"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        {/* Mobile overlay */}
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          style={{ display: sidebarCollapsed ? 'none' : 'none' }}
        />
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
