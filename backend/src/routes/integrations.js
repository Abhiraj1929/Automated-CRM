// ============================================================
// Integration Credentials Routes — Manage platform API keys
// per organization
// ============================================================
const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");
const { authenticate, authorize } = require("../middleware/auth");
const crypto = require("crypto");

router.use(authenticate);

// Supported platforms with their required credential fields
const PLATFORMS = {
  meta_ads: {
    name: "Meta (Facebook/Instagram) Lead Ads",
    fields: ["access_token", "app_secret", "form_id", "page_id"],
    description: "Collect leads from Facebook & Instagram ad campaigns",
  },
  google_ads: {
    name: "Google Lead Ads",
    fields: ["customer_id", "refresh_token", "client_id", "client_secret"],
    description: "Collect leads from Google Ads lead form extensions",
  },
  indiamart: {
    name: "IndiaMART Lead Manager",
    fields: ["api_key", "glid", "sender_email"],
    description: "Auto-fetch buyer inquiries from IndiaMART",
  },
  justdial: {
    name: "Justdial Business",
    fields: ["api_key", "business_id"],
    description: "Receive customer inquiries from Justdial",
  },
  tradeindia: {
    name: "TradeIndia",
    fields: ["api_key", "seller_id"],
    description: "Collect buyer leads from TradeIndia",
  },
  whatsapp: {
    name: "WhatsApp Business API",
    fields: ["phone_number_id", "access_token", "verify_token", "app_secret"],
    description: "Receive leads via WhatsApp Business messages",
  },
  gmail: {
    name: "Gmail (IMAP)",
    fields: ["email", "app_password", "imap_host"],
    description: "Parse inquiry emails from Gmail",
  },
  amazon: {
    name: "Amazon Seller Central",
    fields: ["seller_id", "marketplace_id", "access_token", "refresh_token"],
    description: "Import buyer inquiries from Amazon",
  },
  flipkart: {
    name: "Flipkart Seller Hub",
    fields: ["seller_id", "access_token", "api_secret"],
    description: "Import leads from Flipkart seller platform",
  },
  shopify: {
    name: "Shopify Store",
    fields: ["store_url", "access_token", "api_key"],
    description: "Import customer inquiries from Shopify",
  },
  webhooks: {
    name: "Custom Webhooks",
    fields: ["webhook_url"],
    description: "Receive leads from any custom form or webhook",
  },
};

// ============================================================
// GET /api/integrations/platforms — List supported platforms
// ============================================================
router.get("/platforms", (req, res) => {
  const platforms = Object.entries(PLATFORMS).map(([key, val]) => ({
    id: key,
    ...val,
  }));
  res.json({ success: true, data: platforms });
});

// ============================================================
// GET /api/integrations — List org's integration credentials
// ============================================================
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("integration_credentials")
      .select("id, platform, name, is_active, last_used_at, created_at")
      .eq("organization_id", req.user.organization_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Never expose raw credentials in list response
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /api/integrations/:id — Get single integration (with masked creds)
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("integration_credentials")
      .select("*")
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "Not found" });

    // Mask sensitive fields
    const masked = { ...data };
    if (masked.credentials && typeof masked.credentials === "object") {
      const maskedCreds = {};
      for (const [k, v] of Object.entries(masked.credentials)) {
        if (typeof v === "string" && v.length > 8) {
          maskedCreds[k] = v.slice(0, 4) + "••••••" + v.slice(-4);
        } else {
          maskedCreds[k] = v;
        }
      }
      masked.credentials = maskedCreds;
    }
    if (masked.api_key) masked.api_key = masked.api_key.slice(0, 6) + "••••••" + masked.api_key.slice(-4);

    res.json({ success: true, data: masked });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /api/integrations — Create new integration
// ============================================================
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { platform, name, credentials, webhook_secret } = req.body;

    if (!platform || !PLATFORMS[platform]) {
      return res.status(400).json({ success: false, error: `Invalid platform. Supported: ${Object.keys(PLATFORMS).join(", ")}` });
    }

    if (!name) {
      return res.status(400).json({ success: false, error: "Integration name is required" });
    }

    // Validate required fields
    const required = PLATFORMS[platform].fields;
    const missing = required.filter(f => !credentials?.[f]);
    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(", ")}` });
    }

    // Generate API key for webhook verification
    const apiKey = crypto.randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("integration_credentials")
      .insert({
        organization_id: req.user.organization_id,
        platform,
        name,
        credentials,
        api_key: apiKey,
        webhook_secret: webhook_secret || crypto.randomBytes(16).toString("hex"),
        is_active: true,
        created_by: req.user.id,
      })
      .select("id, platform, name, api_key, is_active, created_at")
      .single();

    if (error) throw error;

    // Return the API key only on creation (won't be shown again in full)
    res.status(201).json({
      success: true,
      data: {
        ...data,
        api_key_full: apiKey, // Show once — tell user to save it
        webhook_endpoint: `/api/ingest/${platform}?org_id=${req.user.organization_id}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PUT /api/integrations/:id — Update integration
// ============================================================
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const { name, credentials, is_active } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (is_active !== undefined) updates.is_active = is_active;
    if (credentials) updates.credentials = credentials;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("integration_credentials")
      .update(updates)
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id)
      .select("id, platform, name, is_active, created_at")
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: "Not found" });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DELETE /api/integrations/:id — Delete integration
// ============================================================
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const { error } = await supabase
      .from("integration_credentials")
      .delete()
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id);

    if (error) throw error;
    res.json({ success: true, message: "Integration deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /api/integrations/:id/regenerate-key — Rotate API key
// ============================================================
router.post("/:id/regenerate-key", authorize("admin"), async (req, res) => {
  try {
    const newKey = crypto.randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("integration_credentials")
      .update({ api_key: newKey, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id)
      .select("id, platform, name")
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "Not found" });

    res.json({
      success: true,
      data: { ...data, api_key_full: newKey },
      message: "API key regenerated. Save it now — it won't be shown again.",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
