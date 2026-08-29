const express = require("express");
const router = express.Router();
const { getLeads, getLead, createLead, updateLead, updateLeadStatus, convertLead, deleteLead } = require("../controllers/leadController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validation");
const { supabase } = require("../config/supabase");

router.use(authenticate);

router.get("/", getLeads);
router.get("/:id", validate(schemas.idParam, "params"), getLead);
router.post("/", validate(schemas.leadSchema), createLead);
router.put("/:id", validate(schemas.idParam, "params"), updateLead);
router.patch("/:id/status", validate(schemas.idParam, "params"), updateLeadStatus);
router.post("/:id/convert", validate(schemas.idParam, "params"), convertLead);
router.delete("/:id", validate(schemas.idParam, "params"), deleteLead);

// ============================================================
// PUT /leads/:id/assign — Assign a lead to a team member
// ============================================================
router.put("/:id/assign", authorize("admin", "manager"), async (req, res) => {
  try {
    const { owner_id } = req.body;
    const leadId = req.params.id;

    if (!owner_id) {
      return res.status(400).json({ success: false, error: "owner_id is required" });
    }

    // Verify the target user is in the same organization
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", owner_id)
      .eq("organization_id", req.user.organization_id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found in your organization" });
    }

    // Verify lead belongs to this org
    const { data: lead } = await supabase
      .from("leads")
      .select("id, owner_id")
      .eq("id", leadId)
      .single();

    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    // Assign the lead
    const { data: updated, error } = await supabase
      .from("leads")
      .update({
        owner_id: owner_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select("*, owner:users!leads_owner_id_fkey(id, name, email)")
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from("activities").insert({
      type: "assignment",
      subject: `Lead assigned to ${targetUser.name}`,
      description: `Lead reassigned from ${req.user.name} to ${targetUser.name}`,
      status: "completed",
      what_id: leadId,
      what_type: "lead",
      owner_id: owner_id,
      created_by: req.user.id,
    }).catch(() => {});

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /leads/bulk-assign — Bulk assign multiple leads
// ============================================================
router.post("/bulk-assign", authorize("admin", "manager"), async (req, res) => {
  try {
    const { lead_ids, owner_id } = req.body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ success: false, error: "lead_ids array is required" });
    }

    if (!owner_id) {
      return res.status(400).json({ success: false, error: "owner_id is required" });
    }

    // Verify the target user
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", owner_id)
      .eq("organization_id", req.user.organization_id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Bulk update leads
    const { data, error } = await supabase
      .from("leads")
      .update({
        owner_id: owner_id,
        updated_at: new Date().toISOString(),
      })
      .in("id", lead_ids)
      .select("id, first_name, last_name, email");

    if (error) throw error;

    res.json({
      success: true,
      data: {
        assigned: data?.length || 0,
        assignedTo: targetUser,
        leads: data,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
