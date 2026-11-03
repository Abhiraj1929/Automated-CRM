"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, Users, TrendingUp, CheckSquare, Package, Megaphone,
  Clock, Cpu, AlertCircle, RefreshCw,
} from "lucide-react";

export default function AdminOrganizationsPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const r = await apiClient.get("/admin/overview");
      if (r.data?.success) {
        setOrg(r.data.data.organization);
        setTeam(r.data.data.team);
        setCounts(r.data.data.counts);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col h-full">
        <Header title="Access Denied" subtitle="" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const planLabels: Record<string, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
  const planPrices: Record<string, number> = { starter: 19, pro: 49, enterprise: 149 };

  const statusBadge = (status: string, daysLeft?: number) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case "trialing": return <Badge className="bg-blue-100 text-blue-700">Trial — {daysLeft}d left</Badge>;
      case "expired": return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
      case "canceled": return <Badge className="bg-gray-100 text-gray-600">Canceled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const entityCards = [
    { label: "Leads", value: counts.leads, icon: Users, color: "hsl(221, 83%, 53%)" },
    { label: "Accounts", value: counts.accounts, icon: Building2, color: "hsl(160, 60%, 40%)" },
    { label: "Contacts", value: counts.contacts, icon: Users, color: "hsl(280, 60%, 50%)" },
    { label: "Opportunities", value: counts.opportunities, icon: TrendingUp, color: "hsl(30, 80%, 50%)" },
    { label: "Activities", value: counts.activities, icon: CheckSquare, color: "hsl(220, 9%, 46%)" },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Organization" subtitle="Your organization overview and team" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div />
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : !org ? (
          <p className="text-center text-muted-foreground py-12">Organization not found.</p>
        ) : (
          <>
            {/* Org Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
                      <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{org.name}</h2>
                      <p className="text-sm text-muted-foreground">Created {new Date(org.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-sm font-medium mb-1">
                      {planLabels[org.plan] || org.plan}
                      {planPrices[org.plan] && <span className="ml-1 text-muted-foreground text-xs">₹{planPrices[org.plan]}/mo</span>}
                    </Badge>
                    <div>{statusBadge(org.payment_status, org.trial_days_left)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {entityCards.map((c) => (
                <Card key={c.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
                      <c.icon className="h-4 w-4" style={{ color: c.color }} />
                    </div>
                    <p className="text-2xl font-bold mt-1">{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Usage */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold">AI Score Usage</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{org.ai_credits_display}</span>
                </div>
                <Progress
                  value={org.ai_credits_total === -1 ? 50 : org.ai_credits_total > 0 ? Math.min(100, (org.ai_credits_used / org.ai_credits_total) * 100) : 0}
                  className="h-2"
                />
                {org.ai_credits_used >= (org.ai_credits_total === -1 ? Infinity : org.ai_credits_total) && org.ai_credits_total !== -1 && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />Quota reached — ML scoring paused
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Team */}
            <Card>
              <CardContent className="p-0">
                <div className="px-5 py-4" style={{ borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />Team Members ({team.length})
                  </h3>
                </div>
                <div className="divide-y">
                  {team.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          {u.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize text-xs">{u.role}</Badge>
                    </div>
                  ))}
                  {team.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">No team members</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
