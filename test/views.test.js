const assert = require("assert");
const got = require("got");
const mockDB = require("mock-knex");
const nock = require("nock");

const { DAILY_HOST } = require("../src/constants");
const { roomsFixtures, metricsFixtures } = require("./fixtures");
const { makeGetUrl } = require("./utils");

const port = 3030;
const app = require("../src/index").setupApp(port, "fake token");
const getUrl = makeGetUrl(app, port);

describe("View tests", () => {
  before(function (done) {
    this.server = app.listen(port);
    this.server.once("listening", () => done());
  });

  after(function (done) {
    nock.cleanAll();
    this.server.close(done);
  });

  it("starts and shows the index page", async function () {
    const scope = nock(DAILY_HOST)
      .get(`/v1/rooms`)
      .reply(200, {
        totalCount: 1,
        data: [
          {
            ...roomsFixtures[0],
          },
        ],
      });
    const response = await got(getUrl());
    assert.ok(response.body.indexOf("<html") !== -1);
    scope.done();
  });

  it("index page has a table", async function () {
    const scope = nock(DAILY_HOST)
      .get(`/v1/rooms`)
      .reply(200, {
        totalCount: 1,
        data: [
          {
            ...roomsFixtures[0],
          },
        ],
      });
    const response = await got(getUrl());
    assert.ok(response.body.indexOf("<table>") !== -1);
    assert.ok(response.body.indexOf("<td>") !== -1);
    scope.done();
  });

  it("empty metrics page has a table w/ a no-data row", async function () {
    const roomOneName = roomsFixtures[0].name;
    const scope = nock(DAILY_HOST)
      .get(`/v1/rooms/${roomOneName}`)
      .reply(200, {
        ...roomsFixtures[0],
      });
    const response = await got(getUrl(`/metrics/${roomOneName}`));
    assert.ok(response.body.indexOf("<table>") !== -1);
    assert.ok(response.body.indexOf("<td colspan") !== -1);
    assert.ok(response.body.indexOf("no data") !== -1);
    scope.done();
  });

  it("non-empty metrics page has a table w/ data rows", async function () {
    mockDB.mock(app.db);
    const tracker = mockDB.getTracker();
    const roomOneName = roomsFixtures[0].name;
    const scope = nock(DAILY_HOST)
      .get(`/v1/rooms/${roomOneName}`)
      .reply(200, {
        ...roomsFixtures[0],
      });
    tracker.install();
    tracker.on("query", (query) => {
      query.response([...metricsFixtures]);
    });

    const response = await got(getUrl(`/metrics/${roomOneName}`), {
      retry: { limit: 0 },
    });

    assert.ok(response.body.indexOf("<table>") !== -1);
    assert.ok(response.body.indexOf("<td>") !== -1);
    assert.ok(response.body.indexOf(metricsFixtures[1].session_id) !== -1);
    scope.done();
    tracker.uninstall();
    mockDB.unmock(app.db);
  });

  it("shows a 404 page", async () => {
    try {
      const res = await got(getUrl("path/to/nowhere"));
    } catch (err) {
      assert.equal(err.response.statusCode, 404);
      assert.ok(err.response.body.indexOf("<html") !== -1);
    }
  });
});
