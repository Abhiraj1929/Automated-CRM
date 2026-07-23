const request = require("supertest");
const express = require("express");

// Build chainable supabase mock
const buildQuery = (data = [], count = 0) => {
  const q = {};
  ["select", "insert", "update", "delete", "eq", "neq", "in", "ilike", "or", "order", "range", "like", "not"].forEach((m) => { q[m] = jest.fn(() => q); });
  q.single = jest.fn(() => Promise.resolve({ data: data[0] || null, error: null }));
  q.then = (fn) => fn({ data, error: null, count });
  return q;
};

jest.mock("../src/config/supabase", () => ({ supabase: { from: jest.fn(() => buildQuery()) } }));
jest.mock("../src/middleware/auth", () => ({
  authenticate: (req, res, next) => { req.user = { id: "uid", role: "admin", email: "t@t.com" }; next(); },
  authorize: () => (req, res, next) => next(),
}));
jest.mock("../src/middleware/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  requestLogger: (req, res, next) => next(),
}));
jest.mock("../src/middleware/activityLogger", () => ({ logActivity: jest.fn() }));
jest.mock("../src/services/auditService", () => ({
  logAudit: jest.fn(),
  auditMiddleware: (req, res, next) => { req.auditInfo = {}; next(); },
  getAuditLogs: (req, res) => res.json({ success: true, data: [] }),
}));
jest.mock("../src/services/workflowEngine", () => ({
  runWorkflow: jest.fn(),
  getWorkflowRules: (req, res) => res.json({ success: true, data: [] }),
  createWorkflowRule: (req, res) => res.status(201).json({ success: true, data: { id: "wf-1", ...req.body } }),
  updateWorkflowRule: (req, res) => res.json({ success: true, data: {} }),
  deleteWorkflowRule: (req, res) => res.json({ success: true }),
  getWorkflowLogs: (req, res) => res.json({ success: true, data: [] }),
}));
jest.mock("../src/services/scoringService", () => ({
  scoreAndUpdateLead: jest.fn(),
  rescoreAllLeads: jest.fn(),
  getScoringRules: (req, res) => res.json({ success: true, data: [] }),
  createScoringRule: (req, res) => res.status(201).json({ success: true, data: { id: "sr-1", ...req.body } }),
  updateScoringRule: (req, res) => res.json({ success: true, data: {} }),
  deleteScoringRule: (req, res) => res.json({ success: true }),
  rescoreAll: (req, res) => res.json({ success: true }),
}));
jest.mock("../src/services/escalationService", () => ({
  runEscalations: jest.fn(),
  getEscalationRules: (req, res) => res.json({ success: true, data: [] }),
  createEscalationRule: (req, res) => res.status(201).json({ success: true, data: { id: "er-1", ...req.body } }),
  updateEscalationRule: (req, res) => res.json({ success: true, data: {} }),
  deleteEscalationRule: (req, res) => res.json({ success: true }),
  runNow: (req, res) => res.json({ success: true }),
}));
jest.mock("../src/services/emailService", () => ({
  getEmailTemplates: (req, res) => res.json({ success: true, data: [] }),
  createEmailTemplate: (req, res) => res.status(201).json({ success: true, data: { id: "et-1", ...req.body } }),
  updateEmailTemplate: (req, res) => res.json({ success: true, data: {} }),
  deleteEmailTemplate: (req, res) => res.json({ success: true }),
  sendEmailHandler: (req, res) => res.json({ success: true }),
  getEmailLogs: (req, res) => res.json({ success: true, data: [] }),
}));
jest.mock("../src/services/attachmentService", () => ({
  uploadFileHandler: (req, res) => res.json({ success: true }),
  getAttachmentsHandler: (req, res) => res.json({ success: true, data: [] }),
  deleteAttachmentHandler: (req, res) => res.json({ success: true }),
}));
jest.mock("../src/services/notificationService", () => ({
  getNotifications: (req, res) => res.json({ success: true, data: [] }),
  markAsRead: (req, res) => res.json({ success: true }),
  markAllAsRead: (req, res) => res.json({ success: true }),
  getUnreadCount: (req, res) => res.json({ success: true, data: { count: 0 } }),
}));
jest.mock("../src/services/schedulerService", () => ({
  getScheduledJobs: (req, res) => res.json({ success: true, data: [] }),
  createScheduledJob: (req, res) => res.status(201).json({ success: true, data: {} }),
  updateScheduledJob: (req, res) => res.json({ success: true, data: {} }),
  deleteScheduledJob: (req, res) => res.json({ success: true }),
  runNow: (req, res) => res.json({ success: true }),
}));
jest.mock("../src/services/duplicateService", () => ({
  findDuplicateLeads: jest.fn(() => ({ duplicates: [] })),
  checkDuplicatesHandler: (req, res) => res.json({ success: true, data: { duplicates: [] } }),
}));

const app = express();
app.use(express.json());
app.use("/api/leads", require("../src/routes/leads"));
app.use("/api/accounts", require("../src/routes/accounts"));
app.use("/api/contacts", require("../src/routes/contacts"));
app.use("/api/products", require("../src/routes/products"));
app.use("/api/automation", require("../src/routes/automation"));

describe("API Routes", () => {
  it("GET /api/leads should return 200", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/leads should reject empty body", async () => {
    const res = await request(app).post("/api/leads").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/leads should reject invalid email", async () => {
    const res = await request(app).post("/api/leads").send({ first_name: "T", last_name: "U", email: "bad" });
    expect(res.status).toBe(400);
  });

  it("GET /api/leads/:id should reject invalid UUID", async () => {
    const res = await request(app).get("/api/leads/nope");
    expect(res.status).toBe(400);
  });

  it("GET /api/accounts should return 200", async () => {
    const res = await request(app).get("/api/accounts");
    expect(res.status).toBe(200);
  });

  it("POST /api/accounts should reject empty", async () => {
    const res = await request(app).post("/api/accounts").send({});
    expect(res.status).toBe(400);
  });

  it("GET /api/contacts should return 200", async () => {
    const res = await request(app).get("/api/contacts");
    expect(res.status).toBe(200);
  });

  it("POST /api/contacts should reject empty", async () => {
    const res = await request(app).post("/api/contacts").send({});
    expect(res.status).toBe(400);
  });

  it("GET /api/products should return 200", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
  });

  it("GET /api/automation/workflows should return 200", async () => {
    const res = await request(app).get("/api/automation/workflows");
    expect(res.status).toBe(200);
  });

  it("POST /api/automation/workflows should create", async () => {
    const res = await request(app).post("/api/automation/workflows").send({ name: "Test", entity_type: "lead", trigger_event: "on_create" });
    expect(res.status).toBe(201);
  });

  it("GET /api/automation/escalation-rules should return 200", async () => {
    const res = await request(app).get("/api/automation/escalation-rules");
    expect(res.status).toBe(200);
  });

  it("GET /api/automation/scoring-rules should return 200", async () => {
    const res = await request(app).get("/api/automation/scoring-rules");
    expect(res.status).toBe(200);
  });

  it("GET /api/automation/notifications should return 200", async () => {
    const res = await request(app).get("/api/automation/notifications");
    expect(res.status).toBe(200);
  });
});
