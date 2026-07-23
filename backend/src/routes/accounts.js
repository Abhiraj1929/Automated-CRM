const express = require("express");
const router = express.Router();
const { getAccounts, getAccount, createAccount, updateAccount, deleteAccount } = require("../controllers/accountController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");

router.use(authenticate);

router.get("/", getAccounts);
router.get("/:id", validate(schemas.idParam, "params"), getAccount);
router.post("/", validate(schemas.accountSchema), createAccount);
router.put("/:id", validate(schemas.idParam, "params"), updateAccount);
router.delete("/:id", validate(schemas.idParam, "params"), authorize("admin", "manager"), deleteAccount);

module.exports = router;
