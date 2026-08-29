const { supabase } = require("../config/supabase");

// ============================================================
// Helper: Recalculate campaign analytics from linked leads
// ============================================================
async function recalcCampaignStats(campaignId) {
  // Count linked leads
  const { count: memberCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  // Count converted leads
  const { count: convertedLeads } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "converted");

  // Count contacts created from campaign leads
  const { data: campaignLeads } = await supabase
    .from("leads")
    .select("converted_contact_id, converted_opportunity_id")
    .eq("campaign_id", campaignId)
    .eq("status", "converted");

  const convertedContacts = campaignLeads?.filter((l) => l.converted_contact_id).length || 0;
  const convertedOpps = campaignLeads?.filter((l) => l.converted_opportunity_id).length || 0;

  // Get pipeline value from opportunities linked to converted leads
  let pipelineValue = 0;
  let closedValue = 0;
  const oppIds = campaignLeads?.filter((l) => l.converted_opportunity_id).map((l) => l.converted_opportunity_id) || [];
  if (oppIds.length > 0) {
    const { data: opps } = await supabase
      .from("opportunities")
      .select("amount, stage")
      .in("id", oppIds);

    pipelineValue = opps?.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) || 0;
    closedValue = opps?.filter((o) => o.stage === "closed_won").reduce((sum, o) => sum + (Number(o.amount) || 0), 0) || 0;
  }

  // Calculate ROI
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("actual_cost")
    .eq("id", campaignId)
    .single();

  const cost = Number(campaign?.actual_cost) || 0;
  const roi = cost > 0 ? ((closedValue - cost) / cost) * 100 : 0;

  // Update campaign stats
  await supabase
    .from("campaigns")
    .update({
      member_count: memberCount || 0,
      converted_leads: convertedLeads || 0,
      converted_contacts: convertedContacts,
      converted_opportunities: convertedOpps,
      pipeline_value: pipelineValue,
      closed_value: closedValue,
      roi: Math.round(roi * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return {
    member_count: memberCount || 0,
    converted_leads: convertedLeads || 0,
    converted_contacts: convertedContacts,
    converted_opportunities: convertedOpps,
    pipeline_value: pipelineValue,
    closed_value: closedValue,
    roi: Math.round(roi * 100) / 100,
  };
}

// ============================================================
// GET /api/campaigns — List all campaigns with stats
// ============================================================
const getCampaigns = async (req, res, next) => {
  try {
    const { status, search, type } = req.query;
    let query = supabase
      .from("campaigns")
      .select("*, owner:users!campaigns_owner_id_fkey(name, email)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/campaigns/:id — Single campaign with full analytics
// ============================================================
const getCampaign = async (req, res, next) => {
  try {
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*, owner:users!campaigns_owner_id_fkey(id, name, email)")
      .eq("id", req.params.id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found" });
    }

    // Recalc stats
    const stats = await recalcCampaignStats(req.params.id);

    // Get status breakdown
    const { data: leads } = await supabase
      .from("leads")
      .select("status, rating, source, lead_score")
      .eq("campaign_id", req.params.id);

    const statusBreakdown = {};
    const ratingBreakdown = {};
    const sourceBreakdown = {};
    let avgScore = 0;

    for (const lead of leads || []) {
      statusBreakdown[lead.status] = (statusBreakdown[lead.status] || 0) + 1;
      ratingBreakdown[lead.rating] = (ratingBreakdown[lead.rating] || 0) + 1;
      sourceBreakdown[lead.source] = (sourceBreakdown[lead.source] || 0) + 1;
      avgScore += lead.lead_score || 0;
    }

    if (leads?.length) avgScore = Math.round(avgScore / leads.length);

    // Get recent responses
    const { data: responses } = await supabase
      .from("campaign_responses")
      .select("*, lead:leads(first_name, last_name, email)")
      .eq("campaign_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(20);

    res.json({
      success: true,
      data: {
        ...campaign,
        ...stats,
        status_breakdown: statusBreakdown,
        rating_breakdown: ratingBreakdown,
        source_breakdown: sourceBreakdown,
        avg_lead_score: avgScore,
        responses: responses || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/campaigns — Create campaign
// ============================================================
const createCampaign = async (req, res, next) => {
  try {
    const { name, type, status, start_date, end_date, budget, actual_cost, description, expected_leads } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required" });

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name,
        type: type || "email",
        status: status || "planning",
        start_date: start_date || null,
        end_date: end_date || null,
        budget: budget || 0,
        actual_cost: actual_cost || 0,
        expected_leads: expected_leads || 0,
        description: description || null,
        owner_id: req.user.id,
        created_by: req.user.id,
      })
      .select("*, owner:users!campaigns_owner_id_fkey(name, email)")
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PUT /api/campaigns/:id — Update campaign
// ============================================================
const updateCampaign = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("campaigns")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*, owner:users!campaigns_owner_id_fkey(name, email)")
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE /api/campaigns/:id — Delete campaign
// ============================================================
const deleteCampaign = async (req, res, next) => {
  try {
    // Unlink all leads first
    await supabase
      .from("leads")
      .update({ campaign_id: null })
      .eq("campaign_id", req.params.id);

    const { error } = await supabase.from("campaigns").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/campaigns/:id/leads — Get leads linked to this campaign
// ============================================================
const getCampaignLeads = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("leads")
      .select("*, owner:users!leads_owner_id_fkey(name, email)", { count: "exact" })
      .eq("campaign_id", req.params.id)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data, total: count, page: +page, limit: +limit });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/campaigns/:id/leads — Link leads to campaign
// ============================================================
const linkLeadsToCampaign = async (req, res, next) => {
  try {
    const { lead_ids } = req.body;
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ success: false, error: "lead_ids array is required" });
    }

    const campaignId = req.params.id;

    // Update leads to point to this campaign
    const { data, error } = await supabase
      .from("leads")
      .update({ campaign_id: campaignId })
      .in("id", lead_ids)
      .select("id, first_name, last_name, email");

    if (error) throw error;

    // Log responses for each linked lead
    const responses = lead_ids.map((leadId) => ({
      campaign_id: campaignId,
      lead_id: leadId,
      response_type: "sent",
      channel: "ads",
    }));

    await supabase.from("campaign_responses").insert(responses);

    // Recalc stats
    await recalcCampaignStats(campaignId);

    res.json({ success: true, data, linked: data?.length || 0 });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE /api/campaigns/:id/leads/:leadId — Unlink lead from campaign
// ============================================================
const unlinkLeadFromCampaign = async (req, res, next) => {
  try {
    const { id: campaignId, leadId } = req.params;

    const { error } = await supabase
      .from("leads")
      .update({ campaign_id: null })
      .eq("id", leadId)
      .eq("campaign_id", campaignId);

    if (error) throw error;

    // Recalc stats
    await recalcCampaignStats(campaignId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/campaigns/:id/responses — Log a campaign response
// ============================================================
const logCampaignResponse = async (req, res, next) => {
  try {
    const { lead_id, contact_id, response_type, channel, metadata } = req.body;

    const { data, error } = await supabase
      .from("campaign_responses")
      .insert({
        campaign_id: req.params.id,
        lead_id: lead_id || null,
        contact_id: contact_id || null,
        response_type: response_type || "sent",
        channel: channel || "email",
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // If converted, recalc stats
    if (response_type === "converted") {
      await recalcCampaignStats(req.params.id);
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/campaigns/:id/responses — Get campaign responses
// ============================================================
const getCampaignResponses = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("campaign_responses")
      .select("*, lead:leads(first_name, last_name, email), contact:contacts(first_name, last_name, email)")
      .eq("campaign_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignLeads,
  linkLeadsToCampaign,
  unlinkLeadFromCampaign,
  logCampaignResponse,
  getCampaignResponses,
  recalcCampaignStats,
};
