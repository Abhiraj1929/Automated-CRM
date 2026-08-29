const { supabase } = require("../config/supabase");
const emailService = require("./emailService");

// ============================================================
// Multi-Tier Escalation
// Supports: single threshold OR multi-tier (3/7/14 day chains)
// Each rule can have multiple "tiers" in its actions array
// ============================================================

const runEscalations = async () => {
  try {
    const { data: rules } = await supabase.from("escalation_rules").select("*").eq("is_active", true);
    if (!rules) return { processed: 0 };

    let processed = 0;
    const results = [];

    for (const rule of rules) {
      const result = await processEscalationRule(rule);
      processed += result.processed;
      results.push({ rule: rule.name, ...result });
    }

    return { processed, results };
  } catch (err) {
    console.error("Escalation error:", err.message);
    return { processed: 0, error: err.message };
  }
};

// ============================================================
// Process a single escalation rule with multi-tier support
// ============================================================
async function processEscalationRule(rule) {
  const tiers = rule.actions || [];
  if (tiers.length === 0) return { processed: 0 };

  // Sort tiers by threshold_days ascending (3, 7, 14...)
  const sortedTiers = [...tiers].sort((a, b) => (a.threshold_days || 0) - (b.threshold_days || 0));

  let affectedEntities = [];
  const now = new Date();

  switch (rule.entity_type) {
    case "lead": {
      const { data } = await supabase
        .from("leads")
        .select("id, organization_id, owner_id, first_name, last_name, email, status, updated_at")
        .neq("status", "converted")
        .eq("organization_id", rule.organization_id || undefined);
      affectedEntities = (data || []).map((e) => ({ ...e, _type: "lead" }));
      break;
    }
    case "contact": {
      const { data } = await supabase
        .from("contacts")
        .select("id, organization_id, owner_id, first_name, last_name, email, created_at")
        .eq("organization_id", rule.organization_id || undefined);
      affectedEntities = (data || []).map((e) => ({ ...e, _type: "contact" }));
      break;
    }
    case "task": {
      const { data } = await supabase
        .from("activities")
        .select("id, organization_id, owner_id, subject, status, due_date, created_at")
        .eq("type", "task")
        .eq("status", "open");
      affectedEntities = (data || []).map((e) => ({ ...e, _type: "task" }));
      break;
    }
    case "opportunity": {
      const { data } = await supabase
        .from("opportunities")
        .select("id, organization_id, owner_id, name, stage, amount, updated_at")
        .not("stage", "in", "(closed_won,closed_lost)");
      affectedEntities = (data || []).map((e) => ({ ...e, _type: "opportunity" }));
      break;
    }
    case "account": {
      const { data } = await supabase
        .from("accounts")
        .select("id, organization_id, owner_id, name, industry, created_at")
        .eq("organization_id", rule.organization_id || undefined);
      affectedEntities = (data || []).map((e) => ({ ...e, _type: "account" }));
      break;
    }
  }

  let processed = 0;

  for (const entity of affectedEntities) {
    // Calculate entity age in days
    const entityDate = new Date(entity.updated_at || entity.created_at);
    const daysSinceUpdate = Math.floor((now - entityDate) / (1000 * 60 * 60 * 24));

    // Find the highest tier that applies (multi-tier: 3-day triggers at day 3, 7-day at day 7, etc.)
    let matchedTier = null;
    for (const tier of sortedTiers) {
      const threshold = tier.threshold_days || rule.threshold_days || 7;
      if (daysSinceUpdate >= threshold) {
        matchedTier = tier;
      }
    }

    if (!matchedTier) continue;

    // Check if we already escalated at this tier level for this entity
    const tierKey = `${rule.id}:${matchedTier.threshold_days || matchedTier.type}`;
    const { data: alreadyEscalated } = await supabase
      .from("notifications")
      .select("id")
      .eq("entity_type", rule.entity_type)
      .eq("entity_id", entity.id)
      .ilike("title", `%${tierKey}%`)
      .limit(1);

    if (alreadyEscalated && alreadyEscalated.length > 0) continue;

    // Execute tier actions
    await executeTierActions(matchedTier, entity, rule, daysSinceUpdate, tierKey);
    processed++;
  }

  await supabase.from("escalation_rules").update({ last_run_at: now.toISOString() }).eq("id", rule.id);
  return { processed };
}

