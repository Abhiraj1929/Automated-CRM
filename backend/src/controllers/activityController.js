// ============================================================
// Activity Controller - Calls, Emails, Meetings, Tasks, Notes
// ============================================================
const { supabase } = require("../config/supabase");
const { logActivity } = require("../middleware/activityLogger");
const { runWorkflow } = require("../services/workflowEngine");

const getActivities = async (req, res, next) => {
  try {
    const { type, status, who_id, what_id, what_type, owner_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("activities")
      .select("*, owner:users!activities_owner_id_fkey(id, name, email)", { count: "exact" });

    if (req.user.role === "employee") query = query.eq("owner_id", req.user.id);
    else if (req.user.role === "manager") {
      const { data: team } = await supabase.from("users").select("id").eq("manager_id", req.user.id);
      query = query.in("owner_id", [req.user.id, ...(team?.map((u) => u.id) || [])]);
    }

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);
    if (who_id) query = query.eq("who_id", who_id);
    if (what_id) query = query.eq("what_id", what_id);
    if (what_type) query = query.eq("what_type", what_type);
    if (owner_id) query = query.eq("owner_id", owner_id);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};

const getActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("activities")
      .select("*, owner:users!activities_owner_id_fkey(id, name, email)")
      .eq("id", id).single();

    if (error || !data) return res.status(404).json({ success: false, error: "Activity not found" });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createActivity = async (req, res, next) => {
  try {
    const { type, subject, description, status, priority, due_date, duration_minutes, who_id, what_id, who_type, what_type } = req.body;

    const { data, error } = await supabase
      .from("activities")
      .insert({ type, subject, description, status: status || "open", priority: priority || "normal", due_date, duration_minutes, who_id, what_id, who_type, what_type, owner_id: req.user.id, created_by: req.user.id })
      .select("*, owner:users!activities_owner_id_fkey(id, name)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "activity.created", entityType: "activity", entityId: data.id, details: { type, subject } });
    runWorkflow("activity", "on_create", data, null, req.user.organization_id).catch(() => {});
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.status === "completed") updates.completed_at = new Date().toISOString();
    delete updates.id; delete updates.created_at; delete updates.created_by;

    const { data, error } = await supabase
      .from("activities").update(updates).eq("id", id)
      .select("*, owner:users!activities_owner_id_fkey(id, name)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "activity.updated", entityType: "activity", entityId: id });
    runWorkflow("activity", "on_update", data, null, req.user.organization_id).catch(() => {});
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) throw error;
    logActivity({ userId: req.user.id, action: "activity.deleted", entityType: "activity", entityId: id });
    res.json({ success: true, message: "Activity deleted" });
  } catch (error) { next(error); }
};

const getMyTasks = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("activities")
      .select("*, owner:users!activities_owner_id_fkey(id, name)")
      .eq("owner_id", req.user.id)
      .eq("status", "open")
      .order("due_date", { ascending: true })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

module.exports = { getActivities, getActivity, createActivity, updateActivity, deleteActivity, getMyTasks };
