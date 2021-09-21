const express = require("express");
const bodyParser = require("body-parser");
const setupDatabase = require("./setup/database");
const setupApi = require("./routes/api");
const setupViews = require("./routes/views");
const { errorHandler } = require("./middleware");

const setupApp = (port, dailyToken) => {
  const app = express();

  // in a real app, we'd use a config management library to load a file
  // and then merge sensitive env creds into it around this point
  app.config = {
    port,
    dailyToken,
  };

  // handle json and serve static files at / out of ./server/static
  app.use(bodyParser.json());
  app.use(express.static("static"));

  // hang a 'db' key off of the app context for app-wide use
  setupDatabase(app);

  // put api routes at /api and view routes at /
  // e.g. /api/rooms and /metrics/:room_name
  app.use("/api", setupApi(app));
  app.use(setupViews(app));

  // sends json for all errors w/ keys statusCode and message
  app.use(errorHandler);

  return app;
};

// i.e., "only if we invoke index.js directly:"
if (require.main === module) {
  // in theory we could parameterize the application to have different
  // startup modes, e.g. with/without docs, different db adapters, etc.
  const port = process.env.TOY_METRICS_PORT || 35813; // for fun, a fibonacci port
  const dailyToken = process.env.DAILY_API_KEY;
  const app = setupApp(port, dailyToken);

  app.listen(port, () => {
    console.log(`toy metrics collector listening on port ${app.config.port}`);
  });

  // if any promise rejections get lost in asynchrony, we'd rather they not crash the app
  process.on("unhandledRejection", (reason) =>
    console.error(
      `Unhandled Rejection at: ${
        reason && reason.stack ? reason.stack : reason
      }`
    )
  );
}

// we export setupApp just for tests to be able to make their own instances
module.exports = { setupApp };
