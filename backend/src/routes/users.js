// ============================================================
// User Routes - Admin user management
// ============================================================
const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getManagerEmployees,
} = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");
const { validateUser } = require("../middleware/validate");

// All routes require authentication
router.use(authenticate);

// PUT /api/users/me - Update own profile
router.put("/me", async (req, res) => {
  try {
    const { supabase } = require("../config/supabase");
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.role;
    delete updates.organization_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", req.user.id)
      .select("id, name, email, role, onboarding_completed, organization_id")
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users - Get all users (Admin: all, Manager: team)
router.get("/", authorize("admin", "manager"), getUsers);

// GET /api/users/:id - Get single user
router.get("/:id", getUser);

// POST /api/users - Create user (Admin only)
router.post("/", authorize("admin"), validateUser, createUser);

// PUT /api/users/:id - Update user
router.put("/:id", updateUser);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete("/:id", authorize("admin"), deleteUser);

// PATCH /api/users/:id/reset-password - Reset password (Admin only)
router.patch("/:id/reset-password", authorize("admin"), resetPassword);

// GET /api/users/:id/employees - Get manager's employees
router.get("/:id/employees", authorize("admin", "manager"), getManagerEmployees);

module.exports = router;
