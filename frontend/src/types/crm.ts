// ============================================================
// CRM Types - Business CRM (Salesforce-style)
// ============================================================

// Account (Company)
export interface Account {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  annual_revenue?: number;
  number_of_employees?: number;
  description?: string;
  owner?: { id: string; name: string; email: string };
  created_by?: string;
  created_at: string;
  updated_at: string;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  activities?: Activity[];
}

// Contact (Person at company)
export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  account_id?: string;
  account?: { id: string; name: string };
  owner?: { id: string; name: string; email: string };
  mailing_address?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  lead_source?: string;
  created_at: string;
  updated_at: string;
  activities?: Activity[];
  opportunities?: Opportunity[];
}

// Lead (Prospect before conversion)
export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  industry?: string;
  source?: string;
  status: "new" | "contacted" | "qualified" | "unqualified" | "converted";
  rating: "hot" | "warm" | "cold";
  annual_revenue?: number;
  number_of_employees?: number;
  website?: string;
  description?: string;
  owner?: { id: string; name: string; email: string };
  converted_account_id?: string;
  converted_contact_id?: string;
  converted_opportunity_id?: string;
  converted_at?: string;
  lead_score: number;
  score_category: "low" | "medium" | "high";
  tags?: string[];
  created_at: string;
  updated_at: string;
  activities?: Activity[];
}

// Opportunity (Deal in pipeline)
export interface Opportunity {
  id: string;
  name: string;
  account_id?: string;
  account?: { id: string; name: string; industry?: string; phone?: string; email?: string };
  contact_id?: string;
  contact?: { id: string; first_name: string; last_name: string; email?: string; phone?: string; title?: string };
  stage: "prospecting" | "qualification" | "needs_analysis" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  amount: number;
  probability: number;
  expected_revenue?: number;
  close_date?: string;
  type?: "new_business" | "existing_business" | "renewal";
  lead_source?: string;
  description?: string;
  owner?: { id: string; name: string; email: string };
  tags?: string[];
  created_at: string;
  updated_at: string;
  products?: OpportunityProduct[];
  activities?: Activity[];
}

// Activity (Call, Email, Meeting, Task, Note)
export type ActivityType = "call" | "email" | "meeting" | "task" | "note";
export type ActivityStatus = "open" | "completed" | "cancelled";

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  status: ActivityStatus;
  priority: "low" | "normal" | "high" | "urgent";
  due_date?: string;
  completed_at?: string;
  duration_minutes?: number;
  who_id?: string;
  what_id?: string;
  who_type?: "contact" | "lead";
  what_type?: "account" | "opportunity";
  owner?: { id: string; name: string; email: string };
  created_at: string;
  updated_at: string;
}

// Product
export interface Product {
  id: string;
  name: string;
  code?: string;
  description?: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
}

// Opportunity Product (Line item)
export interface OpportunityProduct {
  id: string;
  opportunity_id: string;
  product_id?: string;
  product?: { id: string; name: string; code?: string };
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Campaign
export interface Campaign {
  id: string;
  name: string;
  type: "email" | "social" | "webinar" | "event" | "ads" | "referral" | "other";
  status: "planning" | "active" | "paused" | "completed" | "cancelled";
  start_date?: string;
  end_date?: string;
  budget: number;
  actual_cost: number;
  expected_leads: number;
  actual_leads: number;
  member_count: number;
  converted_leads: number;
  converted_contacts: number;
  converted_opportunities: number;
  pipeline_value: number;
  closed_value: number;
  roi: number;
  description?: string;
  owner?: { id: string; name: string; email: string };
  created_at: string;
  updated_at: string;
  // Analytics (from getCampaign detail)
  status_breakdown?: Record<string, number>;
  rating_breakdown?: Record<string, number>;
  source_breakdown?: Record<string, number>;
  avg_lead_score?: number;
  responses?: CampaignResponse[];
}

export interface CampaignResponse {
  id: string;
  campaign_id: string;
  lead_id?: string;
  contact_id?: string;
  response_type: "sent" | "opened" | "clicked" | "replied" | "bounced" | "converted";
  channel: string;
  metadata: Record<string, unknown>;
  lead?: { first_name: string; last_name: string; email: string };
  contact?: { first_name: string; last_name: string; email: string };
  created_at: string;
}

export const CAMPAIGN_TYPES = [
  { id: "email", label: "Email" },
  { id: "social", label: "Social Media" },
  { id: "webinar", label: "Webinar" },
  { id: "event", label: "Event" },
  { id: "ads", label: "Paid Ads" },
  { id: "referral", label: "Referral" },
  { id: "other", label: "Other" },
] as const;

export const CAMPAIGN_STATUSES = [
  { id: "planning", label: "Planning", color: "bg-slate-400" },
  { id: "active", label: "Active", color: "bg-emerald-500" },
  { id: "paused", label: "Paused", color: "bg-amber-500" },
  { id: "completed", label: "Completed", color: "bg-blue-500" },
  { id: "cancelled", label: "Cancelled", color: "bg-red-400" },
] as const;

// Pipeline stages
export const PIPELINE_STAGES = [
  { id: "prospecting", label: "Prospecting", color: "bg-slate-400" },
  { id: "qualification", label: "Qualification", color: "bg-blue-500" },
  { id: "needs_analysis", label: "Needs Analysis", color: "bg-cyan-500" },
  { id: "proposal", label: "Proposal", color: "bg-purple-500" },
  { id: "negotiation", label: "Negotiation", color: "bg-amber-500" },
  { id: "closed_won", label: "Closed Won", color: "bg-emerald-500" },
  { id: "closed_lost", label: "Closed Lost", color: "bg-red-400" },
] as const;

// Lead statuses
export const LEAD_STATUSES = [
  { id: "new", label: "New", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-amber-500" },
  { id: "qualified", label: "Qualified", color: "bg-emerald-500" },
  { id: "unqualified", label: "Unqualified", color: "bg-slate-400" },
  { id: "converted", label: "Converted", color: "bg-purple-500" },
] as const;

// Kanban column
export interface KanbanColumn {
  id: string;
  title: string;
  items: any[];
  color: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: { page: number; limit: number; total: number; pages: number };
}

// Settings
export interface AppSettings {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  emailIntegration: boolean;
  autoScore: boolean;
}
