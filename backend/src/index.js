// ============================================================
// AI CRM Backend - Production Configuration
// ============================================================
require("dotenv").config();
const express = require("express");
const http = require("http");
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
const importExportRoutes = require("./routes/importExport");
const reportRoutes = require("./routes/reports");
const billingRoutes = require("./routes/billing");
const webhookRoutes = require("./routes/webhooks");
const superAdminRoutes = require("./routes/superAdmin");
const adminRoutes = require("./routes/admin");
const dataSourcesRoutes = require("./routes/dataSources");
const ingestionRoutes = require("./routes/ingestion");
const integrationRoutes = require("./routes/integrations");
const invitationRoutes = require("./routes/invitations");
const assignmentRuleRoutes = require("./routes/assignmentRules");
const stripeService = require("./services/stripeService");

// Import services
const emailService = require("./services/emailService");
const storageService = require("./services/storageService");
const websocketService = require("./services/websocketService");
const dataSourceService = require("./services/dataSourceService");

// Import middleware
const errorHandler = require("./middleware/errorHandler");
const { setupSwagger } = require("./config/swagger");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ============================================================
// Initialize Services
// ============================================================
emailService.init();
storageService.init();
websocketService.init(server);

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
// Stripe Webhooks — MUST be before express.json() for raw body
// ============================================================
app.use("/api/webhooks", webhookRoutes);

// ============================================================
// Body Parsing & Logging
// ============================================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(requestLogger);

// Serve uploaded files (local storage fallback)
app.use("/uploads", express.static("uploads"));

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
app.use("/api/data", importExportRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/data-sources", dataSourcesRoutes);
app.use("/api/ingest", ingestionRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/assignment-rules", assignmentRuleRoutes);

// ============================================================
// Data Source Scheduler — Sync all active sources every 30 min
// ============================================================
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
setInterval(async () => {
  try {
    logger.info("Running scheduled data source sync");
    await dataSourceService.syncAll();
  } catch (err) {
    logger.error("Scheduled data source sync failed", { error: err.message });
  }
}, SYNC_INTERVAL);

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
      services: {
        email: emailService.initialized ? "configured" : "logging-only",
        storage: storageService.useS3 ? "s3" : "local",
        websocket: "active",
        billing: stripeService.isConfigured() ? "stripe" : "self-serve",
      },
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
// Start Server (using http.createServer for WebSocket support)
// ============================================================
server.listen(PORT, () => {
  logger.info(`AI CRM Backend running on port ${PORT}`, {
    environment: process.env.NODE_ENV || "development",
    pid: process.pid,
  });

  // Initialize background scheduler with node-cron
  const { initializeScheduler } = require("./services/schedulerService");
  initializeScheduler().catch((err) => logger.error("Scheduler init failed", { error: err.message }));
});

// ============================================================
// Graceful Shutdown
// ============================================================
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
