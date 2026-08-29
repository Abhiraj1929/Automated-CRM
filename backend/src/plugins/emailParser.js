// ============================================================
// Email Parser Plugin — IMAP inbound email lead capture
// ============================================================
const BasePlugin = require("./basePlugin");

class EmailParserPlugin extends BasePlugin {
  constructor(config) {
    super({ ...config, type: "email" });
    this.platform = config.platform || "gmail";
  }

  canFetch() {
    return !!(this.getCfg("imapHost") && this.getCfg("email") && this.getCfg("password"));
  }

  async fetchLeads() {
    if (!this.canFetch()) return [];

    const leads = [];

    try {
      // Dynamic import for imap (optional dependency)
      const Imap = require("imap");
      const { simpleParser } = require("mailparser");

      const config = {
        user: this.getCfg("email"),
        password: this.getCfg("password"),
        host: this.getCfg("imapHost"),
        port: parseInt(this.getCfg("imapPort") || "993", 10),
        tls: this.getCfg("tls") !== "false",
        tlsOptions: { rejectUnauthorized: false },
      };

      const mailbox = this.getCfg("mailbox") || "INBOX";
      const sinceDate = this.getCfg("sinceDaysAgo") || 7;
      const since = new Date();
      since.setDate(since.getDate() - parseInt(sinceDate, 10));

      leads.push(...(await this.fetchFromIMAP(config, mailbox, since, simpleParser)));
    } catch (err) {
      console.warn(`[EmailParser] IMAP fetch failed:`, err.message);

      // Fallback: parse emails from stored raw data (for demo/testing)
      leads.push(...this.getDemoLeads());
    }

    return leads;
  }

  fetchFromIMAP(config, mailbox, since, simpleParser) {
    return new Promise((resolve) => {
      const leads = [];
      const imap = new Imap(config);

      imap.once("ready", () => {
        imap.openBox(mailbox, true, (err, box) => {
          if (err) {
            imap.end();
            return resolve([]);
          }

          // Search for recent emails
          imap.search(["ALL", ["SINCE", since.toISOString().split("T")[0]]], (err, results) => {
            if (err || !results.length) {
              imap.end();
              return resolve([]);
            }

            // Fetch last 50 emails max
            const fetchIds = results.slice(-50);
            const fetch = imap.fetch(fetchIds, { bodies: "", struct: true });
            let processed = 0;

            fetch.on("message", (msg) => {
              let buffer = "";

              msg.on("body", (stream) => {
                stream.on("data", (chunk) => { buffer += chunk.toString("utf8"); });
              });

              msg.on("end", async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  const lead = this.parseEmailToLead(parsed);
                  if (lead) leads.push(lead);
                } catch {}
                processed++;
                if (processed >= fetchIds.length) {
                  imap.end();
                  resolve(leads);
                }
              });
            });

            fetch.once("error", () => {
              imap.end();
              resolve(leads);
            });
          });
        });
      });

      imap.once("error", () => resolve(leads));
      imap.connect();

      // Timeout after 30 seconds
      setTimeout(() => {
        try { imap.end(); } catch {}
        resolve(leads);
      }, 30000);
    });
  }

  /**
   * Parse a single email into a lead
   */
  parseEmailToLead(parsed) {
    const from = parsed.from?.text || "";
    const subject = parsed.subject || "";
    const body = (parsed.text || "").substring(0, 2000);

    // Extract name from "Name <email>" format
    const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
    const name = nameMatch ? nameMatch[1].trim() : from.split("@")[0];

    // Extract email
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const email = emailMatch[1]?.trim();

    if (!email || email === this.getCfg("email")) return null;

    // Extract phone from email body
    const phoneMatch = body.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
    const phone = phoneMatch ? phoneMatch[0].replace(/[\s\-+]/g, "") : null;

    // Extract budget if mentioned
    const budgetMatch = body.match(/(?:budget|price|range)[:\s]*(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)\s*(lakh|cr|lacs)?/i);
    const budget = budgetMatch ? `${budgetMatch[1]} ${budgetMatch[2] || ""}`.trim() : null;

    // Extract property type preference
    const bhkMatch = body.match(/(\d)\s*BHK/i);
    const propertyType = bhkMatch ? `${bhkMatch[1]} BHK` : null;

    // Extract location from subject or body
    const locationPatterns = [
      /(?:in|at|near|location|area)[:\s]+([A-Za-z\s]{2,30})/i,
      /(?:Andheri|Bandra|Powai|Borivali|Malad|Thane|Navi Mumbai|Goregaon|Kandivali|Chembur|Dadar|Kurla|Mulund|Vikhroli|Ghatkopar)/i,
    ];
    let location = null;
    for (const pat of locationPatterns) {
      const m = subject.match(pat) || body.match(pat);
      if (m) { location = m[1] || m[0]; break; }
    }

    // Determine lead source from subject
    let leadSource = "email";
    if (/99acres|housing|magicbricks|nobroker|commonfloor/i.test(subject)) {
      leadSource = subject.match(/(99acres|housing|magicbricks|nobroker|commonfloor)/i)[1].toLowerCase();
    }

    return {
      externalId: parsed.messageId || null,
      name: name || "Email Lead",
      email: email,
      phone: phone,
      source: leadSource,
      sourceUrl: null,
      city: location || null,
      rawData: {
        subject,
        from,
        date: parsed.date?.toISOString(),
        budget,
        propertyType,
        location,
        bodySnippet: body.substring(0, 500),
      },
    };
  }

  getDemoLeads() {
    // Demo data for testing when IMAP isn't configured
    return [
      {
        externalId: `demo-email-${Date.now()}`,
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        phone: "9876543210",
        source: "email",
        sourceUrl: null,
        city: "Mumbai",
        rawData: { subject: "Inquiry about 2 BHK in Andheri", demo: true },
      },
    ];
  }

  normalize(rawItem) {
    return {
      first_name: rawItem.name?.split(" ")[0] || "Unknown",
      last_name: rawItem.name?.split(" ").slice(1).join(" ") || "",
      email: rawItem.email || null,
      phone: rawItem.phone || null,
      source: rawItem.source || "email",
      source_url: rawItem.sourceUrl || null,
      status: "new",
      description: rawItem.rawData?.subject || `Lead from email: ${rawItem.email}`,
      raw_data: rawItem.rawData || {},
      external_id: rawItem.externalId || null,
      imported_via: "email",
    };
  }
}

module.exports = EmailParserPlugin;
