// ============================================================
// Stripe Webhook Routes — Handles checkout.session.completed
// Includes Redis-backed idempotency guard.
// ============================================================
const express = require("express");
const router = express.Router();
const stripeService = require("../services/stripeService");
const { provisionWorkspace } = require("../services/onboardingService");
const { supabase } = require("../config/supabase");
const emailService = require("../services/emailService");
const { logger } = require("../middleware/logger");
const { recordWebhookEvent } = require("../config/redis");

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

    // Idempotency: skip already-processed events
    const isDuplicate = await recordWebhookEvent(event.id);
    if (!isDuplicate) {
      logger.info("Webhook event already processed, skipping", { eventId: event.id });
      return res.json({ received: true, duplicate: true });
    }

    logger.info("Processing webhook event", { eventId: event.id, type: event.type });

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { org_id, user_id, plan_id, billing, type, trialDays } = session.metadata || {};

        logger.info("Stripe checkout completed", {
          sessionId: session.id,
          customer: session.customer,
          orgId: org_id,
          userId: user_id,
          type: type || "paid",
        });

        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerName = session.customer_details?.name;

        if (org_id) {
          const updateData = {
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: "active",
          };

          if (type === "trial") {
            updateData.status = "trial";
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + (parseInt(trialDays) || 7));
            updateData.trial_ends_at = trialEnd.toISOString();
          }

          await supabase.from("organizations").update(updateData).eq("id", org_id);

          if (user_id) {
            await supabase
              .from("users")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", user_id);
          } else {
            await supabase
              .from("users")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("organization_id", org_id)
              .eq("status", "pending");
          }

          // Send confirmation email
          if (customerEmail) {
            const setupToken = Buffer.from(`${session.id}:${org_id}:${Date.now()}`).toString("base64url");
            const setupUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/checkout/success?session_id=${session.id}&token=${setupToken}`;

            try {
              await emailService.sendEmail({
                to: customerEmail,
                subject: "Payment Confirmed — Set Up Your OptiRev Workspace",
                html: `
                  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 48px; height: 48px; background: #2563eb; border-radius: 12px; line-height: 48px; color: white; font-size: 24px;">✓</div>
                    </div>
                    <h2 style="color: #1a2332; text-align: center;">Payment Confirmed!</h2>
                    <p style="color: #555; line-height: 1.6; text-align: center;">
                      Your <strong>${plan_id || "Pro"}</strong> subscription is now active.
                      ${type === "trial" ? `You have a <strong>${trialDays || 7}-day free trial</strong> included.` : ""}
                    </p>
                    <p style="color: #555; line-height: 1.6; text-align: center;">
                      Click below to set your password and start using your workspace:
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                      <a href="${setupUrl}"
                         style="display: inline-block; padding: 14px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        Set Up Your Workspace
                      </a>
                    </div>
                    <p style="color: #999; font-size: 13px; text-align: center;">
                      This link expires in 24 hours. If you didn't make this purchase, please contact support.
                    </p>
                  </div>
                `,
              });
            } catch (e) {
              logger.warn("Confirmation email failed", { error: e.message });
            }
          }
        } else {
          if (customerEmail) {
            const result = await provisionWorkspace({
              orgName: `${customerEmail.split("@")[0]}'s Workspace`,
              email: customerEmail,
              name: customerName || "Admin",
              planId: plan_id || "pro",
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              billing: billing || "monthly",
            });

            if (result.organization) {
              const setupToken = Buffer.from(`${session.id}:${result.organization.id}:${Date.now()}`).toString("base64url");
              const setupUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/checkout/success?session_id=${session.id}&token=${setupToken}`;

              try {
                await emailService.sendEmail({
                  to: customerEmail,
                  subject: "Welcome to OptiRev — Set Up Your Workspace",
                  html: `
                    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                      <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; width: 48px; height: 48px; background: #2563eb; border-radius: 12px; line-height: 48px; color: white; font-size: 24px;">✓</div>
                      </div>
                      <h2 style="color: #1a2332; text-align: center;">Welcome to OptiRev!</h2>
                      <p style="color: #555; line-height: 1.6; text-align: center;">
                        Your <strong>${plan_id || "Pro"}</strong> workspace is ready.
                        ${type === "trial" ? `You have a <strong>${trialDays || 7}-day free trial</strong> included.` : ""}
                      </p>
                      <p style="color: #555; line-height: 1.6; text-align: center;">
                        Click below to set your password and start using your workspace:
                      </p>
                      <div style="text-align: center; margin: 24px 0;">
                        <a href="${setupUrl}"
                           style="display: inline-block; padding: 14px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                          Set Up Your Workspace
                        </a>
                      </div>
                      <p style="color: #999; font-size: 13px; text-align: center;">
                        This link expires in 24 hours. If you didn't make this purchase, please contact support.
                      </p>
                    </div>
                  `,
                });
              } catch (e) {
                logger.warn("Welcome email failed", { error: e.message });
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const newStatus = subscription.status === "active" ? "active" :
          subscription.status === "trialing" ? "active" : "suspended";

        const updateData = {
          status: newStatus,
          stripe_subscription_id: subscription.id,
        };

        if (subscription.status === "active") {
          updateData.status = "active";
        }

        await supabase
          .from("organizations")
          .update(updateData)
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
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing error", { error: error.message });
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;
