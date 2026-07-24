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
  starter: { price_monthly: "price_starter_monthly", price_annual: "price_starter_annual", quota: 100 },
  pro: { price_monthly: "price_pro_monthly", price_annual: "price_pro_annual", quota: 5000 },
  enterprise: { price_monthly: "price_enterprise_monthly", price_annual: "price_enterprise_annual", quota: -1 },
};

function isConfigured() {
  return !!stripe;
}

async function createCheckoutSession({ planId, billing, customerEmail, orgId }) {
  if (!stripe) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env");

  const plan = PLAN_MAP[planId] || PLAN_MAP.pro;
  const priceId = billing === "annual" ? plan.price_annual : plan.price_monthly;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard?upgraded=1`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/pricing`,
    metadata: { org_id: orgId || "", plan_id: planId, billing },
  });

  return session;
}

async function constructWebhookEvent(body, signature) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
}

async function getSubscription(subscriptionId) {
  if (!stripe) return null;
  return stripe.subscriptions.retrieve(subscriptionId);
}

module.exports = { isConfigured, createCheckoutSession, constructWebhookEvent, getSubscription, PLAN_MAP };
