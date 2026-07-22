// ============================================================
// AI CRM Backend - Express.js Application Entry Point
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Import routes
const leadRoutes = require("./routes/leads");
const dealRoutes = require("./routes/deals");
const dashboardRoutes = require("./routes/dashboard");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Middleware Configuration
// ============================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request logging
app.use(morgan("dev"));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ============================================================
// API Routes
// ============================================================

app.use("/api/leads", leadRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================
// Error Handling
// ============================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 AI CRM Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
