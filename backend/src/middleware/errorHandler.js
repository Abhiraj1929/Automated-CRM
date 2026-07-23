const { logger } = require("./logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  logger.error("Error handled", {
    statusCode,
    message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || "anonymous",
    ip: req.ip,
  });

  // Don't leak stack traces in production
  const response = {
    success: false,
    error: process.env.NODE_ENV === "production" ? message : message,
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
