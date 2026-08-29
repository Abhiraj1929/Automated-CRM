// ============================================================
// Middleware: checkTrialStatus — blocks ML scoring if trial expired
// ============================================================
const { supabase } = require("../config/supabase");
const { logger } = require("./logger");

const checkTrialStatus = async (req, res, next) => {
  try {
    const orgId = req.user?.organization_id;
    if (!orgId) return next();

    const { data: org } = await supabase
      .from("organizations")
      .select("status, subscription_status, trial_ends_at, plan")
      .eq("id", orgId)
      .single();

    if (!org) return next();

    const now = new Date();
    const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;

    // If explicitly canceled or expired
    if (org.subscription_status === "canceled") {
      return res.status(402).json({
        success: false,
        error: "Your subscription has been canceled. Please upgrade to continue using AI scoring.",
        upgrade_url: "/pricing",
      });
    }

    // If trial has ended and they haven't paid
    if (
      org.subscription_status === "trialing" &&
      trialEnd &&
      now > trialEnd
    ) {
      logger.warn("Trial expired — AI scoring blocked", { orgId, trialEnd: trialEnd.toISOString() });
      return res.status(402).json({
        success: false,
        error: "Your free trial has expired. Please subscribe to continue using AI lead scoring.",
        upgrade_url: "/pricing",
        trial_expired: true,
        trial_ends_at: trialEnd.toISOString(),
      });
    }

    next();
  } catch (err) {
    logger.error("Trial check error", { error: err.message });
    next();
  }
};

module.exports = { checkTrialStatus };
