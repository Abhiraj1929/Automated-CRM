const express = require("express");
const router = express.Router();
const { getLeads, getLead, createLead, updateLead, updateLeadStatus, convertLead, deleteLead } = require("../controllers/leadController");
const { authenticate } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

router.use(authenticate);

router.get("/", getLeads);
router.get("/:id", validate(schemas.idParam, "params"), getLead);
router.post("/", validate(schemas.leadSchema), createLead);
router.put("/:id", validate(schemas.idParam, "params"), updateLead);
router.patch("/:id/status", validate(schemas.idParam, "params"), updateLeadStatus);
router.post("/:id/convert", validate(schemas.idParam, "params"), convertLead);
router.delete("/:id", validate(schemas.idParam, "params"), deleteLead);

module.exports = router;
