const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OptiRev API",
      version: "2.0.0",
      description: "Production-ready CRM API with automation, RBAC, and workflow engine",
      contact: { name: "OptiRev Team" },
    },
    servers: [
      { url: process.env.API_URL || "http://localhost:5000", description: "Development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" },
      },
      schemas: {
        Lead: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string", format: "email" },
            status: { type: "string", enum: ["new", "contacted", "qualified", "unqualified", "converted"] },
            rating: { type: "string", enum: ["hot", "warm", "cold"] },
          },
        },
        Account: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            industry: { type: "string" },
            annual_revenue: { type: "number" },
          },
        },
        Opportunity: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            stage: { type: "string", enum: ["prospecting", "qualification", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"] },
            amount: { type: "number" },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {},
            error: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "OptiRev API Docs",
  }));
  app.get("/api/docs.json", (req, res) => { res.json(swaggerSpec); });
};

module.exports = { setupSwagger };
