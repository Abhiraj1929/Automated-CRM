// ============================================================
// Global Error Handler Middleware
// ============================================================

/**
 * Centralized error handling middleware for Express
 * Catches and formats all errors consistently
 */
function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = `Validation Error: ${err.message}`;
  }

  if (err.name === "UnauthorizedError") {
    statusCode = 401;
    message = "Unauthorized: Invalid or missing token";
  }

  if (err.code === "23505") {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    message = "Resource already exists";
  }

  if (err.code === "23503") {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = "Referenced resource does not exist";
  }

  // Supabase specific errors
  if (err.message?.includes("Supabase")) {
    statusCode = 502;
    message = "Database service error";
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
