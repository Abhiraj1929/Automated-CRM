// ============================================================
// Data Source Service — Sync leads from all connected sources
// ============================================================
const { supabase } = require("../config/supabase");
const { createPlugin } = require("../plugins");
const { logger } = require("../middleware/logger");

class DataSourceService {
  /**
   * Sync leads from a single data source
   * Returns { leadsFound, leadsCreated, leadsSkipped, errors }
   */
  async syncDataSource(dataSourceId) {
    // Fetch data source record
    const { data: ds, error: dsErr } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", dataSourceId)
      .single();

    if (dsErr || !ds) {
      logger.error("Data source not found", { dataSourceId });
      return { leadsFound: 0, leadsCreated: 0, leadsSkipped: 0, errors: ["Data source not found"] };
    }

    // Create plugin instance
    let plugin;
    try {
      plugin = createPlugin(ds);
    } catch (err) {
      await this.updateSyncResult(ds.id, 0, 0, 0, [err.message]);
      return { leadsFound: 0, leadsCreated: 0, leadsSkipped: 0, errors: [err.message] };
    }

    // Check if plugin can fetch
    if (!plugin.canFetch()) {
      const msg = "Plugin not configured (missing credentials)";
      await this.updateSyncResult(ds.id, 0, 0, 0, [msg]);
      return { leadsFound: 0, leadsCreated: 0, leadsSkipped: 0, errors: [msg] };
    }

    // Fetch leads from source
    let rawLeads = [];
    const errors = [];

    try {
      rawLeads = await plugin.fetchLeads();
    } catch (err) {
      errors.push(`Fetch failed: ${err.message}`);
      logger.error("Plugin fetch failed", { sourceId: ds.id, plugin: ds.name, error: err.message });
    }

    // Create import record
    const { data: importRecord } = await supabase
      .from("lead_imports")
      .insert({
        data_source_id: ds.id,
        organization_id: ds.organization_id,
        method: ds.type === "email" ? "email_parse" : ds.type === "whatsapp" ? "whatsapp" : ds.type === "csv" ? "csv_upload" : "api_fetch",
        status: "processing",
        total_rows: rawLeads.length,
      })
      .select("id")
      .single();

    // Normalize and deduplicate
    let leadsCreated = 0;
    let leadsSkipped = 0;

    for (const raw of rawLeads) {
      try {
        const lead = plugin.normalize(raw);

        // Check for duplicates
        const isDuplicate = await this.checkDuplicate(ds.organization_id, lead);
        if (isDuplicate) {
          leadsSkipped++;
          continue;
        }

        // Insert lead
        const { error: insertErr } = await supabase.from("leads").insert({
          first_name: lead.first_name,
          last_name: lead.last_name || "",
          email: lead.email,
          phone: lead.phone,
          source: lead.source || ds.platform,
          status: lead.status || "new",
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

        if (!insertErr) {
          leadsCreated++;
        } else {
          leadsSkipped++;
          errors.push(`Insert failed: ${insertErr.message}`);
        }
      } catch (err) {
        leadsSkipped++;
        errors.push(`Normalize failed: ${err.message}`);
      }
    }

    // Update import record
    if (importRecord) {
      await supabase
        .from("lead_imports")
        .update({
          status: errors.length > 0 && leadsCreated === 0 ? "failed" : "completed",
          imported: leadsCreated,
          skipped: leadsSkipped,
          failed: errors.length,
          errors: errors.length > 0 ? errors : [],
          completed_at: new Date().toISOString(),
        })
        .eq("id", importRecord.id);
    }

    // Update data source sync result
    await this.updateSyncResult(ds.id, rawLeads.length, leadsCreated, leadsSkipped, errors);

    // Update total count
    await supabase
      .from("data_sources")
      .update({
        total_leads_collected: (ds.total_leads_collected || 0) + leadsCreated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ds.id);

    logger.info("Data source sync completed", {
      sourceId: ds.id,
      name: ds.name,
      found: rawLeads.length,
      created: leadsCreated,
      skipped: leadsSkipped,
      errors: errors.length,
    });

    return { leadsFound: rawLeads.length, leadsCreated, leadsSkipped, errors };
  }

  /**
   * Check if lead already exists (by external_id, email, or phone)
   */
  async checkDuplicate(orgId, lead) {
    // Check by external_id
    if (lead.external_id) {
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("organization_id", orgId)
        .eq("external_id", lead.external_id)
        .limit(1)
        .single();
      if (data) return true;
    }

    // Check by email
    if (lead.email) {
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("organization_id", orgId)
        .eq("email", lead.email)
        .limit(1)
        .single();
      if (data) return true;
    }

    // Check by phone
    if (lead.phone) {
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("organization_id", orgId)
        .eq("phone", lead.phone)
        .limit(1)
        .single();
      if (data) return true;
    }

    return false;
  }

  /**
   * Update data source with sync results
   */
  async updateSyncResult(dsId, found, created, skipped, errors) {
    await supabase
      .from("data_sources")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_result: { leads_found: found, leads_created: created, leads_skipped: skipped, errors },
        error_message: errors.length > 0 ? errors[0] : null,
        status: errors.length > 0 && created === 0 ? "error" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dsId);
  }

  /**
   * Sync ALL active data sources for an organization
   */
  async syncAllForOrg(orgId) {
    const { data: sources } = await supabase
      .from("data_sources")
      .select("id")
      .eq("organization_id", orgId)
      .eq("status", "active");

    if (!sources || !sources.length) return [];

    const results = [];
    for (const ds of sources) {
      const result = await this.syncDataSource(ds.id);
      results.push({ sourceId: ds.id, ...result });
    }

    return results;
  }

  /**
   * Sync ALL active data sources across all organizations
   * Called by the scheduler
   */
  async syncAll() {
    const { data: sources } = await supabase
      .from("data_sources")
      .select("id, organization_id, name")
      .eq("status", "active");

    if (!sources || !sources.length) {
      logger.info("No active data sources to sync");
      return [];
    }

    logger.info(`Syncing ${sources.length} data sources`);
    const results = [];

    for (const ds of sources) {
      try {
        const result = await this.syncDataSource(ds.id);
        results.push({ sourceId: ds.id, name: ds.name, ...result });
      } catch (err) {
        results.push({ sourceId: ds.id, name: ds.name, error: err.message });
      }
    }

    return results;
  }
}

module.exports = new DataSourceService();
