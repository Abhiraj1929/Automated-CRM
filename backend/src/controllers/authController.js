// ============================================================
// Auth Controller - Login, Register, Logout, Session Management
// ============================================================
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../config/supabase");
const { JWT_SECRET } = require("../middleware/auth");
const { logActivity } = require("../middleware/activityLogger");
const { blacklistToken } = require("../config/redis");

const TOKEN_EXPIRY = process.env.SESSION_TIMEOUT || "24h";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Generate JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Check if user is active — block pending (unpaid) and inactive users
    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        error: "Your account is awaiting payment confirmation. Please complete your subscription to activate.",
        code: "PENDING_PAYMENT",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated. Contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Check if user's organization is pending payment
    if (user.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("status")
        .eq("id", user.organization_id)
        .single();

      if (org && org.status === "pending") {
        return res.status(403).json({
          success: false,
          error: "Your workspace is awaiting payment. Please complete your subscription to activate.",
          code: "PENDING_PAYMENT",
        });
      }
    }

    // Generate tokens
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Update last login
    await supabase
      .from("users")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", user.id);

    // Log activity
    logActivity({
      userId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
    });

    // Set secure cookie — matches JWT expiry
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    };

    res.cookie("token", token, cookieOptions);
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (refresh token lasts longer)
    });

    // Return user info (without password)
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register new user (Admin only)
 * @route   POST /api/auth/register
 * @access  Private (Admin)
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, manager_id, phone, department, designation } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error } = await supabase
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

    // Log activity
    logActivity({
      userId: req.user?.id || user.id,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      details: { role: user.role, email: user.email },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, manager_id, phone, department, designation, status, profile_image, is_super_admin, organization_id, created_at, updated_at")
      .eq("id", req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // If user has a manager_id, fetch manager info
    let manager = null;
    if (user.manager_id) {
      const { data: managerData } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("id", user.manager_id)
        .single();
      manager = managerData;
    }

    res.json({
      success: true,
      data: { ...user, manager },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (clear cookies)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    // Blacklist current token (requires Redis)
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await blacklistToken(token);
    }

    // Log activity
    logActivity({
      userId: req.user.id,
      action: "auth.logout",
      entityType: "user",
      entityId: req.user.id,
    });

    // Clear cookies
    res.cookie("token", "", { maxAge: 0, path: "/" });
    res.cookie("refreshToken", "", { maxAge: 0, path: "/" });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh
 * @access  Public (with refresh token)
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Refresh token required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }

    // Verify user still exists and is active
    const { data: user } = await supabase
      .from("users")
      .select("id, role, status")
      .eq("id", decoded.userId)
      .single();

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        error: "User not found or deactivated",
      });
    }

    // Generate new tokens
    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };

    res.cookie("token", newToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: { token: newToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token. Please log in again.",
      });
    }
    next(error);
  }
};

/**
 * @desc    Public self-serve signup (creates PENDING organization + user)
 *          User cannot log in until payment is confirmed via webhook.
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, status, organization_id, name, email")
      .eq("email", email)
      .single();

    // If user exists and is active — check if their org is still pending (incomplete payment)
    if (existingUser && existingUser.status === "active" && existingUser.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, status, plan")
        .eq("id", existingUser.organization_id)
        .single();

      if (org && org.status === "pending") {
        // User signed up but never completed payment — allow resume
        logActivity({
          userId: existingUser.id,
          action: "user.signup_resume_pending_payment",
          entityType: "user",
          entityId: existingUser.id,
          details: { email, organization_id: org.id },
        });

        return res.status(200).json({
          success: true,
          data: {
            user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, status: "active" },
            organization: { id: org.id, name: org.name, status: org.status, plan: org.plan },
            resumePayment: true,
            message: "Your account exists but payment is incomplete. Redirecting to checkout...",
          },
        });
      }

      // User is active and org is active — truly already registered
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists. Please log in.",
      });
    }

    // If user exists but is pending (legacy path), allow re-creation
    if (existingUser && existingUser.status === "pending") {
      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);

      await supabase
        .from("users")
        .update({ name, password_hash, updated_at: new Date().toISOString() })
        .eq("id", existingUser.id);

      // Find their pending org
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", (await supabase.from("users").select("organization_id").eq("id", existingUser.id).single()).data?.organization_id)
        .single();

      logActivity({
        userId: existingUser.id,
        action: "user.signup_resumed",
        entityType: "user",
        entityId: existingUser.id,
        details: { email, organization_id: org?.id },
      });

      return res.status(200).json({
        success: true,
        data: {
          user: { id: existingUser.id, email, name, status: "pending" },
          organization: org ? { id: org.id } : null,
          message: "Account ready for payment. Redirecting to checkout...",
        },
      });
    }

    // Create PENDING organization
    const slug = (companyName || email.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: companyName || `${name}'s Workspace`,
        slug: `${slug}-${Date.now()}`,
        plan: "pro",
        status: "pending",
        ai_score_quota_monthly: 500,
        ai_score_used_this_month: 0,
        billing_cycle: "monthly",
      })
      .select("id, name")
      .single();

    if (orgErr) throw orgErr;

    // Hash password and create user (status: active, but org is pending)
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password_hash,
        role: "admin",
        organization_id: org.id,
        status: "active",
      })
      .select("id, name, email, role, organization_id, status, created_at")
      .single();

    if (error) throw error;

    // NO JWT tokens issued — user must pay first
    logActivity({
      userId: user.id,
      action: "user.signup_pending",
      entityType: "user",
      entityId: user.id,
      details: { role: user.role, email: user.email, organization_id: org.id },
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, status: "pending" },
        organization: { id: org.id, name: org.name },
        message: "Account created. Complete payment to activate your workspace.",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, signup, getMe, logout, refreshToken };