// ============================================================
// Execute actions for a single escalation tier
// ============================================================
async function executeTierActions(tier, entity, rule, daysSince, tierKey) {
  const entityType = entity._type || rule.entity_type;

  switch (tier.type) {
    case "notify_manager": {
      if (entity.owner_id) {
        const { data: owner } = await supabase.from("users").select("manager_id, name").eq("id", entity.owner_id).single();
        if (owner?.manager_id) {
          await supabase.from("notifications").insert({
            user_id: owner.manager_id,
            title: `[Tier ${tier.threshold_days || rule.threshold_days}d] ${rule.name}`,
            message: `${entityType} "${entity.first_name || entity.name || entity.subject}" needs attention — no activity for ${daysSince} days`,
            type: "warning",
            entity_type: entityType,
            entity_id: entity.id,
          });
        }
      }
      break;
    }

    case "notify_admin": {
      // Notify all admins in the organization
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true);

      for (const admin of admins || []) {
        await supabase.from("notifications").insert({
          user_id: admin.id,
          title: `[Tier ${tier.threshold_days || rule.threshold_days}d] ${rule.name}`,
          message: `${entityType} "${entity.first_name || entity.name || entity.subject}" escalated — no activity for ${daysSince} days`,
          type: "warning",
          entity_type: entityType,
          entity_id: entity.id,
        });
      }
      break;
    }

    case "auto_reassign": {
      if (tier.new_owner_id) {
        const tableMap = { task: "activities" };
        const table = tableMap[entityType] || entityType + "s";
        await supabase.from(table).update({ owner_id: tier.new_owner_id }).eq("id", entity.id);
      }
      break;
    }

    case "change_status": {
      if (tier.new_status) {
        const tableMap = { task: "activities" };
        const table = tableMap[entityType] || entityType + "s";
        const field = entityType === "opportunity" ? "stage" : "status";
        await supabase.from(table).update({ [field]: tier.new_status }).eq("id", entity.id);
      }
      break;
    }

    case "create_task": {
      await supabase.from("activities").insert({
        type: "task",
        subject: tier.subject || `Follow up: ${entity.first_name || entity.name || entity.subject}`,
        description: tier.description || `Escalation task (tier ${tier.threshold_days || rule.threshold_days}d) from rule "${rule.name}"`,
        priority: tier.priority || "high",
        status: "open",
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        owner_id: tier.assign_to || entity.owner_id,
        organization_id: entity.organization_id,
      });
      break;
    }

    case "send_email": {
      if (entity.email) {
        const vars = {
          first_name: entity.first_name || "",
          last_name: entity.last_name || "",
          name: entity.first_name ? `${entity.first_name} ${entity.last_name || ""}`.trim() : entity.name || "",
          email: entity.email || "",
          company: entity.company || "",
          days: String(daysSince),
          threshold: String(tier.threshold_days || rule.threshold_days),
          entity_type: entityType,
        };

        const subject = (tier.subject || `${entityType} needs attention`)
          .replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
        const body = (tier.body || `This ${entityType} has been inactive for ${daysSince} days.`)
          .replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");

        await emailService.sendEmail({
          to: entity.email,
          subject,
          html: body,
          text: body.replace(/<[^>]*>/g, ""),
        });
      }
      break;
    }

    case "close_entity": {
      const tableMap = { task: "activities" };
      const table = tableMap[entityType] || entityType + "s";
      if (entityType === "opportunity") {
        await supabase.from(table).update({ stage: "closed_lost", updated_at: new Date().toISOString() }).eq("id", entity.id);
      } else {
        await supabase.from(table).update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", entity.id);
      }
      break;
    }
  }
}

// ============================================================
// CRUD Handlers
// ============================================================
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
  try {
    const result = await runEscalations();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = { runEscalations, getEscalationRules, createEscalationRule, updateEscalationRule, deleteEscalationRule, runNow };
