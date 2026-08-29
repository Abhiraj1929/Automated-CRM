// ============================================================
// CSV Import Plugin — Upload CSV/Excel to import leads
// ============================================================
const BasePlugin = require("./basePlugin");
const path = require("path");

class CsvImportPlugin extends BasePlugin {
  constructor(config) {
    super({ ...config, type: "csv" });
    this.platform = "csv_upload";
  }

  canFetch() {
    return true;
  }

  /**
   * Parse uploaded CSV file into leads
   * Expects columns like: name, first_name, last_name, email, phone, source, city, etc.
   */
  async parseCSV(filePath) {
    const fs = require("fs");
    const content = fs.readFileSync(filePath, "utf8");
    return this.parseCSVContent(content);
  }

  parseCSVContent(csvContent) {
    const lines = csvContent.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Parse header
    const headers = this.parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

    // Map common column names
    const colMap = {
      name: headers.findIndex((h) => ["name", "full_name", "fullname", "contact name"].includes(h)),
      first_name: headers.findIndex((h) => ["first_name", "firstname", "first"].includes(h)),
      last_name: headers.findIndex((h) => ["last_name", "lastname", "last", "surname"].includes(h)),
      email: headers.findIndex((h) => ["email", "email address", "e-mail"].includes(h)),
      phone: headers.findIndex((h) => ["phone", "mobile", "contact", "phone number", "mobile number", "tel"].includes(h)),
      source: headers.findIndex((h) => ["source", "lead source", "origin", "referral"].includes(h)),
      city: headers.findIndex((h) => ["city", "location", "area", "region"].includes(h)),
      budget: headers.findIndex((h) => ["budget", "price", "amount", "requirement"].includes(h)),
      description: headers.findIndex((h) => ["description", "notes", "message", "comment", "inquiry"].includes(h)),
    };

    const leads = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const lead = {
        externalId: `csv_${i}_${Date.now()}`,
        name: this.getHeaderVal(values, colMap.name) || `${this.getHeaderVal(values, colMap.first_name) || ""} ${this.getHeaderVal(values, colMap.last_name) || ""}`.trim() || null,
        email: this.getHeaderVal(values, colMap.email) || null,
        phone: this.getHeaderVal(values, colMap.phone) || null,
        source: this.getHeaderVal(values, colMap.source) || "csv_import",
        sourceUrl: null,
        city: this.getHeaderVal(values, colMap.city) || null,
        rawData: {
          row: i + 1,
          budget: this.getHeaderVal(values, colMap.budget),
          description: this.getHeaderVal(values, colMap.description),
          allColumns: {},
        },
      };

      // Store all columns in rawData
      headers.forEach((header, idx) => {
        if (values[idx] && values[idx].trim()) {
          lead.rawData.allColumns[header] = values[idx].trim();
        }
      });

      // Only add if we have at least name or phone or email
      if (lead.name || lead.phone || lead.email) {
        leads.push(lead);
      }
    }

    return leads;
  }

  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  getHeaderVal(values, index) {
    if (index < 0 || index >= values.length) return null;
    const val = values[index];
    return val && val.trim() ? val.trim() : null;
  }

  normalize(rawItem) {
    return {
      first_name: rawItem.name?.split(" ")[0] || rawItem.rawData?.first_name || "Unknown",
      last_name: rawItem.name?.split(" ").slice(1).join(" ") || rawItem.rawData?.last_name || "",
      email: rawItem.email || null,
      phone: rawItem.phone || null,
      source: rawItem.source || "csv_import",
      source_url: rawItem.sourceUrl || null,
      status: "new",
      description: rawItem.rawData?.description || `Imported from CSV (row ${rawItem.rawData?.row})`,
      raw_data: rawItem.rawData || {},
      external_id: rawItem.externalId || null,
      imported_via: "csv",
    };
  }
}

module.exports = CsvImportPlugin;
