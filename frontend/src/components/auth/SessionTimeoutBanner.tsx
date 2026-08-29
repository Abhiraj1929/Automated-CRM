// ============================================================
// Session Timeout Warning Banner
// ============================================================
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SessionTimeoutBanner() {
  const { showTimeoutWarning, sessionExpiresAt, extendSession, logout } = useAuth();
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!showTimeoutWarning || !sessionExpiresAt) return;

    const updateRemaining = () => {
      const diff = sessionExpiresAt - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}m ${secs}s`);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [showTimeoutWarning, sessionExpiresAt]);

  if (!showTimeoutWarning) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t px-4 py-3"
      style={{
        backgroundColor: "hsl(38, 92%, 50%)",
        borderColor: "hsl(38, 92%, 40%)",
        color: "hsl(0, 0%, 100%)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Session Expiring Soon</p>
            <p className="text-xs opacity-90">
              Your session will expire in <strong>{remaining}</strong> due to inactivity.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => extendSession()}
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            <Clock className="mr-1 h-3 w-3" />
            Stay Logged In
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => logout()}
            className="text-white hover:bg-white/20"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
