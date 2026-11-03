import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency value (Indian Rupee)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to relative time (locale-agnostic to avoid hydration errors)
 */
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Use ISO format to avoid locale differences between server/client
  const year = past.getFullYear();
  const month = String(past.getMonth() + 1).padStart(2, "0");
  const day = String(past.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get lead score color based on category
 */
export function getScoreColor(category: string): string {
  switch (category) {
    case "high":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "low":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

/**
 * Get status column color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: "bg-blue-500",
    contacted: "bg-amber-500",
    proposal_sent: "bg-purple-500",
    won: "bg-emerald-500",
    lost: "bg-slate-400",
  };
  return colors[status] || "bg-slate-400";
}
