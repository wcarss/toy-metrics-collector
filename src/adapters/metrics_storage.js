const { HTTPError } = require("../utils/errors");

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

module.exports = MetricsStorage;
