const express = require("express");
const router = express.Router();
const { getOpportunities, getOpportunity, createOpportunity, updateOpportunity, updateStage, deleteOpportunity, getPipelineStats } = require("../controllers/opportunityController");
const { authenticate } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

router.use(authenticate);

router.get("/", getOpportunities);
router.get("/stats", getPipelineStats);
router.get("/:id", validate(schemas.idParam, "params"), getOpportunity);
router.post("/", validate(schemas.opportunitySchema), createOpportunity);
router.put("/:id", validate(schemas.idParam, "params"), updateOpportunity);
router.patch("/:id/stage", validate(schemas.idParam, "params"), updateStage);
router.delete("/:id", validate(schemas.idParam, "params"), deleteOpportunity);

module.exports = router;
