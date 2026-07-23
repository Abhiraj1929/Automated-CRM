// ============================================================
// Dashboard Controller - Business analytics
// ============================================================
const { supabase } = require("../config/supabase");

const getDashboardStats = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";
    const isManager = req.user.role === "manager";

    // Build RBAC filter
    let ownerFilter = null;
    if (req.user.role === "employee") ownerFilter = req.user.id;
    else if (isManager) {
      const { data: team } = await supabase.from("users").select("id").eq("manager_id", req.user.id);
      ownerFilter = [req.user.id, ...(team?.map((u) => u.id) || [])];
    }

    // Accounts
    let accQuery = supabase.from("accounts").select("id, industry, annual_revenue", { count: "exact" });
    if (ownerFilter) accQuery = Array.isArray(ownerFilter) ? accQuery.in("owner_id", ownerFilter) : accQuery.eq("owner_id", ownerFilter);
    const { data: accounts, count: totalAccounts } = await accQuery;

    // Contacts
    let conQuery = supabase.from("contacts").select("id", { count: "exact" });
    if (ownerFilter) conQuery = Array.isArray(ownerFilter) ? conQuery.in("owner_id", ownerFilter) : conQuery.eq("owner_id", ownerFilter);
    const { count: totalContacts } = await conQuery;

    // Leads
    let leadQuery = supabase.from("leads").select("id, status, lead_score, score_category, created_at", { count: "exact" });
    if (ownerFilter) leadQuery = Array.isArray(ownerFilter) ? leadQuery.in("owner_id", ownerFilter) : leadQuery.eq("owner_id", ownerFilter);
    const { data: leads, count: totalLeads } = await leadQuery;

    // Opportunities
    let oppQuery = supabase.from("opportunities").select("id, stage, amount, probability, close_date, created_at", { count: "exact" });
    if (ownerFilter) oppQuery = Array.isArray(ownerFilter) ? oppQuery.in("owner_id", ownerFilter) : oppQuery.eq("owner_id", ownerFilter);
    const { data: opps, count: totalOpps } = await oppQuery;

    // Activities
    let actQuery = supabase.from("activities").select("id, type, status, due_date, created_at", { count: "exact" });
    if (ownerFilter) actQuery = Array.isArray(ownerFilter) ? actQuery.in("owner_id", ownerFilter) : actQuery.eq("owner_id", ownerFilter);
    const { data: activities, count: totalActivities } = await actQuery;

    // Calculate metrics
    const leadsByStatus = {};
    leads?.forEach((l) => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1; });

    const oppsByStage = {};
    opps?.forEach((o) => { oppsByStage[o.stage] = (oppsByStage[o.stage] || 0) + 1; });

    const totalPipelineValue = opps?.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
    const totalWonValue = opps?.filter((o) => o.stage === "closed_won").reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
    const totalLostValue = opps?.filter((o) => o.stage === "closed_lost").reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
    const weightedValue = opps?.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 0) / 100), 0) || 0;
    const winRate = (totalWonValue + totalLostValue) > 0 ? ((totalWonValue / (totalWonValue + totalLostValue)) * 100).toFixed(1) : 0;

    // Activities by type
    const actsByType = {};
    activities?.forEach((a) => { actsByType[a.type] = (actsByType[a.type] || 0) + 1; });

    // Overdue tasks
    const overdueTasks = activities?.filter((a) => a.type === "task" && a.status === "open" && a.due_date && new Date(a.due_date) < new Date()).length || 0;

    // Hot leads
    const hotLeads = leads?.filter((l) => l.score_category === "high").length || 0;

    // Accounts by industry
    const accountsByIndustry = {};
    accounts?.forEach((a) => { accountsByIndustry[a.industry || "Other"] = (accountsByIndustry[a.industry || "Other"] || 0) + 1; });

    // Revenue (from won opportunities)
    const revenueByMonth = {};
    opps?.filter((o) => o.stage === "closed_won").forEach((o) => {
      const key = o.close_date ? o.close_date.substring(0, 7) : "unknown";
      revenueByMonth[key] = (revenueByMonth[key] || 0) + (o.amount || 0);
    });

    // Team performance (admin/manager only)
    let teamPerformance = [];
    if (isAdmin || isManager) {
      let userQuery = supabase.from("users").select("id, name").eq("status", "active");
      if (isManager) userQuery = userQuery.eq("manager_id", req.user.id);
      else userQuery = userQuery.neq("role", "admin");

      const { data: users } = await userQuery;
      teamPerformance = (users || []).map((user) => {
        const userOpps = opps?.filter((o) => o.owner_id === user.id) || [];
        return {
          userId: user.id, name: user.name,
          totalOpps: userOpps.length,
          wonOpps: userOpps.filter((o) => o.stage === "closed_won").length,
          revenue: userOpps.filter((o) => o.stage === "closed_won").reduce((s, o) => s + (o.amount || 0), 0),
          pipeline: userOpps.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).reduce((s, o) => s + (o.amount || 0), 0),
        };
      });
    }

    res.json({
      success: true,
      data: {
        totalAccounts, totalContacts, totalLeads, totalOpps, totalActivities,
        totalPipelineValue, totalWonValue, weightedValue, winRate: +winRate,
        leadsByStatus, oppsByStage, actsByType, accountsByIndustry, revenueByMonth,
        overdueTasks, hotLeads, teamPerformance,
      },
    });
  } catch (error) { next(error); }
};

module.exports = { getDashboardStats };
