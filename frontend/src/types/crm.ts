// ============================================================
// CRM Types - TypeScript definitions for the application
// ============================================================

// Lead status enum matching Kanban columns
export type LeadStatus = "new" | "contacted" | "proposal_sent" | "won" | "lost";

// Lead score categories for badge display
export type LeadScoreCategory = "high" | "medium" | "low";

// Base Lead interface
export interface Lead {
  id: string;
  title: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  amount: number;
  status: LeadStatus;
  leadScore: number; // 0-100
  scoreCategory: LeadScoreCategory;
  owner: TeamMember;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  notes?: string;
}

// Kanban column definition
export interface KanbanColumn {
  id: LeadStatus;
  title: string;
  leads: Lead[];
  color: string;
}

// Team member / User
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "admin" | "manager" | "sales_rep";
}

// Deal (extends Lead with additional fields)
export interface Deal extends Lead {
  closeDate?: string;
  pipeline?: string;
  probability?: number;
}

// Contact
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  avatar?: string;
  lastContacted?: string;
  tags?: string[];
}

// Dashboard stats
export interface DashboardStats {
  totalLeads: number;
  totalDeals: number;
  totalRevenue: number;
  conversionRate: number;
  leadsByStatus: Record<LeadStatus, number>;
  recentActivity: Activity[];
}

// Activity log
export interface Activity {
  id: string;
  type: "lead_created" | "deal_updated" | "email_sent" | "call_made";
  description: string;
  timestamp: string;
  user: TeamMember;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ML Score prediction request
export interface ScorePredictionRequest {
  leadId: string;
  email: string;
  company?: string;
  industry?: string;
  companySize?: number;
  leadSource?: string;
  pageViews?: number;
  timeOnSite?: number;
}

// ML Score prediction response
export interface ScorePredictionResponse {
  leadId: string;
  score: number;
  category: LeadScoreCategory;
  confidence: number;
  factors: ScoreFactor[];
}

// Score contributing factors
export interface ScoreFactor {
  feature: string;
  impact: number;
  description: string;
}

// Settings
export interface AppSettings {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  emailIntegration: boolean;
  autoScore: boolean;
}
