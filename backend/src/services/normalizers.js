// ============================================================
// Platform Normalizers — Map platform-specific payloads to
// standard CRM Lead model
// ============================================================

/**
 * Standard normalized lead shape
 * @typedef {Object} NormalizedLead
 * @property {string|null} first_name
 * @property {string|null} last_name
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string|null} company
 * @property {string|null} budget
 * @property {string|null} notes
 * @property {string} source
 * @property {string|null} source_url
 * @property {string|null} external_id
 * @property {Object} raw_payload
 */

const normalizePhone = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("91")) cleaned = cleaned.substring(2);
  if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  return cleaned.length === 10 ? cleaned : cleaned || null;
};

const splitName = (fullName) => {
  if (!fullName) return { first_name: null, last_name: null };
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0] || null,
    last_name: parts.slice(1).join(" ") || null,
  };
};

// ============================================================
// Meta (Facebook/Instagram) Lead Ads
// ============================================================
function normalizeMetaAds(payload) {
  // Meta sends an array of leadgen objects
  const leads = [];

  const entries = payload.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== "leadgen") continue;
      const leadData = change.value;
      const formFields = leadData.questions || [];

      let firstName = null, lastName = null, email = null, phone = null, company = null, budget = null, notes = null;

      for (const field of formFields) {
        const key = field.name?.toLowerCase() || "";
        const value = field.answers?.[0]?.text || field.answers?.[0]?.answer || "";

        if (key.includes("first_name") || key.includes("name")) {
          const split = splitName(value);
          firstName = split.first_name;
          lastName = split.last_name;
        } else if (key.includes("email")) {
          email = value;
        } else if (key.includes("phone") || key.includes("mobile")) {
          phone = normalizePhone(value);
        } else if (key.includes("company") || key.includes("business")) {
          company = value;
        } else if (key.includes("budget") || key.includes("price") || key.includes("range")) {
          budget = value;
        } else {
          notes = notes ? `${notes}\n${key}: ${value}` : `${key}: ${value}`;
        }
      }

      leads.push({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        company,
        budget,
        notes,
        source: "Meta Ads",
        source_url: null,
        external_id: leadData.leadgen_id || null,
        campaign_name: leadData.form_name || leadData.ad_name || null,
        raw_payload: leadData,
      });
    }
  }

  return leads;
}

// ============================================================
// Google Lead Ads
// ============================================================
function normalizeGoogleAds(payload) {
  const leads = [];

  // Google sends campaign data with lead info
  const campaigns = payload.campaigns || [payload];
  for (const campaign of campaigns) {
    const leadFields = campaign.leads?.leads || campaign.leads || [];

    for (const lead of leadFields) {
      let firstName = null, lastName = null, email = null, phone = null, company = null, notes = null;

      // Google stores responses by field ID
      const responses = lead.field_data || lead.responses || {};
      for (const [fieldId, response] of Object.entries(responses)) {
        const value = typeof response === "string" ? response : response?.values?.[0] || "";
        const lowerVal = value.toLowerCase();

        if (lowerVal.includes("@")) {
          email = value;
        } else if (/^\+?[\d\s-]{10,}$/.test(value)) {
          phone = normalizePhone(value);
        } else if (!firstName) {
          const split = splitName(value);
          firstName = split.first_name;
          lastName = split.last_name;
        } else {
          notes = notes ? `${notes}\n${value}` : value;
        }
      }

      leads.push({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        company,
        budget: null,
        notes,
        source: "Google Ads",
        source_url: null,
        external_id: lead.lead_id || lead.id || null,
        campaign_name: campaign.campaign_name || campaign.name || null,
        raw_payload: lead,
      });
    }
  }

  return leads;
}

// ============================================================
// IndiaMART
// ============================================================
function normalizeIndiaMART(payload) {
  const leads = [];

  // IndiaMART sends leads via webhook
  const incomingLeads = payload.incoming || payload.leads || [payload];

  for (const lead of incomingLeads) {
    leads.push({
      first_name: lead.SENDER_NAME?.split(" ")[0] || lead.sender_name?.split(" ")[0] || null,
      last_name: lead.SENDER_NAME?.split(" ").slice(1).join(" ") || lead.sender_name?.split(" ").slice(1).join(" ") || null,
      email: lead.SENDER_EMAIL || lead.sender_email || null,
      phone: normalizePhone(lead.SENDER_MOBILE || lead.sender_mobile || lead.SENDER_PHONE || ""),
      company: lead.SENDER_COMPANY || lead.sender_company || null,
      budget: null,
      notes: lead.SUBJECT || lead.subject || lead.PRODUCT_NAME || lead.product_name || null,
      source: "IndiaMART",
      source_url: lead.SENDER_PROFILE_URL || lead.sender_profile_url || null,
      external_id: lead.QUERY_ID || lead.query_id || lead.REQ_ID || null,
      raw_payload: lead,
    });
  }

  return leads;
}

// ============================================================
// Justdial
// ============================================================
function normalizeJustdial(payload) {
  const leads = [];

  const inquiries = payload.inquiries || payload.leads || [payload];

  for (const lead of inquiries) {
    leads.push({
      first_name: lead.customer_name?.split(" ")[0] || lead.CUSTOMER_NAME?.split(" ")[0] || null,
      last_name: lead.customer_name?.split(" ").slice(1).join(" ") || lead.CUSTOMER_NAME?.split(" ").slice(1).join(" ") || null,
      email: lead.customer_email || lead.CUSTOMER_EMAIL || null,
      phone: normalizePhone(lead.customer_phone || lead.CUSTOMER_PHONE || lead.MOBILE || ""),
      company: null,
      budget: null,
      notes: lead.requirement || lead.REQUIREMENT || lead.SERVICE_REQUIRED || null,
      source: "Justdial",
      source_url: null,
      external_id: lead.inquiry_id || lead.INQUIRY_ID || null,
      raw_payload: lead,
    });
  }

  return leads;
}

