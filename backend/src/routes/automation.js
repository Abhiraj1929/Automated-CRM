const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { auditMiddleware, getAuditLogs } = require("../services/auditService");
const { getWorkflowRules, createWorkflowRule, updateWorkflowRule, deleteWorkflowRule, getWorkflowLogs } = require("../services/workflowEngine");
const { getScoringRules, createScoringRule, updateScoringRule, deleteScoringRule, rescoreAll } = require("../services/scoringService");
const { getEscalationRules, createEscalationRule, updateEscalationRule, deleteEscalationRule, runNow: runEscalationsNow } = require("../services/escalationService");
const { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate, sendEmailHandler, getEmailLogs } = require("../services/emailService");
const { uploadFileHandler, getAttachmentsHandler, deleteAttachmentHandler } = require("../services/attachmentService");
const { checkDuplicatesHandler } = require("../services/duplicateService");
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require("../services/notificationService");
const { getScheduledJobs, createScheduledJob, updateScheduledJob, deleteScheduledJob, runNow: runJobsNow } = require("../services/schedulerService");

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
router.get("/email-templates", getEmailTemplates);
router.post("/email-templates", authorize("admin", "manager"), createEmailTemplate);
router.put("/email-templates/:id", authorize("admin", "manager"), updateEmailTemplate);
router.delete("/email-templates/:id", authorize("admin"), deleteEmailTemplate);
router.post("/emails/send", sendEmailHandler);
router.get("/emails/logs", authorize("admin", "manager"), getEmailLogs);

// Attachments (multer middleware added at route level)
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.post("/attachments/upload", upload.single("file"), uploadFileHandler);
router.get("/attachments", getAttachmentsHandler);
router.delete("/attachments/:id", deleteAttachmentHandler);

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
