const { supabase } = require("../config/supabase");

// Check and execute escalation rules
const runEscalations = async () => {
  try {
    const { data: rules } = await supabase.from("escalation_rules").select("*").eq("is_active", true);
    if (!rules) return { processed: 0 };

    let processed = 0;
    for (const rule of rules) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - rule.threshold_days);

      let affectedEntities = [];

      switch (rule.entity_type) {
        case "lead": {
          const { data } = await supabase.from("leads").select("id, owner_id, first_name, last_name, email, status, updated_at")
            .neq("status", "converted").lt("updated_at", cutoffDate.toISOString());
          affectedEntities = data || [];
          break;
        }
        case "task": {
          const { data } = await supabase.from("activities").select("id, owner_id, subject, status, due_date")
            .eq("type", "task").eq("status", "open").lt("due_date", new Date().toISOString());
          affectedEntities = data || [];
          break;
        }
        case "opportunity": {
          const { data } = await supabase.from("opportunities").select("id, owner_id, name, stage, updated_at")
            .not("stage", "in", "(closed_won,closed_lost)").lt("updated_at", cutoffDate.toISOString());
          affectedEntities = data || [];
          break;
        }
      }

      for (const entity of affectedEntities) {
        for (const action of rule.actions || []) {
          switch (action.type) {
            case "notify_manager": {
              if (entity.owner_id) {
                const { data: owner } = await supabase.from("users").select("manager_id").eq("id", entity.owner_id).single();
                if (owner?.manager_id) {
                  await supabase.from("notifications").insert({
                    user_id: owner.manager_id, title: `Escalation: ${rule.name}`,
                    message: `${rule.entity_type} "${entity.first_name || entity.name || entity.subject}" needs attention (no activity for ${rule.threshold_days} days)`,
                    type: "warning", entity_type: rule.entity_type, entity_id: entity.id,
                  });
                }
              }
              break;
            }
            case "auto_reassign": {
              if (action.new_owner_id) {
                const table = rule.entity_type + "s";
                await supabase.from(table).update({ owner_id: action.new_owner_id }).eq("id", entity.id);
              }
              break;
            }
            case "change_status": {
              if (action.new_status) {
                const table = rule.entity_type + "s";
                await supabase.from(table).update({ status: action.new_status }).eq("id", entity.id);
              }
              break;
            }
            case "create_task": {
              await supabase.from("activities").insert({
                type: "task", subject: action.subject || `Follow up: ${entity.first_name || entity.name || entity.subject}`,
                description: action.description || `Auto-escalation task from rule "${rule.name}"`,
                priority: action.priority || "high", status: "open",
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                owner_id: action.assign_to || entity.owner_id,
              });
              break;
            }
          }
        }
      }
      processed += affectedEntities.length;
      await supabase.from("escalation_rules").update({ last_run_at: new Date().toISOString() }).eq("id", rule.id);
    }
    return { processed };
  } catch (err) { console.error("Escalation error:", err.message); return { processed: 0, error: err.message }; }
};

const getEscalationRules = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("escalation_rules").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createEscalationRule = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("escalation_rules").insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateEscalationRule = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("escalation_rules").update(req.body).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteEscalationRule = async (req, res, next) => {
  try {
    const { error } = await supabase.from("escalation_rules").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { next(error); }
};

const runNow = async (req, res, next) => {
  try { const result = await runEscalations(); res.json({ success: true, data: result }); }
  catch (error) { next(error); }
};

module.exports = { runEscalations, getEscalationRules, createEscalationRule, updateEscalationRule, deleteEscalationRule, runNow };
