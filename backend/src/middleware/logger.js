const winston = require("winston");
const path = require("path");

const logDir = path.join(__dirname, "../../logs");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "ai-crm" },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "error.log"), level: "error", maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, "combined.log"), maxsize: 5242880, maxFiles: 5 }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }));
}

// Express request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || "anonymous",
    };
    if (res.statusCode >= 400) {
      logger.error("Request failed", logData);
    } else {
      logger.info("Request completed", logData);
    }
  });
  next();
};

module.exports = { logger, requestLogger };
