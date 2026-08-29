// ============================================================
// Auth Middleware - JWT Verification, Role Authorization & RLS
// ============================================================
const jwt = require("jsonwebtoken");
const { supabase } = require("../config/supabase");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

/**
 * Middleware: Verify JWT token from cookie or Authorization header
 * Attaches req.user with { id, email, role, organization_id }
 * Sets PostgreSQL session variables for RLS enforcement.
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please log in.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database to verify still exists and get current role
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, status, manager_id, is_super_admin, organization_id")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "User not found. Please log in again.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated. Contact administrator.",
      });
    }

    // Check token blacklist (Redis) if available
    const { isTokenBlacklisted } = require("../config/redis");
    if (isTokenBlacklisted) {
      const blacklisted = await isTokenBlacklisted(token);
      if (blacklisted) {
        return res.status(401).json({
          success: false,
          error: "Session revoked. Please log in again.",
        });
      }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.manager_id,
      is_super_admin: user.is_super_admin || false,
      organization_id: user.organization_id || null,
    };

    // Set PostgreSQL session variables for RLS enforcement
    // Uses Supabase RPC to set session variables within the current transaction
    if (user.organization_id) {
      try {
        await supabase.rpc("set_config", {
          setting_name: "app.current_organization_id",
          setting_value: user.organization_id,
          is_local: true,
        });
      } catch {
        // RPC may not exist yet — fall through to direct query approach
      }
      try {
        await supabase.rpc("set_config", {
          setting_name: "app.current_user_id",
          setting_value: user.id,
          is_local: true,
        });
      } catch {
        // Fall through
      }
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Session expired. Please log in again.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please log in again.",
      });
    }
    next(error);
  }
};

/**
 * Middleware: Authorize based on user roles
 * @param  {...string} allowedRoles - Roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize, JWT_SECRET };
