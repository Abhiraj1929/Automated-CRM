// ============================================================
// Lead Routes - API endpoints for lead operations
// ============================================================
const express = require("express");
const router = express.Router();
const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  scoreLead,
  batchScoreLeads,
} = require("../controllers/leadController");

// GET /api/leads - Get all leads
router.get("/", getLeads);

// GET /api/leads/:id - Get single lead
router.get("/:id", getLead);

// POST /api/leads - Create new lead
router.post("/", createLead);

// PUT /api/leads/:id - Update lead
router.put("/:id", updateLead);

// PATCH /api/leads/:id/status - Update lead status (Kanban drag-drop)
router.patch("/:id/status", updateLeadStatus);

// DELETE /api/leads/:id - Delete lead
router.delete("/:id", deleteLead);

// POST /api/leads/score - Get AI lead score prediction
router.post("/score", scoreLead);

// POST /api/leads/score/batch - Batch score multiple leads
router.post("/score/batch", batchScoreLeads);

module.exports = router;
