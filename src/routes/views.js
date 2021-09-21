const nunjucks = require("nunjucks");
const express = require("express");
const MetricsStorage = require("../adapters/metrics_storage");
const DailyAPI = require("../adapters/daily_api");

const setupViews = (app) => {
  const viewRouter = express.Router({ mergeParams: true });
  const metricsStorage = new MetricsStorage(app.db);
  const dailyAPI = new DailyAPI(app.config.dailyToken);

  // nunjuck will render templates, which we're just calling .html files
  // this tells res.render to look in ./views
  const nunjucksEnv = nunjucks.configure("views", {
    autoescape: true,
    express: app,
    watch: true,
  });
  nunjucksEnv.addFilter("fixed", (num, length) => num.toFixed(2 || length));

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
    res.render("metrics.html", { roomName: req.params.room_name, metrics });
  });

  return viewRouter;
};

module.exports = setupViews;
