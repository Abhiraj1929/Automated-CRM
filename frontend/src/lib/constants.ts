// ============================================================
// Application Constants
// ============================================================

// Kanban board columns configuration
export const KANBAN_COLUMNS = [
  {
    id: "new" as const,
    title: "New",
    color: "bg-blue-500",
    headerBg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "contacted" as const,
    title: "Contacted",
    color: "bg-amber-500",
    headerBg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    id: "proposal_sent" as const,
    title: "Proposal Sent",
    color: "bg-purple-500",
    headerBg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "won" as const,
    title: "Won",
    color: "bg-emerald-500",
    headerBg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "lost" as const,
    title: "Lost",
    color: "bg-slate-400",
    headerBg: "bg-slate-50 dark:bg-slate-950/30",
  },
] as const;

// Sample team members for demo
export const TEAM_MEMBERS = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@company.com",
    avatar: "/avatars/sarah.jpg",
    role: "admin" as const,
  },
  {
    id: "2",
    name: "Marcus Johnson",
    email: "marcus@company.com",
    avatar: "/avatars/marcus.jpg",
    role: "manager" as const,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily@company.com",
    avatar: "/avatars/emily.jpg",
    role: "sales_rep" as const,
  },
];

// Navigation items
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/leads", label: "Leads", icon: "Users" },
  { href: "/deals", label: "Deals", icon: "GitBranch" },
  { href: "/contacts", label: "Contacts", icon: "Contact" },
  { href: "/ai-scoring", label: "AI Lead Scoring", icon: "Brain" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];
