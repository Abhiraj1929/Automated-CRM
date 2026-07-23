const express = require("express");
const router = express.Router();
const { getContacts, getContact, createContact, updateContact, deleteContact } = require("../controllers/contactController");
const { authenticate } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

router.use(authenticate);

router.get("/", getContacts);
router.get("/:id", validate(schemas.idParam, "params"), getContact);
router.post("/", validate(schemas.contactSchema), createContact);
router.put("/:id", validate(schemas.idParam, "params"), updateContact);
router.delete("/:id", validate(schemas.idParam, "params"), deleteContact);

module.exports = router;
