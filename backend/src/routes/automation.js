const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const { auditMiddleware, getAuditLogs } = require("../services/auditService");
const { getWorkflowRules, createWorkflowRule, updateWorkflowRule, deleteWorkflowRule, getWorkflowLogs } = require("../services/workflowEngine");
const { getScoringRules, createScoringRule, updateScoringRule, deleteScoringRule, rescoreAll } = require("../services/scoringService");
const { getEscalationRules, createEscalationRule, updateEscalationRule, deleteEscalationRule, runNow: runEscalationsNow } = require("../services/escalationService");
const emailService = require("../services/emailService");
const storageService = require("../services/storageService");
const { checkDuplicatesHandler } = require("../services/duplicateService");
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require("../services/notificationService");
const { getScheduledJobs, createScheduledJob, updateScheduledJob, deleteScheduledJob, runNow: runJobsNow } = require("../services/schedulerService");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);
router.use(auditMiddleware);

// Audit Logs
router.get("/audit-logs", authorize("admin", "manager"), getAuditLogs);

// Workflow Rules
router.get("/workflows", authorize("admin", "manager"), getWorkflowRules);
router.post("/workflows", authorize("admin", "manager"), createWorkflowRule);
router.put("/workflows/:id", authorize("admin", "manager"), updateWorkflowRule);
router.delete("/workflows/:id", authorize("admin"), deleteWorkflowRule);
router.get("/workflows/logs", authorize("admin", "manager"), getWorkflowLogs);

// Scoring Rules
router.get("/scoring-rules", authorize("admin", "manager"), getScoringRules);
router.post("/scoring-rules", authorize("admin", "manager"), createScoringRule);
router.put("/scoring-rules/:id", authorize("admin", "manager"), updateScoringRule);
router.delete("/scoring-rules/:id", authorize("admin"), deleteScoringRule);
router.post("/scoring-rules/rescore", authorize("admin", "manager"), rescoreAll);

// Escalation Rules
router.get("/escalation-rules", authorize("admin", "manager"), getEscalationRules);
router.post("/escalation-rules", authorize("admin", "manager"), createEscalationRule);
router.put("/escalation-rules/:id", authorize("admin", "manager"), updateEscalationRule);
router.delete("/escalation-rules/:id", authorize("admin"), deleteEscalationRule);
router.post("/escalation-rules/run", authorize("admin", "manager"), runEscalationsNow);

// Email Templates
router.get("/email-templates", async (req, res) => {
  try {
    const { data, error } = await emailService.getTemplates();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/email-templates", authorize("admin", "manager"), async (req, res) => {
  try {
    const { data, error } = await emailService.createTemplate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/email-templates/:id", authorize("admin", "manager"), async (req, res) => {
  try {
    const { data, error } = await emailService.updateTemplate(req.params.id, req.body);
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/email-templates/:id", authorize("admin"), async (req, res) => {
  try {
    const { error } = await emailService.deleteTemplate(req.params.id);
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send email (actually sends via SMTP if configured)
router.post("/emails/send", async (req, res) => {
  try {
    const { to, subject, body, html, templateId, variables } = req.body;

    let result;
    if (templateId) {
      result = await emailService.sendTemplatedEmail({
        templateId, to, variables, senderId: req.user.id,
      });
    } else {
      result = await emailService.sendEmail({
        to, subject, html: html || body, text: body,
      });
    }

    res.json({ success: result.success, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/emails/logs", authorize("admin", "manager"), async (req, res) => {
  try {
    const result = await emailService.getLogs({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      recipient: req.query.recipient,
    });
    res.json({ success: true, data: result.data, total: result.total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Attachments (real storage — S3 or local disk)
router.post("/attachments/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file provided" });

    const { entityType, entityId } = req.body;
    const result = await storageService.upload(req.file, {
      entityType: entityType || "general",
      entityId: entityId || null,
      userId: req.user.id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    if (result.error) return res.status(400).json({ success: false, error: result.error.message });
    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/attachments", async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    const { data, error } = await storageService.getAttachments({ entityType, entityId });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/attachments/:id", async (req, res) => {
  try {
    const { error } = await storageService.deleteAttachment(req.params.id);
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Duplicate Detection
router.post("/check-duplicates", checkDuplicatesHandler);

// Notifications
router.get("/notifications", getNotifications);
router.get("/notifications/unread-count", getUnreadCount);
router.put("/notifications/:id/read", markAsRead);
router.put("/notifications/read-all", markAllAsRead);

// Scheduled Jobs
router.get("/scheduled-jobs", authorize("admin"), getScheduledJobs);
router.post("/scheduled-jobs", authorize("admin"), createScheduledJob);
router.put("/scheduled-jobs/:id", authorize("admin"), updateScheduledJob);
router.delete("/scheduled-jobs/:id", authorize("admin"), deleteScheduledJob);
router.post("/scheduled-jobs/run", authorize("admin"), runJobsNow);

module.exports = router;
