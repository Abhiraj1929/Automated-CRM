// ============================================================
// Property Portal Scraper — 99acres, Housing, MagicBricks
// ============================================================
const BasePlugin = require("./basePlugin");

class PropertyPortalPlugin extends BasePlugin {
  constructor(config) {
    super({ ...config, type: "property_portal" });
    this.platform = config.platform || "99acres";
  }

  canFetch() {
    const hasKeywords = this.getCfg("keywords") || this.getCfg("city");
    return !!hasKeywords;
  }

  async fetchLeads() {
    if (!this.canFetch()) return [];

    const keywords = this.getCfg("keywords") || "2 BHK";
    const city = this.getCfg("city") || "Mumbai";
    const propertyType = this.getCfg("propertyType") || "buy";
    const maxPages = parseInt(this.getCfg("maxPages") || "3", 10);

    const leads = [];

    switch (this.platform) {
      case "99acres":
        leads.push(...(await this.fetch99Acres(keywords, city, propertyType, maxPages)));
        break;
      case "housing":
        leads.push(...(await this.fetchHousing(keywords, city, propertyType, maxPages)));
        break;
      case "magicbricks":
        leads.push(...(await this.fetchMagicBricks(keywords, city, propertyType, maxPages)));
        break;
      default:
        // Generic scraper — try RSS or sitemap
        leads.push(...(await this.fetchGeneric(keywords, city)));
    }

    return leads;
  }

  async fetch99Acres(keywords, city, type, maxPages) {
    const leads = [];
    const encodedCity = encodeURIComponent(city);
    const encodedKw = encodeURIComponent(keywords);

    for (let page = 1; page <= maxPages; page++) {
      try {
        // 99acres search URL pattern
        const url = `https://www.99acres.com/${type === "buy" ? "buy" : "rent"}-property-in-${encodedCity.toLowerCase().replace(/%20/g, "-")}?search_text=${encodedKw}&page_number=${page}`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) continue;

        const html = await response.text();
        const leadMatches = this.parseListingsFromHTML(html, "99acres", city);

        leads.push(...leadMatches);

        // Rate limit — 2 seconds between pages
        if (page < maxPages) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err) {
        // Continue to next page on error
        console.warn(`[99acres] Page ${page} failed:`, err.message);
      }
    }

    return leads;
  }

  async fetchHousing(keywords, city, type, maxPages) {
    const leads = [];
    const citySlug = city.toLowerCase().replace(/\s+/g, "-");

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `https://housing.com/${type === "buy" ? "buy" : "rent"}/${encodedKw}-in-${citySlug}?page=${page}`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) continue;

        const html = await response.text();
        const leadMatches = this.parseListingsFromHTML(html, "housing", city);
        leads.push(...leadMatches);

        if (page < maxPages) await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.warn(`[Housing] Page ${page} failed:`, err.message);
      }
    }

    return leads;
  }

  async fetchMagicBricks(keywords, city, type, maxPages) {
    const leads = [];
    const citySlug = city.toLowerCase().replace(/\s+/g, "-");

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `https://www.magicbricks.com/${type === "buy" ? "buy-property-in" : "rent-property-in"}-${citySlug}?page=${page}`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) continue;

        const html = await response.text();
        const leadMatches = this.parseListingsFromHTML(html, "magicbricks", city);
        leads.push(...leadMatches);

        if (page < maxPages) await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.warn(`[MagicBricks] Page ${page} failed:`, err.message);
      }
    }

    return leads;
  }

  async fetchGeneric(keywords, city) {
    // Generic: try to fetch a search URL and parse listings
    return [];
  }

  /**
   * Parse listing HTML to extract leads (name, phone, requirement)
   * Uses regex patterns common across property portals
   */
  parseListingsFromHTML(html, platform, city) {
    const leads = [];

    // Phone patterns: Indian mobile numbers
    const phonePatterns = [
      /(?:\+91[\s-]?)?[6-9]\d{9}/g,
      /(?:\+91[\s-]?)?(?:\d{2,4}[\s-]?)?\d{5,6}[\s-]?\d{4,5}/g,
    ];

    // Name patterns from listing cards
    const namePatterns = [
      /class="[^"]*owner[^"]*name[^"]*"[^>]*>([^<]+)/gi,
      /class="[^"]*agent[^"]*name[^"]*"[^>]*>([^<]+)/gi,
      /class="[^"]*posted[^"]*by[^"]*"[^>]*>([^<]+)/gi,
      /<span[^>]*>([A-Z][a-z]+ [A-Z][a-z]+)<\/span>/g,
    ];

    // Price patterns
    const pricePatterns = [
      /₹\s*([\d,]+\.?\d*)\s*(lakh|cr|lacs)?/gi,
      /Rs\.?\s*([\d,]+\.?\d*)\s*(lakh|cr)?/gi,
    ];

    // Extract phones
    const phones = new Set();
    for (const pattern of phonePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const phone = match[0].replace(/[\s\-+]/g, "").trim();
        if (phone.length >= 10) phones.add(phone);
      }
    }

    // Extract names
    const names = new Set();
    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 50 && /^[A-Z]/.test(name)) {
          names.add(name);
        }
      }
    }

    // Create leads from extracted data
    const phoneArr = [...phones];
    const nameArr = [...names];

    // At minimum, we need a phone or name to create a lead
    if (phoneArr.length > 0 || nameArr.length > 0) {
      const count = Math.max(phoneArr.length, nameArr.length, 1);

      for (let i = 0; i < Math.min(count, 20); i++) {
        leads.push({
          externalId: null,
          name: nameArr[i] || `Property Lead ${i + 1}`,
          email: null,
          phone: phoneArr[i] || null,
          source: platform,
          sourceUrl: null,
          city: city,
          rawData: {
            html_snippet: html.substring(0, 500),
            platform,
            extracted_at: new Date().toISOString(),
          },
        });
      }
    }

    return leads;
  }

  normalize(rawItem) {
    return {
      first_name: rawItem.name?.split(" ")[0] || "Unknown",
      last_name: rawItem.name?.split(" ").slice(1).join(" ") || "",
      email: rawItem.email || null,
      phone: rawItem.phone || null,
      source: rawItem.source || this.platform,
      source_url: rawItem.sourceUrl || null,
      status: "new",
      description: `Lead from ${rawItem.source || this.platform} — ${rawItem.city || "Unknown city"}`,
      raw_data: rawItem.rawData || {},
      external_id: rawItem.externalId || null,
      imported_via: "scraper",
    };
  }
}

module.exports = PropertyPortalPlugin;
