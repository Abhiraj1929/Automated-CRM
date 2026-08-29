// ============================================================
// Invitation Service — Handle team member invites
// ============================================================
const crypto = require("crypto");
const { supabase } = require("../config/supabase");
const { logger } = require("../middleware/logger");
const emailService = require("./emailService");

const INVITATION_EXPIRY_DAYS = 7;

// Plan user limits
const PLAN_LIMITS = {
  starter: 5,
  pro: 50,
  enterprise: 999999,
};

class InvitationService {
  /**
   * Check if org can add more users
   */
  async canAddUser(orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, max_users")
      .eq("id", orgId)
      .single();

    if (!org) return { allowed: false, error: "Organization not found" };

    const limit = org.max_users || PLAN_LIMITS[org.plan] || PLAN_LIMITS.starter;

    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active");

    if (count >= limit) {
      return {
        allowed: false,
        error: `User limit reached (${limit} for ${org.plan} plan). Upgrade to add more team members.`,
        current: count,
        limit,
        plan: org.plan,
      };
    }

    return { allowed: true, current: count, limit, plan: org.plan };
  }

  /**
   * Create an invitation
   */
  async createInvitation({ orgId, email, role, department, designation, invitedBy }) {
    // Check quota
    const quota = await this.canAddUser(orgId);
    if (!quota.allowed) {
      return { success: false, error: quota.error };
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("organization_id", orgId)
      .limit(1)
      .single();

    if (existingUser) {
      return { success: false, error: "User with this email already exists in your organization" };
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("email", email)
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (existingInvite) {
      return { success: false, error: "A pending invitation already exists for this email" };
    }

    // Generate secure token
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error } = await supabase
      .from("invitations")
      .insert({
        organization_id: orgId,
        email,
        role: role || "employee",
        department: department || null,
        designation: designation || null,
        token,
        invited_by: invitedBy,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id, email, role, status, expires_at, created_at")
      .single();

    if (error) throw error;

    // Send invitation email (best effort)
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    const { data: inviter } = await supabase
      .from("users")
      .select("name")
      .eq("id", invitedBy)
      .single();

    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite?token=${token}`;

    try {
      await emailService.sendEmail({
        to: email,
        subject: `You're invited to join ${org?.name || "CRM"} on Pulse`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3b82f6;">You're Invited!</h2>
            <p><strong>${inviter?.name || "Admin"}</strong> has invited you to join <strong>${org?.name || "CRM"}</strong> on Pulse CRM.</p>
            <p>Your role: <strong>${role || "Employee"}</strong></p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 13px;">This invitation expires in ${INVITATION_EXPIRY_DAYS} days. If you didn't expect this email, you can safely ignore it.</p>
          </div>
        `,
      });
    } catch (err) {
      logger.warn("Invitation email failed (non-fatal)", { error: err.message });
    }

    return {
      success: true,
      data: invitation,
      inviteUrl,
      quota: { current: quota.current + 1, limit: quota.limit },
    };
  }

  /**
   * Verify invitation token
   */
  async verifyToken(token) {
    const { data: invitation, error } = await supabase
      .from("invitations")
      .select("*, organization:organizations(name), inviter:users!invitations_invited_by_fkey(name, email)")
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return { valid: false, error: "Invalid invitation link" };
    }

    if (invitation.status === "accepted") {
      return { valid: false, error: "This invitation has already been accepted" };
    }

    if (invitation.status === "revoked") {
      return { valid: false, error: "This invitation has been revoked" };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return { valid: false, error: "This invitation has expired" };
    }

    return {
      valid: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        designation: invitation.designation,
        organizationName: invitation.organization?.name,
        inviterName: invitation.inviter?.name,
      },
    };
  }

  /**
   * Accept invitation — create user + link to org
   */
  async acceptInvitation({ token, name, password }) {
    // Verify token
    const verification = await this.verifyToken(token);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const inv = verification.data;

    // Check quota again
    const { data: invitation } = await supabase
      .from("invitations")
      .select("organization_id, role, department, designation")
      .eq("token", token)
      .single();

    const quota = await this.canAddUser(invitation.organization_id);
    if (!quota.allowed) {
      return { success: false, error: quota.error };
    }

    // Check if user already exists (maybe from another invite)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, organization_id")
      .eq("email", inv.email)
      .single();

    if (existingUser && existingUser.organization_id) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    let userId;

    if (existingUser) {
      // Update existing user record
      const { data: updated } = await supabase
        .from("users")
        .update({
          name,
          password_hash,
          role: invitation.role,
          department: invitation.department || null,
          designation: invitation.designation || null,
          organization_id: invitation.organization_id,
          status: "active",
        })
        .eq("id", existingUser.id)
        .select("id")
        .single();
      userId = updated.id;
    } else {
      // Create new user
      const { data: newUser, error: createErr } = await supabase
        .from("users")
        .insert({
          name,
          email: inv.email,
          password_hash,
          role: invitation.role,
          department: invitation.department || null,
          designation: invitation.designation || null,
          organization_id: invitation.organization_id,
          status: "active",
        })
        .select("id")
        .single();

      if (createErr) throw createErr;
      userId = newUser.id;
    }

    // Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("token", token);

    // Increment org user count
    try {
      await supabase.rpc("increment_org_user_count", { org_id: invitation.organization_id });
    } catch {
      // Fallback: manual increment
      try {
        await supabase
          .from("organizations")
          .update({ current_user_count: (quota.current || 0) + 1 })
          .eq("id", invitation.organization_id);
      } catch {}
    }

    logger.info("Invitation accepted", { userId, email: inv.email, orgId: invitation.organization_id });

    return {
      success: true,
      data: { userId, email: inv.email, role: invitation.role },
    };
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(invitationId, orgId) {
    const { error } = await supabase
      .from("invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", invitationId)
      .eq("organization_id", orgId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId, orgId) {
    const { data: inv } = await supabase
      .from("invitations")
      .select("*, organization:organizations(name), inviter:users!invitations_invited_by_fkey(name)")
      .eq("id", invitationId)
      .eq("organization_id", orgId)
      .single();

    if (!inv) return { success: false, error: "Invitation not found" };

    // Generate new token
    const newToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("invitations")
      .update({ token: newToken, expires_at: expiresAt, status: "pending", updated_at: new Date().toISOString() })
      .eq("id", invitationId);

    // Send email
    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite?token=${newToken}`;

    try {
      await emailService.sendEmail({
        to: inv.email,
        subject: `Reminder: Join ${inv.organization?.name || "CRM"} on Pulse`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3b82f6;">Invitation Reminder</h2>
            <p>You were invited to join <strong>${inv.organization?.name || "CRM"}</strong> on Pulse CRM.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 13px;">This invitation expires in ${INVITATION_EXPIRY_DAYS} days.</p>
          </div>
        `,
      });
    } catch (err) {
      logger.warn("Resend invitation email failed", { error: err.message });
    }

    return { success: true };
  }

  /**
   * List invitations for an org
   */
  async listInvitations(orgId, status) {
    let query = supabase
      .from("invitations")
      .select("id, email, role, department, designation, status, expires_at, accepted_at, created_at, inviter:users!invitations_invited_by_fkey(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

module.exports = new InvitationService();
