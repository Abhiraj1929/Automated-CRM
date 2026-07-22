// ============================================================
// Deal Controller - Handles deal/pipeline operations
// ============================================================
const { supabase } = require("../config/supabase");

/**
 * @desc    Get all deals
 * @route   GET /api/deals
 * @access  Private
 */
const getDeals = async (req, res, next) => {
  try {
    const { stage, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .neq("status", "lost"); // Exclude lost deals by default

    if (stage) {
      query = query.eq("status", stage);
    }

    const { data, error, count } = await query
      .order("amount", { ascending: false })
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
 * @desc    Update deal stage
 * @route   PATCH /api/deals/:id/stage
 * @access  Private
 */
const updateDealStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const validStages = ["new", "contacted", "proposal_sent", "won", "lost"];
    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stage. Must be one of: ${validStages.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("leads")
      .update({
        status: stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pipeline statistics
 * @route   GET /api/deals/stats
 * @access  Private
 */
const getPipelineStats = async (req, res, next) => {
  try {
    const { data: leads, error } = await supabase
      .from("leads")
      .select("status, amount");

    if (error) throw error;

    // Calculate stats per stage
    const stats = {
      new: { count: 0, value: 0 },
      contacted: { count: 0, value: 0 },
      proposal_sent: { count: 0, value: 0 },
      won: { count: 0, value: 0 },
      lost: { count: 0, value: 0 },
    };

    leads.forEach((lead) => {
      if (stats[lead.status]) {
        stats[lead.status].count += 1;
        stats[lead.status].value += lead.amount || 0;
      }
    });

    // Calculate totals
    const totalValue = Object.values(stats).reduce((sum, s) => sum + s.value, 0);
    const totalActive = Object.entries(stats)
      .filter(([key]) => key !== "lost")
      .reduce((sum, [, s]) => sum + s.count, 0);

    res.json({
      success: true,
      data: {
        stages: stats,
        totalValue,
        totalActive,
        winRate: stats.won.count / (stats.won.count + stats.lost.count) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeals,
  updateDealStage,
  getPipelineStats,
};
