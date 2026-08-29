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
 * POST /api/billing/create-payment-intent
 * Creates a PaymentIntent for Stripe Elements (PCI-compliant).
 * Card data never touches our server — handled entirely by Stripe.
 */
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { planId, billing, email, userId, orgId } = req.body;

    if (!planId || !["starter", "pro", "enterprise"].includes(planId)) {
      return res.status(400).json({ success: false, error: "Invalid plan ID" });
    }

    const planPrices = { starter: { monthly: 1900, annual: 1500 }, pro: { monthly: 4900, annual: 3900 }, enterprise: { monthly: 14900, annual: 11900 } };
    const price = (planPrices[planId] || planPrices.pro)[billing] || planPrices.pro.monthly;

    // If Stripe is configured, create real PaymentIntent
    if (stripeService.isConfigured()) {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

      // Find or create Stripe customer
      let customerId = null;
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("stripe_customer_id")
        .eq("id", orgId)
        .single();

      if (existingOrg?.stripe_customer_id) {
        customerId = existingOrg.stripe_customer_id;
      } else if (email) {
        const customer = await stripe.customers.create({ email, metadata: { org_id: orgId, user_id: userId } });
        customerId = customer.id;
        await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: "usd",
        customer: customerId,
        metadata: { org_id: orgId, user_id: userId, plan_id: planId, billing },
        automatic_payment_methods: { enabled: true },
      });

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

    // Dev mode — simulate PaymentIntent
    const fakeIntentId = `pi_dev_${Date.now()}`;
    const fakeClientSecret = `${fakeIntentId}_secret_dev`;
    return res.json({
      success: true,
      clientSecret: fakeClientSecret,
      paymentIntentId: fakeIntentId,
      devMode: true,
    });
  } catch (error) {
    logger.error("PaymentIntent creation failed", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/billing/confirm-payment
 * Confirms payment after Stripe Elements submission.
 * In dev mode: activates workspace directly.
 */
router.post("/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId, orgId, userId, planId, billing, cardLast4 } = req.body;

    if (!orgId) {
      return res.status(400).json({ success: false, error: "Organization ID is required" });
    }

    const validPlan = ["starter", "pro", "enterprise"].includes(planId) ? planId : "pro";
    const planQuotas = { starter: 100, pro: 5000, enterprise: -1 };
    const planPrices = { starter: { monthly: 19, annual: 15 }, pro: { monthly: 49, annual: 39 }, enterprise: { monthly: 149, annual: 119 } };
    const price = (planPrices[validPlan] || planPrices.pro)[billing || "monthly"] || planPrices.pro.monthly;

    // If Stripe is configured, verify the PaymentIntent
    if (stripeService.isConfigured() && paymentIntentId && !paymentIntentId.startsWith("pi_dev_")) {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (intent.status !== "succeeded") {
        return res.status(402).json({ success: false, error: `Payment not completed. Status: ${intent.status}` });
      }
    }

    // Activate organization
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    await supabase.from("organizations").update({
      status: "active",
      plan: validPlan,
      stripe_subscription_id: paymentIntentId || `pi_dev_${Date.now()}`,
      ai_score_quota_monthly: planQuotas[validPlan] || 5000,
      billing_cycle: billing || "monthly",
      trial_ends_at: trialEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", orgId);

    // Activate user
    if (userId) {
      await supabase.from("users").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", userId);
    } else {
      await supabase.from("users").update({ status: "active", updated_at: new Date().toISOString() }).eq("organization_id", orgId).eq("status", "active");
    }

    // Seed pipeline stages (gracefully handle if table doesn't exist)
    const stages = [
      { name: "Prospecting", stage_order: 1, organization_id: orgId },
      { name: "Qualification", stage_order: 2, organization_id: orgId },
      { name: "Proposal", stage_order: 3, organization_id: orgId },
      { name: "Negotiation", stage_order: 4, organization_id: orgId },
      { name: "Closed Won", stage_order: 5, organization_id: orgId },
      { name: "Closed Lost", stage_order: 6, organization_id: orgId },
    ];
    try { await supabase.from("pipeline_stages").insert(stages); } catch {}

    // Log payment (gracefully handle if table doesn't exist)
    try {
      await supabase.from("platform_activity_log").insert({
        organization_id: orgId,
        event_type: "payment_completed",
        event_data: { plan: validPlan, billing, price, card_last4: cardLast4 || "0000", trial_ends: trialEnd.toISOString() },
      });
    } catch {}

    res.json({
      success: true,
      data: {
        organization: { id: orgId },
        subscription: { plan: validPlan, status: "active", trial_ends_at: trialEnd.toISOString() },
      },
    });
  } catch (error) {
    logger.error("Payment confirmation failed", { error: error.message });
    res.status(500).json({ success: false, error: "Payment confirmation failed" });
  }
});

/**
 * POST /api/billing/create-checkout-session
 * Creates a Stripe Checkout session for a selected plan.
 * Accepts userId + orgId from the pending signup flow.
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { planId, billing, email, userId, orgId } = req.body;

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
      orgId: orgId || req.user?.organization_id || null,
      userId: userId || req.user?.id || null,
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
 * Accepts userId + orgId from the pending signup flow — activates them directly.
 */
router.post("/checkout", async (req, res) => {
  try {
    const { planId, companyName, email, userId, orgId } = req.body;

    if (!companyName && !orgId) {
      return res.status(400).json({ success: false, error: "Company name or organization ID is required" });
    }

    const validPlan = ["starter", "pro", "enterprise"].includes(planId) ? planId : "starter";

    // If Stripe is configured, redirect to Stripe checkout
    if (stripeService.isConfigured()) {
      const session = await stripeService.createCheckoutSession({
        planId: validPlan,
        billing: "monthly",
        customerEmail: email,
        orgId: orgId || null,
        userId: userId || null,
      });
      return res.json({ success: true, url: session.url, sessionId: session.id });
    }

    // No Stripe — activate immediately (dev / trial mode)
    // If orgId provided (from signup flow), activate that org + user
    if (orgId) {
      const planQuotas = { starter: 100, pro: 5000, enterprise: -1 };

      // Activate org
      await supabase
        .from("organizations")
        .update({
          status: "active",
          plan: validPlan,
          ai_score_quota_monthly: planQuotas[validPlan] || 5000,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);

      // Activate user
      if (userId) {
        await supabase
          .from("users")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", userId);
      } else {
        // Activate all pending users in this org
        await supabase
          .from("users")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("organization_id", orgId)
          .eq("status", "pending");
      }

      // Seed pipeline stages for the org (gracefully handle if table doesn't exist)
      const DEFAULT_STAGES = [
        { name: "Prospecting", stage_order: 1, organization_id: orgId },
        { name: "Qualification", stage_order: 2, organization_id: orgId },
        { name: "Proposal", stage_order: 3, organization_id: orgId },
        { name: "Negotiation", stage_order: 4, organization_id: orgId },
        { name: "Closed Won", stage_order: 5, organization_id: orgId },
        { name: "Closed Lost", stage_order: 6, organization_id: orgId },
      ];
      try { await supabase.from("pipeline_stages").insert(DEFAULT_STAGES); } catch {}

      return res.status(200).json({
        success: true,
        data: {
          organization: { id: orgId },
          message: "Payment confirmed. Workspace activated. You can now log in.",
        },
      });
    }

    // No orgId — create new workspace from scratch (legacy path)
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
 * POST /api/billing/process-payment
 * Processes payment and activates workspace.
 * In dev mode: simulates payment processing.
 * In production: would use Stripe PaymentIntents or similar.
 */
router.post("/process-payment", async (req, res) => {
  try {
    const { orgId, userId, planId, billing, email, cardLast4 } = req.body;

    if (!orgId) {
      return res.status(400).json({ success: false, error: "Organization ID is required" });
    }

    const validPlan = ["starter", "pro", "enterprise"].includes(planId) ? planId : "pro";
    const planPrices = { starter: { monthly: 19, annual: 15 }, pro: { monthly: 49, annual: 39 }, enterprise: { monthly: 149, annual: 119 } };
    const planQuotas = { starter: 100, pro: 5000, enterprise: -1 };
    const price = planPrices[validPlan]?.[billing] || planPrices.pro.monthly;

    // Simulate payment processing delay (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // If Stripe is configured, use real Stripe
    if (stripeService.isConfigured()) {
      try {
        const session = await stripeService.createCheckoutSession({
          planId: validPlan,
          billing: billing || "monthly",
          customerEmail: email,
          orgId,
          userId,
          type: "trial",
        });
        return res.json({ success: true, url: session.url, sessionId: session.id });
      } catch (stripeErr) {
        logger.warn("Stripe checkout failed, falling back to direct activation", { error: stripeErr.message });
      }
    }

    // Dev mode: simulate successful payment and activate directly
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    // Activate organization
    const { error: orgErr } = await supabase
      .from("organizations")
      .update({
        status: "active",
        plan: validPlan,
        stripe_customer_id: `dev_cust_${Date.now()}`,
        stripe_subscription_id: `dev_sub_${Date.now()}`,
        ai_score_quota_monthly: planQuotas[validPlan] || 5000,
        billing_cycle: billing || "monthly",
        trial_ends_at: trialEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (orgErr) {
      logger.error("Failed to activate org", { error: orgErr.message });
      return res.status(500).json({ success: false, error: "Failed to activate workspace" });
    }

    // Activate user
    if (userId) {
      await supabase
        .from("users")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      await supabase
        .from("users")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("organization_id", orgId)
        .eq("status", "active");
    }

    // Seed pipeline stages (gracefully handle if table doesn't exist)
    const stages = [
      { name: "Prospecting", stage_order: 1, organization_id: orgId },
      { name: "Qualification", stage_order: 2, organization_id: orgId },
      { name: "Proposal", stage_order: 3, organization_id: orgId },
      { name: "Negotiation", stage_order: 4, organization_id: orgId },
      { name: "Closed Won", stage_order: 5, organization_id: orgId },
      { name: "Closed Lost", stage_order: 6, organization_id: orgId },
    ];
    try { await supabase.from("pipeline_stages").insert(stages); } catch {}

    // Log the payment (gracefully handle if table doesn't exist)
    try {
      await supabase.from("platform_activity_log").insert({
        organization_id: orgId,
        event_type: "payment_completed",
        event_data: {
          plan: validPlan,
          billing,
          price,
          card_last4: cardLast4 || "0000",
          trial_ends: trialEnd.toISOString(),
          email,
        },
      });
    } catch {}

    logger.info("Payment processed successfully", { orgId, plan: validPlan, price });

    res.json({
      success: true,
      data: {
        organization: { id: orgId },
        subscription: { plan: validPlan, status: "active", trial_ends_at: trialEnd.toISOString() },
        message: "Payment successful. Workspace activated.",
      },
    });
  } catch (error) {
    logger.error("Payment processing failed", { error: error.message });
    res.status(500).json({ success: false, error: "Payment processing failed" });
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
 * GET /api/billing/verify-session
 * Verifies a Stripe checkout session and returns workspace details.
 */
router.get("/verify-session", async (req, res) => {
  try {
    const { session_id, token } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, error: "Session ID is required" });
    }

    if (!stripeService.isConfigured()) {
      // Dev mode — return mock verified session
      return res.json({
        success: true,
        data: {
          id: session_id,
          status: "complete",
          payment_status: "paid",
          customer_email: "dev@pulse.local",
          plan_id: "pro",
          billing: "monthly",
          trialDays: 7,
        },
      });
    }

    const session = await stripeService.verifySession(session_id);

    if (session.status !== "complete" && session.payment_status !== "paid") {
      return res.status(402).json({
        success: false,
        error: "Payment not completed",
        redirect_url: "/payment",
      });
    }

    // Verify token matches session
    if (token) {
      try {
        const decoded = Buffer.from(token, "base64url").toString();
        const [tokenSessionId] = decoded.split(":");
        if (tokenSessionId !== session_id) {
          return res.status(403).json({ success: false, error: "Invalid verification token" });
        }
      } catch {
        // Token parsing failed — proceed without token validation
      }
    }

    // Find the org created by this session
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, plan, status, stripe_subscription_id")
      .eq("stripe_subscription_id", session.subscription_id)
      .single();

    res.json({
      success: true,
      data: {
        ...session,
        organization: org || null,
      },
    });
  } catch (error) {
    logger.error("Session verification failed", { error: error.message });
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

/**
 * POST /api/billing/setup-password
 * Sets password for a newly created user after payment confirmation.
 */
router.post("/setup-password", async (req, res) => {
  try {
    const { session_id, token, password, name } = req.body;

    if (!session_id || !password) {
      return res.status(400).json({ success: false, error: "Session ID and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    // Verify session
    let customerEmail;
    let orgId;

    if (stripeService.isConfigured()) {
      const session = await stripeService.verifySession(session_id);
      customerEmail = session.customer_email;

      // Find org
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_subscription_id", session.subscription_id)
        .single();
      orgId = org?.id;
    } else {
      // Dev mode — find any org without a user
      const { data: recentOrg } = await supabase
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      orgId = recentOrg?.id;
      customerEmail = "dev@pulse.local";
    }

    if (!orgId) {
      return res.status(404).json({ success: false, error: "Workspace not found" });
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 12);

    // Find or create user
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("organization_id", orgId)
      .eq("role", "admin")
      .limit(1)
      .single();

    if (existingUser) {
      // Update existing user's password
      await supabase
        .from("users")
        .update({
          password_hash: passwordHash,
          name: name || existingUser.name || "Admin",
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);
    } else {
      // Create new admin user
      await supabase.from("users").insert({
        name: name || "Admin",
        email: customerEmail,
        password_hash: passwordHash,
        role: "admin",
        status: "active",
        organization_id: orgId,
      });
    }

    // Generate JWT for auto-login
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const token_payload = { userId: existingUser?.id || "new", role: "admin" };
    const jwtToken = jwt.sign(token_payload, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      data: {
        token: jwtToken,
        email: customerEmail,
        organization_id: orgId,
        message: "Password set successfully. Redirecting to dashboard...",
      },
    });
  } catch (error) {
    logger.error("Password setup failed", { error: error.message });
    res.status(500).json({ success: false, error: "Setup failed" });
  }
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
