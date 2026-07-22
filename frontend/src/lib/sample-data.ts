import type { Lead, KanbanColumn, Contact, Activity, TeamMember } from "@/types/crm";

// ============================================================
// Sample Data for Development/Demo
// ============================================================

export const sampleTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@company.com",
    avatar: "SC",
    role: "admin",
  },
  {
    id: "2",
    name: "Marcus Johnson",
    email: "marcus@company.com",
    avatar: "MJ",
    role: "manager",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily@company.com",
    avatar: "ER",
    role: "sales_rep",
  },
];

export const sampleLeads: Lead[] = [
  // New leads
  {
    id: "lead-1",
    title: "Enterprise License Deal",
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "+1 (555) 123-4567",
    company: "Acme Corporation",
    amount: 125000,
    status: "new",
    leadScore: 85,
    scoreCategory: "high",
    owner: sampleTeamMembers[0],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    tags: ["enterprise", "q1-target"],
  },
  {
    id: "lead-2",
    title: "SaaS Platform Upgrade",
    name: "TechStart Inc",
    email: "info@techstart.io",
    company: "TechStart Inc",
    amount: 45000,
    status: "new",
    leadScore: 62,
    scoreCategory: "medium",
    owner: sampleTeamMembers[1],
    createdAt: "2024-01-14T14:30:00Z",
    updatedAt: "2024-01-14T14:30:00Z",
    tags: ["saas", "upgrade"],
  },
  {
    id: "lead-3",
    title: "Consulting Services",
    name: "Global Solutions Ltd",
    email: "sales@globalsolutions.com",
    company: "Global Solutions Ltd",
    amount: 28000,
    status: "new",
    leadScore: 35,
    scoreCategory: "low",
    owner: sampleTeamMembers[2],
    createdAt: "2024-01-13T09:15:00Z",
    updatedAt: "2024-01-13T09:15:00Z",
    tags: ["consulting"],
  },
  // Contacted leads
  {
    id: "lead-4",
    title: "Annual Subscription",
    name: "DataFlow Systems",
    email: "procurement@dataflow.com",
    phone: "+1 (555) 987-6543",
    company: "DataFlow Systems",
    amount: 89000,
    status: "contacted",
    leadScore: 78,
    scoreCategory: "high",
    owner: sampleTeamMembers[0],
    createdAt: "2024-01-10T11:20:00Z",
    updatedAt: "2024-01-15T08:45:00Z",
    tags: ["subscription", "renewal"],
  },
  {
    id: "lead-5",
    title: "API Integration Package",
    name: "ConnectHub",
    email: "dev@connecthub.io",
    company: "ConnectHub",
    amount: 32000,
    status: "contacted",
    leadScore: 55,
    scoreCategory: "medium",
    owner: sampleTeamMembers[1],
    createdAt: "2024-01-09T16:00:00Z",
    updatedAt: "2024-01-14T11:30:00Z",
    tags: ["api", "integration"],
  },
  // Proposal sent
  {
    id: "lead-6",
    title: "Digital Transformation",
    name: "Legacy Corp",
    email: "cfo@legacycorp.com",
    phone: "+1 (555) 456-7890",
    company: "Legacy Corp",
    amount: 250000,
    status: "proposal_sent",
    leadScore: 92,
    scoreCategory: "high",
    owner: sampleTeamMembers[0],
    createdAt: "2024-01-05T09:00:00Z",
    updatedAt: "2024-01-15T14:20:00Z",
    tags: ["enterprise", "transformation", "priority"],
  },
  {
    id: "lead-7",
    title: "Team License Bundle",
    name: "StartupXYZ",
    email: "founder@startupxyz.com",
    company: "StartupXYZ",
    amount: 18000,
    status: "proposal_sent",
    leadScore: 48,
    scoreCategory: "medium",
    owner: sampleTeamMembers[2],
    createdAt: "2024-01-08T13:45:00Z",
    updatedAt: "2024-01-13T16:10:00Z",
    tags: ["startup", "team"],
  },
  // Won deals
  {
    id: "lead-8",
    title: "Platform Migration",
    name: "MegaTech Industries",
    email: "cto@megatech.com",
    phone: "+1 (555) 321-0987",
    company: "MegaTech Industries",
    amount: 175000,
    status: "won",
    leadScore: 95,
    scoreCategory: "high",
    owner: sampleTeamMembers[0],
    createdAt: "2023-12-20T10:00:00Z",
    updatedAt: "2024-01-12T09:00:00Z",
    tags: ["enterprise", "migration", "closed"],
  },
  // Lost deals
  {
    id: "lead-9",
    title: "Budget Optimization",
    name: "CostCut Inc",
    email: "ops@costcut.com",
    company: "CostCut Inc",
    amount: 22000,
    status: "lost",
    leadScore: 28,
    scoreCategory: "low",
    owner: sampleTeamMembers[1],
    createdAt: "2024-01-02T08:30:00Z",
    updatedAt: "2024-01-11T15:45:00Z",
    tags: ["budget", "lost-competitor"],
  },
];

// Group leads by status for Kanban
export function getKanbanColumns(leads: Lead[]): KanbanColumn[] {
  const columns: KanbanColumn[] = [
    { id: "new", title: "New", leads: [], color: "bg-blue-500" },
    { id: "contacted", title: "Contacted", leads: [], color: "bg-amber-500" },
    { id: "proposal_sent", title: "Proposal Sent", leads: [], color: "bg-purple-500" },
    { id: "won", title: "Won", leads: [], color: "bg-emerald-500" },
    { id: "lost", title: "Lost", leads: [], color: "bg-slate-400" },
  ];

  leads.forEach((lead) => {
    const column = columns.find((col) => col.id === lead.status);
    if (column) {
      column.leads.push(lead);
    }
  });

  return columns;
}

export const sampleContacts: Contact[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@acme.com",
    phone: "+1 (555) 111-2222",
    company: "Acme Corporation",
    position: "CTO",
    lastContacted: "2024-01-15T10:00:00Z",
    tags: ["decision-maker", "technical"],
  },
  {
    id: "2",
    name: "Lisa Wang",
    email: "lisa@techstart.io",
    company: "TechStart Inc",
    position: "VP Engineering",
    lastContacted: "2024-01-14T14:30:00Z",
    tags: ["technical"],
  },
  {
    id: "3",
    name: "Robert Brown",
    email: "robert@legacycorp.com",
    phone: "+1 (555) 333-4444",
    company: "Legacy Corp",
    position: "CFO",
    lastContacted: "2024-01-12T09:00:00Z",
    tags: ["decision-maker", "finance"],
  },
];

export const sampleActivities: Activity[] = [
  {
    id: "1",
    type: "deal_updated",
    description: "Deal 'Enterprise License Deal' moved to Contacted",
    timestamp: "2024-01-15T14:30:00Z",
    user: sampleTeamMembers[0],
  },
  {
    id: "2",
    type: "email_sent",
    description: "Proposal sent to Legacy Corp",
    timestamp: "2024-01-15T11:20:00Z",
    user: sampleTeamMembers[0],
  },
  {
    id: "3",
    type: "lead_created",
    description: "New lead 'Global Solutions Ltd' added",
    timestamp: "2024-01-15T09:15:00Z",
    user: sampleTeamMembers[2],
  },
  {
    id: "4",
    type: "call_made",
    description: "Discovery call with DataFlow Systems",
    timestamp: "2024-01-14T16:45:00Z",
    user: sampleTeamMembers[1],
  },
];
