const { supabase } = require("../config/supabase");

// Replace template variables like {{first_name}}, {{account.name}}
const renderTemplate = (template, entity) => {
  let rendered = template;
  for (const [key, value] of Object.entries(entity)) {
    if (typeof value === "string" || typeof value === "number") {
      rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, "gi"), String(value));
    }
    if (typeof value === "object" && value !== null) {
      for (const [k2, v2] of Object.entries(value)) {
        if (typeof v2 === "string" || typeof v2 === "number") {
          rendered = rendered.replace(new RegExp(`{{\\s*${key}.${k2}\\s*}}`, "gi"), String(v2));
        }
      }
    }
  }
  return rendered;
};

// Send email (log it - in production would integrate with SMTP/SendGrid)
const sendEmail = async ({ fromUserId, toEmail, subject, body, templateId, entityType, entityId }) => {
  try {
    const { data, error } = await supabase.from("email_logs").insert({
      from_user_id: fromUserId, to_email: toEmail, subject, body,
      template_id: templateId || null, to_entity_type: entityType || null,
      to_entity_id: entityId || null, status: "sent",
    }).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) { return { success: false, error: err.message }; }
};

// Send templated email
const sendTemplatedEmail = async ({ templateId, toEmail, entityType, entityId, fromUserId, additionalVars = {} }) => {
  try {
    const { data: template } = await supabase.from("email_templates").select("*").eq("id", templateId).single();
    if (!template) return { success: false, error: "Template not found" };

    let entity = additionalVars;
    if (entityType && entityId) {
      const tableMap = { lead: "leads", contact: "contacts", account: "accounts", opportunity: "opportunities" };
      const table = tableMap[entityType];
      if (table) { const { data } = await supabase.from(table).select("*").eq("id", entityId).single(); if (data) entity = { ...data, ...additionalVars }; }
    }

    const subject = renderTemplate(template.subject, entity);
    const body = renderTemplate(template.body, entity);
    return await sendEmail({ fromUserId, toEmail, subject, body, templateId, entityType, entityId });
  } catch (err) { return { success: false, error: err.message }; }
};

// CRUD
const getEmailTemplates = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = supabase.from("email_templates").select("*").order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createEmailTemplate = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("email_templates").insert({ ...req.body, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateEmailTemplate = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("email_templates").update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteEmailTemplate = async (req, res, next) => {
  try { await supabase.from("email_templates").delete().eq("id", req.params.id); res.json({ success: true }); }
  catch (error) { next(error); }
};

const sendEmailHandler = async (req, res, next) => {
  try {
    const { template_id, to_email, entity_type, entity_id } = req.body;
    if (template_id) {
      const result = await sendTemplatedEmail({ templateId: template_id, toEmail: to_email, entityType: entity_type, entityId: entity_id, fromUserId: req.user.id });
      return res.json(result);
    }
    const { subject, body } = req.body;
    const result = await sendEmail({ fromUserId: req.user.id, toEmail: to_email, subject, body, entityType: entity_type, entityId: entity_id });
    res.json(result);
  } catch (error) { next(error); }
};

const getEmailLogs = async (req, res, next) => {
  try {
    const { entity_type, entity_id, page = 1, limit = 50 } = req.query;
    let query = supabase.from("email_logs").select("*, from_user:users!email_logs_from_user_id_fkey(name, email)", { count: "exact" });
    if (entity_type) query = query.eq("to_entity_type", entity_type);
    if (entity_id) query = query.eq("to_entity_id", entity_id);
    query = query.order("sent_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count || 0 } });
  } catch (error) { next(error); }
};

module.exports = { sendEmail, sendTemplatedEmail, getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate, sendEmailHandler, getEmailLogs };
