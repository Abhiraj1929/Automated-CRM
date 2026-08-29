// ============================================================
// Lead Ingestion Service — Unified pipeline for multi-source
// lead extraction, normalization, dedup, scoring, assignment,
// and real-time notification.
// ============================================================
const { supabase } = require("../config/supabase");
const { normalizeLead } = require("./normalizers");
const { logger } = require("../middleware/logger");
const websocketService = require("./websocketService");
const assignmentService = require("./assignmentService");

// ============================================================
// ML Scoring — call FastAPI /predict-score
// ============================================================
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://ml-service:8000";

async function scoreWithML(lead) {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/predict-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        industry: lead.industry || null,
        source: lead.source,
        annual_revenue: lead.annual_revenue || null,
        number_of_employees: lead.number_of_employees || null,
        title: lead.title || null,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      logger.warn("ML scoring failed, using rule-based fallback", { status: resp.status });
      return null;
    }

    const data = await resp.json();
    return {
      score: data.score ?? 0,
      category: data.category ?? "low",
      vertical_type: data.vertical_type ?? null,
      scoring_method: data.method ?? "ml",
      score_factors: data.factors ?? [],
    };
  } catch (err) {
    logger.warn("ML scoring unavailable, using rule-based fallback", { error: err.message });
    return null;
  }
}

// ============================================================
// Rule-based scoring fallback (same logic as scoringService.js)
// ============================================================
async function scoreWithRules(lead) {
  try {
    const { data: rules } = await supabase
      .from("scoring_rules")
      .select("*")
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      return { score: 0, category: "low", scoring_method: "default", score_factors: [] };
    }

    let totalScore = 0;
    const factors = [];

    for (const rule of rules) {
      let matched = false;
      const fieldValue = lead[rule.field];

      switch (rule.condition) {
        case "equals": matched = String(fieldValue) === rule.value; break;
        case "not_empty": matched = fieldValue != null && fieldValue !== ""; break;
        case "empty": matched = fieldValue == null || fieldValue === ""; break;
        case "contains": matched = String(fieldValue || "").toLowerCase().includes(rule.value.toLowerCase()); break;
        case "greater_than": matched = Number(fieldValue) > Number(rule.value); break;
        case "less_than": matched = Number(fieldValue) < Number(rule.value); break;
        case "in_list": matched = rule.value.split(",").map(s => s.trim()).includes(String(fieldValue)); break;
      }

      if (matched) {
        totalScore += rule.score;
        factors.push({ rule: rule.name, field: rule.field, score: rule.score });
      }
    }

    totalScore = Math.min(100, totalScore);
    let category = "low";
    if (totalScore >= 60) category = "high";
    else if (totalScore >= 30) category = "medium";

    return { score: totalScore, category, scoring_method: "rules", score_factors: factors };
  } catch (err) {
    return { score: 0, category: "low", scoring_method: "none", score_factors: [] };
  }
}

// ============================================================
// Round-Robin Lead Distribution
// ============================================================
async function getRoundRobinAssignee(orgId) {
  try {
    // Get all active sales reps (employees + managers) in this org
    const { data: users } = await supabase
      .from("users")
      .select("id, name")
      .eq("organization_id", orgId)
      .in("role", ["employee", "manager"])
      .eq("is_active", true);

    if (!users || users.length === 0) {
      // Fallback: assign to admin
      const { data: admin } = await supabase
        .from("users")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("role", "admin")
        .eq("is_active", true)
        .limit(1)
        .single();
      return admin || null;
    }

    // Get last assigned user for this org from a lightweight tracking field
    // We use a simple counter stored in organization metadata or a dedicated table
    const { data: orgMeta } = await supabase
      .from("organizations")
      .select("metadata")
      .eq("id", orgId)
      .single();

    const lastIdx = orgMeta?.metadata?.last_lead_assign_index ?? -1;
    const nextIdx = (lastIdx + 1) % users.length;

    // Update the counter (fire and forget — best effort)
    supabase
      .from("organizations")
      .update({
        metadata: { ...(orgMeta?.metadata || {}), last_lead_assign_index: nextIdx },
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId)
      .then(() => {})
      .catch(() => {});

    return users[nextIdx];
  } catch (err) {
    logger.error("Round-robin assignment failed", { error: err.message });
    return null;
  }
}

// ============================================================
// Duplicate Check — per tenant, by email OR phone OR external_id
// Returns { isDuplicate, existingLeadId }
// ============================================================
async function checkDuplicate(orgId, lead) {
  // 1. Check by external_id (strongest match)
  if (lead.external_id) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", orgId)
      .eq("external_id", lead.external_id)
      .limit(1)
      .single();
    if (data) return { isDuplicate: true, existingLeadId: data.id };
  }

  // 2. Check by email
  if (lead.email) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", orgId)
      .eq("email", lead.email)
      .limit(1)
      .single();
    if (data) return { isDuplicate: true, existingLeadId: data.id };
  }

  // 3. Check by phone
  if (lead.phone) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", orgId)
      .eq("phone", lead.phone)
      .limit(1)
      .single();
    if (data) return { isDuplicate: true, existingLeadId: data.id };
  }

  return { isDuplicate: false, existingLeadId: null };
}

