// ============================================================
// Onboarding Service — Auto-provision workspace after checkout
// ============================================================
const { supabase } = require("../config/supabase");
const emailService = require("./emailService");
const { logActivity } = require("../middleware/activityLogger");
const { logger } = require("../middleware/logger");
const { PLAN_MAP } = require("./stripeService");

const DEFAULT_PIPELINE_STAGES = [
  { name: "Prospecting", stage_order: 1 },
  { name: "Qualification", stage_order: 2 },
  { name: "Proposal", stage_order: 3 },
  { name: "Negotiation", stage_order: 4 },
  { name: "Closed Won", stage_order: 5 },
  { name: "Closed Lost", stage_order: 6 },
];

/**
 * Provision a new organization + admin user after Stripe checkout
 */
async function provisionWorkspace({ orgName, email, name, planId, stripeCustomerId, stripeSubscriptionId, billing }) {
  const plan = PLAN_MAP[planId] || PLAN_MAP.pro;
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 1. Create organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      slug: `${slug}-${Date.now()}`,
      plan: planId || "pro",
      status: "active",
      stripe_customer_id: stripeCustomerId || null,
      stripe_subscription_id: stripeSubscriptionId || null,
      ai_score_quota_monthly: plan.quota,
      billing_cycle: billing || "monthly",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, name, slug, plan")
    .single();

  if (orgErr) {
    logger.error("Failed to create organization", { error: orgErr.message });
    throw orgErr;
  }

  logger.info("Organization created", { orgId: org.id, name: org.name, plan: org.plan });

  // 2. Create admin user (if provided)
  let adminUser = null;
  if (email && name) {
    const bcrypt = require("bcryptjs");
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const { data: user, error: userErr } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password_hash: passwordHash,
        role: "admin",
        status: "active",
        organization_id: org.id,
      })
      .select("id, name, email, role")
      .single();

    if (userErr && !userErr.message?.includes("duplicate")) {
      logger.error("Failed to create admin user", { error: userErr.message });
    } else {
      adminUser = user;
    }
  }

  // 3. Seed default pipeline stages
  const stages = DEFAULT_PIPELINE_STAGES.map((s) => ({
    ...s,
    organization_id: org.id,
  }));
  const { error: stageErr } = await supabase.from("pipeline_stages").insert(stages);
  if (stageErr) {
    logger.warn("Pipeline stages may already exist", { error: stageErr.message });
  }

  // 4. Send welcome email
  try {
    await emailService.sendEmail({
      to: email,
      subject: "Welcome to Pulse CRM — Your workspace is ready!",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1a2332;">Welcome to Pulse CRM, ${name}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Your <strong>${org.plan}</strong> workspace "<strong>${org.name}</strong>" is now active.
          </p>
          <p style="color: #555; line-height: 1.6;">
            You can now log in and start adding leads, contacts, and deals.
            Your AI lead scoring engine is ready with <strong>${plan.quota === -1 ? "unlimited" : plan.quota + " monthly"}</strong> predictions.
          </p>
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login"
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px;">
            Log in to your workspace
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 32px;">
            If you have any questions, reply to this email or visit our docs.
          </p>
        </div>
      `,
    });
  } catch (e) {
    logger.warn("Welcome email failed", { error: e.message });
  }

  // 5. Log activity
  logActivity({
    userId: adminUser?.id || "system",
    action: "org.created",
    entityType: "organization",
    entityId: org.id,
    details: { name: org.name, plan: org.plan, billing },
  });

  return { organization: org, user: adminUser };
}

module.exports = { provisionWorkspace };
