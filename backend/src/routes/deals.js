// ============================================================
// Deal Routes - Pipeline operations with RBAC
// ============================================================
const express = require("express");
const router = express.Router();
const { getDeals, updateDealStage, getPipelineStats } = require("../controllers/dealController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// GET /api/deals/stats - Get pipeline statistics (must be before /:id)
router.get("/stats", getPipelineStats);

// GET /api/deals - Get all deals
router.get("/", getDeals);

// PATCH /api/deals/:id/stage - Update deal stage
router.patch("/:id/stage", updateDealStage);

module.exports = router;
