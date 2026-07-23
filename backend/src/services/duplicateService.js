const { supabase } = require("../config/supabase");

const findDuplicateLeads = async (email, firstName, lastName, company) => {
  try {
    let query = supabase.from("leads").select("id, first_name, last_name, email, company, status, created_at").neq("status", "converted");
    // Check by email if provided
    if (email) {
      const { data: byEmail } = await query.ilike("email", email);
      if (byEmail && byEmail.length > 0) return { duplicates: byEmail, matchType: "email" };
    }
    // Check by name + company
    if (firstName && lastName) {
      const { data: byName } = await supabase.from("leads").select("id, first_name, last_name, email, company, status, created_at")
        .ilike("first_name", firstName).ilike("last_name", lastName).neq("status", "converted");
      if (byName && byName.length > 0) return { duplicates: byName, matchType: "name" };
    }
    return { duplicates: [], matchType: null };
  } catch (err) { return { duplicates: [], matchType: null, error: err.message }; }
};

const findDuplicateContacts = async (email, firstName, lastName, accountId) => {
  try {
    if (email) {
      const { data } = await supabase.from("contacts").select("id, first_name, last_name, email, account_id").ilike("email", email);
      if (data && data.length > 0) return { duplicates: data, matchType: "email" };
    }
    if (firstName && lastName && accountId) {
      const { data } = await supabase.from("contacts").select("id, first_name, last_name, email, account_id")
        .ilike("first_name", firstName).ilike("last_name", lastName).eq("account_id", accountId);
      if (data && data.length > 0) return { duplicates: data, matchType: "name_account" };
    }
    return { duplicates: [], matchType: null };
  } catch (err) { return { duplicates: [], matchType: null, error: err.message }; }
};

const findDuplicateAccounts = async (name) => {
  try {
    if (!name) return { duplicates: [], matchType: null };
    const { data } = await supabase.from("accounts").select("id, name, industry, website").ilike("name", name);
    if (data && data.length > 0) return { duplicates: data, matchType: "name" };
    return { duplicates: [], matchType: null };
  } catch (err) { return { duplicates: [], matchType: null, error: err.message }; }
};

const checkDuplicatesHandler = async (req, res, next) => {
  try {
    const { entity_type, email, first_name, last_name, company, account_id, name } = req.body;
    let result;
    switch (entity_type) {
      case "lead": result = await findDuplicateLeads(email, first_name, last_name, company); break;
      case "contact": result = await findDuplicateContacts(email, first_name, last_name, account_id); break;
      case "account": result = await findDuplicateAccounts(name); break;
      default: result = { duplicates: [], matchType: null };
    }
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

module.exports = { findDuplicateLeads, findDuplicateContacts, findDuplicateAccounts, checkDuplicatesHandler };
