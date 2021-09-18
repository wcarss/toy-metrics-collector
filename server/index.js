const express = require("express");
const got = require("got");
const bodyParser = require("body-parser");

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

  getRooms(query) {
    return this.call("GET", `/rooms`, { query });
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

const setupApp = (port, token) => {
  const app = express();
  const apiRouter = express.Router({ mergeParams: true });

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

  app.use(express.static("client"));
  app.use(bodyParser.json());
  app.use("/api", apiRouter);
  app.listen(port, () => {
    console.log(`toy metrics collector listening on port ${port}`);
  });
};

const port = process.env.TOY_METRICS_PORT || 35813; // a fibonacci port
const token = process.env.DAILY_API_KEY;
setupApp(port, token);
