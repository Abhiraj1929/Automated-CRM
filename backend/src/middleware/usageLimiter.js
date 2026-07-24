// ============================================================
// Usage Limiter Middleware — AI quota guard
// ============================================================
const { supabase } = require("../config/supabase");
const { logger } = require("./logger");

const UNLIMITED_QUOTAS = new Set(["enterprise"]);

/**
 * Middleware that checks the organization's remaining AI scoring quota
 * before allowing calls to /predict-score and /batch-score.
 *
 * Requires `req.user` to be populated (must run after auth middleware).
 */
async function aiQuotaGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const orgId = req.user.organization_id;
    if (!orgId) {
      // No organization = legacy user, allow but warn
      logger.warn("AI scoring called by user without organization", { userId: req.user.id });
      return next();
    }

    // Fetch org plan + usage
    const { data: org, error } = await supabase
      .from("organizations")
      .select("plan, ai_score_quota_monthly, ai_score_used_this_month, status")
      .eq("id", orgId)
      .single();

    if (error || !org) {
      logger.error("Could not fetch organization for quota check", { orgId, error: error?.message });
      return next(); // Fail open — allow the request
    }

    if (org.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Organization subscription is inactive. Please update your billing.",
      });
    }

    const quota = org.ai_score_quota_monthly;
    const used = org.ai_score_used_this_month || 0;

    // Enterprise = unlimited
    if (UNLIMITED_QUOTAS.has(org.plan) || quota === -1) {
      return next();
    }

    if (used >= quota) {
      logger.warn("AI quota exceeded", { orgId, plan: org.plan, used, quota });
      return res.status(429).json({
        success: false,
        error: `AI scoring quota reached (${used}/${quota} this month). Upgrade your plan for more.`,
        quota: { used, total: quota, plan: org.plan },
      });
    }

    // Attach quota info for downstream use
    req.aiQuota = { used, total: quota, remaining: quota - used, plan: org.plan };
    next();
  } catch (err) {
    logger.error("AI quota guard error", { error: err.message });
    next(); // Fail open
  }
}

module.exports = { aiQuotaGuard };
