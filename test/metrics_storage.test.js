const assert = require("assert");
const mockDB = require("mock-knex");
const setupDatabase = require("../src/setup/database");
const db = setupDatabase({});
const MetricsStorage = require("../src/adapters/metrics_storage");
const { metricsFixtures, roomsFixtures } = require("./fixtures");

describe("MetricsStorage tests", () => {
  before(function (done) {
    mockDB.mock(db);
    done();
  });

  after(function (done) {
    mockDB.unmock(db);
    done();
  });

  it("metricStorage.get issues select w/ query and order", async function () {
    const roomOneName = roomsFixtures[0].name;
    const metricsStorage = new MetricsStorage(db);

    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([]);
    });

    const result = await metricsStorage.get({ room_name: roomOneName });
    assert(tracker.queries.count() === 1);
    assert(
      tracker.queries.first().sql ===
        "select * from `metrics` where `room_name` = ? order by `timestamp` asc"
    );
    assert(tracker.queries.first().bindings[0] === roomOneName);
    tracker.uninstall();
  });

  it("metricStorage.create issues insert", async function () {
    const roomOneName = roomsFixtures[0].name;
    const metricsStorage = new MetricsStorage(db);

    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([]);
    });

    const result = await metricsStorage.create({ ...metricsFixtures[0] });
    assert(tracker.queries.count() === 1);
    assert(
      tracker.queries.first().sql ===
        "insert into `metrics` (`recv_bps`, `recv_packet_loss`, `room_name`, `send_bps`, `send_packet_loss`, `session_id`, `timestamp`) values (?, ?, ?, ?, ?, ?, ?)"
    );
    // cannot check the bindings directly because they no longer have keys
    // and could be in any order, so just check that the timestamp there
    assert(
      tracker.queries.first().bindings.indexOf(metricsFixtures[0].timestamp) !==
        -1
    );
    tracker.uninstall();
  });

  it("metricStorage.create w/ incomplete data throws", async function () {
    const roomOneName = roomsFixtures[0].name;
    const metricsStorage = new MetricsStorage(db);

    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([]);
    });

    let errorThrown = false;
    try {
      const result = await metricsStorage.create({ room_name: roomOneName });
    } catch (error) {
      errorThrown = true;
      assert(error.statusCode === 400);
    }
    assert(errorThrown);
    assert(tracker.queries.count() === 0);
    tracker.uninstall();
  });

  it("metricStorage.delete issues delete", async function () {
    const roomOneName = roomsFixtures[0].name;
    const metricsStorage = new MetricsStorage(db);

    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([]);
    });

    const result = await metricsStorage.delete({ room_name: roomOneName });

    assert(tracker.queries.count() === 1);
    assert(
      tracker.queries.first().sql ===
        "delete from `metrics` where `room_name` = ?"
    );
    assert(tracker.queries.first().bindings[0] === roomOneName);
    tracker.uninstall();
  });

  it("metricStorage.delete without query throws", async function () {
    const roomOneName = roomsFixtures[0].name;
    const metricsStorage = new MetricsStorage(db);

    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([]);
    });

    let errorThrown = false;
    try {
      const result = await metricsStorage.delete();
    } catch (error) {
      errorThrown = true;
      assert(error.statusCode === 400);
    }
    assert(errorThrown);
    assert(tracker.queries.count() === 0);

    tracker.uninstall();
  });
});
