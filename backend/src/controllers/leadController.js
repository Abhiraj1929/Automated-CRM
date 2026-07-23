// ============================================================
// Lead Controller - Lead management with conversion
// ============================================================
const { supabase } = require("../config/supabase");
const { logActivity } = require("../middleware/activityLogger");
const { logAudit } = require("../services/auditService");
const { runWorkflow } = require("../services/workflowEngine");
const { scoreAndUpdateLead } = require("../services/scoringService");
const { findDuplicateLeads } = require("../services/duplicateService");

const getLeads = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("leads")
      .select("*, owner:users!leads_owner_id_fkey(id, name, email)", { count: "exact" });

    if (req.user.role === "employee") query = query.eq("owner_id", req.user.id);
    else if (req.user.role === "manager") {
      const { data: team } = await supabase.from("users").select("id").eq("manager_id", req.user.id);
      query = query.in("owner_id", [req.user.id, ...(team?.map((u) => u.id) || [])]);
    }

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) } });
  } catch (error) { next(error); }
};

const getLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("leads")
      .select("*, owner:users!leads_owner_id_fkey(id, name, email)")
      .eq("id", id).single();

    if (error || !data) return res.status(404).json({ success: false, error: "Lead not found" });

    const { data: activities } = await supabase
      .from("activities")
      .select("id, type, subject, status, due_date, created_at, owner:users!activities_owner_id_fkey(id, name)")
      .eq("who_id", id).eq("who_type", "lead")
      .order("created_at", { ascending: false }).limit(10);

    res.json({ success: true, data: { ...data, activities: activities || [] } });
  } catch (error) { next(error); }
};

const createLead = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, company, title, industry, source, annual_revenue, number_of_employees, website, description } = req.body;

    // Check for duplicates
    const { duplicates } = await findDuplicateLeads(email, first_name, last_name, company);
    if (duplicates.length > 0) {
      return res.status(200).json({ success: true, data: null, warning: "Potential duplicate found", duplicates });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({ first_name, last_name, email, phone, company, title, industry, source, annual_revenue, number_of_employees, website, description, owner_id: req.user.id, created_by: req.user.id })
      .select("*, owner:users!leads_owner_id_fkey(id, name, email)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "lead.created", entityType: "lead", entityId: data.id, details: { name: `${first_name} ${last_name}`, company } });
    logAudit({ entityType: "lead", entityId: data.id, action: "create", newValues: data, userId: req.user.id, ...req.auditInfo });
    runWorkflow("lead", "on_create", data, null).catch(() => {});
    scoreAndUpdateLead(data.id).catch(() => {});
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Get old values for audit
    const { data: oldLead } = await supabase.from("leads").select("*").eq("id", id).single();
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.created_at; delete updates.created_by;

    const { data, error } = await supabase
      .from("leads").update(updates).eq("id", id)
      .select("*, owner:users!leads_owner_id_fkey(id, name, email)")
      .single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "lead.updated", entityType: "lead", entityId: id });
    logAudit({ entityType: "lead", entityId: id, action: "update", oldValues: oldLead, newValues: data, userId: req.user.id, ...req.auditInfo });
    runWorkflow("lead", "on_update", data, oldLead).catch(() => {});
    scoreAndUpdateLead(id).catch(() => {});
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ["new", "contacted", "qualified", "unqualified", "converted"];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });

    const { data: oldLead } = await supabase.from("leads").select("*").eq("id", id).single();
    const { data, error } = await supabase
      .from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
      .select().single();

    if (error) throw error;
    logActivity({ userId: req.user.id, action: "lead.status_changed", entityType: "lead", entityId: id, details: { newStatus: status } });
    logAudit({ entityType: "lead", entityId: id, action: "update", oldValues: { status: oldLead?.status }, newValues: { status }, userId: req.user.id, ...req.auditInfo });
    runWorkflow("lead", "on_status_change", data, oldLead).catch(() => {});
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * Convert lead → Account + Contact + Opportunity
 * This is the key Salesforce-style conversion
 */
const convertLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { opportunity_name, opportunity_amount, opportunity_close_date, opportunity_stage } = req.body;

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from("leads").select("*").eq("id", id).single();

    if (leadError || !lead) return res.status(404).json({ success: false, error: "Lead not found" });
    if (lead.status === "converted") return res.status(400).json({ success: false, error: "Lead already converted" });

    // 1. Create Account
    const { data: account, error: accError } = await supabase
      .from("accounts")
      .insert({
        name: lead.company || `${lead.first_name} ${lead.last_name}'s Company`,
        industry: lead.industry,
        website: lead.website,
        phone: lead.phone,
        email: lead.email,
        annual_revenue: lead.annual_revenue,
        number_of_employees: lead.number_of_employees,
        owner_id: lead.owner_id,
        created_by: req.user.id,
      })
      .select().single();

    if (accError) throw accError;

    // 2. Create Contact
    const { data: contact, error: conError } = await supabase
      .from("contacts")
      .insert({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        title: lead.title,
        account_id: account.id,
        lead_source: lead.source,
        owner_id: lead.owner_id,
        created_by: req.user.id,
      })
      .select().single();

    if (conError) throw conError;

    // 3. Create Opportunity (optional)
    let opportunity = null;
    if (opportunity_name) {
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .insert({
          name: opportunity_name,
          account_id: account.id,
          contact_id: contact.id,
          stage: opportunity_stage || "prospecting",
          amount: opportunity_amount || 0,
          close_date: opportunity_close_date,
          owner_id: lead.owner_id,
          created_by: req.user.id,
        })
        .select().single();

      if (oppError) throw oppError;
      opportunity = opp;
    }

    // 4. Update lead as converted
    await supabase
      .from("leads")
      .update({
        status: "converted",
        converted_account_id: account.id,
        converted_contact_id: contact.id,
        converted_opportunity_id: opportunity?.id || null,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    logActivity({
      userId: req.user.id, action: "lead.converted", entityType: "lead", entityId: id,
      details: { accountId: account.id, contactId: contact.id, opportunityId: opportunity?.id },
    });

    res.json({
      success: true,
      data: { lead: { ...lead, status: "converted" }, account, contact, opportunity },
    });
  } catch (error) { next(error); }
};

const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === "employee") return res.status(403).json({ success: false, error: "Access denied" });
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
    logActivity({ userId: req.user.id, action: "lead.deleted", entityType: "lead", entityId: id });
    res.json({ success: true, message: "Lead deleted" });
  } catch (error) { next(error); }
};

module.exports = { getLeads, getLead, createLead, updateLead, updateLeadStatus, convertLead, deleteLead };
