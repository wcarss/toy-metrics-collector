const got = require("got");
const { DAILY_HOST } = require("../constants");

class DailyAPI {
  constructor(token) {
    if (!token) {
      // not failing/throwing because you might *want* to run with no key
      console.warn("no daily api key provided! all DailyAPI calls will fail.");
    }
    this.token = token;
    this.dailyHost = `${DAILY_HOST}/v1`;
  }

  async call(method, path, requestData) {
    const OUTBOUND_REQUEST_TIMEOUT = 10000; // a 10s timeout
    const uri = `${this.dailyHost}${path}`;
    try {
      const result = await got(uri, {
        method,
        responseType: "json",
        timeout: OUTBOUND_REQUEST_TIMEOUT,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        ...requestData,
      }).json();
      return result;
    } catch (error) {
      console.error(
        `DailyAPI error calling ${uri} w/ data ${JSON.stringify(
          requestData
        )}, error: ${error.statusCode}, ${error.message}`
      );
    }
  }

  getRoom(id) {
    return this.call("GET", `/rooms/${id}`);
  }

  // async so we can pull .data, which is the actual rooms array
  // (async or not shouldn't make any difference to the caller here)
  async getRooms(query) {
    const roomsResponse = await this.call("GET", `/rooms`, { query });
    return roomsResponse && roomsResponse.data;
  }

  createRoom(body) {
    return this.call("POST", `/rooms`, { json: body });
  }

  modifyRoom(id, body) {
    return this.call("POST", `/rooms/${id}`, { json: body });
  }

  deleteRoom(id) {
    return this.call("DELETE", `/rooms/${id}`);
  }
}

module.exports = DailyAPI;
