// ============================================================
// Follow-Up Controller - Lead follow-up management
// ============================================================
const { supabase } = require("../config/supabase");
const { logActivity } = require("../middleware/activityLogger");

/**
 * @desc    Get follow-ups for a lead
 * @route   GET /api/leads/:leadId/follow-ups
 * @access  Private (assigned employee, their manager, admin)
 */
const getFollowUps = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Verify lead access
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, assigned_to, manager_id, created_by")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    // Access check
    if (req.user.role === "employee" && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    if (req.user.role === "manager" && lead.manager_id !== req.user.id && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    let query = supabase
      .from("follow_ups")
      .select(`
        id, lead_id, employee_id, date, time, notes, status, next_follow_up, created_at,
        employee:users!follow_ups_employee_id_fkey(id, name, email)
      `, { count: "exact" })
      .eq("lead_id", leadId);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create follow-up for a lead
 * @route   POST /api/leads/:leadId/follow-ups
 * @access  Private (assigned employee, manager, admin)
 */
const createFollowUp = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { date, time, notes, status, next_follow_up } = req.body;

    // Verify lead exists
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, assigned_to, manager_id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    // Access check
    if (req.user.role === "employee" && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        lead_id: leadId,
        employee_id: req.user.id,
        date,
        time: time || null,
        notes: notes || null,
        status: status || "pending",
        next_follow_up: next_follow_up || null,
      })
      .select(`
        id, lead_id, employee_id, date, time, notes, status, next_follow_up, created_at,
        employee:users!follow_ups_employee_id_fkey(id, name, email)
      `)
      .single();

    if (error) throw error;

    logActivity({
      userId: req.user.id,
      action: "follow_up.created",
      entityType: "follow_up",
      entityId: data.id,
      details: { leadId, date },
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update follow-up
 * @route   PUT /api/follow-ups/:id
 * @access  Private (creator, manager, admin)
 */
const updateFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current follow-up
    const { data: existing } = await supabase
      .from("follow_ups")
      .select("id, employee_id, lead_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, error: "Follow-up not found" });
    }

    // Access check - only creator, their manager, or admin
    if (req.user.role === "employee" && existing.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    delete updates.id;
    delete updates.created_at;
    delete updates.lead_id;
    delete updates.employee_id;

    const { data, error } = await supabase
      .from("follow_ups")
      .update(updates)
      .eq("id", id)
      .select(`
        id, lead_id, employee_id, date, time, notes, status, next_follow_up, created_at,
        employee:users!follow_ups_employee_id_fkey(id, name, email)
      `)
      .single();

    if (error) throw error;

    logActivity({
      userId: req.user.id,
      action: "follow_up.updated",
      entityType: "follow_up",
      entityId: id,
      details: { updatedFields: Object.keys(updates) },
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete follow-up
 * @route   DELETE /api/follow-ups/:id
 * @access  Private (creator, admin)
 */
const deleteFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from("follow_ups")
      .select("id, employee_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, error: "Follow-up not found" });
    }

    if (req.user.role === "employee" && existing.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { error } = await supabase
      .from("follow_ups")
      .delete()
      .eq("id", id);

    if (error) throw error;

    logActivity({
      userId: req.user.id,
      action: "follow_up.deleted",
      entityType: "follow_up",
      entityId: id,
    });

    res.json({ success: true, message: "Follow-up deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get today's follow-ups for current user
 * @route   GET /api/follow-ups/today
 * @access  Private
 */
const getTodayFollowUps = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("follow_ups")
      .select(`
        id, lead_id, employee_id, date, time, notes, status, next_follow_up, created_at,
        employee:users!follow_ups_employee_id_fkey(id, name),
        lead:leads!follow_ups_lead_id_fkey(id, name, email, company, status)
      `)
      .eq("date", today)
      .neq("status", "cancelled");

    // Employee sees only their follow-ups
    if (req.user.role === "employee") {
      query = query.eq("employee_id", req.user.id);
    }
    // Manager sees their team's follow-ups
    if (req.user.role === "manager") {
      const { data: team } = await supabase
        .from("users")
        .select("id")
        .eq("manager_id", req.user.id);
      const teamIds = [req.user.id, ...(team?.map((u) => u.id) || [])];
      query = query.in("employee_id", teamIds);
    }
    // Admin sees all

    const { data, error } = await query.order("time");

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getTodayFollowUps,
};
