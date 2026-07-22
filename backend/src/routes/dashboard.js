// ============================================================
// Dashboard Routes - API endpoints for analytics and stats
// ============================================================
const express = require("express");
const router = express.Router();
const { getDashboardStats, getRevenueAnalytics } = require("../controllers/dashboardController");

// GET /api/dashboard/stats - Get dashboard statistics
router.get("/stats", getDashboardStats);

// GET /api/dashboard/revenue - Get revenue analytics
router.get("/revenue", getRevenueAnalytics);

module.exports = router;
