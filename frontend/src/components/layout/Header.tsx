"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getUnreadCount, getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCount = async () => {
      try { const r = await getUnreadCount(); if (r.success) setUnreadCount(r.data.count); } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const openNotifs = async () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      try { const r = await getNotifications({ unread_only: "true" }); if (r.success) setNotifications(r.data || []); } catch {}
    }
  };

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((p) => p.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications([]);
    setUnreadCount(0);
  };

  const personalizedSubtitle = user ? `Welcome back, ${user.name.split(" ")[0]}. ${subtitle || ""}` : subtitle;

  return (
    <header className="flex items-center justify-between h-16 px-6" style={{ backgroundColor: "white", borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>{title}</h1>
        {personalizedSubtitle && <p className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{personalizedSubtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 9%, 46%)" }} />
          <input type="search" placeholder="Search..."
            className="h-9 w-64 rounded-lg pl-9 pr-4 text-sm focus:outline-none focus:ring-2"
            style={{ border: "1px solid hsl(220, 13%, 91%)", backgroundColor: "hsl(220, 14%, 98%)", color: "hsl(220, 13%, 18%)" }}
          />
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={openNotifs} style={{ color: "hsl(220, 9%, 46%)" }}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white rounded-full" style={{ backgroundColor: "hsl(0, 84%, 60%)" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg shadow-lg z-50 max-h-96 overflow-auto" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
              <div className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
                <span className="font-medium text-sm" style={{ color: "hsl(220, 13%, 18%)" }}>Notifications</span>
                {notifications.length > 0 && <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllRead}>Mark all read</Button>}
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "hsl(220, 9%, 46%)" }}>No unread notifications</p>
              ) : (
                <div>{notifications.map((n) => (
                  <div key={n.id} className="p-3 cursor-pointer" style={{ borderBottom: "1px solid hsl(220, 13%, 94%)" }} onClick={() => markRead(n.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(220, 14%, 98%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                    <p className="text-sm font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>{n.title}</p>
                    <p className="text-xs mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>{n.message}</p>
                  </div>
                ))}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