// ============================================================
// TradeIndia
// ============================================================
function normalizeTradeIndia(payload) {
  const leads = [];

  const inquiries = payload.inquiries || payload.leads || [payload];

  for (const lead of inquiries) {
    leads.push({
      first_name: lead.buyer_name?.split(" ")[0] || lead.BUYER_NAME?.split(" ")[0] || null,
      last_name: lead.buyer_name?.split(" ").slice(1).join(" ") || lead.BUYER_NAME?.split(" ").slice(1).join(" ") || null,
      email: lead.buyer_email || lead.BUYER_EMAIL || null,
      phone: normalizePhone(lead.buyer_phone || lead.BUYER_PHONE || lead.MOBILE || ""),
      company: lead.buyer_company || lead.BUYER_COMPANY || null,
      budget: null,
      notes: lead.product_name || lead.PRODUCT_NAME || lead.MESSAGE || null,
      source: "TradeIndia",
      source_url: null,
      external_id: lead.inquiry_id || lead.INQUIRY_ID || null,
      raw_payload: lead,
    });
  }

  return leads;
}

// ============================================================
// Webhook / Custom Form — Auto-map matching keys
// ============================================================
function normalizeWebhook(payload) {
  const fieldMap = {
    name: ["name", "full_name", "fullname", "contact_name", "customer_name", "sender_name"],
    first_name: ["first_name", "firstname", "first"],
    last_name: ["last_name", "lastname", "last", "surname"],
    email: ["email", "e_mail", "email_address", "customer_email", "sender_email"],
    phone: ["phone", "mobile", "contact", "phone_number", "mobile_number", "tel", "sender_mobile", "customer_phone"],
    company: ["company", "business", "organization", "company_name"],
    budget: ["budget", "price", "amount", "range", "budget_range"],
    notes: ["message", "notes", "description", "comment", "inquiry", "requirement", "subject"],
  };

  const extract = (keys) => {
    for (const key of keys) {
      const val = payload[key] || payload[key.toUpperCase()] || payload[key.toLowerCase()];
      if (val && typeof val === "string" && val.trim()) return val.trim();
    }
    return null;
  };

  // Try structured name first
  let firstName = extract(fieldMap.first_name);
  let lastName = extract(fieldMap.last_name);
  const fullName = extract(fieldMap.name);

  if (!firstName && fullName) {
    const split = splitName(fullName);
    firstName = split.first_name;
    lastName = split.last_name;
  }

  const phoneRaw = extract(fieldMap.phone);

  return [{
    first_name: firstName,
    last_name: lastName,
    email: extract(fieldMap.email),
    phone: normalizePhone(phoneRaw),
    company: extract(fieldMap.company),
    budget: extract(fieldMap.budget),
    notes: extract(fieldMap.notes),
    source: "Webhook",
    source_url: payload.pageUrl || payload.referrer || null,
    external_id: payload.id || payload.formId || null,
    raw_payload: payload,
  }];
}

// ============================================================
// CSV Row — already normalized at upload time
// ============================================================
function normalizeCSVRow(payload) {
  return [{
    first_name: payload.first_name || payload.name?.split(" ")[0] || null,
    last_name: payload.last_name || payload.name?.split(" ").slice(1).join(" ") || null,
    email: payload.email || null,
    phone: normalizePhone(payload.phone || payload.mobile || ""),
    company: payload.company || null,
    budget: payload.budget || null,
    notes: payload.notes || payload.description || null,
    source: payload.source || "CSV Import",
    source_url: null,
    external_id: null,
    raw_payload: payload,
  }];
}

// ============================================================
// Platform → Normalizer mapping
// ============================================================
const NORMALIZERS = {
  meta_ads: normalizeMetaAds,
  facebook: normalizeMetaAds,
  instagram: normalizeMetaAds,
  google_ads: normalizeGoogleAds,
  google: normalizeGoogleAds,
  indiamart: normalizeIndiaMART,
  justdial: normalizeJustdial,
  tradeindia: normalizeTradeIndia,
  webhook: normalizeWebhook,
  custom_form: normalizeWebhook,
  csv: normalizeCSVRow,
  // Property portals
  "99acres": normalizeWebhook,
  housing: normalizeWebhook,
  magicbricks: normalizeWebhook,
  // E-commerce
  amazon: normalizeWebhook,
  flipkart: normalizeWebhook,
  shopify: normalizeWebhook,
};

/**
 * Normalize a raw payload from any platform into standard lead format
 * @param {string} sourceName — platform identifier
 * @param {Object} rawPayload — the raw incoming data
 * @returns {Array<NormalizedLead>}
 */
function normalizeLead(sourceName, rawPayload) {
  const normalizer = NORMALIZERS[sourceName.toLowerCase().replace(/[\s-]/g, "_")];

  if (normalizer) {
    try {
      return normalizer(rawPayload);
    } catch (err) {
      console.warn(`[Normalizer] ${sourceName} failed, falling back to webhook:`, err.message);
      return normalizeWebhook(rawPayload);
    }
  }

  // Unknown source — try generic mapping
  return normalizeWebhook(rawPayload);
}

module.exports = {
  normalizeLead,
  normalizePhone,
  splitName,
  NORMALIZERS,
};
