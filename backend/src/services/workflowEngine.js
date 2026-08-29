const { supabase } = require("../config/supabase");
const emailService = require("./emailService");

// ============================================================
// Condition Evaluation
// ============================================================
const evaluateCondition = (entity, condition, oldEntity) => {
  const { field, operator, value } = condition;

  // Handle "changed" operator — check if field changed between old/new
  if (operator === "changed" && oldEntity) {
    return JSON.stringify(oldEntity[field]) !== JSON.stringify(entity[field]);
  }

  const fieldValue = entity[field];

  switch (operator) {
    case "equals": return String(fieldValue).toLowerCase() === String(value).toLowerCase();
    case "not_equals": return String(fieldValue).toLowerCase() !== String(value).toLowerCase();
    case "contains": return String(fieldValue || "").toLowerCase().includes(String(value).toLowerCase());
    case "not_contains": return !String(fieldValue || "").toLowerCase().includes(String(value).toLowerCase());
    case "not_empty": return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
    case "empty": return fieldValue === null || fieldValue === undefined || fieldValue === "";
    case "greater_than": return Number(fieldValue) > Number(value);
    case "less_than": return Number(fieldValue) < Number(value);
    case "greater_equal": return Number(fieldValue) >= Number(value);
    case "less_equal": return Number(fieldValue) <= Number(value);
    case "in_list": {
      const list = Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim());
      return list.includes(String(fieldValue));
    }
    case "not_in_list": {
      const list = Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim());
      return !list.includes(String(fieldValue));
    }
    case "starts_with": return String(fieldValue || "").toLowerCase().startsWith(String(value).toLowerCase());
    case "ends_with": return String(fieldValue || "").toLowerCase().endsWith(String(value).toLowerCase());
    case "regex": {
      try { return new RegExp(value, "i").test(String(fieldValue || "")); } catch { return false; }
    }
    default: return false;
  }
};

const evaluateConditions = (entity, conditions, oldEntity) => {
  if (!conditions || conditions.length === 0) return true;

  // Group conditions by logic type
  const andConditions = conditions.filter((c) => c.logic !== "or");
  const orConditions = conditions.filter((c) => c.logic === "or");

  // All AND conditions must pass
  const andMet = andConditions.length === 0 || andConditions.every((c) => evaluateCondition(entity, c, oldEntity));

  // Any OR condition can pass
  const orMet = orConditions.length === 0 || orConditions.some((c) => evaluateCondition(entity, c, oldEntity));

  return andMet && orMet;
};

// ============================================================
// Action Execution — Real SMTP email sending
// ============================================================
const executeAction = async (action, entity, entityType, tenantId) => {
  try {
    switch (action.type) {
      case "update_field": {
        const table = entityType + "s";
        // Map entity types to actual table names
        const tableMap = { activity: "activities", task: "activities" };
        const actualTable = tableMap[entityType] || table;
        await supabase.from(actualTable).update({ [action.field]: action.value }).eq("id", entity.id);
        break;
      }

      case "create_task": {
        await supabase.from("activities").insert({
          type: "task",
          subject: action.subject || "Auto-created task",
          description: action.description || `Created by workflow on ${entityType}`,
          priority: action.priority || "normal",
          status: "open",
          due_date: action.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          who_id: entityType === "lead" ? entity.id : null,
          who_type: entityType === "lead" ? "lead" : null,
          what_id: entityType === "opportunity" ? entity.id : null,
          what_type: entityType === "opportunity" ? "opportunity" : null,
          owner_id: action.assign_to || entity.owner_id,
          organization_id: tenantId,
        });
        break;
      }

      case "create_notification": {
        await supabase.from("notifications").insert({
          user_id: action.user_id || entity.owner_id,
          title: action.title || "Workflow Notification",
          message: action.message || `Rule triggered on ${entityType} "${entity.first_name || entity.name || entity.subject || entity.id}"`,
          type: action.notification_type || "info",
          entity_type: entityType,
          entity_id: entity.id,
        });
        break;
      }

      case "send_email": {
        // Actually send SMTP email via emailService
        const toEmail = action.to_email || entity.email;
        if (toEmail) {
          const result = await emailService.sendEmail({
            to: toEmail,
            subject: action.subject || `Notification: ${entityType} update`,
            html: action.body || `<p>Record ${entity.first_name || entity.name || entity.id} was updated.</p>`,
            text: action.body?.replace(/<[^>]*>/g, "") || `Record ${entity.first_name || entity.name || entity.id} was updated.`,
          });
          // Also log to email_logs
          await supabase.from("email_logs").insert({
            to_email: toEmail,
            subject: action.subject || `Notification: ${entityType} update`,
            body: action.body || "",
            to_entity_type: entityType,
            to_entity_id: entity.id,
            status: result.success ? "sent" : "failed",
          });
        }
        break;
      }

      case "send_templated_email": {
        // Send email using a template with variable substitution
        if (action.template_id && entity.email) {
          const vars = {
            first_name: entity.first_name || "",
            last_name: entity.last_name || "",
            name: entity.first_name ? `${entity.first_name} ${entity.last_name || ""}`.trim() : entity.name || "",
            email: entity.email || "",
            company: entity.company || "",
            phone: entity.phone || "",
            source: entity.source || "",
            status: entity.status || "",
            stage: entity.stage || "",
            amount: entity.amount || "",
            subject: entity.subject || "",
          };
          const result = await emailService.sendTemplatedEmail({
            templateId: action.template_id,
            to: entity.email,
            variables: vars,
          });
          await supabase.from("email_logs").insert({
            to_email: entity.email,
            subject: `[Template] ${action.template_id}`,
            body: JSON.stringify(vars),
            template_id: action.template_id,
            to_entity_type: entityType,
            to_entity_id: entity.id,
            status: result.success ? "sent" : "failed",
          });
        }
        break;
      }

      case "assign_owner": {
        if (action.owner_id) {
          const table = entityType + "s";
          const tableMap = { activity: "activities", task: "activities" };
          const actualTable = tableMap[entityType] || table;
          await supabase.from(actualTable).update({ owner_id: action.owner_id }).eq("id", entity.id);
        }
        break;
      }

      case "change_status": {
        if (action.new_status) {
          const table = entityType + "s";
          const tableMap = { activity: "activities", task: "activities" };
          const actualTable = tableMap[entityType] || table;
          const field = entityType === "opportunity" ? "stage" : "status";
          await supabase.from(actualTable).update({ [field]: action.new_status }).eq("id", entity.id);
        }
        break;
      }

      case "add_tag": {
        if (action.tag) {
          const table = entityType + "s";
          const tableMap = { activity: "activities", task: "activities" };
          const actualTable = tableMap[entityType] || table;
          const { data: current } = await supabase.from(actualTable).select("tags").eq("id", entity.id).single();
          const tags = [...(current?.tags || []), action.tag];
          await supabase.from(actualTable).update({ tags }).eq("id", entity.id);
        }
        break;
      }

      case "webhook": {
        // Fire an external webhook
        if (action.url) {
          try {
            await fetch(action.url, {
              method: action.method || "POST",
              headers: { "Content-Type": "application/json", ...action.headers },
              body: JSON.stringify({ entity_type: entityType, entity, action: action.name }),
              signal: AbortSignal.timeout(10000),
            });
          } catch (err) { console.error("Webhook failed:", err.message); }
        }
        break;
      }

      default: break;
    }
    return { success: true, action: action.type };
  } catch (err) {
    console.error(`Workflow action ${action.type} failed:`, err.message);
    return { success: false, action: action.type, error: err.message };
  }
};

