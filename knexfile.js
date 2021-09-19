module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: "./db/metrics.sqlite3",
    },
    migrations: {
      directory: "./db/migrations",
      tableName: "knex_migrations",
    },
    useNullAsDefault: true,
  },
};
