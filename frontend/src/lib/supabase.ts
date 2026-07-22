// ============================================================
// Supabase Client - Direct database connection
// ============================================================
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client with proper typing
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper: Get current user session
export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// Helper: Fetch leads with pagination
export async function fetchLeads(page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { leads: data, total: count ?? 0 };
}

// Helper: Update lead status (for Kanban drag-drop)
export async function updateLeadStatus(
  leadId: string,
  newStatus: string
) {
  const { data, error } = await supabase
    .from("leads")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Create new lead
export async function createLead(lead: {
  title: string;
  name: string;
  email: string;
  company?: string;
  amount: number;
  status?: string;
}) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...lead,
      status: lead.status || "new",
      lead_score: 0,
      score_category: "low",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Fetch dashboard statistics
export async function fetchDashboardStats() {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("status, amount");

  if (error) throw error;

  const stats = {
    totalLeads: leads?.length ?? 0,
    totalRevenue: leads?.reduce((sum, l) => sum + (l.amount || 0), 0) ?? 0,
    leadsByStatus: {} as Record<string, number>,
  };

  leads?.forEach((lead) => {
    stats.leadsByStatus[lead.status] =
      (stats.leadsByStatus[lead.status] || 0) + 1;
  });

  return stats;
}
