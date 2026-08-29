const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const { supabase } = require('../config/supabase');
const { scoreAndUpdateLead } = require('./scoringService');

class ImportExportService {
  // ============ EXPORT ============

  async exportLeads({ format = 'csv', filters = {} } = {}) {
    let query = supabase.from('leads').select('*');
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return { error };

    return this._format(data, format, 'leads');
  }

  async exportContacts({ format = 'csv', filters = {} } = {}) {
    let query = supabase.from('contacts').select('*, account:accounts(name)');
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return { error };

    const flat = (data || []).map(c => ({
      ...c,
      account_name: c.account?.name || '',
      account: undefined,
    }));

    return this._format(flat, format, 'contacts');
  }

  async exportAccounts({ format = 'csv', filters = {} } = {}) {
    let query = supabase.from('accounts').select('*');
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return { error };

    return this._format(data || [], format, 'accounts');
  }

  async exportOpportunities({ format = 'csv', filters = {} } = {}) {
    let query = supabase.from('opportunities').select('*, account:accounts(name)');
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.stage) query = query.eq('stage', filters.stage);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return { error };

    const flat = (data || []).map(o => ({
      ...o,
      account_name: o.account?.name || '',
      account: undefined,
    }));

    return this._format(flat, format, 'opportunities');
  }

  async exportActivities({ format = 'csv', filters = {} } = {}) {
    let query = supabase.from('activities').select('*, assignee:users(name)');
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return { error };

    const flat = (data || []).map(a => ({
      ...a,
      assignee_name: a.assignee?.name || '',
      assignee: undefined,
    }));

    return this._format(flat || [], format, 'activities');
  }

  // ============ IMPORT ============

  async importLeads(rows, userId) {
    const results = { imported: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const firstName = row.first_name || row.FirstName || row.firstname || row.first || '';
        const lastName = row.last_name || row.LastName || row.lastname || row.last || row.surname || '';
        const fullName = row.name || row.Name || row.full_name || row.FullName || '';
        const nameParts = fullName ? fullName.trim().split(/\s+/) : [];
        const finalFirst = firstName || nameParts[0] || '';
        const finalLast = lastName || nameParts.slice(1).join(' ') || '';

        if (!finalFirst || !row.email) {
          results.skipped++;
          results.errors.push(`Skipped row: missing first_name or email`);
          continue;
        }

        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('email', row.email)
          .limit(1);

        if (existing && existing.length > 0) {
          results.skipped++;
          continue;
        }

        const lead = {
          first_name: finalFirst,
          last_name: finalLast,
          email: row.email || row.Email || '',
          phone: row.phone || row.Phone || row.mobile || row.Mobile || '',
          company: row.company || row.Company || '',
          title: row.title || row.Title || 'Imported Lead',
          industry: row.industry || row.Industry || null,
          source: row.source || row.Source || 'import',
          status: row.status || row.Status || 'new',
          rating: row.rating || row.Rating || 'warm',
          annual_revenue: row.annual_revenue ? parseFloat(row.annual_revenue) : null,
          number_of_employees: row.number_of_employees ? parseInt(row.number_of_employees) : null,
          website: row.website || row.Website || null,
          description: row.description || row.Description || row.notes || row.Notes || '',
          owner_id: userId,
          created_by: userId,
        };

        const { data: inserted, error } = await supabase.from('leads').insert(lead).select('id').single();
        if (error) {
          results.skipped++;
          results.errors.push(error.message);
        } else {
          results.imported++;
          if (inserted && inserted.id) {
            scoreAndUpdateLead(inserted.id).catch(() => {});
          }
        }
      } catch (err) {
        results.skipped++;
        results.errors.push(err.message);
      }
    }

    return results;
  }

  async importContacts(rows, userId) {
    const results = { imported: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const contact = {
          first_name: row.first_name || row.first || row.First || '',
          last_name: row.last_name || row.last || row.Last || row.name || row.Name || '',
          email: row.email || row.Email || '',
          phone: row.phone || row.Phone || '',
          title: row.title || row.Title || row.position || '',
          owner_id: userId,
        };

        if (!contact.first_name || !contact.last_name || !contact.email) {
          results.skipped++;
          continue;
        }

        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', contact.email)
          .limit(1);

        if (existing && existing.length > 0) {
          results.skipped++;
          continue;
        }

        const { error } = await supabase.from('contacts').insert(contact);
        if (error) {
          results.skipped++;
          results.errors.push(error.message);
        } else {
          results.imported++;
        }
      } catch (err) {
        results.skipped++;
        results.errors.push(err.message);
      }
    }

    return results;
  }

  async importAccounts(rows, userId) {
    const results = { imported: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const account = {
          name: row.name || row.Name || row.company || row.Company || '',
          industry: row.industry || row.Industry || '',
          website: row.website || row.Website || '',
          phone: row.phone || row.Phone || '',
          city: row.city || row.City || '',
          state: row.state || row.State || '',
          country: row.country || row.Country || '',
          annual_revenue: parseFloat(row.annual_revenue || row.revenue || row.Revenue || 0),
          number_of_employees: parseInt(row.employees || row.number_of_employees || row.Employees || 0),
          owner_id: userId,
        };

        if (!account.name) {
          results.skipped++;
          continue;
        }

        const { data: existing } = await supabase
          .from('accounts')
          .select('id')
          .eq('name', account.name)
          .limit(1);

        if (existing && existing.length > 0) {
          results.skipped++;
          continue;
        }

        const { error } = await supabase.from('accounts').insert(account);
        if (error) {
          results.skipped++;
          results.errors.push(error.message);
        } else {
          results.imported++;
        }
      } catch (err) {
        results.skipped++;
        results.errors.push(err.message);
      }
    }

    return results;
  }

  // ============ HELPERS ============

  _format(data, format, entityName) {
    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, entityName);
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        data: buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${entityName}_export.xlsx`,
      };
    }

    // CSV default
    const parser = new Parser();
    const csv = parser.parse(data);
    return {
      data: csv,
      contentType: 'text/csv',
      filename: `${entityName}_export.csv`,
    };
  }

  parseImportFile(file) {
    const ext = (file.originalname || '').split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws);
    }

    // CSV
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  }
}

module.exports = new ImportExportService();
