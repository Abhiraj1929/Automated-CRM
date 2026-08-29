// ============================================================
// Middleware: requireSuperAdmin — verifies JWT + is_super_admin flag
// ============================================================
const jwt = require("jsonwebtoken");
const { supabase } = require("../config/supabase");
const { JWT_SECRET } = require("./auth");

const requireSuperAdmin = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: err.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid token.",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, status, is_super_admin, organization_id")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, error: "User not found." });
    }

    if (user.status !== "active") {
      return res.status(403).json({ success: false, error: "Account is deactivated." });
    }

    if (!user.is_super_admin) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Super admin privileges required.",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      is_super_admin: true,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireSuperAdmin };
