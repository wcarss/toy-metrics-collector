const express = require("express");
const got = require("got");
const bodyParser = require("body-parser");
const nunjucks = require("nunjucks");

class DailyAPI {
  constructor(token) {
    this.token = token;
    this.dailyHost = "https://api.daily.co/v1";
  }

  async call(method, path, requestData) {
    const OUTBOUND_REQUEST_TIMEOUT = 10000; // a 10s timeout
    const uri = `${this.dailyHost}${path}`;
    try {
      const result = await got(uri, {
        method,
        responseType: "json",
        timeout: OUTBOUND_REQUEST_TIMEOUT,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        ...requestData,
      }).json();
      return result;
    } catch (error) {
      console.error(
        `DailyAPI error calling ${uri} w/ data ${JSON.stringify(
          requestData
        )}, error: ${error.statusCode}, ${error.message}`
      );
    }
  }

  getRoom(id) {
    return this.call("GET", `/rooms/${id}`);
  }

  async getRooms(query) {
    const roomsResponse = await this.call("GET", `/rooms`, { query });
    return roomsResponse.data;
  }

  createRoom(body) {
    return this.call("POST", `/rooms`, { json: body });
  }

  modifyRoom(id, body) {
    return this.call("POST", `/rooms/${id}`, { json: body });
  }

  deleteRoom(id) {
    return this.call("DELETE", `/rooms/${id}`);
  }

  getParticipants() {
    throw new Error("get participants not yet implemented");
  }
}

class HTTPError extends Error {
  constructor(errorObj = {}) {
    super(errorObj.message || "error");
    this.message = errorObj.message || "error";
    this.statusCode = errorObj.statusCode || 500;
  }
}

class MetricsStorage {
  constructor() {
    this.store = {};
  }

  validate(metrics) {
    const requiredFields = [
      "session_id",
      "send_bps",
      "recv_bps",
      "send_packet_loss",
      "recv_packet_loss",
    ];
    for (const requiredField of requiredFields) {
      if (!metrics.hasOwnProperty(requiredField)) {
        throw new HTTPError({
          statusCode: 400,
          message: `metrics missing required field: ${requiredField}`,
        });
      }
    }
  }

  create(metrics) {
    this.validate(metrics);
    const session = metrics.session_id;
    const room = metrics.room_name;
    if (!this.store[room]) {
      this.store[room] = [];
    }
    this.store[room].push(metrics);
  }

  get(roomName) {
    return this.store[roomName];
  }
}

const setupApp = (port, token) => {
  const app = express();
  const apiRouter = express.Router({ mergeParams: true });
  const viewRouter = express.Router({ mergeParams: true });
  const metricsStorage = new MetricsStorage();

  if (!token) {
    // not exiting app because you might *want* to run with no key for some reason
    console.warn("no daily api key provided! all DailyAPI calls will fail.");
  }

  const dailyAPI = new DailyAPI(token);

  apiRouter.get("/rooms/:room_name", async (req, res, next) => {
    const room = await dailyAPI.getRoom(req.params.room_name);
    res.send(room);
  });

  apiRouter.get("/rooms", async (req, res, next) => {
    const rooms = await dailyAPI.getRooms();
    res.send(rooms);
  });

  apiRouter.post("/rooms", async (req, res, next) => {
    const room = await dailyAPI.createRoom(req.body);
    res.send(room);
  });

  apiRouter.post("/rooms/:room_name", async (req, res, next) => {
    const room = await dailyAPI.modifyRoom(req.params.room_name, req.body);
    res.send(room);
  });

  apiRouter.delete("/rooms/:room_name", async (req, res, next) => {
    const room = await dailyAPI.deleteRoom(req.params.room_name);
    res.send(room);
  });

  apiRouter.get("/metrics/:room_name", async (req, res, next) => {
    const metrics = metricsStorage.get(req.params.room_name);
    res.send(metrics);
  });

  apiRouter.post("/metrics/", async (req, res, next) => {
    metricsStorage.create(req.body);
    res.send();
  });

  viewRouter.get("/", async (req, res) => {
    const rooms = await dailyAPI.getRooms();
    res.render("dashboard.html", { rooms });
  });

  viewRouter.get("/calls/:call_name", async (req, res) => {
    const room = await dailyAPI.getRoom(req.params.call_name);
    res.render("call.html", { room });
  });

  viewRouter.get("/metrics/:call_name", async (req, res) => {
    const room = await dailyAPI.getRoom(req.params.call_name);
    const metrics = metricsStorage.get(req.params.call_name);
    res.render("metrics.html", { room, metrics });
  });

  nunjucks.configure("server/views", {
    autoescape: true,
    express: app,
    watch: true,
  });

  app.use(bodyParser.json());
  app.use("/api", apiRouter);
  app.use(viewRouter);
  app.use(express.static("server/static"));
  app.use((err, req, res, next) => {
    res.header("Content-Type", "application/json");
    res
      .status(err.statusCode || 500)
      .json({ statusCode: err.statusCode, message: err.message });
  });
  app.listen(port, () => {
    console.log(`toy metrics collector listening on port ${port}`);
  });
};

const port = process.env.TOY_METRICS_PORT || 35813; // a fibonacci port
const token = process.env.DAILY_API_KEY;
setupApp(port, token);
