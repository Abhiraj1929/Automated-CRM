const express = require("express");
const router = express.Router();
const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignLeads,
  linkLeadsToCampaign,
  unlinkLeadFromCampaign,
  logCampaignResponse,
  getCampaignResponses,
} = require("../controllers/campaignController");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);

// Campaign CRUD
router.get("/", getCampaigns);
router.get("/:id", getCampaign);
router.post("/", authorize("admin", "manager"), createCampaign);
router.put("/:id", authorize("admin", "manager"), updateCampaign);
router.delete("/:id", authorize("admin"), deleteCampaign);

// Campaign leads (linked leads)
router.get("/:id/leads", getCampaignLeads);
router.post("/:id/leads", authorize("admin", "manager"), linkLeadsToCampaign);
router.delete("/:id/leads/:leadId", authorize("admin", "manager"), unlinkLeadFromCampaign);

// Campaign responses
router.get("/:id/responses", getCampaignResponses);
router.post("/:id/responses", authorize("admin", "manager"), logCampaignResponse);

module.exports = router;
