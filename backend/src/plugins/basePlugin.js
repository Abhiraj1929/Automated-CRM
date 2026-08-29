// ============================================================
// Base Plugin — Interface for all data source integrations
// ============================================================

class BasePlugin {
  constructor(config) {
    this.config = config;
    this.name = config.name || "unknown";
    this.type = config.type || "unknown";
    this.platform = config.platform || "unknown";
  }

  /**
   * Fetch leads from the external source
   * @returns {Array<{externalId, name, email, phone, source, rawData, sourceUrl}>}
   */
  async fetchLeads() {
    throw new Error("Plugin must implement fetchLeads()");
  }

  /**
   * Normalize raw data into CRM lead format
   */
  normalize(rawItem) {
    throw new Error("Plugin must implement normalize()");
  }

  /**
   * Validate that config has required fields
   */
  validateConfig(requiredFields = []) {
    for (const field of requiredFields) {
      if (!this.config[field] && !this.config.config?.[field]) {
        throw new Error(`Missing required config: ${field}`);
      }
    }
  }

  /**
   * Get config value (checks top-level then nested config object)
   */
  getCfg(key) {
    return this.config[key] || this.config.config?.[key] || null;
  }

  /**
   * Check if this plugin can fetch (config is valid)
   */
  canFetch() {
    return true;
  }

  /**
   * Get plugin status info
   */
  getStatus() {
    return {
      name: this.name,
      type: this.type,
      platform: this.platform,
      canFetch: this.canFetch(),
    };
  }
}

module.exports = BasePlugin;
