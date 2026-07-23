const { supabase } = require("../config/supabase");

const getProducts = async (req, res, next) => {
  try {
    const { search, is_active } = req.query;
    let query = supabase.from("products").select("*").order("created_at", { ascending: false });
    if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    if (is_active !== undefined) query = query.eq("is_active", is_active === "true");
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const getProduct = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("products").select("*").eq("id", req.params.id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, code, description, unit_price, is_active } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name is required" });
    const { data, error } = await supabase.from("products").insert({ name, code, description, unit_price: unit_price || 0, is_active: is_active !== false }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

const updateProduct = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("products").update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { error } = await supabase.from("products").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { next(error); }
};

const getProductStats = async (req, res, next) => {
  try {
    const { data: products } = await supabase.from("products").select("id, is_active, unit_price");
    const { data: oppProducts } = await supabase.from("opportunity_products").select("product_id, quantity, total_price");
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter((p) => p.is_active).length || 0;
    const totalRevenue = oppProducts?.reduce((sum, op) => sum + (op.total_price || 0), 0) || 0;
    const topProducts = {};
    oppProducts?.forEach((op) => { if (op.product_id) topProducts[op.product_id] = (topProducts[op.product_id] || 0) + (op.total_price || 0); });
    res.json({ success: true, data: { totalProducts, activeProducts, totalRevenue, topProducts } });
  } catch (error) { next(error); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductStats };
