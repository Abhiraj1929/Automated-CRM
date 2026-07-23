const express = require("express");
const router = express.Router();
const { getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign } = require("../controllers/campaignController");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);

router.get("/", getCampaigns);
router.get("/:id", getCampaign);
router.post("/", authorize("admin", "manager"), createCampaign);
router.put("/:id", authorize("admin", "manager"), updateCampaign);
router.delete("/:id", authorize("admin"), deleteCampaign);

module.exports = router;
