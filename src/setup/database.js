const knexModule = require("knex");
// it's awkward to have to reach up so far for this
const knexFile = require("../../knexfile");

const setupDatabase = (app) => {
  // in a real app, we'd have this use NODE_ENV to choose its config
  const knex = knexModule(knexFile.development);
  // the app.db pattern allows anything with an app context to use the db,
  // which is much better than require('db') sprinkled liberally, and
  // the connection-management headaches that can often bring + cause
  app.db = knex;

  return app.db;
};

module.exports = setupDatabase;
