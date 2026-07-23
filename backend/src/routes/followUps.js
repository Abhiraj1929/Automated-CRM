// ============================================================
// Follow-Up Routes - Lead follow-up management
// ============================================================
const express = require("express");
const router = express.Router();
const {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getTodayFollowUps,
} = require("../controllers/followUpController");
const { authenticate } = require("../middleware/auth");
const { validateFollowUp } = require("../middleware/validate");

// All routes require authentication
router.use(authenticate);

// GET /api/follow-ups/today - Get today's follow-ups (must be before /:leadId)
router.get("/today", getTodayFollowUps);

// GET /api/leads/:leadId/follow-ups - Get follow-ups for a lead
router.get("/lead/:leadId", getFollowUps);

// POST /api/leads/:leadId/follow-ups - Create follow-up for a lead
router.post("/lead/:leadId", validateFollowUp, createFollowUp);

// PUT /api/follow-ups/:id - Update follow-up
router.put("/:id", updateFollowUp);

// DELETE /api/follow-ups/:id - Delete follow-up
router.delete("/:id", deleteFollowUp);

module.exports = router;
