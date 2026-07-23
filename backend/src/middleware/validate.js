// ============================================================
// Legacy Validation Middleware - rewritten with Zod
// ============================================================
const { z } = require("zod");

const handleValidation = (schema) => (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    req.body = data;
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

const validateLogin = handleValidation(z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}));

const validateRegister = handleValidation(z.object({
  name: z.string().min(2, "Name must be 2-100 characters").max(100),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must have uppercase, lowercase, and number"),
  role: z.enum(["admin", "manager", "employee"]).optional(),
}));

const validateLead = handleValidation(z.object({
  first_name: z.string().min(1, "First name required").max(100),
  last_name: z.string().min(1, "Last name required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
  rating: z.enum(["hot", "warm", "cold"]).optional(),
}));

const validateLeadStatus = handleValidation(z.object({
  status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]),
}));

const validateUser = handleValidation(z.object({
  name: z.string().min(2, "Name must be 2-100 characters").max(100),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "manager", "employee"]),
  manager_id: z.string().uuid().optional(),
}));

module.exports = {
  handleValidation,
  validateLogin,
  validateRegister,
  validateLead,
  validateLeadStatus,
  validateUser,
};
