// ============================================================
// Admin Routes — Organization management for CRM admins
// ============================================================
const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { authenticate, authorize } = require("../middleware/auth");

// All routes require admin role
router.use(authenticate);
router.use(authorize("admin"));

// Ensure admin has an organization
router.use(async (req, res, next) => {
  if (req.user.organization_id) return next();

  // Auto-create org for legacy admins
  const slug = req.user.email.split("@")[0].replace(/[^a-z0-9]/g, "-");
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: `${req.user.name}'s Organization`,
      slug,
      plan: "pro",
      status: "active",
      ai_score_quota_monthly: 500,
      ai_score_used_this_month: 0,
    })
    .select("id")
    .single();

  if (error) return next(error);

  await supabase
    .from("users")
    .update({ organization_id: org.id, updated_at: new Date().toISOString() })
    .eq("id", req.user.id);

  req.user.organization_id = org.id;
  next();
});

// ============================================================
// GET /api/admin/overview
// Organization stats, team, AI usage
// ============================================================
router.get("/overview", async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, plan, status, stripe_subscription_id, trial_ends_at, ai_score_quota_monthly, ai_score_used_this_month, credits_bonus, created_at")
      .eq("id", orgId)
      .single();

    if (!org) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    // Team members
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, role, created_at")
      .eq("organization_id", orgId);

    // Entity counts
    const [leads, accounts, contacts, opportunities, activities] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("accounts").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    ]);

    // Trial status
    const now = new Date();
    const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : 0;
    const isExpired = trialEnd && now > trialEnd;

    let payment_status;
    if (org.status === "cancelled" || org.status === "canceled") payment_status = "canceled";
    else if (org.status === "active" && org.stripe_subscription_id) payment_status = "active";
    else if (isExpired) payment_status = "expired";
    else if (daysLeft > 0) payment_status = "trialing";
    else payment_status = "expired";

    const quota = org.ai_score_quota_monthly === -1 ? Infinity : (org.ai_score_quota_monthly || 0);
    const used = org.ai_score_used_this_month || 0;

    res.json({
      success: true,
      data: {
        organization: {
          ...org,
          payment_status,
          trial_days_left: daysLeft,
          ai_credits_used: used,
          ai_credits_total: quota === Infinity ? -1 : quota,
          ai_credits_display: quota === Infinity
            ? `${used.toLocaleString()} / Unlimited`
            : `${used.toLocaleString()} / ${quota.toLocaleString()}`,
        },
        team: users || [],
        counts: {
          leads: leads.count || 0,
          accounts: accounts.count || 0,
          contacts: contacts.count || 0,
          opportunities: opportunities.count || 0,
          activities: activities.count || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/admin/analytics
// Revenue, pipeline, lead conversion, team performance
// ============================================================
router.get("/analytics", async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;

    // Opportunities by stage
    const { data: opps } = await supabase
      .from("opportunities")
      .select("id, name, value, stage, status, created_at, closed_at")
      .eq("organization_id", orgId);

    // Leads by status
    const { data: leads } = await supabase
      .from("leads")
      .select("id, status, rating, source, created_at, converted_at")
      .eq("organization_id", orgId);

    // Activities
    const { data: activities } = await supabase
      .from("activities")
      .select("id, type, status, due_date, completed_at, created_at")
      .eq("organization_id", orgId);

    // Team members
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("organization_id", orgId);

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);

    // Pipeline summary
    const pipeline = {};
    let totalPipelineValue = 0;
    let wonValue = 0;
    let lostValue = 0;
    for (const opp of (opps || [])) {
      if (!pipeline[opp.stage]) pipeline[opp.stage] = { count: 0, value: 0 };
      pipeline[opp.stage].count++;
      pipeline[opp.stage].value += opp.value || 0;
      totalPipelineValue += opp.value || 0;
      if (opp.status === "won") wonValue += opp.value || 0;
      if (opp.status === "lost") lostValue += opp.value || 0;
    }

    // Lead conversion
    const totalLeads = (leads || []).length;
    const convertedLeads = (leads || []).filter((l) => l.converted_at).length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // Leads by source
    const bySource = {};
    for (const lead of (leads || [])) {
      const src = lead.source || "unknown";
      if (!bySource[src]) bySource[src] = 0;
      bySource[src]++;
    }

    // Leads by rating
    const byRating = {};
    for (const lead of (leads || [])) {
      const rat = lead.rating || "unrated";
      if (!byRating[rat]) byRating[rat] = 0;
      byRating[rat]++;
    }

    // This month activities
    const monthActivities = (activities || []).filter((a) => a.created_at?.startsWith(thisMonth));
    const completedActivities = monthActivities.filter((a) => a.status === "completed");
    const overdueActivities = (activities || []).filter((a) => a.status !== "completed" && a.due_date && new Date(a.due_date) < now);

    // Team performance
    const teamPerformance = (users || []).map((u) => {
      const userOpps = (opps || []).filter((o) => o.assigned_to === u.id || o.created_by === u.id);
      const userLeads = (leads || []).filter((l) => l.assigned_to === u.id);
      const userActivities = (activities || []).filter((a) => a.assigned_to === u.id);
      return {
        user: u,
        opportunities: userOpps.length,
        pipeline_value: userOpps.reduce((sum, o) => sum + (o.value || 0), 0),
        leads: userLeads.length,
        activities: userActivities.length,
        completed_activities: userActivities.filter((a) => a.status === "completed").length,
      };
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const monthOpps = (opps || []).filter((o) => o.created_at?.startsWith(monthKey));
      const monthLeads = (leads || []).filter((l) => l.created_at?.startsWith(monthKey));
      monthlyTrend.push({
        month: monthKey,
        label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        opportunities: monthOpps.length,
        pipeline_value: monthOpps.reduce((sum, o) => sum + (o.value || 0), 0),
        leads: monthLeads.length,
      });
    }

    res.json({
      success: true,
      data: {
        pipeline,
        total_pipeline_value: totalPipelineValue,
        won_value: wonValue,
        lost_value: lostValue,
        leads_summary: {
          total: totalLeads,
          converted: convertedLeads,
          conversion_rate: conversionRate,
          by_source: bySource,
          by_rating: byRating,
        },
        activities_summary: {
          total_this_month: monthActivities.length,
          completed: completedActivities.length,
          overdue: overdueActivities.length,
        },
        team_performance: teamPerformance,
        monthly_trend: monthlyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/admin/activity
// Organization activity feed
// ============================================================
router.get("/activity", async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const limit = parseInt(req.query.limit) || 30;

    // Recent activities
    const { data: activities } = await supabase
      .from("activities")
      .select("id, type, subject, description, status, priority, due_date, assigned_to, created_by, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Recent opportunities changes
    const { data: recentOpps } = await supabase
      .from("opportunities")
      .select("id, name, value, stage, status, updated_at")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(10);

    // Recent leads
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("id, name, company, status, rating, updated_at")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(10);

    // Enrich with user names
    const { data: users } = await supabase
      .from("users")
      .select("id, name")
      .eq("organization_id", orgId);

    const userMap = {};
    (users || []).forEach((u) => { userMap[u.id] = u.name; });

    const enrichedActivities = (activities || []).map((a) => ({
      ...a,
      assigned_to_name: userMap[a.assigned_to] || null,
      created_by_name: userMap[a.created_by] || null,
    }));

    // Combined feed
    const feed = [
      ...enrichedActivities.map((a) => ({
        type: "activity",
        icon: a.type === "call" ? "📞" : a.type === "email" ? "📧" : a.type === "meeting" ? "📅" : "📝",
        text: `${a.subject} — ${a.type}`,
        detail: a.description || null,
        status: a.status,
        user: a.assigned_to_name || a.created_by_name || "Unknown",
        date: a.created_at,
      })),
      ...(recentOpps || []).map((o) => ({
        type: "opportunity",
        icon: "💰",
        text: `${o.name} — $${(o.value || 0).toLocaleString()}`,
        detail: `Stage: ${o.stage}`,
        status: o.status,
        date: o.updated_at,
      })),
      ...(recentLeads || []).map((l) => ({
        type: "lead",
        icon: "👤",
        text: `${l.name} — ${l.company || "N/A"}`,
        detail: `Status: ${l.status}`,
        status: l.rating,
        date: l.updated_at,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

    res.json({ success: true, data: feed });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GET /api/admin/users
// Team members list
// ============================================================
router.get("/users", async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;

    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, role, is_active, last_login, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    res.json({ success: true, data: users || [] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
