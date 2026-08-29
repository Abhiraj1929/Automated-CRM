"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SuperAdminSidebar } from "@/components/layout/SuperAdminSidebar";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isSuperAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Not logged in or not super admin — show without sidebar (login page handles it)
  if (!user || !isSuperAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <SuperAdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
