// ============================================================
// User Controller - Admin user management
// ============================================================
const bcrypt = require("bcryptjs");
const { supabase } = require("../config/supabase");
const { logActivity } = require("../middleware/activityLogger");

/**
 * @desc    Get all users (Admin: all, Manager: their team)
 * @route   GET /api/users
 * @access  Private (Admin, Manager)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, status, manager_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("users")
      .select("id, name, email, role, manager_id, phone, department, designation, status, profile_image, created_at, updated_at", { count: "exact" });

    // Role-based filtering
    if (req.user.role === "manager") {
      // Managers can only see themselves and their assigned employees
      query = query.or(`id.eq.${req.user.id},manager_id.eq.${req.user.id}`);
    }
    // Admin sees all

    if (role) query = query.eq("role", role);
    if (status) query = query.eq("status", status);
    if (manager_id) query = query.eq("manager_id", manager_id);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin, Manager for own team, Employee for self)
 */
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Authorization check
    if (req.user.role === "employee" && req.user.id !== id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    if (req.user.role === "manager") {
      // Check if user is the manager or one of their employees
      const { data: targetUser } = await supabase
        .from("users")
        .select("manager_id")
        .eq("id", id)
        .single();
      if (targetUser && targetUser.manager_id !== req.user.id && req.user.id !== id) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, manager_id, phone, department, designation, status, profile_image, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create user (Admin only)
 * @route   POST /api/users
 * @access  Private (Admin)
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, manager_id, phone, department, designation } = req.body;

    // Check duplicate email
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return res.status(409).json({ success: false, error: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password_hash,
        role: role || "employee",
        manager_id: manager_id || null,
        phone: phone || null,
        department: department || null,
        designation: designation || null,
        organization_id: req.user.organization_id,
        status: "active",
      })
      .select("id, name, email, role, manager_id, phone, department, designation, status, created_at")
      .single();

    if (error) throw error;

    logActivity({
      userId: req.user.id,
      action: "user.created",
      entityType: "user",
      entityId: data.id,
      details: { role: data.role, email: data.email },
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user (Admin: any user, Manager: own team, Employee: self)
 * @route   PUT /api/users/:id
 * @access  Private
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Authorization check
    if (req.user.role === "employee" && req.user.id !== id) {
      return res.status(403).json({ success: false, error: "Can only update your own profile" });
    }
    if (req.user.role === "manager") {
      const { data: targetUser } = await supabase
        .from("users")
        .select("manager_id")
        .eq("id", id)
        .single();
      if (targetUser && targetUser.manager_id !== req.user.id && req.user.id !== id) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    }

    // Remove immutable fields
    delete updates.id;
    delete updates.created_at;
    delete updates.password_hash; // Password changed via separate endpoint

    // Only admin can change role and manager_id
    if (req.user.role !== "admin") {
      delete updates.role;
      delete updates.manager_id;
      delete updates.status;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, name, email, role, manager_id, phone, department, designation, status, updated_at")
      .single();

    if (error) throw error;

    logActivity({
      userId: req.user.id,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      details: { updatedFields: Object.keys(updates) },
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user (Admin only, soft delete)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({ success: false, error: "Cannot delete your own account" });
    }

    // Soft delete - set status to inactive
    const { data, error } = await supabase
      .from("users")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, email, status")
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    logActivity({
      userId: req.user.id,
      action: "user.deleted",
      entityType: "user",
      entityId: id,
      details: { deletedUser: data.email },
    });

    res.json({ success: true, message: "User deactivated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset user password (Admin only)
 * @route   PATCH /api/users/:id/reset-password
 * @access  Private (Admin)
 */
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const { error } = await supabase
      .from("users")
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    logActivity({
      userId: req.user.id,
      action: "user.password_reset",
      entityType: "user",
      entityId: id,
    });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get employees under a manager
 * @route   GET /api/users/:id/employees
 * @access  Private (Admin, Manager)
 */
const getManagerEmployees = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Managers can only see their own employees
    if (req.user.role === "manager" && req.user.id !== id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, phone, department, designation, status, created_at")
      .eq("manager_id", id)
      .eq("status", "active")
      .order("name");

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getManagerEmployees,
};
