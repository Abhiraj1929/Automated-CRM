// ============================================================
// Auth Routes - Login, Register, Logout, Session Management
// ============================================================
const express = require("express");
const router = express.Router();
const { login, register, signup, getMe, logout, refreshToken } = require("../controllers/authController");
const { authenticate, authorize } = require("../middleware/auth");
const { validateLogin, validateRegister } = require("../middleware/validate");

// POST /api/auth/login - Login
router.post("/login", validateLogin, login);

// POST /api/auth/signup - Public self-serve registration (creates org + admin)
router.post("/signup", signup);

// POST /api/auth/register - Register (Admin only, within existing org)
router.post("/register", authenticate, authorize("admin"), validateRegister, register);

// GET /api/auth/me - Get current user
router.get("/me", authenticate, getMe);

// POST /api/auth/logout - Logout
router.post("/logout", authenticate, logout);

// POST /api/auth/refresh - Refresh token
router.post("/refresh", refreshToken);

module.exports = router;
