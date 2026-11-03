const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const { supabase } = require('../config/supabase');

class ReportService {
  // ============ PIPELINE REPORT ============
  async generatePipelineReport({ format = 'pdf' } = {}) {
    const { data: opps } = await supabase
      .from('opportunities')
      .select('*, account:accounts(name), owner:users!opportunities_owner_id_fkey(name)')
      .order('created_at', { ascending: false });

    const stats = this._calculatePipelineStats(opps || []);
    const flat = (opps || []).map(o => ({
      id: o.id,
      name: o.name,
      stage: o.stage,
      amount: o.amount,
      probability: o.probability,
      close_date: o.close_date,
      account_name: o.account?.name || '',
      owner_name: o.owner?.name || '',
      created_at: o.created_at,
    }));

    if (format === 'pdf') {
      return this._generatePDF('Pipeline Report', stats, flat);
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      wb.Sheets['Summary'] = XLSX.utils.json_to_sheet([
        { Metric: 'Total Opportunities', Value: stats.totalOpps },
        { Metric: 'Total Pipeline Value', Value: `₹${stats.totalValue.toLocaleString('en-IN')}` },
        { Metric: 'Won Revenue', Value: `₹${stats.wonValue.toLocaleString('en-IN')}` },
        { Metric: 'Win Rate', Value: `${stats.winRate}%` },
        { Metric: 'Average Deal Size', Value: `₹${stats.avgDealSize.toLocaleString('en-IN')}` },
      ]);
      wb.Sheets['Opportunities'] = XLSX.utils.json_to_sheet(flat.length > 0 ? flat : [{ Message: 'No opportunities found' }]);
      XLSX.utils.book_append_sheet(wb, wb.Sheets['Summary'], 'Summary');
      XLSX.utils.book_append_sheet(wb, wb.Sheets['Opportunities'], 'Opportunities');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return { data: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: 'pipeline_report.xlsx' };
    }

    const parser = new Parser();
    const csv = parser.parse(flat.length > 0 ? flat : [{ Message: 'No opportunities found' }]);
    return { data: csv, contentType: 'text/csv', filename: 'pipeline_report.csv' };
  }

  // ============ REVENUE REPORT ============
  async generateRevenueReport({ startDate, endDate, format = 'pdf' } = {}) {
    const { data: opps } = await supabase
      .from('opportunities')
      .select('amount, stage, close_date, created_at')
      .eq('stage', 'closed_won');

    let filtered = opps || [];
    if (startDate) filtered = filtered.filter(o => o.close_date >= startDate);
    if (endDate) filtered = filtered.filter(o => o.close_date <= endDate);

    const totalRevenue = filtered.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
    const monthlyRevenue = {};
    filtered.forEach(o => {
      const month = (o.close_date || o.created_at || '').slice(0, 7);
      if (month) monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (parseFloat(o.amount) || 0);
    });

    const report = {
      totalRevenue,
      dealCount: filtered.length,
      avgDeal: filtered.length ? totalRevenue / filtered.length : 0,
      monthlyRevenue,
    };

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      wb.Sheets['Revenue'] = XLSX.utils.json_to_sheet([
        { Metric: 'Total Revenue', Value: `₹${totalRevenue.toLocaleString('en-IN')}` },
        { Metric: 'Deals Won', Value: filtered.length },
        { Metric: 'Average Deal', Value: `₹${report.avgDeal.toLocaleString('en-IN')}` },
      ]);
      const monthly = Object.entries(monthlyRevenue).map(([month, rev]) => ({ Month: month, Revenue: rev }));
      wb.Sheets['Monthly'] = XLSX.utils.json_to_sheet(monthly);
      XLSX.utils.book_append_sheet(wb, wb.Sheets['Revenue'], 'Revenue');
      XLSX.utils.book_append_sheet(wb, wb.Sheets['Monthly'], 'Monthly');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return { data: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: 'revenue_report.xlsx' };
    }

