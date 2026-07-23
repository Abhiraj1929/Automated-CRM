// ============================================================
// Activity Logger Middleware - Audit trail for all CRUD operations
// ============================================================
const { supabase } = require("../config/supabase");

/**
 * Log an activity to the activities table
 * @param {Object} params - Activity parameters
 * @param {string} params.userId - User performing the action
 * @param {string} params.action - Action performed (e.g., 'lead.created')
 * @param {string} params.entityType - Entity type (e.g., 'lead', 'user')
 * @param {string} params.entityId - ID of the entity
 * @param {Object} params.details - Additional details (optional)
 */
const logActivity = async ({ userId, action, entityType, entityId, details = {} }) => {
  try {
    const { error } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      });

    if (error) {
      console.error("Failed to log activity:", error.message);
    }
  } catch (err) {
    console.error("Activity logging error:", err.message);
  }
};

/**
 * Express middleware factory that logs activity after response
 * @param {string} action - Action to log
 * @param {string} entityType - Entity type
 */
const logAfterAction = (action, entityType) => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to log activity after successful response
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = req.params.id || body?.data?.id || null;
        logActivity({
          userId: req.user.id,
          action,
          entityType,
          entityId,
          details: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
        });
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = { logActivity, logAfterAction };
