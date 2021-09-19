// in real life, this would likely be handled by a framework
class HTTPError extends Error {
  constructor(errorObj = {}) {
    super(errorObj.message || "error");
    this.message = errorObj.message || "error";
    this.statusCode = errorObj.statusCode || 500;
  }
}

module.exports = { HTTPError };
