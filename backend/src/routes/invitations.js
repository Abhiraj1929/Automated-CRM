// ============================================================
// Invitation Routes — Team member invite management
// ============================================================
const express = require("express");
const router = express.Router();
const invitationService = require("../services/invitationService");
const { authenticate, authorize } = require("../middleware/auth");

// Public routes (no auth required)
router.get("/verify/:token", async (req, res) => {
  try {
    const result = await invitationService.verifyToken(req.params.token);
    if (!result.valid) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to verify invitation" });
  }
});

router.post("/accept", async (req, res) => {
  try {
    const { token, name, password } = req.body;
    if (!token || !name || !password) {
      return res.status(400).json({ success: false, error: "Token, name, and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
    }

    const result = await invitationService.acceptInvitation({ token, name, password });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({ success: false, error: "Failed to accept invitation" });
  }
});

// Protected routes (require auth)
router.use(authenticate);

router.get("/quota", async (req, res) => {
  try {
    const result = await invitationService.canAddUser(req.user.organization_id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/", authorize("admin", "manager"), async (req, res) => {
  try {
    const { status } = req.query;
    const data = await invitationService.listInvitations(req.user.organization_id, status);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", authorize("admin", "manager"), async (req, res) => {
  try {
    const { email, role, department, designation } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const result = await invitationService.createInvitation({
      orgId: req.user.organization_id,
      email,
      role,
      department,
      designation,
      invitedBy: req.user.id,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: { ...result.data, inviteUrl: result.inviteUrl }, quota: result.quota });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await invitationService.revokeInvitation(req.params.id, req.user.organization_id);
    res.json({ success: true, message: "Invitation revoked" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/:id/resend", authorize("admin"), async (req, res) => {
  try {
    const result = await invitationService.resendInvitation(req.params.id, req.user.organization_id);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, message: "Invitation resent" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
