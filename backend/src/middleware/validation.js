const { z } = require("zod");

// Validation middleware factory
const validate = (schema, source = "body") => (req, res, next) => {
  try {
    const data = schema.parse(req[source]);
    req[source] = data;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
      });
    }
    next(error);
  }
};

// Common schemas
const idParam = z.object({ id: z.string().uuid("Invalid ID format") });

const leadSchema = z.object({
  first_name: z.string().min(1, "First name required").max(100),
  last_name: z.string().min(1, "Last name required").max(100),
  email: z.string().email("Invalid email").max(255),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  title: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
  status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
  rating: z.enum(["hot", "warm", "cold"]).optional(),
  annual_revenue: z.number().optional(),
  number_of_employees: z.number().int().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
});

const accountSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  annual_revenue: z.number().optional(),
  number_of_employees: z.number().int().optional(),
  description: z.string().max(2000).optional(),
});

const contactSchema = z.object({
  first_name: z.string().min(1, "First name required").max(100),
  last_name: z.string().min(1, "Last name required").max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  account_id: z.string().uuid().optional(),
});

const opportunitySchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  stage: z.enum(["prospecting", "qualification", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
  amount: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  close_date: z.string().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
});

const activitySchema = z.object({
  type: z.enum(["call", "email", "meeting", "task", "note"]),
  subject: z.string().min(1, "Subject required").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["open", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  due_date: z.string().optional(),
  who_id: z.string().uuid().optional(),
  who_type: z.enum(["contact", "lead"]).optional(),
  what_id: z.string().uuid().optional(),
  what_type: z.enum(["account", "opportunity"]).optional(),
});

const productSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  code: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  unit_price: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

const campaignSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  type: z.enum(["email", "social", "webinar", "event", "ads", "referral", "other"]).optional(),
  status: z.enum(["planning", "active", "paused", "completed", "cancelled"]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().min(0).optional(),
  expected_leads: z.number().int().min(0).optional(),
  description: z.string().max(2000).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
});

const workflowRuleSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  entity_type: z.enum(["lead", "contact", "opportunity", "account", "activity", "task"]),
  trigger_event: z.enum(["on_create", "on_update", "on_status_change", "on_field_change", "on_schedule"]),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.any() })).optional(),
  actions: z.array(z.object({ type: z.string() }).passthrough()).optional(),
  is_active: z.boolean().optional(),
});

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  subject: z.string().min(1, "Subject required").max(200),
  body: z.string().min(1, "Body required").max(10000),
  category: z.enum(["general", "lead_followup", "proposal", "meeting", "task_reminder", "welcome", "custom"]).optional(),
});

const sendEmailSchema = z.object({
  to_email: z.string().email("Invalid email"),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  template_id: z.string().uuid().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
});

module.exports = {
  validate,
  schemas: {
    idParam, leadSchema, accountSchema, contactSchema, opportunitySchema,
    activitySchema, productSchema, campaignSchema, loginSchema, registerSchema,
    workflowRuleSchema, emailTemplateSchema, sendEmailSchema,
  },
};
