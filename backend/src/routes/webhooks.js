// ============================================================
// Stripe Webhook Routes — Handles checkout.session.completed
// ============================================================
const express = require("express");
const router = express.Router();
const stripeService = require("../services/stripeService");
const { provisionWorkspace } = require("../services/onboardingService");
const { supabase } = require("../config/supabase");
const { logger } = require("../middleware/logger");

/**
 * POST /api/webhooks/stripe
 * Raw body endpoint for Stripe webhook events.
 * Must be mounted BEFORE express.json() or use express.raw().
 */
router.post("/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    let event;
    try {
      event = await stripeService.constructWebhookEvent(req.body, signature);
    } catch (err) {
      logger.error("Webhook signature verification failed", { error: err.message });
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { org_id, plan_id, billing } = session.metadata || {};

        logger.info("Stripe checkout completed", {
          sessionId: session.id,
          customer: session.customer,
          orgId: org_id,
        });

        // If org_id was in metadata, update it with Stripe IDs
        if (org_id) {
          await supabase
            .from("organizations")
            .update({
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              status: "active",
            })
            .eq("id", org_id);
        } else {
          // New workspace — provision from checkout data
          const customerEmail = session.customer_details?.email || session.customer_email;
          const customerName = session.customer_details?.name;

          if (customerEmail) {
            await provisionWorkspace({
              orgName: `${customerEmail.split("@")[0]}'s Workspace`,
              email: customerEmail,
              name: customerName || "Admin",
              planId: plan_id || "pro",
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              billing: billing || "monthly",
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const planId = subscription.items?.data?.[0]?.price?.id;

        // Update org status
        await supabase
          .from("organizations")
          .update({
            status: subscription.status === "active" ? "active" : "suspended",
            stripe_subscription_id: subscription.id,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await supabase
          .from("organizations")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing error", { error: error.message });
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;
