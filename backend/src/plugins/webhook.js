// ============================================================
// Webhook Plugin — Generic form submission capture
// ============================================================
const BasePlugin = require("./basePlugin");

class WebhookPlugin extends BasePlugin {
  constructor(config) {
    super({ ...config, type: "webhook" });
    this.platform = "webhook";
  }

  canFetch() {
    return true;
  }

  /**
   * Process incoming webhook payload from a web form
   * Maps form fields to lead fields based on configured mapping
   */
  processWebhook(payload, headers) {
    const mapping = this.getCfg("fieldMapping") || {
      name: "name",
      email: "email",
      phone: "phone",
      message: "description",
    };

    const lead = {
      externalId: payload.id || payload.formId || `webhook_${Date.now()}`,
      name: this.extractField(payload, mapping.name),
      email: this.extractField(payload, mapping.email),
      phone: this.extractField(payload, mapping.phone),
      source: "webhook",
      sourceUrl: payload.pageUrl || payload.referrer || null,
      city: this.extractField(payload, mapping.city) || null,
      rawData: {
        formId: payload.formId || null,
        pageUrl: payload.pageUrl || null,
        referrer: payload.referrer || null,
        utm: payload.utm || null,
        submittedAt: payload.timestamp || new Date().toISOString(),
        allFields: payload,
      },
    };

    return lead;
  }

  /**
   * Extract a field from nested or flat payload
   */
  extractField(payload, fieldPath) {
    if (!fieldPath) return null;

    // Support nested paths like "contact.email"
    const parts = fieldPath.split(".");
    let current = payload;
    for (const part of parts) {
      if (current && typeof current === "object") {
        current = current[part];
      } else {
        return null;
      }
    }

    return current && typeof current === "string" ? current.trim() : current;
  }

  normalize(rawItem) {
    return {
      first_name: rawItem.name?.split(" ")[0] || "Web Lead",
      last_name: rawItem.name?.split(" ").slice(1).join(" ") || "",
      email: rawItem.email || null,
      phone: rawItem.phone || null,
      source: "webhook",
      source_url: rawItem.sourceUrl || null,
      status: "new",
      description: rawItem.rawData?.allFields?.message || rawItem.rawData?.allFields?.description || "Web form submission",
      raw_data: rawItem.rawData || {},
      external_id: rawItem.externalId || null,
      imported_via: "webhook",
    };
  }
}

module.exports = WebhookPlugin;
