const { supabase } = require("../config/supabase");

// Apply scoring rules to a lead
const scoreLead = async (lead) => {
  try {
    const { data: rules } = await supabase.from("scoring_rules").select("*").eq("is_active", true);
    if (!rules || rules.length === 0) return { score: 0, category: "low", breakdown: [] };

    let totalScore = 0;
    const breakdown = [];

    for (const rule of rules) {
      let matched = false;
      const fieldValue = lead[rule.field];

      switch (rule.condition) {
        case "equals": matched = String(fieldValue) === rule.value; break;
        case "not_empty": matched = fieldValue !== null && fieldValue !== undefined && fieldValue !== ""; break;
        case "empty": matched = fieldValue === null || fieldValue === undefined || fieldValue === ""; break;
        case "contains": matched = String(fieldValue || "").toLowerCase().includes(rule.value.toLowerCase()); break;
        case "greater_than": matched = Number(fieldValue) > Number(rule.value); break;
        case "less_than": matched = Number(fieldValue) < Number(rule.value); break;
        case "in_list": matched = rule.value.split(",").map((s) => s.trim()).includes(String(fieldValue)); break;
      }

      if (matched) {
        totalScore += rule.score;
        breakdown.push({ rule: rule.name, field: rule.field, condition: rule.condition, value: rule.value, score: rule.score });
      }
    }

    totalScore = Math.min(100, totalScore);
    let category = "low";
    if (totalScore >= 60) category = "high";
    else if (totalScore >= 30) category = "medium";

    return { score: totalScore, category, breakdown };
  } catch (err) { return { score: 0, category: "low", breakdown: [], error: err.message }; }
};

// Re-score all leads
const rescoreAllLeads = async () => {
  try {
    const { data: leads } = await supabase.from("leads").select("*").neq("status", "converted");
    if (!leads) return { processed: 0 };

    let processed = 0;
    for (const lead of leads) {
      const result = await scoreLead(lead);
      await supabase.from("leads").update({ lead_score: result.score, score_category: result.category }).eq("id", lead.id);
      processed++;
    }
    return { processed };
  } catch (err) { return { processed: 0, error: err.message }; }
};

// Score a single lead and update it
const scoreAndUpdateLead = async (leadId) => {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead) return null;
  const result = await scoreLead(lead);
  const { data: updated } = await supabase.from("leads").update({ lead_score: result.score, score_category: result.category }).eq("id", leadId).select().single();
  return updated;
};

// ============================================================
// Score Decay — reduce scores over time without engagement
// ============================================================
const applyScoreDecay = async () => {
  try {
    const DECAY_RATE = 5; // points per decay cycle
    const DECAY_AFTER_DAYS = 30; // start decaying after 30 days of no activity

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DECAY_AFTER_DAYS);

    const { data: staleLeads } = await supabase
      .from("leads")
      .select("id, lead_score, last_activity_at")
      .neq("status", "converted")
      .lt("last_activity_at", cutoffDate.toISOString())
      .gt("lead_score", 0);

    if (!staleLeads || staleLeads.length === 0) return { decayed: 0 };

    let decayed = 0;
    for (const lead of staleLeads) {
      const newScore = Math.max(0, (lead.lead_score || 0) - DECAY_RATE);
      let category = "low";
      if (newScore >= 60) category = "high";
      else if (newScore >= 30) category = "medium";

      await supabase
        .from("leads")
        .update({ lead_score: newScore, score_category: category })
        .eq("id", lead.id);

      decayed++;
    }

    return { decayed };
  } catch (err) {
    return { decayed: 0, error: err.message };
  }
};

// Get scoring rules
const getScoringRules = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scoring_rules").select("*").order("score", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createScoringRule = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scoring_rules").insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateScoringRule = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("scoring_rules").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteScoringRule = async (req, res, next) => {
  try {
    const { error } = await supabase.from("scoring_rules").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { next(error); }
};

const rescoreAll = async (req, res, next) => {
  try { const result = await rescoreAllLeads(); res.json({ success: true, data: result }); }
  catch (error) { next(error); }
};

module.exports = { scoreLead, scoreAndUpdateLead, rescoreAllLeads, applyScoreDecay, getScoringRules, createScoringRule, updateScoringRule, deleteScoringRule, rescoreAll };