    const parser = new Parser();
    const csv = parser.parse(Object.entries(monthlyRevenue).map(([month, rev]) => ({ month, revenue: rev })));
    return { data: csv, contentType: 'text/csv', filename: 'revenue_report.csv' };
  }

  // ============ ACTIVITY REPORT ============
  async generateActivityReport({ format = 'pdf' } = {}) {
    const { data: activities } = await supabase
      .from('activities')
      .select('*, owner:users!activities_owner_id_fkey(name)')
      .order('created_at', { ascending: false });

    const stats = {
      total: (activities || []).length,
      completed: (activities || []).filter(a => a.status === 'completed').length,
      pending: (activities || []).filter(a => a.status === 'pending' || a.status === 'open').length,
      overdue: (activities || []).filter(a => a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed').length,
    };

    const flat = (activities || []).map(a => ({
      id: a.id,
      type: a.type,
      subject: a.subject,
      description: a.description,
      status: a.status,
      priority: a.priority,
      due_date: a.due_date,
      owner_name: a.owner?.name || '',
      created_at: a.created_at,
    }));

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      wb.Sheets['Summary'] = XLSX.utils.json_to_sheet([
        { Metric: 'Total Activities', Value: stats.total },
        { Metric: 'Completed', Value: stats.completed },
        { Metric: 'Pending', Value: stats.pending },
        { Metric: 'Overdue', Value: stats.overdue },
      ]);
      wb.Sheets['Activities'] = XLSX.utils.json_to_sheet(flat.length > 0 ? flat : [{ Message: 'No activities found' }]);
      XLSX.utils.book_append_sheet(wb, wb.Sheets['Summary'], 'Summary');
      XLSX.utils.book_append_sheet(wb, wb.Sheets['Activities'], 'Activities');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return { data: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: 'activity_report.xlsx' };
    }

    const parser = new Parser();
    const csv = parser.parse(flat.length > 0 ? flat : [{ Message: 'No activities found' }]);
    return { data: csv, contentType: 'text/csv', filename: 'activity_report.csv' };
  }

  // ============ LEAD CONVERSION REPORT ============
  async generateLeadConversionReport({ format = 'pdf' } = {}) {
    const { data: leads } = await supabase.from('leads').select('status, rating, source, created_at');

    const byStatus = {};
    const bySource = {};
    (leads || []).forEach(l => {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      bySource[l.source || 'unknown'] = (bySource[l.source || 'unknown'] || 0) + 1;
    });

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      wb.Sheets['By Status'] = XLSX.utils.json_to_sheet(Object.entries(byStatus).map(([k, v]) => ({ Status: k, Count: v })));
      wb.Sheets['By Source'] = XLSX.utils.json_to_sheet(Object.entries(bySource).map(([k, v]) => ({ Source: k, Count: v })));
      XLSX.utils.book_append_sheet(wb, wb.Sheets['By Status'], 'By Status');
      XLSX.utils.book_append_sheet(wb, wb.Sheets['By Source'], 'By Source');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return { data: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: 'lead_conversion_report.xlsx' };
    }

    const parser = new Parser();
    const csv = parser.parse(Object.entries(byStatus).map(([status, count]) => ({ status, count })));
    return { data: csv, contentType: 'text/csv', filename: 'lead_conversion_report.csv' };
  }

  // ============ SCHEDULED REPORTS ============
  async getScheduledReports() {
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('job_type', 'report')
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  }

  async createScheduledReport(config) {
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .insert({
        name: config.name,
        job_type: 'report',
        config: {
          report_type: config.report_type,
          format: config.format || 'pdf',
          recipients: config.recipients || [],
          schedule: config.schedule,
        },
        schedule: config.schedule,
        is_active: true,
      })
      .select()
      .single();
    return { data, error };
  }

  async deleteScheduledReport(id) {
    const { error } = await supabase.from('scheduled_jobs').delete().eq('id', id);
    return { error };
  }

  // ============ HELPERS ============
  _calculatePipelineStats(opps) {
    const totalValue = opps.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
    const wonOpps = opps.filter(o => o.stage === 'closed_won');
    const wonValue = wonOpps.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
    const winRate = opps.length ? Math.round((wonOpps.length / opps.length) * 100) : 0;

    return {
      totalOpps: opps.length,
      totalValue,
      wonValue,
      winRate,
      avgDealSize: opps.length ? Math.round(totalValue / opps.length) : 0,
      byStage: opps.reduce((acc, o) => { acc[o.stage] = (acc[o.stage] || 0) + 1; return acc; }, {}),
    };
  }

  _generatePDF(title, stats, data) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve({
        data: Buffer.concat(chunks),
        contentType: 'application/pdf',
        filename: `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      }));

      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Stats
      doc.fontSize(14).text('Summary');
      doc.fontSize(10);
      doc.text(`Total Opportunities: ${stats.totalOpps}`);
      doc.text(`Pipeline Value: ₹${stats.totalValue.toLocaleString('en-IN')}`);
      doc.text(`Won Revenue: ₹${stats.wonValue.toLocaleString('en-IN')}`);
      doc.text(`Win Rate: ${stats.winRate}%`);
      doc.text(`Average Deal Size: ₹${stats.avgDealSize.toLocaleString('en-IN')}`);
      doc.moveDown();

      // Table
      if (data.length > 0) {
        doc.fontSize(14).text('Details');
        doc.fontSize(8);
        const cols = ['name', 'stage', 'amount'];
        const colWidths = [200, 120, 100];
        let y = doc.y;
        cols.forEach((col, i) => {
          doc.font('Helvetica-Bold').text(col.toUpperCase(), 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
        });

        doc.font('Helvetica');
        data.slice(0, 30).forEach(row => {
          y += 15;
          if (y > 700) { doc.addPage(); y = 50; }
          cols.forEach((col, i) => {
            const val = col === 'amount' ? `₹${parseFloat(row[col] || 0).toLocaleString('en-IN')}` : (row[col] || '');
            doc.text(String(val).substring(0, 40), 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
          });
        });
      }

      doc.end();
    });
  }
}

module.exports = new ReportService();
