// ============================================================
// Lead Ingestion Routes — Webhook endpoints for external platforms
// POST /api/ingest/:source       — Generic ingest endpoint
// POST /api/ingest/meta          — Meta (FB/IG) Lead Ads
// POST /api/ingest/google        — Google Lead Ads
// POST /api/ingest/indiamart     — IndiaMART inquiries
// POST /api/ingest/justdial      — Justdial inquiries
// POST /api/ingest/tradeindia    — TradeIndia inquiries
// POST /api/ingest/webhook       — Custom form / generic webhook
// POST /api/ingest/csv           — CSV row ingestion
// ============================================================
const express = require("express");
const router = express.Router();
const { ingestIncomingLead, batchIngest } = require("../services/leadIngestionService");
const { supabase } = require("../config/supabase");
const { logger } = require("../middleware/logger");

// ============================================================
// Helper: Resolve org_id from API key or query param
// ============================================================
async function resolveOrgId(req) {
  // 1. Check X-API-Key header (platform API keys stored in data_sources)
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    const { data: ds } = await supabase
      .from("data_sources")
      .select("organization_id, credentials")
      .eq("api_key", apiKey)
      .eq("status", "active")
      .limit(1)
      .single();
    if (ds) return ds.organization_id;
  }

  // 2. Check query param ?org_id=...
  if (req.query.org_id) {
    // Verify the org exists
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", req.query.org_id)
      .limit(1)
      .single();
    if (org) return org.id;
  }

  // 3. Check Bearer token (authenticated user → use their org)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const jwt = require("jsonwebtoken");
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.organization_id) return decoded.organization_id;
      if (decoded.id) {
        const { data: user } = await supabase
          .from("users")
          .select("organization_id")
          .eq("id", decoded.id)
          .limit(1)
          .single();
        if (user) return user.organization_id;
      }
    } catch (err) {
      // Token invalid — skip
    }
  }

  return null;
}

// ============================================================
// POST /api/ingest/:source — Generic source ingest
// ============================================================
router.post("/:source", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Missing or invalid organization context. Provide X-API-Key header, ?org_id= query param, or Bearer token." });
    }

    const { source } = req.params;
    const result = await ingestIncomingLead(orgId, req.body, source);

    const created = result.leads.filter(l => l.status === "created").length;
    const duplicates = result.leads.filter(l => l.status === "duplicate").length;
    const errors = result.leads.filter(l => l.status === "error").length;

    logger.info("Ingest webhook received", { source, orgId, created, duplicates, errors });

    res.status(201).json({
      success: true,
      data: {
        source,
        processed: result.total,
        created,
        duplicates,
        errors,
        leads: result.leads,
      },
    });
  } catch (err) {
    logger.error("Ingest route error", { error: err.message, source: req.params.source });
    res.status(500).json({ success: false, error: "Ingestion failed" });
  }
});

// ============================================================
// POST /api/ingest/meta — Meta (FB/IG) Lead Ads webhook
// ============================================================
router.post("/meta", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, error: "Organization context required" });

    const result = await ingestIncomingLead(orgId, req.body, "Meta Ads");
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("Meta ingest failed", { error: err.message });
    res.status(500).json({ success: false, error: "Ingestion failed" });
  }
});

// ============================================================
// POST /api/ingest/google — Google Lead Ads webhook
// ============================================================
router.post("/google", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, error: "Organization context required" });

    const result = await ingestIncomingLead(orgId, req.body, "Google Ads");
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("Google ingest failed", { error: err.message });
    res.status(500).json({ success: false, error: "Ingestion failed" });
  }
});

// ============================================================
// POST /api/ingest/indiamart — IndiaMART CRM webhook
// ============================================================
router.post("/indiamart", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, error: "Organization context required" });

    const result = await ingestIncomingLead(orgId, req.body, "IndiaMART");
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("IndiaMART ingest failed", { error: err.message });
    res.status(500).json({ success: false, error: "Ingestion failed" });
  }
});

// ============================================================
// POST /api/ingest/justdial — Justdial CRM webhook
// ============================================================
router.post("/justdial", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, error: "Organization context required" });

    const result = await ingestIncomingLead(orgId, req.body, "Justdial");
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("Justdial ingest failed", { error: err.message });
    res.status(500).json({ success: false, error: "Ingestion failed" });
  }
});

// ============================================================
// POST /api/ingest/tradeindia — TradeIndia CRM webhook
// ============================================================
router.post("/tradeindia", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, error: "Organization context required" });

    const result = await ingestIncomingLead(orgId, req.body, "TradeIndia");
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("TradeIndia ingest failed", { error: err.message });
    res.status(500).json({ success: false, error: "Ingestion failed" });
  }
});

// ============================================================
// POST /api/ingest/webhook — Custom form / generic webhook
// ============================================================
router.post("/webhook", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, error: "Organization context required" });

    const result = await ingestIncomingLead(orgId, req.body, "Webhook");
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("Webhook ingest failed", { error: err.message });
    res.status(500).json({ success: false, error: "Ingestion failed" });
  }
});

// ============================================================
// POST /api/ingest/batch — Batch ingest multiple leads
// ============================================================
router.post("/batch", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, error: "Organization context required" });

    const { leads, source } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: "leads array is required" });
    }

    if (leads.length > 500) {
      return res.status(400).json({ success: false, error: "Maximum 500 leads per batch" });
    }

    const result = await batchIngest(orgId, leads, source || "Batch Import");
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("Batch ingest failed", { error: err.message });
    res.status(500).json({ success: false, error: "Batch ingestion failed" });
  }
});

module.exports = router;
