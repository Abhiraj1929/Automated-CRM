// ============================================================
// Dashboard Controller - Aggregated statistics and analytics
// ============================================================
const { supabase } = require("../config/supabase");

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // Fetch all leads for aggregation
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, status, amount, lead_score, score_category, created_at");

    if (error) throw error;

    // Calculate statistics
    const totalLeads = leads?.length || 0;
    const totalRevenue = leads
      ?.filter((l) => l.status === "won")
      .reduce((sum, l) => sum + (l.amount || 0), 0) || 0;

    const leadsByStatus = {};
    leads?.forEach((lead) => {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
    });

    const leadsByScore = { high: 0, medium: 0, low: 0 };
    leads?.forEach((lead) => {
      if (leadsByScore[lead.score_category] !== undefined) {
        leadsByScore[lead.score_category] += 1;
      }
    });

    // Calculate conversion rate (won / total)
    const conversionRate = totalLeads > 0
      ? ((leadsByStatus.won || 0) / totalLeads * 100).toFixed(1)
      : 0;

    // Average deal size
    const wonLeads = leads?.filter((l) => l.status === "won") || [];
    const avgDealSize = wonLeads.length > 0
      ? wonLeads.reduce((sum, l) => sum + (l.amount || 0), 0) / wonLeads.length
      : 0;

    // Recent activity (last 10 leads)
    const recentLeads = leads
      ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10) || [];

    res.json({
      success: true,
      data: {
        totalLeads,
        totalRevenue,
        conversionRate: parseFloat(conversionRate),
        avgDealSize: Math.round(avgDealSize),
        leadsByStatus,
        leadsByScore,
        recentLeads,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue analytics
 * @route   GET /api/dashboard/revenue
 * @access  Private
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = "monthly" } = req.query;

    const { data: leads, error } = await supabase
      .from("leads")
      .select("amount, status, created_at")
      .eq("status", "won");

    if (error) throw error;

    // Group revenue by period
    const revenueByPeriod = {};
    leads?.forEach((lead) => {
      const date = new Date(lead.created_at);
      let key;

      if (period === "daily") {
        key = date.toISOString().split("T")[0];
      } else if (period === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        // Monthly
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      revenueByPeriod[key] = (revenueByPeriod[key] || 0) + (lead.amount || 0);
    });

    res.json({
      success: true,
      data: {
        period,
        revenue: revenueByPeriod,
        total: Object.values(revenueByPeriod).reduce((sum, v) => sum + v, 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
};
