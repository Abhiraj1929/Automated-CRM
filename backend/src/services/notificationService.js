const { supabase } = require("../config/supabase");

const createNotification = async ({ userId, title, message, type = "info", entityType, entityId, actionUrl }) => {
  try {
    const { data, error } = await supabase.from("notifications").insert({
      user_id: userId, title, message, type,
      entity_type: entityType || null, entity_id: entityId || null,
      action_url: actionUrl || null,
    }).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) { return { success: false, error: err.message }; }
};

const getNotifications = async (req, res, next) => {
  try {
    const { unread_only } = req.query;
    let query = supabase.from("notifications").select("*").eq("user_id", req.user.id);
    if (unread_only === "true") query = query.eq("is_read", false);
    query = query.order("created_at", { ascending: false }).limit(100);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { next(error); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", req.user.id).eq("is_read", false);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { next(error); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", req.user.id).eq("is_read", false);
    res.json({ success: true, data: { count: count || 0 } });
  } catch (error) { next(error); }
};

module.exports = { createNotification, getNotifications, markAsRead, markAllAsRead, getUnreadCount };
