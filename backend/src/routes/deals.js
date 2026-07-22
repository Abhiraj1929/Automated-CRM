// ============================================================
// Deal Routes - API endpoints for deal/pipeline operations
// ============================================================
const express = require("express");
const router = express.Router();
const { getDeals, updateDealStage, getPipelineStats } = require("../controllers/dealController");

// GET /api/deals - Get all deals
router.get("/", getDeals);

// GET /api/deals/stats - Get pipeline statistics
router.get("/stats", getPipelineStats);

// PATCH /api/deals/:id/stage - Update deal stage
router.patch("/:id/stage", updateDealStage);

module.exports = router;
