"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, UserCheck, TrendingUp, Settings, ChevronLeft, LogOut, Briefcase, CheckSquare, Package, Megaphone, BarChart3, Zap,
  LayoutList, PieChart, Activity, Database, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/accounts", label: "Accounts", icon: Building2 },
    { href: "/contacts", label: "Contacts", icon: UserCheck },
    { href: "/opportunities", label: "Opportunities", icon: TrendingUp },
    { href: "/activities", label: "Activities", icon: CheckSquare },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/products", label: "Products", icon: Package },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/automation", label: "Automation", icon: Zap },
    { href: "/data-sources", label: "Data Sources", icon: Database },
    ...(isAdmin ? [{ href: "/integrations", label: "Integrations", icon: Link2 }] : []),
    ...(isAdmin ? [{ href: "/admin/users", label: "Users", icon: Briefcase }] : []),
    ...(isAdmin ? [{ href: "/admin/organizations", label: "Organizations", icon: LayoutList }] : []),
    ...(isAdmin ? [{ href: "/admin/analytics", label: "Analytics", icon: PieChart }] : []),
    ...(isAdmin ? [{ href: "/admin/activity", label: "Activity Feed", icon: Activity }] : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className={cn("flex flex-col h-screen transition-all duration-300", collapsed ? "w-16" : "w-64")}
      style={{ backgroundColor: "white", borderRight: "1px solid hsl(220, 13%, 91%)" }}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: "hsl(220, 13%, 18%)" }}>OptiRev</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7" style={{ color: "hsl(220, 9%, 46%)" }}>
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
                collapsed && "justify-center px-2"
              )}
              style={{
                backgroundColor: isActive ? "hsl(221, 83%, 53% / 0.08)" : "transparent",
                color: isActive ? "hsl(221, 83%, 53%)" : "hsl(220, 9%, 46%)",
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "hsl(220, 14%, 96%)"; e.currentTarget.style.color = "hsl(220, 13%, 18%)"; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "hsl(220, 9%, 46%)"; } }}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3" style={{ borderTop: "1px solid hsl(220, 13%, 91%)" }}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full font-medium text-xs text-white shrink-0"
            style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
            {user ? getInitials(user.name) : "?"}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "hsl(220, 13%, 18%)" }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: "hsl(220, 9%, 46%)" }}>{user?.email}</p>
                {user?.role && <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "hsl(221, 83%, 53%)" }}>{user.role}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="h-7 w-7 shrink-0" style={{ color: "hsl(220, 9%, 46%)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(0, 84%, 60%)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(220, 9%, 46%)"; }}
                title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
