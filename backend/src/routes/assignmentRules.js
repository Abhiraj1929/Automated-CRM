// ============================================================
// Assignment Rules Routes — CRUD for auto-lead-assignment rules
// ============================================================
const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);
router.use(authorize("admin"));

const FIELDS = [
  "lead_score", "source", "industry", "budget", "company",
  "first_name", "last_name", "email", "phone", "status",
];

const OPERATORS = [
  { value: "==", label: "Equals" },
  { value: "!=", label: "Not Equals" },
  { value: ">", label: "Greater Than" },
  { value: ">=", label: "Greater or Equal" },
  { value: "<", label: "Less Than" },
  { value: "<=", label: "Less or Equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "in", label: "In List" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

// GET /api/assignment-rules/schema — return available fields + operators
router.get("/schema", (req, res) => {
  res.json({ success: true, data: { fields: FIELDS, operators: OPERATORS } });
});

// GET /api/assignment-rules — list rules
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("lead_assignment_rules")
      .select("*, creator:users!lead_assignment_rules_created_by_fkey(name)")
      .eq("organization_id", req.user.organization_id)
      .order("priority", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/assignment-rules — create rule
router.post("/", async (req, res) => {
  try {
    const { name, priority, conditions, action, is_active } = req.body;

    if (!name) return res.status(400).json({ success: false, error: "Rule name is required" });
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({ success: false, error: "At least one condition is required" });
    }
    if (!action || !action.type) {
      return res.status(400).json({ success: false, error: "Action type is required" });
    }

    const { data, error } = await supabase
      .from("lead_assignment_rules")
      .insert({
        organization_id: req.user.organization_id,
        name,
        priority: priority || 0,
        conditions,
        action,
        is_active: is_active !== false,
        created_by: req.user.id,
      })
      .select("*, creator:users!lead_assignment_rules_created_by_fkey(name)")
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/assignment-rules/:id — update rule
router.put("/:id", async (req, res) => {
  try {
    const { name, priority, conditions, action, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (priority !== undefined) updates.priority = priority;
    if (conditions !== undefined) updates.conditions = conditions;
    if (action !== undefined) updates.action = action;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("lead_assignment_rules")
      .update(updates)
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id)
      .select("*, creator:users!lead_assignment_rules_created_by_fkey(name)")
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: "Rule not found" });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/assignment-rules/:id — delete rule
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("lead_assignment_rules")
      .delete()
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id);

    if (error) throw error;
    res.json({ success: true, message: "Rule deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
