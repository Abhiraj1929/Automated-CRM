// ============================================================
// Account Controller - Company/Organization management
// ============================================================
const { supabase } = require("../config/supabase");
const { logActivity } = require("../middleware/activityLogger");
const { runWorkflow } = require("../services/workflowEngine");

/**
 * Get all accounts with RBAC
 */
const getAccounts = async (req, res, next) => {
  try {
    const { industry, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("accounts")
      .select("*, owner:users!accounts_owner_id_fkey(id, name, email)", { count: "exact" });

    // RBAC
    if (req.user.role === "employee") {
      query = query.eq("owner_id", req.user.id);
    } else if (req.user.role === "manager") {
      const { data: team } = await supabase.from("users").select("id").eq("manager_id", req.user.id);
      const teamIds = [req.user.id, ...(team?.map((u) => u.id) || [])];
      query = query.in("owner_id", teamIds);
    }

    if (industry) query = query.eq("industry", industry);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,industry.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};

/**
 * Get single account with contacts and opportunities
 */
const getAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: account, error } = await supabase
      .from("accounts")
      .select("*, owner:users!accounts_owner_id_fkey(id, name, email)")
      .eq("id", id)
      .single();

    if (error || !account) return res.status(404).json({ success: false, error: "Account not found" });

    // Get associated contacts
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, title, department")
      .eq("account_id", id);

    // Get associated opportunities
    const { data: opportunities } = await supabase
      .from("opportunities")
      .select("id, name, stage, amount, probability, close_date")
      .eq("account_id", id)
      .order("amount", { ascending: false });

    // Get recent activities
    const { data: activities } = await supabase
      .from("activities")
      .select("id, type, subject, status, due_date, created_at")
      .eq("what_id", id)
      .eq("what_type", "account")
      .order("created_at", { ascending: false })
      .limit(10);

    res.json({
      success: true,
      data: { ...account, contacts: contacts || [], opportunities: opportunities || [], activities: activities || [] },
    });
  } catch (error) { next(error); }
};

/**
 * Create account
 */
const createAccount = async (req, res, next) => {
  try {
    const { name, industry, website, phone, email, billing_address, shipping_address, city, state, country, postal_code, annual_revenue, number_of_employees, description } = req.body;

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        name, industry, website, phone, email,
        billing_address, shipping_address, city, state, country, postal_code,
        annual_revenue, number_of_employees, description,
        owner_id: req.user.id, created_by: req.user.id,
      })
      .select("*, owner:users!accounts_owner_id_fkey(id, name, email)")
      .single();

    if (error) throw error;

    logActivity({ userId: req.user.id, action: "account.created", entityType: "account", entityId: data.id, details: { name } });
    runWorkflow("account", "on_create", data, null, req.user.organization_id).catch(() => {});
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * Update account
 */
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.created_at; delete updates.created_by;

    const { data, error } = await supabase
      .from("accounts")
      .update(updates)
      .eq("id", id)
      .select("*, owner:users!accounts_owner_id_fkey(id, name, email)")
      .single();

    if (error) throw error;

    logActivity({ userId: req.user.id, action: "account.updated", entityType: "account", entityId: id, details: { updatedFields: Object.keys(updates) } });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * Delete account (Admin/Manager only)
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === "employee") return res.status(403).json({ success: false, error: "Access denied" });

    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) throw error;

    logActivity({ userId: req.user.id, action: "account.deleted", entityType: "account", entityId: id });
    res.json({ success: true, message: "Account deleted" });
  } catch (error) { next(error); }
};

module.exports = { getAccounts, getAccount, createAccount, updateAccount, deleteAccount };
