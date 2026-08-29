// ============================================================
// Data Sources Routes — CRUD + Sync + Webhooks
// ============================================================
const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { supabase } = require("../config/supabase");
const dataSourceService = require("../services/dataSourceService");
const { getSupportedTypes, createPlugin } = require("../plugins");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// ============================================================
// GET /api/data-sources — List all data sources for this org
// ============================================================
router.get("/", authenticate, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ success: false, error: "No organization" });
    }

    const { data, error } = await supabase
      .from("data_sources")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /api/data-sources/types — Get supported plugin types
// ============================================================
router.get("/types", authenticate, (req, res) => {
  res.json({ success: true, data: getSupportedTypes() });
});

// ============================================================
// POST /api/data-sources — Create a new data source
// ============================================================
router.post("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(400).json({ success: false, error: "No organization" });
    }

    const { name, type, platform, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: "name and type are required" });
    }

    // Validate plugin type
    const plugin = createPlugin({ name, type, platform, config });
    const status = plugin.getStatus();

    const { data, error } = await supabase
      .from("data_sources")
      .insert({
        name,
        type,
        platform: platform || type,
        config: config || {},
        organization_id: orgId,
        created_by: req.user.id,
        status: "active",
      })
      .select("*")
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PUT /api/data-sources/:id — Update data source config
// ============================================================
router.put("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { name, config, status } = req.body;
    const update = { updated_at: new Date().toISOString() };

    if (name) update.name = name;
    if (config) update.config = config;
    if (status) update.status = status;

    const { data, error } = await supabase
      .from("data_sources")
      .update(update)
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id)
      .select("*")
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DELETE /api/data-sources/:id — Delete a data source
// ============================================================
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { error } = await supabase
      .from("data_sources")
      .delete()
      .eq("id", req.params.id)
      .eq("organization_id", req.user.organization_id);

    if (error) throw error;

    res.json({ success: true, message: "Data source deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /api/data-sources/:id/sync — Manual sync trigger
// ============================================================
router.post("/:id/sync", authenticate, authorize("admin"), async (req, res) => {
  try {
    const result = await dataSourceService.syncDataSource(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /api/data-sources/sync-all — Sync all active sources
// ============================================================
router.post("/sync-all", authenticate, authorize("admin"), async (req, res) => {
  try {
    const results = await dataSourceService.syncAllForOrg(req.user.organization_id);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /api/data-sources/import-csv — Upload CSV to import leads
// ============================================================
router.post("/import-csv", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const CsvImportPlugin = require("../plugins/csvImport");
    const plugin = new CsvImportPlugin({ name: "CSV Upload", type: "csv" });

    const rawLeads = await plugin.parseCSV(req.file.path);
    const orgId = req.user.organization_id;

    let created = 0;
    let skipped = 0;
    const errors = [];

    // Create import record
    const { data: importRecord } = await supabase
      .from("lead_imports")
      .insert({
        organization_id: orgId,
        method: "csv_upload",
        status: "processing",
        total_rows: rawLeads.length,
        file_name: req.file.originalname,
        imported_by: req.user.id,
      })
      .select("id")
      .single();

    for (const raw of rawLeads) {
      try {
        const lead = plugin.normalize(raw);

        // Check duplicate by email or phone
        let isDup = false;
        if (lead.email) {
          const { data } = await supabase.from("leads").select("id").eq("organization_id", orgId).eq("email", lead.email).limit(1);
          if (data?.length) isDup = true;
        }
        if (!isDup && lead.phone) {
          const { data } = await supabase.from("leads").select("id").eq("organization_id", orgId).eq("phone", lead.phone).limit(1);
          if (data?.length) isDup = true;
        }

        if (isDup) {
          skipped++;
          continue;
        }

        const { error: insertErr } = await supabase.from("leads").insert({
          first_name: lead.first_name,
          last_name: lead.last_name || "",
          email: lead.email,
          phone: lead.phone,
          source: "csv_import",
          status: "new",
          description: lead.description || null,
          imported_via: "csv",
          organization_id: orgId,
          owner_id: req.user.id,
          created_by: req.user.id,
          raw_data: lead.raw_data || {},
          external_id: lead.external_id || null,
        });

        if (!insertErr) created++;
        else skipped++;
      } catch {
        skipped++;
      }
    }

    // Update import record
    if (importRecord) {
      await supabase
        .from("lead_imports")
        .update({
          status: "completed",
          imported: created,
          skipped,
          completed_at: new Date().toISOString(),
        })
        .eq("id", importRecord.id);
    }

    // Clean up temp file
    const fs = require("fs");
    try { fs.unlinkSync(req.file.path); } catch {}

    res.json({
      success: true,
      data: { total: rawLeads.length, created, skipped, errors },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// GET /api/data-sources/imports — Import history
// ============================================================
router.get("/imports", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("lead_imports")
      .select("*")
      .eq("organization_id", req.user.organization_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /api/data-sources/webhook/:id — Incoming webhook handler
// ============================================================
router.post("/webhook/:id", async (req, res) => {
  try {
    const { data: ds } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (!ds) {
      return res.status(404).json({ success: false, error: "Data source not found" });
    }

    const plugin = createPlugin(ds);
    let leads = [];

    if (ds.type === "whatsapp") {
      leads = plugin.processWebhook(req.body);
    } else {
      leads = [plugin.processWebhook(req.body, req.headers)];
    }

    let created = 0;
    for (const raw of leads) {
      const lead = plugin.normalize(raw);
      const { error } = await supabase.from("leads").insert({
        first_name: lead.first_name,
        last_name: lead.last_name || "",
        email: lead.email,
        phone: lead.phone,
        source: lead.source || ds.platform,
        status: "new",
        description: lead.description || null,
        data_source_id: ds.id,
        source_url: lead.source_url || null,
        raw_data: lead.raw_data || {},
        external_id: lead.external_id || null,
        imported_via: lead.imported_via || ds.type,
        organization_id: ds.organization_id,
        owner_id: ds.created_by || null,
        created_by: ds.created_by || null,
      });

      if (!error) created++;
    }

    res.json({ success: true, data: { leadsReceived: leads.length, leadsCreated: created } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// POST /api/data-sources/whatsapp-webhook — WhatsApp Business webhook
// ============================================================
router.post("/whatsapp-webhook", async (req, res) => {
  try {
    // WhatsApp verification challenge
    if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"]) {
      const token = req.query["hub.verify_token"];
      // Find the data source with this verify token
      const { data: ds } = await supabase
        .from("data_sources")
        .select("id")
        .eq("type", "whatsapp")
        .eq("config->>'verifyToken", token)
        .limit(1)
        .single();

      if (ds) {
        return res.send(req.query["hub.challenge"]);
      }
      return res.status(403).json({ error: "Invalid verify token" });
    }

    // Process incoming messages
    const entries = req.body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const messages = value?.messages || [];
        const contacts = value?.contacts || [];

        // Find the data source for this phone number
        const phoneNumber = value?.metadata?.display_phone_number;
        if (!phoneNumber) continue;

        const { data: ds } = await supabase
          .from("data_sources")
          .select("id, organization_id, created_by")
          .eq("type", "whatsapp")
          .eq("config->>'phoneNumberId", value?.metadata?.phone_number_id)
          .limit(1)
          .single();

        if (!ds) continue;

        const WhatsAppPlugin = require("../plugins/whatsapp");
        const plugin = new WhatsAppPlugin({ name: "WhatsApp", type: "whatsapp" });

        for (const msg of messages) {
          const contact = contacts.find((c) => c.wa_id === msg.from) || {};
          const raw = plugin.parseWhatsAppMessage(msg, contact);
          if (!raw) continue;

          const lead = plugin.normalize(raw);

          await supabase.from("leads").insert({
            first_name: lead.first_name,
            last_name: lead.last_name || "",
            email: lead.email,
            phone: lead.phone,
            source: "whatsapp",
            status: "new",
            description: lead.description || null,
            data_source_id: ds.id,
            raw_data: lead.raw_data || {},
            external_id: lead.external_id || null,
            imported_via: "whatsapp",
            organization_id: ds.organization_id,
            owner_id: ds.created_by || null,
            created_by: ds.created_by || null,
          });
        }
      }
    }

    res.send("OK");
  } catch (error) {
    res.status(200).send("OK"); // Always return 200 to WhatsApp
  }
});

module.exports = router;
