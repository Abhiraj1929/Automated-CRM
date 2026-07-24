const nodemailer = require('nodemailer');
const { supabase } = require('../config/supabase');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  init() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
      console.warn('⚠️  SMTP not configured — emails will be logged but not sent');
      this.from = from || 'noreply@crm.com';
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    this.from = from;
    this.initialized = true;
    console.log(`✅ Email service initialized (SMTP: ${host}:${port})`);
  }

  async sendEmail({ to, subject, html, text, from, attachments }) {
    const sender = from || this.from;

    // Always log to database
    const { data: log } = await supabase
      .from('email_logs')
      .insert({
        sender_id: null,
        recipient: Array.isArray(to) ? to.join(', ') : to,
        subject,
        body: text || html,
        template_id: null,
        status: 'pending',
      })
      .select()
      .single();

    // Actually send if configured
    if (this.initialized && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: sender,
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          html,
          text,
          attachments,
        });

        if (log) {
          await supabase
            .from('email_logs')
            .update({ status: 'sent' })
            .eq('id', log.id);
        }

        console.log(`📧 Email sent to ${to}: ${subject}`);
        return { success: true, logId: log?.id };
      } catch (err) {
        console.error(`❌ Email send failed: ${err.message}`);
        if (log) {
          await supabase
            .from('email_logs')
            .update({ status: 'failed' })
            .eq('id', log.id);
        }
        return { success: false, error: err.message, logId: log?.id };
      }
    }

    // No SMTP — just log
    if (log) {
      await supabase
        .from('email_logs')
        .update({ status: 'sent' })
        .eq('id', log.id);
    }
    return { success: true, logId: log?.id, note: 'Email logged (SMTP not configured)' };
  }

  renderTemplate(template, variables = {}) {
    let rendered = template.body || template.content || '';
    const vars = { ...template.defaults, ...variables };

    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, value != null ? String(value) : '');
    }

    return {
      subject: (template.subject || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] || ''),
      html: rendered,
      text: rendered.replace(/<[^>]*>/g, ''),
    };
  }

  async sendTemplatedEmail({ templateId, to, variables = {}, senderId }) {
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!template) return { success: false, error: 'Template not found' };

    const rendered = this.renderTemplate(template, variables);

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      from: this.from,
    });
  }

  async getTemplates() {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  }

  async createTemplate(template) {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(template)
      .select()
      .single();
    return { data, error };
  }

  async updateTemplate(id, updates) {
    const { data, error } = await supabase
      .from('email_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  async deleteTemplate(id) {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);
    return { error };
  }

  async getLogs({ page = 1, limit = 20, recipient } = {}) {
    let query = supabase
      .from('email_logs')
      .select('*, sender:users(name, email)', { count: 'exact' });

    if (recipient) query = query.ilike('recipient', `%${recipient}%`);

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;
    return { data: data || [], total: count || 0, page, limit, error };
  }
}

module.exports = new EmailService();
