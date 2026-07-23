const { validate, schemas } = require("../src/middleware/validation");

describe("Validation Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = { status: jest.fn(() => res), json: jest.fn() };
    next = jest.fn();
  });

  describe("leadSchema", () => {
    it("should pass valid lead data", () => {
      req.body = { first_name: "John", last_name: "Doe", email: "john@test.com" };
      validate(schemas.leadSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("should fail without required fields", () => {
      req.body = {};
      validate(schemas.leadSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should fail with invalid email", () => {
      req.body = { first_name: "John", last_name: "Doe", email: "invalid" };
      validate(schemas.leadSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("accountSchema", () => {
    it("should pass valid account data", () => {
      req.body = { name: "Acme Corp" };
      validate(schemas.accountSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("should fail without name", () => {
      req.body = {};
      validate(schemas.accountSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("contactSchema", () => {
    it("should pass valid contact data", () => {
      req.body = { first_name: "Jane", last_name: "Smith" };
      validate(schemas.contactSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("opportunitySchema", () => {
    it("should pass valid opportunity data", () => {
      req.body = { name: "Big Deal", amount: 50000 };
      validate(schemas.opportunitySchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("loginSchema", () => {
    it("should pass valid login", () => {
      req.body = { email: "test@test.com", password: "password123" };
      validate(schemas.loginSchema)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("should fail with invalid email", () => {
      req.body = { email: "invalid", password: "password123" };
      validate(schemas.loginSchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("idParam", () => {
    it("should pass valid UUID", () => {
      req.params = { id: "550e8400-e29b-41d4-a716-446655440000" };
      validate(schemas.idParam, "params")(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("should fail with invalid UUID", () => {
      req.params = { id: "not-a-uuid" };
      validate(schemas.idParam, "params")(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
