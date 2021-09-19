const errorHandler = (err, req, res, next) => {
  res.header("Content-Type", "application/json");
  res
    .status(err.statusCode || 500)
    .json({ statusCode: err.statusCode, message: err.message });
};

module.exports = { errorHandler };
