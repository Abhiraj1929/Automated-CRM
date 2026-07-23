// ============================================================
// AI CRM Backend - Production Configuration
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { logger, requestLogger } = require("./middleware/logger");
const { securityHeaders, apiLimiter, authLimiter } = require("./middleware/security");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const leadRoutes = require("./routes/leads");
const accountRoutes = require("./routes/accounts");
const contactRoutes = require("./routes/contacts");
const opportunityRoutes = require("./routes/opportunities");
const activityRoutes = require("./routes/activities");
const productRoutes = require("./routes/products");
const campaignRoutes = require("./routes/campaigns");
const automationRoutes = require("./routes/automation");
const dashboardRoutes = require("./routes/dashboard");

// Import middleware
const errorHandler = require("./middleware/errorHandler");
const { setupSwagger } = require("./config/swagger");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(securityHeaders);
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
}));

// ============================================================
// Body Parsing & Logging
// ============================================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(requestLogger);

// ============================================================
// Rate Limiting
// ============================================================
app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ============================================================
// API Documentation (Swagger)
// ============================================================
setupSwagger(app);

// ============================================================
// API Routes
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/products", productRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check (no rate limit)
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      memory: process.memoryUsage(),
    },
  });
});

// Readiness check for k8s/Docker
app.get("/api/ready", (req, res) => {
  res.json({ success: true, data: { status: "ready" } });
});

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
  logger.warn("Route not found", { method: req.method, url: req.originalUrl });
  res.status(404).json({ success: false, error: "Route not found" });
});

// ============================================================
// Error Handler
// ============================================================
app.use(errorHandler);

// ============================================================
// Graceful Shutdown
// ============================================================
const server = app.listen(PORT, () => {
  logger.info(`AI CRM Backend running on port ${PORT}`, {
    environment: process.env.NODE_ENV || "development",
    pid: process.pid,
  });
});

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason: reason?.toString(), stack: reason?.stack });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;