// ============================================================
// Append inquiry note to existing lead (on duplicate)
// ============================================================
async function appendInquiryToExistingLead(leadId, rawData, sourceName) {
  const inquiryNote = [
    `[${sourceName}] New inquiry received`,
    rawData.SUBJECT || rawData.subject || rawData.MESSAGE || rawData.message || "",
    rawData.query || rawData.requirement || "",
  ].filter(Boolean).join(" — ");

  // Fetch existing description
  const { data: existing } = await supabase
    .from("leads")
    .select("description, inquiry_count")
    .eq("id", leadId)
    .single();

  const existingDesc = existing?.description || "";
  const updatedDesc = existingDesc
    ? `${existingDesc}\n\n${inquiryNote}`
    : inquiryNote;

  await supabase
    .from("leads")
    .update({
      description: updatedDesc,
      inquiry_count: (existing?.inquiry_count || 0) + 1,
      last_inquiry_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  // Log as activity
  await supabase
    .from("activities")
    .insert({
      type: "inquiry",
      subject: `[${sourceName}] Duplicate inquiry`,
      description: inquiryNote,
      status: "completed",
      what_id: leadId,
      what_type: "lead",
      created_by: "system",
    })
    .then(() => {})
    .catch(() => {});
}

// ============================================================
// Resolve Campaign — find or create campaign from campaign_name
// ============================================================
async function resolveCampaign(tenantId, campaignName, sourceName) {
  if (!campaignName) return null;

  // Try to find existing campaign by name in this org
  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("name", campaignName)
    .eq("owner_id", tenantId)
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Auto-create campaign from ad platform data
  const { data: newCampaign } = await supabase
    .from("campaigns")
    .insert({
      name: campaignName,
      type: sourceName === "Google Ads" ? "ads" : "social",
      status: "active",
      description: `Auto-created from ${sourceName} webhook`,
      owner_id: tenantId,
      created_by: "system",
    })
    .select("id")
    .single();

  return newCampaign?.id || null;
}

// ============================================================
// Main Ingestion Pipeline
// ============================================================
/**
 * Unified lead ingestion handler.
 * @param {string} tenantId — organization_id (multi-tenant scope)
 * @param {Object} rawData — raw platform-specific payload
 * @param {string} sourceName — platform identifier (e.g., 'Meta Ads', 'IndiaMART')
 * @returns {Object} { status: 'created'|'duplicate'|'error', lead?, leadId?, scoring? }
 */
async function ingestIncomingLead(tenantId, rawData, sourceName) {
  const results = [];

  // ---- Step 1: Normalize ----
  let normalizedLeads;
  try {
    normalizedLeads = normalizeLead(sourceName, rawData);
  } catch (err) {
    logger.error("Normalization failed", { source: sourceName, error: err.message });
    return { status: "error", error: `Normalization failed: ${err.message}`, leads: [] };
  }

  for (const lead of normalizedLeads) {
    try {
      // ---- Step 2: Duplicate Check ----
      const { isDuplicate, existingLeadId } = await checkDuplicate(tenantId, lead);

      if (isDuplicate) {
        logger.info("Duplicate lead detected, appending inquiry", {
          source: sourceName,
          existingLeadId,
          email: lead.email,
          phone: lead.phone,
        });

        await appendInquiryToExistingLead(existingLeadId, rawData, sourceName);

        results.push({
          status: "duplicate",
          leadId: existingLeadId,
          email: lead.email,
          phone: lead.phone,
        });
        continue;
      }

      // ---- Step 3: ML Scoring ----
      let scoring = await scoreWithML(lead);
      if (!scoring) {
        scoring = await scoreWithRules(lead);
      }

      // ---- Step 4: Assignment (rule-based → round-robin fallback) ----
      const assignment = await assignmentService.resolveAssignment(tenantId, lead);
      const assignee = assignment ? { id: assignment.userId, name: assignment.userName } : null;

      // ---- Step 4b: Resolve campaign ----
      const campaignId = await resolveCampaign(tenantId, lead.campaign_name, sourceName);

      // ---- Step 5: Insert ----
      const insertPayload = {
        first_name: lead.first_name,
        last_name: lead.last_name || "",
        email: lead.email,
        phone: lead.phone,
        company: lead.company || null,
        source: lead.source || sourceName,
        status: "new",
        description: lead.notes || null,
        budget: lead.budget || null,
        lead_score: scoring.score,
        score_category: scoring.category,
        vertical_type: scoring.vertical_type || null,
        scoring_method: scoring.scoring_method,
        score_factors: scoring.score_factors || [],
        source_url: lead.source_url || null,
        external_id: lead.external_id || null,
        campaign_id: campaignId,
        organization_id: tenantId,
        owner_id: assignee?.id || null,
        created_by: "system",
        last_activity_at: new Date().toISOString(),
        raw_payload: lead.raw_payload || {},
      };

      const { data: insertedLead, error: insertErr } = await supabase
        .from("leads")
        .insert(insertPayload)
        .select("*, owner:users!leads_owner_id_fkey(id, name, email)")
        .single();

      if (insertErr) {
        logger.error("Lead insert failed", { source: sourceName, error: insertErr.message });
        results.push({ status: "error", error: insertErr.message, email: lead.email });
        continue;
      }

      // ---- Step 6: Log activity ----
      await supabase
        .from("activities")
        .insert({
          type: "inquiry",
          subject: `[${sourceName}] New lead ingested`,
          description: `Lead auto-created from ${sourceName}. Score: ${scoring.score} (${scoring.category}).`,
          status: "completed",
          what_id: insertedLead.id,
          what_type: "lead",
          owner_id: assignee?.id || null,
          created_by: "system",
        })
        .then(() => {})
        .catch(() => {});

      // ---- Step 7: Real-time notification ----
      if (assignee?.id) {
        websocketService.toUser(assignee.id, "new_lead_received", {
          id: insertedLead.id,
          first_name: insertedLead.first_name,
          last_name: insertedLead.last_name,
          email: insertedLead.email,
          source: insertedLead.source,
          score: scoring.score,
          category: scoring.category,
          assignedTo: assignee.name,
          timestamp: new Date().toISOString(),
        });

        websocketService.sendNotification({
          userId: assignee.id,
          title: "New Lead Assigned",
          message: `${insertedLead.first_name} ${insertedLead.last_name} from ${sourceName} (Score: ${scoring.score})`,
          type: "lead",
          entityType: "lead",
          entityId: insertedLead.id,
          actionUrl: `/leads/${insertedLead.id}`,
        }).catch(() => {});
      }

      results.push({
        status: "created",
        leadId: insertedLead.id,
        email: lead.email,
        phone: lead.phone,
        score: scoring.score,
        category: scoring.category,
        assignedTo: assignee?.name || "Unassigned",
      });

      logger.info("Lead ingested successfully", {
        source: sourceName,
        leadId: insertedLead.id,
        score: scoring.score,
        assignedTo: assignee?.name,
      });
    } catch (err) {
      logger.error("Lead ingestion pipeline error", { source: sourceName, error: err.message });
      results.push({ status: "error", error: err.message, email: lead.email });
    }
  }

  return { status: "processed", leads: results, total: results.length };
}

// ============================================================
// Batch Ingestion — ingest an array of payloads
// ============================================================
async function batchIngest(tenantId, payloads, sourceName) {
  const batchResults = [];

  for (const payload of payloads) {
    const result = await ingestIncomingLead(tenantId, payload, sourceName);
    batchResults.push(result);
  }

  const summary = {
    total: batchResults.reduce((sum, r) => sum + r.total, 0),
    created: batchResults.reduce((sum, r) => sum + r.leads.filter(l => l.status === "created").length, 0),
    duplicates: batchResults.reduce((sum, r) => sum + r.leads.filter(l => l.status === "duplicate").length, 0),
    errors: batchResults.reduce((sum, r) => sum + r.leads.filter(l => l.status === "error").length, 0),
  };

  logger.info("Batch ingestion completed", { source: sourceName, ...summary });
  return { summary, details: batchResults };
}

module.exports = {
  ingestIncomingLead,
  batchIngest,
  checkDuplicate,
  appendInquiryToExistingLead,
  scoreWithML,
  scoreWithRules,
  getRoundRobinAssignee,
};
