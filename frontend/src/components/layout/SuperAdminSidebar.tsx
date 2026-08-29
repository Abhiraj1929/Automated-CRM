"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Activity,
  DollarSign,
  Users,
  Settings,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function SuperAdminSidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/super-admin", label: "Overview", icon: LayoutDashboard },
  ];

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        backgroundColor: "hsl(220, 20%, 14%)",
        borderRight: "1px solid hsl(220, 10%, 20%)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between h-16 px-4"
        style={{ borderBottom: "1px solid hsl(220, 10%, 20%)" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block leading-tight">
                Platform Admin
              </span>
              <span className="text-[10px] text-gray-400 block">CRM Owner</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7 text-gray-400 hover:text-white"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/super-admin" && pathname.startsWith(item.href));
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
                backgroundColor: isActive
                  ? "hsl(221, 83%, 53%)"
                  : "transparent",
                color: isActive ? "white" : "hsl(220, 14%, 55%)",
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "hsl(220, 10%, 20%)";
                  e.currentTarget.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "hsl(220, 14%, 55%)";
                }
              }}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 mb-2" style={{ borderTop: "1px solid hsl(220, 10%, 20%)" }} />

      {/* Back to CRM */}
      <div className="px-2 mb-2">
        <button
          onClick={() => window.history.back()}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all w-full text-left",
            collapsed && "justify-center px-2"
          )}
          style={{ color: "hsl(220, 14%, 55%)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "hsl(220, 10%, 20%)";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "hsl(220, 14%, 55%)";
          }}
        >
          <Users className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Back to CRM</span>}
        </button>
      </div>

      {/* User Profile */}
      <div
        className="p-3"
        style={{ borderTop: "1px solid hsl(220, 10%, 20%)" }}
      >
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full font-medium text-xs text-white shrink-0"
            style={{ backgroundColor: "hsl(221, 83%, 53%)" }}
          >
            {user ? getInitials(user.name) : "?"}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">
                  Platform Owner
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-7 w-7 shrink-0 text-gray-400 hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
