"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Bell, Palette, Database, Key } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Manage your preferences" />
      <div className="flex-1 p-6 space-y-6 overflow-auto max-w-3xl">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your account information</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-muted-foreground">Name</label><p className="font-medium">{user?.name}</p></div>
              <div><label className="text-sm font-medium text-muted-foreground">Email</label><p className="font-medium">{user?.email}</p></div>
              <div><label className="text-sm font-medium text-muted-foreground">Role</label><p className="font-medium capitalize">{user?.role}</p></div>
              <div><label className="text-sm font-medium text-muted-foreground">Department</label><p className="font-medium">{user?.department || "-"}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Appearance</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Theme settings coming soon.</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notifications</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Notification preferences coming soon.</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Security</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Password and 2FA settings coming soon.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
