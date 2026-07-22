// ============================================================
// Lead Controller - Handles all lead-related operations
// ============================================================
const { supabase } = require("../config/supabase");
const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

/**
 * @desc    Get all leads with optional filtering
 * @route   GET /api/leads
 * @access  Private
 */
const getLeads = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single lead by ID
 * @route   GET /api/leads/:id
 * @access  Private
 */
const getLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new lead
 * @route   POST /api/leads
 * @access  Private
 */
const createLead = async (req, res, next) => {
  try {
    const { title, name, email, phone, company, amount, status, tags, notes } = req.body;

    // Validate required fields
    if (!title || !name || !email || !amount) {
      return res.status(400).json({
        success: false,
        error: "Title, name, email, and amount are required",
      });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        title,
        name,
        email,
        phone: phone || null,
        company: company || null,
        amount,
        status: status || "new",
        lead_score: 0,
        score_category: "low",
        tags: tags || [],
        notes: notes || null,
        owner_id: "1", // Default owner for demo
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update lead details
 * @route   PUT /api/leads/:id
 * @access  Private
 */
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove immutable fields
    delete updates.id;
    delete updates.created_at;

    // Add updated timestamp
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update lead status (for Kanban drag-drop)
 * @route   PATCH /api/leads/:id/status
 * @access  Private
 */
const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["new", "contacted", "proposal_sent", "won", "lost"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("leads")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a lead
 * @route   DELETE /api/leads/:id
 * @access  Private
 */
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get AI lead score prediction
 * @route   POST /api/leads/score
 * @access  Private
 */
const scoreLead = async (req, res, next) => {
  try {
    const { leadId, email, company, industry, companySize, leadSource, pageViews, timeOnSite } = req.body;

    if (!leadId || !email) {
      return res.status(400).json({
        success: false,
        error: "leadId and email are required",
      });
    }

    // Call Python ML Service for prediction
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict-score`, {
      lead_id: leadId,
      email,
      company,
      industry,
      company_size: companySize,
      lead_source: leadSource,
      page_views: pageViews,
      time_on_site: timeOnSite,
    }, {
      timeout: 10000,
    });

    const { score, confidence, factors } = mlResponse.data;

    // Determine score category
    let scoreCategory = "low";
    if (score >= 70) scoreCategory = "high";
    else if (score >= 40) scoreCategory = "medium";

    // Update lead in database
    const { data, error } = await supabase
      .from("leads")
      .update({
        lead_score: score,
        score_category: scoreCategory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        leadId,
        score,
        category: scoreCategory,
        confidence,
        factors,
      },
    });
  } catch (error) {
    // Handle ML service unavailable
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "ML service unavailable. Please try again later.",
      });
    }
    next(error);
  }
};

/**
 * @desc    Batch score multiple leads
 * @route   POST /api/leads/score/batch
 * @access  Private
 */
const batchScoreLeads = async (req, res, next) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "leadIds array is required",
      });
    }

    // Fetch leads from database
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .in("id", leadIds);

    if (fetchError) throw fetchError;

    // Score each lead via ML service
    const results = await Promise.allSettled(
      leads.map(async (lead) => {
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict-score`, {
          lead_id: lead.id,
          email: lead.email,
          company: lead.company,
        }, { timeout: 10000 });

        const { score, confidence, factors } = mlResponse.data;
        let scoreCategory = "low";
        if (score >= 70) scoreCategory = "high";
        else if (score >= 40) scoreCategory = "medium";

        // Update in database
        await supabase
          .from("leads")
          .update({
            lead_score: score,
            score_category: scoreCategory,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id);

        return { leadId: lead.id, score, category: scoreCategory, confidence, factors };
      })
    );

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeads,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  scoreLead,
  batchScoreLeads,
};
