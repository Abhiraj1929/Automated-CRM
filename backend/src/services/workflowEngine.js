const { supabase } = require("../config/supabase");

// Evaluate a single condition against an entity
const evaluateCondition = (entity, condition) => {
  const { field, operator, value } = condition;
  const fieldValue = entity[field];
  switch (operator) {
    case "equals": return String(fieldValue) === String(value);
    case "not_equals": return String(fieldValue) !== String(value);
    case "contains": return String(fieldValue || "").toLowerCase().includes(String(value).toLowerCase());
    case "not_empty": return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
    case "empty": return fieldValue === null || fieldValue === undefined || fieldValue === "";
    case "greater_than": return Number(fieldValue) > Number(value);
    case "less_than": return Number(fieldValue) < Number(value);
    case "in_list": return Array.isArray(value) ? value.includes(fieldValue) : String(value).split(",").map((s) => s.trim()).includes(fieldValue);
    case "changed": return true; // Handled by comparing old/new
    default: return false;
  }
};

// Evaluate all conditions for a rule
const evaluateConditions = (entity, conditions) => {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => {
    if (c.logic === "or") return conditions.filter((x) => x.logic !== "or").some((x) => evaluateCondition(entity, x));
    return evaluateCondition(entity, c);
  });
};

// Execute a single action
const executeAction = async (action, entity, entityType) => {
  try {
    switch (action.type) {
      case "update_field":
        await supabase.from(entityType + "s").update({ [action.field]: action.value }).eq("id", entity.id);
        break;
      case "create_task":
        await supabase.from("activities").insert({
          type: "task", subject: action.subject || "Auto-created task",
          description: action.description || "", priority: action.priority || "normal",
          status: "open", due_date: action.due_date || null,
          who_id: entityType === "lead" ? entity.id : null, who_type: entityType === "lead" ? "lead" : null,
          what_id: entityType === "opportunity" ? entity.id : null, what_type: entityType === "opportunity" ? "opportunity" : null,
          owner_id: action.assign_to || entity.owner_id,
        });
        break;
      case "create_notification":
        await supabase.from("notifications").insert({
          user_id: action.user_id || entity.owner_id,
          title: action.title || "Workflow Notification",
          message: action.message || `Rule triggered on ${entityType}`,
          type: action.notification_type || "info",
          entity_type: entityType, entity_id: entity.id,
        });
        break;
      case "send_email":
        await supabase.from("email_logs").insert({
          to_email: action.to_email || entity.email,
          subject: action.subject || `Notification: ${entityType} update`,
          body: action.body || `Record ${entity.id} was updated`,
          to_entity_type: entityType, to_entity_id: entity.id,
          status: "sent",
        });
        break;
      case "assign_owner":
        if (action.owner_id) await supabase.from(entityType + "s").update({ owner_id: action.owner_id }).eq("id", entity.id);
        break;
      default: break;
    }
    return { success: true, action: action.type };
  } catch (err) { return { success: false, action: action.type, error: err.message }; }
};

// Main workflow engine - run all matching rules for an entity event
const runWorkflow = async (entityType, triggerEvent, entity, oldEntity) => {
  try {
    const { data: rules } = await supabase.from("workflow_rules").select("*").eq("is_active", true).eq("entity_type", entityType);
    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      // Check trigger matches
      if (rule.trigger_event !== triggerEvent && rule.trigger_event !== "on_field_change") continue;

      // For on_field_change, check if any condition field changed
      if (rule.trigger_event === "on_field_change" && triggerEvent === "on_update" && oldEntity) {
        const conditionFields = (rule.conditions || []).map((c) => c.field);
        const anyChanged = conditionFields.some((f) => JSON.stringify(oldEntity[f]) !== JSON.stringify(entity[f]));
        if (!anyChanged) continue;
      }

      // Evaluate conditions
      const met = evaluateConditions(entity, rule.conditions || []);
      if (!met) continue;

      // Execute actions
      const results = [];
      for (const action of rule.actions || []) {
        const result = await executeAction(action, entity, entityType);
        results.push(result);
      }

      // Log execution
      await supabase.from("workflow_logs").insert({
        rule_id: rule.id, entity_type: entityType, entity_id: entity.id,
        trigger_event: triggerEvent, conditions_met: true,
        actions_executed: results, status: "success",
      });

      // Update rule stats
      await supabase.from("workflow_rules").update({ last_run_at: new Date().toISOString(), run_count: (rule.run_count || 0) + 1 }).eq("id", rule.id);
    }
  } catch (err) { console.error("Workflow engine error:", err.message); }
};

const getWorkflowRules = async (req, res, next) => {
  try {
    const { entity_type } = req.query;
    let query = supabase.from("workflow_rules").select("*").order("created_at", { ascending: false });
    if (entity_type) query = query.eq("entity_type", entity_type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createWorkflowRule = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("workflow_rules").insert({ ...req.body, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateWorkflowRule = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("workflow_rules").update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteWorkflowRule = async (req, res, next) => {
  try {
    const { error } = await supabase.from("workflow_rules").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { next(error); }
};

const getWorkflowLogs = async (req, res, next) => {
  try {
    const { rule_id, entity_type, page = 1, limit = 50 } = req.query;
    let query = supabase.from("workflow_logs").select("*, rule:workflow_rules!workflow_logs_rule_id_fkey(name)", { count: "exact" });
    if (rule_id) query = query.eq("rule_id", rule_id);
    if (entity_type) query = query.eq("entity_type", entity_type);
    query = query.order("executed_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total: count || 0 } });
  } catch (error) { next(error); }
};

module.exports = { runWorkflow, getWorkflowRules, createWorkflowRule, updateWorkflowRule, deleteWorkflowRule, getWorkflowLogs };
