// ============================================================
// Assignment Service — Auto-assign leads based on rules
// ============================================================
const { supabase } = require("../config/supabase");
const { logger } = require("../middleware/logger");

const OPERATORS = {
  "==": (a, b) => String(a) === String(b),
  "!=": (a, b) => String(a) !== String(b),
  ">": (a, b) => Number(a) > Number(b),
  ">=": (a, b) => Number(a) >= Number(b),
  "<": (a, b) => Number(a) < Number(b),
  "<=": (a, b) => Number(a) <= Number(b),
  "contains": (a, b) => String(a || "").toLowerCase().includes(String(b).toLowerCase()),
  "not_contains": (a, b) => !String(a || "").toLowerCase().includes(String(b).toLowerCase()),
  "in": (a, b) => String(b).split(",").map(s => s.trim()).includes(String(a)),
  "not_in": (a, b) => !String(b).split(",").map(s => s.trim()).includes(String(a)),
  "is_empty": (a) => !a || a === "" || a === null,
  "is_not_empty": (a) => a && a !== "" && a !== null,
};

class AssignmentService {
  /**
   * Evaluate conditions against a lead
   */
  matchesConditions(lead, conditions) {
    if (!conditions || conditions.length === 0) return true;

    for (const cond of conditions) {
      const value = lead[cond.field];
      const operator = OPERATORS[cond.operator];

      if (!operator) {
        logger.warn("Unknown assignment operator", { operator: cond.operator });
        continue;
      }

      if (!operator(value, cond.value)) return false;
    }

    return true;
  }

  /**
   * Resolve assignment for a lead based on active rules
   * Returns { userId, method, ruleName } or null
   */
  async resolveAssignment(orgId, lead) {
    // Fetch active rules sorted by priority (highest first)
    const { data: rules } = await supabase
      .from("lead_assignment_rules")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!rules || rules.length === 0) {
      // No rules — fall back to round-robin
      return this.roundRobinAssign(orgId);
    }

    for (const rule of rules) {
      try {
        if (this.matchesConditions(lead, rule.conditions)) {
          return this.executeAction(orgId, rule);
        }
      } catch (err) {
        logger.error("Rule evaluation failed", { ruleId: rule.id, error: err.message });
      }
    }

    // No rules matched — fall back to round-robin
    return this.roundRobinAssign(orgId);
  }

  /**
   * Execute a rule action
   */
  async executeAction(orgId, rule) {
    const action = rule.action;

    if (action.type === "assign_to" && action.user_id) {
      // Verify user is still in the org
      const { data: user } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", action.user_id)
        .eq("organization_id", orgId)
        .eq("status", "active")
        .single();

      if (user) {
        return {
          userId: user.id,
          userName: user.name,
          method: "rule_direct",
          ruleName: rule.name,
        };
      }
    }

    if (action.type === "round_robin") {
      return this.roundRobinAssign(orgId);
    }

    if (action.type === "assign_to_manager") {
      // Find admin for the org
      const { data: admin } = await supabase
        .from("users")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("role", "admin")
        .eq("status", "active")
        .limit(1)
        .single();

      if (admin) {
        return {
          userId: admin.id,
          userName: admin.name,
          method: "rule_manager",
          ruleName: rule.name,
        };
      }
    }

    // Fallback to round-robin if action is invalid
    return this.roundRobinAssign(orgId);
  }

  /**
   * Round-robin assignment across team members
   */
  async roundRobinAssign(orgId) {
    try {
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .eq("organization_id", orgId)
        .in("role", ["employee", "manager"])
        .eq("status", "active");

      if (!users || users.length === 0) {
        // Fallback to admin
        const { data: admin } = await supabase
          .from("users")
          .select("id, name")
          .eq("organization_id", orgId)
          .eq("role", "admin")
          .eq("status", "active")
          .limit(1)
          .single();

        return admin ? {
          userId: admin.id,
          userName: admin.name,
          method: "round_robin_fallback",
          ruleName: "Default",
        } : null;
      }

      const { data: orgMeta } = await supabase
        .from("organizations")
        .select("metadata")
        .eq("id", orgId)
        .single();

      const lastIdx = orgMeta?.metadata?.last_lead_assign_index ?? -1;
      const nextIdx = (lastIdx + 1) % users.length;

      // Update counter (fire and forget)
      supabase
        .from("organizations")
        .update({ metadata: { ...(orgMeta?.metadata || {}), last_lead_assign_index: nextIdx } })
        .eq("id", orgId)
        .then(() => {})
        .catch(() => {});

      return {
        userId: users[nextIdx].id,
        userName: users[nextIdx].name,
        method: "round_robin",
        ruleName: "Round Robin",
      };
    } catch (err) {
      logger.error("Round-robin assignment failed", { error: err.message });
      return null;
    }
  }
}

module.exports = new AssignmentService();
