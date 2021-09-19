const express = require("express");
const got = require("got");
const bodyParser = require("body-parser");
const nunjucks = require("nunjucks");
const knexModule = require("knex");

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
  constructor(knex) {
    this.store = {};
    this.knex = knex;
  }

  validate(metrics) {
    const requiredFields = [
      "room_name",
      "timestamp",
      "session_id",
      "send_bps",
      "recv_bps",
      "send_packet_loss",
      "recv_packet_loss",
    ];
    const safeMetrics = {};
    for (const requiredField of requiredFields) {
      if (!metrics.hasOwnProperty(requiredField)) {
        throw new HTTPError({
          statusCode: 400,
          message: `metrics missing required field: ${requiredField}`,
        });
      }
      safeMetrics[requiredField] = metrics[requiredField];
    }

    return safeMetrics;
  }

  create(metrics) {
    const safeMetrics = this.validate(metrics);
    return this.knex("metrics").insert(safeMetrics);
  }

  delete(query) {
    if (!query) {
      throw new HTTPError({
        statusCode: 400,
        message: `for safety, delete requires a query`,
      });
    }
    return this.knex("metrics").where(query).del();
  }

  get(query, order = [{ column: "timestamp", order: "asc" }]) {
    let result = this.knex("metrics").select();
    if (query) {
      result = result.where(query);
    }
    if (order) {
      result = result.orderBy(order);
    }
    return result;
  }
}

const setupApp = (port, token) => {
  const app = express();
  const apiRouter = express.Router({ mergeParams: true });
  const viewRouter = express.Router({ mergeParams: true });
  const knex = knexModule({
    client: "sqlite3",
    connection: {
      filename: "./db/metrics.sqlite",
    },
    useNullAsDefault: true,
  });
  const metricsStorage = new MetricsStorage(knex);

  if (!token) {
    // not exiting app because you might *want* to run with no key for some reason
    console.warn("no daily api key provided! all DailyAPI calls will fail.");
  }

  const dailyAPI = new DailyAPI(token);

  const nunjucksEnv = nunjucks.configure("server/views", {
    autoescape: true,
    express: app,
    watch: true,
  });
  nunjucksEnv.addFilter("fixed", (num, length) => num.toFixed(2 || length));

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
    // clear out any metrics we stored for that room
    const metrics = await metricsStorage.delete({
      room_name: req.params.room_name,
    });
    res.send(room);
  });

  apiRouter.get("/metrics/:room_name", async (req, res, next) => {
    const metrics = await metricsStorage.get({
      room_name: req.params.room_name,
    });
    res.send(metrics);
  });

  apiRouter.post("/metrics", async (req, res, next) => {
    await metricsStorage.create(req.body);
    res.send();
  });

  apiRouter.delete("/metrics/:room_name", async (req, res, next) => {
    await metricsStorage.delete({
      room_name: req.params.room_name,
    });
    res.send();
  });

  viewRouter.get("/", async (req, res) => {
    const rooms = await dailyAPI.getRooms();
    res.render("dashboard.html", { rooms });
  });

  viewRouter.get("/calls/:room_name", async (req, res) => {
    const room = await dailyAPI.getRoom(req.params.room_name);
    res.render("call.html", { room });
  });

  viewRouter.get("/metrics/:room_name", async (req, res) => {
    const room = await dailyAPI.getRoom(req.params.room_name);
    const metrics = await metricsStorage.get(
      {
        room_name: req.params.room_name,
      },
      ["room_name", "session_id", "timestamp"]
    );
    res.render("metrics.html", { room, metrics });
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
