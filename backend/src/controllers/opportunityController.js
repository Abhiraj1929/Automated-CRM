// ============================================================
// Opportunity Controller - Sales pipeline management
// ============================================================
const { supabase } = require("../config/supabase");
const { logActivity } = require("../middleware/activityLogger");
const { logAudit } = require("../services/auditService");
const { runWorkflow } = require("../services/workflowEngine");

const STAGES = ["prospecting", "qualification", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"];

const getOpportunities = async (req, res, next) => {
  try {
    const { stage, account_id, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("opportunities")
      .select("*, account:accounts!opportunities_account_id_fkey(id, name), contact:contacts!opportunities_contact_id_fkey(id, first_name, last_name, email), owner:users!opportunities_owner_id_fkey(id, name, email)", { count: "exact" });

    if (req.user.role === "employee") query = query.eq("owner_id", req.user.id);
    else if (req.user.role === "manager") {
      const { data: team } = await supabase.from("users").select("id").eq("manager_id", req.user.id);
      query = query.in("owner_id", [req.user.id, ...(team?.map((u) => u.id) || [])]);
    }

    if (stage) query = query.eq("stage", stage);
    if (account_id) query = query.eq("account_id", account_id);
    if (search) query = query.or(`name.ilike.%${search}%`);

    const { data, error, count } = await query
      .order("amount", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};

const getOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("opportunities")
      .select("*, account:accounts!opportunities_account_id_fkey(id, name, industry, phone, email), contact:contacts!opportunities_contact_id_fkey(id, first_name, last_name, email, phone, title), owner:users!opportunities_owner_id_fkey(id, name, email)")
      .eq("id", id).single();

    if (error || !data) return res.status(404).json({ success: false, error: "Opportunity not found" });

    const { data: products } = await supabase
      .from("opportunity_products")
      .select("id, quantity, unit_price, total_price, product:products(id, name, code)")
      .eq("opportunity_id", id);

    const { data: activities } = await supabase
      .from("activities")
      .select("id, type, subject, description, status, priority, due_date, completed_at, created_at, owner:users!activities_owner_id_fkey(id, name)")
      .eq("what_id", id).eq("what_type", "opportunity")
      .order("created_at", { ascending: false }).limit(20);

    res.json({ success: true, data: { ...data, products: products || [], activities: activities || [] } });
  } catch (error) { next(error); }
};

const createOpportunity = async (req, res, next) => {
  try {
    const { name, account_id, contact_id, stage, amount, probability, expected_revenue, close_date, type, lead_source, description, tags } = req.body;

    const { data, error } = await supabase
      .from("opportunities")
      .insert({ name, account_id, contact_id, stage: stage || "prospecting", amount: amount || 0, probability: probability || 0, expected_revenue, close_date, type, lead_source, description, tags, owner_id: req.user.id, created_by: req.user.id })
      .select("*, account:accounts!opportunities_account_id_fkey(id, name), contact:contacts!opportunities_contact_id_fkey(id, first_name, last_name)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "opportunity.created", entityType: "opportunity", entityId: data.id, details: { name, amount } });
    logAudit({ entityType: "opportunity", entityId: data.id, action: "create", newValues: data, userId: req.user.id, ...req.auditInfo });
    runWorkflow("opportunity", "on_create", data, null).catch(() => {});
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: oldOpp } = await supabase.from("opportunities").select("*").eq("id", id).single();
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.created_at; delete updates.created_by;

    const { data, error } = await supabase
      .from("opportunities").update(updates).eq("id", id)
      .select("*, account:accounts!opportunities_account_id_fkey(id, name), contact:contacts!opportunities_contact_id_fkey(id, first_name, last_name)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "opportunity.updated", entityType: "opportunity", entityId: id, details: { updatedFields: Object.keys(updates) } });
    logAudit({ entityType: "opportunity", entityId: id, action: "update", oldValues: oldOpp, newValues: data, userId: req.user.id, ...req.auditInfo });
    runWorkflow("opportunity", "on_update", data, oldOpp).catch(() => {});
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const updateStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    if (!STAGES.includes(stage)) return res.status(400).json({ success: false, error: "Invalid stage" });

    const { data: oldOpp } = await supabase.from("opportunities").select("*").eq("id", id).single();
    const { data, error } = await supabase
      .from("opportunities").update({ stage, updated_at: new Date().toISOString() }).eq("id", id)
      .select().single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "opportunity.stage_changed", entityType: "opportunity", entityId: id, details: { newStage: stage } });
    logAudit({ entityType: "opportunity", entityId: id, action: "update", oldValues: { stage: oldOpp?.stage }, newValues: { stage }, userId: req.user.id, ...req.auditInfo });
    runWorkflow("opportunity", "on_status_change", data, oldOpp).catch(() => {});
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteOpportunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === "employee") return res.status(403).json({ success: false, error: "Access denied" });
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) throw error;
    logActivity({ userId: req.user.id, action: "opportunity.deleted", entityType: "opportunity", entityId: id });
    res.json({ success: true, message: "Opportunity deleted" });
  } catch (error) { next(error); }
};

const getPipelineStats = async (req, res, next) => {
  try {
    let query = supabase.from("opportunities").select("stage, amount, probability");

    if (req.user.role === "employee") query = query.eq("owner_id", req.user.id);
    else if (req.user.role === "manager") {
      const { data: team } = await supabase.from("users").select("id").eq("manager_id", req.user.id);
      query = query.in("owner_id", [req.user.id, ...(team?.map((u) => u.id) || [])]);
    }

    const { data: opps, error } = await query;
    if (error) throw error;

    const stages = {};
    STAGES.forEach((s) => { stages[s] = { count: 0, value: 0 }; });
    opps?.forEach((o) => {
      if (stages[o.stage]) {
        stages[o.stage].count += 1;
        stages[o.stage].value += o.amount || 0;
      }
    });

    const totalValue = opps?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
    const weightedValue = opps?.reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 0) / 100), 0) || 0;
    const closedWon = stages.closed_won?.value || 0;
    const closedLost = stages.closed_lost?.value || 0;
    const winRate = (closedWon + closedLost) > 0 ? (closedWon / (closedWon + closedLost) * 100).toFixed(1) : 0;

    res.json({ success: true, data: { stages, totalValue, weightedValue, winRate: +winRate, totalOpps: opps?.length || 0 } });
  } catch (error) { next(error); }
};

module.exports = { getOpportunities, getOpportunity, createOpportunity, updateOpportunity, updateStage, deleteOpportunity, getPipelineStats };
