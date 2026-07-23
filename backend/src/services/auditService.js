const { supabase } = require("../config/supabase");

// Generic audit logger - call after any create/update/delete
const logAudit = async ({ entityType, entityId, action, oldValues, newValues, userId, ip, userAgent }) => {
  try {
    const changedFields = [];
    if (action === "update" && oldValues && newValues) {
      for (const key of Object.keys(newValues)) {
        if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) changedFields.push(key);
      }
    }
    await supabase.from("audit_logs").insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_values: oldValues || null,
      new_values: newValues || null,
      changed_fields: changedFields.length > 0 ? changedFields : null,
      user_id: userId || null,
      ip_address: ip || null,
      user_agent: userAgent || null,
    });
  } catch (err) { console.error("Audit log error:", err.message); }
};

// Express middleware to auto-log request info
const auditMiddleware = (req, res, next) => {
  req.auditInfo = { ip: req.ip, userAgent: req.get("user-agent") };
  next();
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { entity_type, entity_id, user_id, action, page = 1, limit = 50 } = req.query;
    let query = supabase.from("audit_logs").select("*, user:users!audit_logs_user_id_fkey(name, email)", { count: "exact" });
    if (entity_type) query = query.eq("entity_type", entity_type);
    if (entity_id) query = query.eq("entity_id", entity_id);
    if (user_id) query = query.eq("user_id", user_id);
    if (action) query = query.eq("action", action);
    query = query.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count || 0, pages: Math.ceil((count || 0) / limit) } });
  } catch (error) { next(error); }
};

module.exports = { logAudit, auditMiddleware, getAuditLogs };
