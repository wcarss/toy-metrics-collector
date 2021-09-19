const express = require("express");
const MetricsStorage = require("../adapters/metrics_storage");
const DailyAPI = require("../adapters/daily_api");

const setupApi = (app) => {
  // this router is a little bit like an independent sub-app
  const apiRouter = express.Router({ mergeParams: true });
  const metricsStorage = new MetricsStorage(app.db);
  const dailyAPI = new DailyAPI(app.config.dailyToken);

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

  return apiRouter;
};

module.exports = setupApi;
