// ============================================================
// Stripe Service — Checkout session creation & subscription mgmt
// ============================================================
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe = null;
if (STRIPE_SECRET) {
  const Stripe = require("stripe");
  stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });
}

const PLAN_MAP = {
  starter: { price_monthly: "price_starter_monthly", price_annual: "price_starter_annual", quota: 100, name: "Starter" },
  pro: { price_monthly: "price_pro_monthly", price_annual: "price_pro_annual", quota: 5000, name: "Pro" },
  enterprise: { price_monthly: "price_enterprise_monthly", price_annual: "price_enterprise_annual", quota: -1, name: "Enterprise" },
};

function isConfigured() {
  return !!stripe;
}

async function createCheckoutSession({ planId, billing, customerEmail, orgId, userId, type }) {
  if (!stripe) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env");

  const plan = PLAN_MAP[planId] || PLAN_MAP.pro;
  const priceId = billing === "annual" ? plan.price_annual : plan.price_monthly;

  const metadata = {
    org_id: orgId || "",
    user_id: userId || "",
    plan_id: planId || "pro",
    billing: billing || "monthly",
    trialDays: 7,
  };

  if (type === "trial") {
    metadata.type = "trial";
  }

  const sessionParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment`,
    metadata,
  };

  // For trial type, set trial_period_days on the subscription
  if (type === "trial") {
    sessionParams.subscription_data = {
      trial_period_days: 7,
      metadata,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
}

async function verifySession(sessionId) {
  if (!stripe) throw new Error("Stripe not configured");

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });

  return {
    id: session.id,
    status: session.status,
    payment_status: session.payment_status,
    customer_email: session.customer_details?.email || session.customer_email,
    customer_name: session.customer_details?.name,
    plan_id: session.metadata?.plan_id,
    billing: session.metadata?.billing,
    trialDays: session.metadata?.trialDays,
    subscription_id: session.subscription?.id,
    subscription_status: session.subscription?.status,
    customer_id: session.customer?.id,
  };
}

async function constructWebhookEvent(body, signature) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
}

async function getSubscription(subscriptionId) {
  if (!stripe) return null;
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function getSubscriptions(customerId) {
  if (!stripe) return [];
  const result = await stripe.subscriptions.list({ customer: customerId, limit: 5 });
  return result.data || [];
}

module.exports = { isConfigured, createCheckoutSession, verifySession, constructWebhookEvent, getSubscription, getSubscriptions, PLAN_MAP };
