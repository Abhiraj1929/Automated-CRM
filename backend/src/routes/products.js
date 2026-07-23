const express = require("express");
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductStats } = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);

router.get("/", getProducts);
router.get("/stats", getProductStats);
router.get("/:id", getProduct);
router.post("/", authorize("admin", "manager"), createProduct);
router.put("/:id", authorize("admin", "manager"), updateProduct);
router.delete("/:id", authorize("admin"), deleteProduct);

module.exports = router;
