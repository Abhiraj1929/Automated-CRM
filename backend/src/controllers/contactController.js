// ============================================================
// Contact Controller - People management
// ============================================================
const { supabase } = require("../config/supabase");
const { logActivity } = require("../middleware/activityLogger");

const getContacts = async (req, res, next) => {
  try {
    const { account_id, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("contacts")
      .select("*, account:accounts!contacts_account_id_fkey(id, name), owner:users!contacts_owner_id_fkey(id, name, email)", { count: "exact" });

    if (req.user.role === "employee") query = query.eq("owner_id", req.user.id);
    else if (req.user.role === "manager") {
      const { data: team } = await supabase.from("users").select("id").eq("manager_id", req.user.id);
      query = query.in("owner_id", [req.user.id, ...(team?.map((u) => u.id) || [])]);
    }

    if (account_id) query = query.eq("account_id", account_id);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};

const getContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("contacts")
      .select("*, account:accounts!contacts_account_id_fkey(id, name, industry, phone), owner:users!contacts_owner_id_fkey(id, name, email)")
      .eq("id", id).single();

    if (error || !data) return res.status(404).json({ success: false, error: "Contact not found" });

    const { data: activities } = await supabase
      .from("activities")
      .select("id, type, subject, status, due_date, created_at")
      .eq("who_id", id).eq("who_type", "contact")
      .order("created_at", { ascending: false }).limit(10);

    const { data: opportunities } = await supabase
      .from("opportunities")
      .select("id, name, stage, amount, close_date")
      .eq("contact_id", id);

    res.json({ success: true, data: { ...data, activities: activities || [], opportunities: opportunities || [] } });
  } catch (error) { next(error); }
};

const createContact = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, mobile, title, department, account_id, mailing_address, city, state, country, description, lead_source } = req.body;

    const { data, error } = await supabase
      .from("contacts")
      .insert({ first_name, last_name, email, phone, mobile, title, department, account_id, mailing_address, city, state, country, description, lead_source, owner_id: req.user.id, created_by: req.user.id })
      .select("*, account:accounts!contacts_account_id_fkey(id, name)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "contact.created", entityType: "contact", entityId: data.id, details: { name: `${first_name} ${last_name}` } });
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.created_at; delete updates.created_by;

    const { data, error } = await supabase
      .from("contacts").update(updates).eq("id", id)
      .select("*, account:accounts!contacts_account_id_fkey(id, name)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "contact.updated", entityType: "contact", entityId: id });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === "employee") return res.status(403).json({ success: false, error: "Access denied" });
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) throw error;
    logActivity({ userId: req.user.id, action: "contact.deleted", entityType: "contact", entityId: id });
    res.json({ success: true, message: "Contact deleted" });
  } catch (error) { next(error); }
};

module.exports = { getContacts, getContact, createContact, updateContact, deleteContact };
