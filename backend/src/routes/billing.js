// ============================================================
// Billing Routes — Stripe checkout & subscription management
// ============================================================
const express = require("express");
const router = express.Router();
const stripeService = require("../services/stripeService");
const { provisionWorkspace } = require("../services/onboardingService");
const { authenticate } = require("../middleware/auth");
const { supabase } = require("../config/supabase");
const { logger } = require("../middleware/logger");

/**
 * POST /api/billing/create-checkout-session
 * Creates a Stripe Checkout session for a selected plan.
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { planId, billing, email } = req.body;

    if (!planId || !["starter", "pro", "enterprise"].includes(planId)) {
      return res.status(400).json({ success: false, error: "Invalid plan ID" });
    }

    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your .env file.",
      });
    }

    const session = await stripeService.createCheckoutSession({
      planId,
      billing: billing || "monthly",
      customerEmail: email,
      orgId: req.user?.organization_id || null,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    logger.error("Checkout session creation failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/billing/checkout
 * Self-serve workspace creation (no Stripe required for dev/trial).
 * Creates an organization + provisions workspace immediately.
 */
router.post("/checkout", async (req, res) => {
  try {
    const { planId, companyName, email } = req.body;

    if (!companyName || !email) {
      return res.status(400).json({ success: false, error: "Company name and email are required" });
    }

    const validPlan = ["starter", "pro", "enterprise"].includes(planId) ? planId : "starter";
    const planQuotas = { starter: 100, pro: 5000, enterprise: -1 };

    // If Stripe is configured, redirect to Stripe checkout
    if (stripeService.isConfigured()) {
      const session = await stripeService.createCheckoutSession({
        planId: validPlan,
        billing: "monthly",
        customerEmail: email,
      });
      return res.json({ success: true, url: session.url, sessionId: session.id });
    }

    // No Stripe — provision immediately (dev / trial mode)
    const result = await provisionWorkspace({
      orgName: companyName,
      email,
      name: null,
      planId: validPlan,
      billing: "monthly",
    });

    res.status(201).json({
      success: true,
      data: {
        organization: result.organization,
        message: "Workspace created. You can now sign up as admin.",
      },
    });
  } catch (error) {
    logger.error("Checkout failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/billing/plans
 * Returns available plan details.
 */
router.get("/plans", (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: "starter",
        name: "Starter",
        price_monthly: 19,
        price_annual: 15,
        features: { users: 5, contacts: 1000, ai_scores: 100 },
      },
      {
        id: "pro",
        name: "Pro",
        price_monthly: 49,
        price_annual: 39,
        features: { users: -1, contacts: 15000, ai_scores: 5000 },
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price_monthly: 149,
        price_annual: 119,
        features: { users: -1, contacts: -1, ai_scores: -1 },
      },
    ],
  });
});

/**
 * GET /api/billing/subscription
 * Get current organization's subscription status.
 */
router.get("/subscription", authenticate, async (req, res) => {
  try {
    const orgId = req.user?.organization_id;
    if (!orgId) {
      return res.json({ success: true, data: null });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, plan, status, ai_score_quota_monthly, ai_score_used_this_month, billing_cycle, trial_ends_at, created_at")
      .eq("id", orgId)
      .single();

    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
