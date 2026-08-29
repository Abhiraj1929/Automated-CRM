// ============================================================
// WhatsApp Business API Plugin — Webhook + Message Parsing
// ============================================================
const BasePlugin = require("./basePlugin");

class WhatsAppPlugin extends BasePlugin {
  constructor(config) {
    super({ ...config, type: "whatsapp" });
    this.platform = "whatsapp_business";
  }

  canFetch() {
    return !!(this.getCfg("accessToken") && this.getCfg("phoneNumberId"));
  }

  /**
   * Process incoming webhook payload from WhatsApp Business API
   * Called by the webhook handler route, not by the scheduler
   */
  processWebhook(payload) {
    const leads = [];

    try {
      const entries = payload.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value) continue;

          const messages = value.messages || [];
          const contacts = value.contacts || [];

          for (const msg of messages) {
            const contact = contacts.find((c) => c.wa_id === msg.from) || {};
            const lead = this.parseWhatsAppMessage(msg, contact);
            if (lead) leads.push(lead);
          }
        }
      }
    } catch (err) {
      console.warn("[WhatsApp] Webhook parse error:", err.message);
    }

    return leads;
  }

  /**
   * Parse a single WhatsApp message into a lead
   */
  parseWhatsAppMessage(msg, contact) {
    if (!msg || !msg.from) return null;

    const phone = msg.from;
    const name = contact.profile?.name || null;
    const messageType = msg.type;
    let messageText = "";

    // Extract text from different message types
    switch (messageType) {
      case "text":
        messageText = msg.text?.body || "";
        break;
      case "image":
        messageText = msg.image?.caption || "[Image message]";
        break;
      case "document":
        messageText = msg.document?.caption || "[Document message]";
        break;
      case "interactive":
        messageText = msg.interactive?.button?.title || msg.interactive?.list_reply?.title || "";
        break;
      default:
        messageText = `[${messageType} message]`;
    }

    // Extract lead-relevant info from message text
    const extracted = this.extractLeadInfo(messageText);

    return {
      externalId: msg.id || `wa_${phone}_${msg.timestamp}`,
      name: name || extracted.name || null,
      email: extracted.email || null,
      phone: this.formatPhone(phone),
      source: "whatsapp",
      sourceUrl: null,
      city: extracted.location || null,
      rawData: {
        messageId: msg.id,
        timestamp: msg.timestamp,
        from: phone,
        type: messageType,
        text: messageText,
        contactName: contact.profile?.name,
        ...extracted,
      },
    };
  }

  /**
   * Extract lead info from WhatsApp message text
   */
  extractLeadInfo(text) {
    const result = {};

    // Phone in message
    const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
    if (phoneMatch) result.phone = phoneMatch[0].replace(/[\s\-+]/g, "");

    // Email in message
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) result.email = emailMatch[0];

    // Budget
    const budgetMatch = text.match(/(?:budget|price|range|cost)[:\s]*(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)\s*(lakh|cr|lacs)?/i);
    if (budgetMatch) result.budget = `${budgetMatch[1]} ${budgetMatch[2] || ""}`.trim();

    // BHK
    const bhkMatch = text.match(/(\d)\s*BHK/i);
    if (bhkMatch) result.propertyType = `${bhkMatch[1]} BHK`;

    // Location
    const locationMatch = text.match(/(?:in|at|near|location)[:\s]+([A-Za-z\s]{2,30})/i);
    if (locationMatch) result.location = locationMatch[1].trim();

    // Name if mentioned
    const nameMatch = text.match(/(?:name|I am|I'm)[:\s]+([A-Za-z\s]{2,30})/i);
    if (nameMatch) result.name = nameMatch[1].trim();

    return result;
  }

  formatPhone(phone) {
    // Ensure Indian format: 10 digits starting with 6-9
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    return cleaned.length === 10 ? cleaned : phone;
  }

  /**
   * Send a reply message via WhatsApp Business API
   */
  async sendReply(toPhone, messageText) {
    if (!this.canFetch()) return { success: false, error: "WhatsApp not configured" };

    try {
      const url = `https://graph.facebook.com/v18.0/${this.getCfg("phoneNumberId")}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getCfg("accessToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: messageText },
        }),
      });

      const data = await response.json();
      return { success: !!data.messages, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  normalize(rawItem) {
    return {
      first_name: rawItem.name?.split(" ")[0] || "WhatsApp User",
      last_name: rawItem.name?.split(" ").slice(1).join(" ") || "",
      email: rawItem.email || null,
      phone: rawItem.phone || null,
      source: "whatsapp",
      source_url: null,
      status: "new",
      description: rawItem.rawData?.text || "WhatsApp inquiry",
      raw_data: rawItem.rawData || {},
      external_id: rawItem.externalId || null,
      imported_via: "whatsapp",
    };
  }
}

module.exports = WhatsAppPlugin;
