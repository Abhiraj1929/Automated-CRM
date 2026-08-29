// ============================================================
// Plugin Registry — Loads and manages all data source plugins
// ============================================================
const PropertyPortalPlugin = require("./propertyPortal");
const EmailParserPlugin = require("./emailParser");
const WhatsAppPlugin = require("./whatsapp");
const EcommercePlugin = require("./ecommerce");
const CsvImportPlugin = require("./csvImport");
const WebhookPlugin = require("./webhook");

const PLUGIN_MAP = {
  property_portal: PropertyPortalPlugin,
  email: EmailParserPlugin,
  whatsapp: WhatsAppPlugin,
  ecommerce: EcommercePlugin,
  csv: CsvImportPlugin,
  webhook: WebhookPlugin,
};

/**
 * Create a plugin instance from a data_source record
 */
function createPlugin(dataSource) {
  const PluginClass = PLUGIN_MAP[dataSource.type];
  if (!PluginClass) {
    throw new Error(`Unknown plugin type: ${dataSource.type}`);
  }
  return new PluginClass({
    name: dataSource.name,
    type: dataSource.type,
    platform: dataSource.platform,
    config: dataSource.config || {},
  });
}

/**
 * Get all supported plugin types (for UI dropdowns)
 */
function getSupportedTypes() {
  return [
    { type: "property_portal", label: "Property Portal", platforms: ["99acres", "housing", "magicbricks"], description: "Scrape buyer inquiries from real estate portals" },
    { type: "email", label: "Email Inbox", platforms: ["gmail", "outlook", "yahoo"], description: "Parse inbound emails for leads (IMAP)" },
    { type: "whatsapp", label: "WhatsApp Business", platforms: ["whatsapp_business"], description: "Capture leads from WhatsApp messages" },
    { type: "ecommerce", label: "E-commerce Seller", platforms: ["amazon", "flipkart", "shopify"], description: "Fetch customer orders and inquiries" },
    { type: "csv", label: "CSV/Excel Upload", platforms: ["csv"], description: "Import leads from spreadsheet files" },
    { type: "webhook", label: "Web Form Webhook", platforms: ["webhook"], description: "Capture leads from website contact forms" },
  ];
}

module.exports = { createPlugin, getSupportedTypes, PLUGIN_MAP };