// ============================================================
// Main Workflow Engine — run all matching rules for an entity event
// ============================================================
const runWorkflow = async (entityType, triggerEvent, entity, oldEntity, tenantId) => {
  try {
    const { data: rules } = await supabase
      .from("workflow_rules")
      .select("*")
      .eq("is_active", true)
      .eq("entity_type", entityType);

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      try {
        // Check trigger matches
        const triggerMatch =
          rule.trigger_event === triggerEvent ||
          rule.trigger_event === "on_any" ||
          (rule.trigger_event === "on_field_change" && triggerEvent === "on_update");

        if (!triggerMatch) continue;

        // For on_field_change, check if any condition field actually changed
        if (rule.trigger_event === "on_field_change" && triggerEvent === "on_update" && oldEntity) {
          const conditionFields = (rule.conditions || []).map((c) => c.field);
          const anyChanged = conditionFields.some((f) => JSON.stringify(oldEntity[f]) !== JSON.stringify(entity[f]));
          if (!anyChanged) continue;
        }

        // Evaluate conditions
        const met = evaluateConditions(entity, rule.conditions || [], oldEntity);
        if (!met) continue;

        // Execute all actions in sequence
        const results = [];
        for (const action of rule.actions || []) {
          try {
            const result = await executeAction(action, entity, entityType, tenantId);
            results.push(result);
          } catch (actionErr) {
            console.error(`Workflow action ${action.type} failed for rule ${rule.id}:`, actionErr.message);
            results.push({ success: false, action: action.type, error: actionErr.message });
          }
        }

        // Log execution
        await supabase.from("workflow_logs").insert({
          rule_id: rule.id,
          entity_type: entityType,
          entity_id: entity.id,
          trigger_event: triggerEvent,
          conditions_met: true,
          actions_executed: results,
          status: results.every((r) => r.success) ? "success" : "partial",
        }).catch(() => {});

        // Update rule stats
        await supabase.from("workflow_rules").update({
          last_run_at: new Date().toISOString(),
          run_count: (rule.run_count || 0) + 1,
        }).eq("id", rule.id).catch(() => {});
      } catch (ruleErr) {
        console.error(`Workflow rule ${rule.id} failed:`, ruleErr.message);
      }
    }
  } catch (err) {
    console.error("Workflow engine error:", err.message);
  }
};

// ============================================================
// CRUD Handlers
// ============================================================
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
    const { data, error } = await supabase.from("workflow_rules").insert({
      ...req.body,
      conditions: req.body.conditions || [],
      actions: req.body.actions || [],
      created_by: req.user.id,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateWorkflowRule = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("workflow_rules")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single();
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

module.exports = {
  runWorkflow,
  evaluateConditions,
  executeAction,
  getWorkflowRules,
  createWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
  getWorkflowLogs,
};
