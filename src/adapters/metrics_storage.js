const { HTTPError } = require("../utils/errors");

class MetricsStorage {
  constructor(knex) {
    this.knex = knex;
  }

  _validate(metrics) {
    // this method would be better off handled by a schema tied to the db
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
        // I also should not really throw HTTP errors from inside a DB adapter,
        // but this is the only error class I have!
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
    const safeMetrics = this._validate(metrics);
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
