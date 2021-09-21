const url = require("url");

const makeGetUrl = (app, port) => {
  return (pathname) => {
    return url.format({
      hostname: app.get("host") || "localhost",
      protocol: "http",
      port: port || 3030,
      pathname,
    });
  };
};

const makeDailyAPIDeleteFixture = (name) => ({
  deleted: true,
  name,
});

module.exports = { makeGetUrl, makeDailyAPIDeleteFixture };
