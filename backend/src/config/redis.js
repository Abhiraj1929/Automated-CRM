// ============================================================
// Redis Configuration — JWT Revocation & Idempotency
// ============================================================
// Optional Redis integration. If REDIS_URL is not set,
// all Redis features degrade gracefully (no-op).

let redis = null;
let Redis = null;

const REDIS_URL = process.env.REDIS_URL;
const JWT_BLACKLIST_PREFIX = "jwt:blacklist:";
const WEBHOOK_EVENT_PREFIX = "webhook:event:";
const WEBHOOK_EVENT_TTL = 86400; // 24 hours

// Try to load ioredis
try {
  Redis = require("ioredis");
} catch {
  console.log("[REDIS] ioredis not installed — Redis features disabled");
}

/**
 * Initialize Redis connection if REDIS_URL is configured.
 * Returns the Redis client or null if unavailable.
 */
function getRedisClient() {
  if (redis) return redis;

  if (!REDIS_URL || !Redis) {
    return null;
  }

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redis.on("connect", () => console.log("[REDIS] Connected"));
    redis.on("ready", () => console.log("[REDIS] Ready"));
    redis.on("error", (err) => console.error("[REDIS] Error:", err.message));
    redis.on("close", () => console.log("[REDIS] Connection closed"));

    redis.connect().catch(() => {});
    return redis;
  } catch (err) {
    console.error("[REDIS] Connection failed:", err.message);
    return null;
  }
}

/**
 * Add a JWT token to the blacklist.
 * @param {string} token - The JWT to revoke
 * @param {number} expiresIn - TTL in seconds (defaults to 7 days)
 */
async function blacklistToken(token, expiresIn = 604800) {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.decode(token);
    const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : expiresIn;
    const finalTtl = Math.max(ttl, 60); // At least 60 seconds

    await client.setex(`${JWT_BLACKLIST_PREFIX}${token}`, finalTtl, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a JWT token is blacklisted.
 * @param {string} token - The JWT to check
 * @returns {boolean} True if blacklisted
 */
async function isTokenBlacklisted(token) {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.exists(`${JWT_BLACKLIST_PREFIX}${token}`);
    return result === 1;
  } catch {
    return false;
  }
}

/**
 * Blacklist all tokens for a user (force logout everywhere).
 * Uses a separate key pattern since we can't enumerate JWTs.
 * @param {string} userId - The user ID
 */
async function blacklistAllUserTokens(userId) {
  const client = getRedisClient();
  if (!client) return false;

  try {
    // Store user's token generation timestamp
    // Auth middleware checks: if token.iat < user's blacklist timestamp, reject
    const timestamp = Math.floor(Date.now() / 1000);
    await client.setex(
      `${JWT_BLACKLIST_PREFIX}user:${userId}`,
      604800, // 7 days
      String(timestamp)
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a user's tokens are all revoked.
 * @param {string} userId - The user ID
 * @param {number} tokenIat - The token's issued-at timestamp
 * @returns {boolean} True if token should be rejected
 */
async function isUserTokenRevoked(userId, tokenIat) {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const blacklistTimestamp = await client.get(`${JWT_BLACKLIST_PREFIX}user:${userId}`);
    if (!blacklistTimestamp) return false;
    return tokenIat < parseInt(blacklistTimestamp, 10);
  } catch {
    return false;
  }
}

/**
 * Record a webhook event ID for idempotency.
 * @param {string} eventId - The Stripe event ID
 * @returns {boolean} True if this is a new event (not a duplicate)
 */
async function recordWebhookEvent(eventId) {
  const client = getRedisClient();
  if (!client) return true; // If no Redis, allow processing

  try {
    const key = `${WEBHOOK_EVENT_PREFIX}${eventId}`;
    const result = await client.setnx(key, "1");
    if (result === 1) {
      await client.expire(key, WEBHOOK_EVENT_TTL);
      return true; // New event — process it
    }
    return false; // Duplicate — skip
  } catch {
    return true; // If Redis fails, allow processing
  }
}

/**
 * Check if a webhook event has already been processed.
 * @param {string} eventId - The Stripe event ID
 * @returns {boolean} True if already processed
 */
async function isWebhookEventProcessed(eventId) {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.exists(`${WEBHOOK_EVENT_PREFIX}${eventId}`);
    return result === 1;
  } catch {
    return false;
  }
}

module.exports = {
  getRedisClient,
  blacklistToken,
  isTokenBlacklisted,
  blacklistAllUserTokens,
  isUserTokenRevoked,
  recordWebhookEvent,
  isWebhookEventProcessed,
};
