// ============================================================
// Super Admin Routes — Platform Owner management endpoints
// ============================================================
const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { requireSuperAdmin } = require("../middleware/requireSuperAdmin");
const { logger } = require("../middleware/logger");

// All routes require super admin
router.use(requireSuperAdmin);

// ============================================================
// GET /api/super-admin/analytics
// MRR, active clients, trial stats, AI usage
// ============================================================
router.get("/analytics", async (req, res, next) => {
  try {
    const planPrices = { starter: 19, pro: 49, enterprise: 149 };

    // All organizations
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, plan, status, stripe_subscription_id, trial_ends_at, ai_score_quota_monthly, ai_score_used_this_month, credits_bonus, created_at");

    const now = new Date();

    // MRR
    let mrr = 0;
    let activePaid = 0;
    let trialing = 0;
    let expiringSoon = 0;
    let churned = 0;
    let totalAiUsed = 0;
    let totalAiQuota = 0;

    for (const org of (orgs || [])) {
      const isPaid = org.status === "active" && (org.plan !== "starter" || org.stripe_subscription_id);
      const isTrial = org.status === "trial" || (org.trial_ends_at && new Date(org.trial_ends_at) > now);
      const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
      const daysLeft = trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : 0;

      if (isPaid && org.status === "active") {
        mrr += planPrices[org.plan] || 0;
        activePaid++;
      } else if (isTrial && trialEnd && now <= trialEnd) {
        trialing++;
        if (daysLeft <= 2) expiringSoon++;
      } else {
        churned++;
      }

      totalAiUsed += org.ai_score_used_this_month || 0;
      totalAiQuota += (org.ai_score_quota_monthly || 0) === -1 ? 0 : (org.ai_score_quota_monthly || 0);
    }

    res.json({
      success: true,
      data: {
        mrr,
        active_paid: activePaid,
        total_organizations: (orgs || []).length,
        trialing,
        expiring_soon: expiringSoon,
        churned,
        ai_usage: {
          total_used: totalAiUsed,
          total_quota: totalAiQuota,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/super-admin/organizations
// Paginated, searchable org directory
// ============================================================
router.get("/organizations", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("organizations")
      .select(`
        id, name, slug, plan, status, stripe_subscription_id,
        trial_ends_at, created_at,
        ai_score_quota_monthly, ai_score_used_this_month, credits_bonus
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: orgs, count } = await query.range(offset, offset + limit - 1);

    // For each org, get admin user info
    const enrichedOrgs = await Promise.all(
      (orgs || []).map(async (org) => {
        const { data: admin } = await supabase
          .from("users")
          .select("id, name, email, created_at")
          .eq("organization_id", org.id)
          .eq("role", "admin")
          .limit(1)
          .single();

        const now = new Date();
        const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
        const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : 0;
        const isExpired = trialEnd && now > trialEnd;

        const quota = org.ai_score_quota_monthly === -1 ? Infinity : (org.ai_score_quota_monthly || 0);
        const used = org.ai_score_used_this_month || 0;

        let payment_status;
        if (org.status === "cancelled" || org.status === "canceled") {
          payment_status = "canceled";
        } else if (org.stripe_subscription_id && org.status === "active") {
          payment_status = "paid";
        } else if (isExpired) {
          payment_status = "expired";
        } else if (daysLeft <= 2 && daysLeft > 0) {
          payment_status = "expiring";
        } else if (daysLeft > 0) {
          payment_status = "trialing";
        } else {
          payment_status = "expired";
        }

        return {
          ...org,
          admin_name: admin?.name || null,
          admin_email: admin?.email || null,
          admin_created_at: admin?.created_at || null,
          trial_days_left: daysLeft,
          payment_status,
          ai_credits_used: used,
          ai_credits_total: quota === Infinity ? -1 : quota,
          ai_credits_display: quota === Infinity
            ? `${used.toLocaleString()} / Unlimited`
            : `${used.toLocaleString()} / ${quota.toLocaleString()}`,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedOrgs,
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/super-admin/activity
// Recent platform activity feed
// ============================================================
router.get("/activity", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 30;

    const { data: events } = await supabase
      .from("platform_activity_log")
      .select("id, organization_id, event_type, event_data, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Enrich with org name
    const enriched = await Promise.all(
      (events || []).map(async (ev) => {
        let orgName = null;
        if (ev.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", ev.organization_id)
            .single();
          orgName = org?.name;
        }
        return { ...ev, organization_name: orgName };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PATCH /api/super-admin/organizations/:id/extend-trial
// ============================================================
router.patch("/organizations/:id/extend-trial", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    const extraDays = parseInt(days) || 7;

    const { data: org } = await supabase
      .from("organizations")
      .select("id, trial_ends_at")
      .eq("id", id)
      .single();

    if (!org) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    const currentEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date();
    const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + extraDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from("organizations")
      .update({
        trial_ends_at: newEnd.toISOString(),
        status: "trial",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    // Log activity
    await supabase.from("platform_activity_log").insert({
      organization_id: id,
      event_type: "trial_extended",
      event_data: { days_added: extraDays, new_end: newEnd.toISOString(), admin: req.user.email },
    });

    res.json({ success: true, data: { new_trial_ends_at: newEnd.toISOString(), days_added: extraDays } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PATCH /api/super-admin/organizations/:id/status
// ============================================================
router.patch("/organizations/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "suspended", "canceled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be: ${validStatuses.join(", ")}` });
    }

    const { error } = await supabase
      .from("organizations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    await supabase.from("platform_activity_log").insert({
      organization_id: id,
      event_type: `org_${status}`,
      event_data: { new_status: status, admin: req.user.email },
    });

    res.json({ success: true, data: { id, status } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/super-admin/organizations/:id/add-credits
// ============================================================
router.post("/organizations/:id/add-credits", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;
    const bonusCredits = parseInt(credits) || 500;

    const { data: org } = await supabase
      .from("organizations")
      .select("id, credits_bonus, ai_score_used_this_month")
      .eq("id", id)
      .single();

    if (!org) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    const newBonus = (org.credits_bonus || 0) + bonusCredits;

    const { error } = await supabase
      .from("organizations")
      .update({
        credits_bonus: newBonus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    await supabase.from("platform_activity_log").insert({
      organization_id: id,
      event_type: "credits_added",
      event_data: { credits_added: bonusCredits, total_bonus: newBonus, admin: req.user.email },
    });

    res.json({ success: true, data: { credits_added: bonusCredits, total_bonus: newBonus } });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/super-admin/organizations/:id/sync-subscription
// Sync an organization's subscription status from Stripe
// ============================================================
router.post("/organizations/:id/sync-subscription", async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    let stripeStatus = null;
    let syncData = {};

    try {
      const stripeService = require("../services/stripeService");

      if (org.stripe_subscription_id) {
        const subscription = await stripeService.getSubscription(org.stripe_subscription_id);
        stripeStatus = {
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at: subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null,
          plan: subscription.items?.data?.[0]?.price?.id || null,
        };
      } else if (org.stripe_customer_id) {
        const subscriptions = await stripeService.getSubscriptions(org.stripe_customer_id);
        if (subscriptions.length > 0) {
          const sub = subscriptions[0];
          stripeStatus = {
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at: sub.cancel_at
              ? new Date(sub.cancel_at * 1000).toISOString()
              : null,
            plan: sub.items?.data?.[0]?.price?.id || null,
          };
          // Update subscription ID if missing
          if (!org.stripe_subscription_id) {
            syncData.stripe_subscription_id = sub.id;
          }
        }
      }
    } catch (stripeErr) {
      logger.warn("Stripe sync failed (keys may not be configured):", stripeErr.message);
    }

    // Map Stripe status to our plan status
    let newStatus = org.status;
    if (stripeStatus) {
      if (stripeStatus.status === "active" || stripeStatus.status === "trialing") {
        newStatus = "active";
      } else if (stripeStatus.status === "past_due") {
        newStatus = "active"; // still allow access
      } else if (stripeStatus.status === "canceled" || stripeStatus.status === "unpaid") {
        newStatus = "cancelled";
      } else if (stripeStatus.status === "trialing") {
        newStatus = "trial";
      }
    }

    syncData.status = newStatus;
    syncData.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("organizations")
      .update(syncData)
      .eq("id", id);

    if (updateErr) throw updateErr;

    await supabase.from("platform_activity_log").insert({
      organization_id: id,
      event_type: "subscription_synced",
      event_data: {
        admin: req.user.email,
        stripe_status: stripeStatus?.status || "no_stripe_data",
        previous_status: org.status,
        new_status: newStatus,
      },
    });

    res.json({
      success: true,
      data: {
        organization: { id, name: org.name },
        stripe: stripeStatus,
        previous_status: org.status,
        new_status: newStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
