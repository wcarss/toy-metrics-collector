const assert = require("assert");
const got = require("got");
const mockDB = require("mock-knex");
const nock = require("nock");

const { DAILY_HOST } = require("../src/constants");
const { metricsFixtures, roomsFixtures } = require("./fixtures");
const { makeGetUrl, makeDailyAPIDeleteFixture } = require("./utils");

const port = 3030;
const app = require("../src/index").setupApp(port, "fake token");
const getUrl = makeGetUrl(app, port);

describe("API tests", () => {
  before(function (done) {
    this.server = app.listen(port);
    mockDB.mock(app.db);
    this.server.once("listening", () => done());
  });

  after(function (done) {
    nock.cleanAll();
    mockDB.unmock(app.db);
    this.server.close(done);
  });

  it("passes GET /rooms/:room_name through to the Daily rooms api", async function () {
    const roomOneName = roomsFixtures[0].name;
    const roomTwoName = roomsFixtures[1].name;
    const scope = nock(DAILY_HOST)
      .get(`/v1/rooms/${roomOneName}`)
      .reply(200, {
        ...roomsFixtures[0],
      })
      .get(`/v1/rooms/${roomTwoName}`)
      .reply(200, {
        ...roomsFixtures[1],
      });

    const roomOneResults = await got(getUrl(`api/rooms/${roomOneName}`)).json();
    assert(roomOneResults.name === roomOneName);
    const roomTwoResults = await got(getUrl(`api/rooms/${roomTwoName}`)).json();
    assert(roomTwoResults.name === roomTwoName);
    scope.done();
  });

  it("passes GET /rooms through to the Daily rooms api", async function () {
    const roomOneName = roomsFixtures[0].name;
    const roomTwoName = roomsFixtures[1].name;
    const scope = nock(DAILY_HOST)
      .get("/v1/rooms")
      .reply(200, {
        totalCount: 1,
        data: [{ ...roomsFixtures[0] }, { ...roomsFixtures[1] }],
      });

    const results = await got(getUrl("api/rooms")).json();
    assert(results.length === 2);
    assert(results[0].name === roomOneName);
    assert(results[1].name === roomTwoName);
    scope.done();
  });

  it("passes POST /rooms through to the Daily rooms api", async function () {
    const roomName = roomsFixtures[0].name;
    const scope = nock(DAILY_HOST)
      .post(`/v1/rooms`)
      .reply(200, { ...roomsFixtures[0] });

    const results = await got(getUrl("api/rooms"), {
      method: "POST",
    }).json();
    assert(results.name === roomName);
    scope.done();
  });

  it("passes POST /rooms/:room_name through to the Daily rooms api", async function () {
    const roomName = roomsFixtures[0].name;
    const newRoomName = "new room name";
    const scope = nock(DAILY_HOST)
      .post(`/v1/rooms/${roomName}`, { privacy: "private" })
      .reply(200, { ...roomsFixtures[0], ...{ privacy: "private" } });

    const results = await got(getUrl(`api/rooms/${roomName}`), {
      method: "POST",
      json: {
        privacy: "private",
      },
    }).json();
    assert(results.name === roomName);
    assert(results.privacy === "private");
    scope.done();
  });

  it("passes DELETE /rooms/:room_name through to the Daily rooms api", async function () {
    const roomOneName = roomsFixtures[0].name;
    const roomTwoName = roomsFixtures[1].name;
    const scope = nock(DAILY_HOST)
      .delete(`/v1/rooms/${roomOneName}`)
      .reply(200, makeDailyAPIDeleteFixture(roomOneName))
      .delete(`/v1/rooms/${roomTwoName}`)
      .reply(200, makeDailyAPIDeleteFixture(roomTwoName));

    const roomOneResults = await got(getUrl(`api/rooms/${roomOneName}`), {
      method: "delete",
    }).json();
    assert(roomOneResults.name === roomOneName);

    const roomTwoResults = await got(getUrl(`api/rooms/${roomTwoName}`), {
      method: "delete",
    }).json();
    assert(roomTwoResults.name === roomTwoName);
    scope.done();
  });

  it("on DELETE /rooms/:room_name, issues deletes to the metrics db", async function () {
    const roomOneName = roomsFixtures[0].name;
    const roomTwoName = roomsFixtures[1].name;
    const scope = nock(DAILY_HOST)
      .delete(`/v1/rooms/${roomOneName}`)
      .reply(200, makeDailyAPIDeleteFixture(roomOneName))
      .delete(`/v1/rooms/${roomTwoName}`)
      .reply(200, makeDailyAPIDeleteFixture(roomTwoName));

    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([]);
    });

    const roomOneResults = await got(getUrl(`api/rooms/${roomOneName}`), {
      method: "delete",
    }).json();
    const roomTwoResults = await got(getUrl(`api/rooms/${roomTwoName}`), {
      method: "delete",
    }).json();
    assert(tracker.queries.count() === 2);
    assert(
      tracker.queries.first().sql ===
        "delete from `metrics` where `room_name` = ?"
    );
    assert(tracker.queries.first().bindings[0] === roomOneName);
    assert(
      tracker.queries.last().sql ===
        "delete from `metrics` where `room_name` = ?"
    );
    assert(tracker.queries.step(2).bindings[0] === roomTwoName);
    scope.done();
    tracker.uninstall();
  });

  it("on GET /metrics/:room_name, reads metrics from the database", async function () {
    const roomOneName = roomsFixtures[0].name;
    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([{ ...metricsFixtures[0] }]);
    });
    const roomOneResults = await got(
      getUrl(`api/metrics/${roomOneName}`)
    ).json();
    assert(tracker.queries.count() === 1);
    assert(
      tracker.queries.first().sql ===
        "select * from `metrics` where `room_name` = ? order by `timestamp` asc"
    );
    assert(tracker.queries.first().bindings[0] === roomOneName);
    tracker.uninstall();
  });

  it("on POST /metrics, inserts metrics into the database", async function () {
    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([{ ...metricsFixtures[0] }]);
    });
    const results = await got(getUrl(`api/metrics/`), {
      method: "POST",
      json: { ...metricsFixtures[0] },
    }).json();
    assert(tracker.queries.count() === 1);
    // this is way too in the weeds for the long term
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

  it("on POST /metrics w/ incomplete data, returns 400", async function () {
    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([{ ...metricsFixtures[0] }]);
    });
    let errorThrown = false;
    try {
      const results = await got(getUrl(`api/metrics/`), {
        method: "POST",
        json: { name: metricsFixtures[0].name },
      }).json();
    } catch (error) {
      assert(error.response.statusCode === 400);
      errorThrown = true;
    }
    assert(errorThrown);
    assert(tracker.queries.count() === 0);
    tracker.uninstall();
  });

  it("on DELETE /metrics/:room_name, issues deletes to the metrics db", async function () {
    const roomOneName = roomsFixtures[0].name;
    const tracker = mockDB.getTracker();
    tracker.install();
    tracker.on("query", (query) => {
      query.response([]);
    });

    const results = await got(getUrl(`api/metrics/${roomOneName}`), {
      method: "DELETE",
    }).json();

    assert(tracker.queries.count() === 1);
    assert(
      tracker.queries.first().sql ===
        "delete from `metrics` where `room_name` = ?"
    );
    assert(tracker.queries.first().bindings[0] === roomOneName);
    tracker.uninstall();
  });
});
