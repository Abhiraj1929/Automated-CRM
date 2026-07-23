const { supabase } = require("../config/supabase");

const getCampaigns = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = supabase.from("campaigns").select("*, owner:users!campaigns_owner_id_fkey(name, email)").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const getCampaign = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("campaigns").select("*, owner:users!campaigns_owner_id_fkey(name, email)").eq("id", req.params.id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createCampaign = async (req, res, next) => {
  try {
    const { name, type, status, start_date, end_date, budget, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required" });
    const { data, error } = await supabase.from("campaigns").insert({ name, type: type || "email", status: status || "planning", start_date, end_date, budget: budget || 0, description, owner_id: req.user.id, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateCampaign = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("campaigns").update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteCampaign = async (req, res, next) => {
  try {
    const { error } = await supabase.from("campaigns").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { next(error); }
};

module.exports = { getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign };
