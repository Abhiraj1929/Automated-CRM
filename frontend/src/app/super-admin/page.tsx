"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, Mail, Lock, AlertCircle, Loader2,
  DollarSign, Users, Clock, Cpu, TrendingUp,
  RefreshCw, Search, ChevronLeft, ChevronRight,
  MoreHorizontal, CheckCircle, Ban, Gift, Activity, CreditCard,
} from "lucide-react";

// ============================================================
// Login Component
// ============================================================
function PlatformLoginForm({ onLogin }: { onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await onLogin(email, password);
    if (!result.success) setError(result.error || "Login failed");
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(220, 20%, 14%)" }}>
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight" style={{ color: "hsl(220, 13%, 18%)" }}>Platform Admin</span>
            <span className="block text-xs font-medium" style={{ color: "hsl(220, 9%, 46%)" }}>CRM Owner Access Only</span>
          </div>
        </div>
        <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>Sign in as Platform Owner</h2>
            <p className="mt-1 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>This login is restricted to the CRM platform administrator.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg p-3 text-sm" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.08)", color: "hsl(0, 84%, 60%)" }}>
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input id="email" type="email" placeholder="owner@pulsecrm.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
              </div>
            </div>
            <Button type="submit" className="h-10 w-full" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>) : ("Sign In to Platform Admin")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Dashboard Component
// ============================================================
function statusBadge(status: string, daysLeft?: number) {
  switch (status) {
    case "paid": return <Badge className="bg-green-100 text-green-700 font-semibold">Paid / Active</Badge>;
    case "trialing": return <Badge className="bg-blue-100 text-blue-700 font-semibold">Trial — {daysLeft}d left</Badge>;
    case "expiring": return <Badge className="bg-yellow-100 text-yellow-700 font-semibold">Expiring — {daysLeft}d left</Badge>;
    case "expired": return <Badge className="bg-red-100 text-red-700 font-semibold">Expired</Badge>;
    case "canceled": return <Badge className="bg-gray-100 text-gray-600 font-semibold">Canceled</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatEvent(type: string, data: Record<string, unknown>, orgName: string | null) {
  const name = orgName || "Unknown";
  switch (type) {
    case "trial_started": return { icon: "🆕", text: `${name} started a 7-Day Free Trial` };
    case "trial_extended": return { icon: "⏰", text: `Trial extended by ${data.days_added || 0}d for ${name}` };
    case "trial_converted": return { icon: "💳", text: `${name} converted from Trial to ${data.plan || "Paid"} Plan` };
    case "trial_expired": return { icon: "⚠️", text: `Trial Expired for ${name} (Pending Payment)` };
    case "org_suspended": return { icon: "🚫", text: `${name} access has been suspended` };
    case "org_canceled": return { icon: "❌", text: `${name} subscription canceled` };
    case "org_active": return { icon: "✅", text: `${name} reactivated` };
    case "credits_added": return { icon: "🎁", text: `+${data.credits_added || 0} AI credits added to ${name}` };
    default: return { icon: "📋", text: `${type.replace(/_/g, " ")} — ${name}` };
  }
}

function DashboardView() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const [a, o, act] = await Promise.all([
        apiClient.get("/super-admin/analytics"),
        apiClient.get("/super-admin/organizations", { params: { page, limit: 10, search: searchTerm } }),
        apiClient.get("/super-admin/activity", { params: { limit: 20 } }),
      ]);
      setAnalytics(a.data.data);
      setOrgs(o.data.data);
      setPagination(o.data.pagination);
      setActivity(act.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchData(1, search); };

  const handleAction = async (orgId: string, action: string, payload?: Record<string, unknown>) => {
    setActionLoading(`${orgId}-${action}`);
    setOpenMenu(null);
    try {
      if (action === "extend-trial") await apiClient.patch(`/super-admin/organizations/${orgId}/extend-trial`, payload);
      else if (action === "status") await apiClient.patch(`/super-admin/organizations/${orgId}/status`, payload);
      else if (action === "add-credits") await apiClient.post(`/super-admin/organizations/${orgId}/add-credits`, payload);
      else if (action === "sync-subscription") await apiClient.post(`/super-admin/organizations/${orgId}/sync-subscription`);
      fetchData(pagination.page, search);
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const planLabels: Record<string, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
  const planPrices: Record<string, number> = { starter: 19, pro: 49, enterprise: 149 };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "hsl(220, 13%, 18%)" }}>
            <ShieldCheck className="h-6 w-6 text-blue-600" />Platform Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>Global overview of all CRM tenants, billing, and AI usage.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(pagination.page, search)}>
          <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
        </Button>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold mt-1" style={{ color: "hsl(220, 13%, 18%)" }}>${analytics.mrr.toLocaleString()}</p></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.08)" }}>
                <DollarSign className="h-5 w-5" style={{ color: "hsl(160, 60%, 40%)" }} /></div>
            </div>
            <p className="text-xs mt-2" style={{ color: "hsl(220, 9%, 46%)" }}>{analytics.active_paid} paying clients</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Active Paid Clients</p>
              <p className="text-3xl font-bold mt-1" style={{ color: "hsl(220, 13%, 18%)" }}>{analytics.active_paid}</p></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(221, 83%, 53% / 0.08)" }}>
                <Users className="h-5 w-5" style={{ color: "hsl(221, 83%, 53%)" }} /></div>
            </div>
            <p className="text-xs mt-2" style={{ color: "hsl(220, 9%, 46%)" }}>{analytics.total_organizations} total organizations</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Active Free Trials</p>
              <p className="text-3xl font-bold mt-1" style={{ color: "hsl(220, 13%, 18%)" }}>{analytics.trialing}</p></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(280, 60%, 50% / 0.08)" }}>
                <Clock className="h-5 w-5" style={{ color: "hsl(280, 60%, 50%)" }} /></div>
            </div>
            {analytics.expiring_soon > 0 && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "hsl(35, 80%, 50%)" }}>
                <AlertCircle className="h-3 w-3" />{analytics.expiring_soon} expiring in &lt;48h</p>)}
            {analytics.expiring_soon === 0 && (
              <p className="text-xs mt-2" style={{ color: "hsl(220, 9%, 46%)" }}>{analytics.churned} churned</p>)}
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Platform AI Usage</p>
              <p className="text-3xl font-bold mt-1" style={{ color: "hsl(220, 13%, 18%)" }}>{analytics.ai_usage.total_used.toLocaleString()}</p></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(30, 80%, 50% / 0.08)" }}>
                <Cpu className="h-5 w-5" style={{ color: "hsl(30, 80%, 50%)" }} /></div>
            </div>
            <p className="text-xs mt-2" style={{ color: "hsl(220, 9%, 46%)" }}>
              {analytics.ai_usage.total_quota > 0 ? `${Math.round((analytics.ai_usage.total_used / analytics.ai_usage.total_quota) * 100)}% of quota` : "Across all tenants"}</p>
          </CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Subscribers & Trials ({pagination.total})</CardTitle>
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "hsl(220, 9%, 60%)" }} />
                    <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                      className="h-8 w-48 rounded-md border pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Search</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{ borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Business</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>AI Credits</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(220, 9%, 46%)" }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></td></tr>
                    ) : orgs.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>No organizations found.</td></tr>
                    ) : orgs.map((org) => (
                      <tr key={org.id} style={{ borderBottom: "1px solid hsl(220, 13%, 94%)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(220, 14%, 98%)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>{org.name}</p>
                          <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>{org.admin_name || "—"} &middot; {org.admin_email || "—"}</p>
                          <p className="text-[11px]" style={{ color: "hsl(220, 9%, 60%)" }}>Since {new Date(org.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-xs font-medium">{planLabels[org.plan] || org.plan}
                          {planPrices[org.plan] && <span className="ml-1 text-[10px]" style={{ color: "hsl(220, 9%, 55%)" }}>${planPrices[org.plan]}/mo</span>}</Badge></td>
                        <td className="px-4 py-3">{statusBadge(org.payment_status, org.trial_days_left)}</td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <Progress value={org.ai_credits_total === -1 ? 50 : org.ai_credits_total > 0 ? Math.min(100, (org.ai_credits_used / org.ai_credits_total) * 100) : 0} className="h-1.5 flex-1" />
                            <span className="text-[11px] whitespace-nowrap" style={{ color: "hsl(220, 9%, 46%)" }}>{org.ai_credits_display}</span>
                          </div></td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenMenu(openMenu === org.id ? null : org.id)}
                              disabled={actionLoading?.startsWith(org.id)}>
                              {actionLoading?.startsWith(org.id) ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
                            </Button>
                            {openMenu === org.id && (
                              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg py-1 shadow-lg"
                                style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
                                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50" style={{ color: "hsl(220, 13%, 18%)" }}
                                  onClick={() => setOpenMenu(null)}><TrendingUp className="h-3.5 w-3.5" style={{ color: "hsl(220, 9%, 46%)" }} />View Overview</button>
                                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50" style={{ color: "hsl(220, 13%, 18%)" }}
                                  onClick={() => handleAction(org.id, "sync-subscription")}><CreditCard className="h-3.5 w-3.5" style={{ color: "hsl(221, 83%, 53%)" }} />Sync Subscription</button>
                                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50" style={{ color: "hsl(220, 13%, 18%)" }}
                                  onClick={() => handleAction(org.id, "extend-trial", { days: 7 })}><Clock className="h-3.5 w-3.5" style={{ color: "hsl(221, 83%, 53%)" }} />Extend Trial +7 Days</button>
                                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50" style={{ color: "hsl(220, 13%, 18%)" }}
                                  onClick={() => handleAction(org.id, "extend-trial", { days: 14 })}><Clock className="h-3.5 w-3.5" style={{ color: "hsl(221, 83%, 53%)" }} />Extend Trial +14 Days</button>
                                <div style={{ borderTop: "1px solid hsl(220, 13%, 91%)" }} />
                                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50" style={{ color: "hsl(220, 13%, 18%)" }}
                                  onClick={() => handleAction(org.id, "add-credits", { credits: 500 })}><Gift className="h-3.5 w-3.5" style={{ color: "hsl(160, 60%, 40%)" }} />Add +500 AI Credits</button>
                                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50" style={{ color: "hsl(220, 13%, 18%)" }}
                                  onClick={() => handleAction(org.id, "status", { status: "active" })}><CheckCircle className="h-3.5 w-3.5" style={{ color: "hsl(160, 60%, 40%)" }} />Activate</button>
                                <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50" style={{ color: "hsl(0, 84%, 60%)" }}
                                  onClick={() => handleAction(org.id, "status", { status: "suspended" })}><Ban className="h-3.5 w-3.5" />Suspend Access</button>
                              </div>)}
                          </div></td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid hsl(220, 13%, 91%)" }}>
                  <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Page {pagination.page} of {pagination.pages}</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1, search)}>
                      <ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={pagination.page >= pagination.pages} onClick={() => fetchData(pagination.page + 1, search)}>
                      <ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>)}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />Activity Feed</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {activity.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>No activity yet.</p>
                ) : activity.map((ev) => {
                  const f = formatEvent(ev.event_type, ev.event_data || {}, ev.organization_name);
                  return (
                    <div key={ev.id} className="px-4 py-3 text-xs" style={{ borderBottom: "1px solid hsl(220, 13%, 94%)" }}>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-sm">{f.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: "hsl(220, 13%, 18%)" }}>{f.text}</p>
                          <p className="mt-0.5 text-[10px]" style={{ color: "hsl(220, 9%, 60%)" }}>{new Date(ev.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>);
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page — Login or Dashboard
// ============================================================
export default function SuperAdminPage() {
  const { user, loading, isSuperAdmin, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [user, loading, isSuperAdmin, router]);

  const handleLogin = async (email: string, password: string) => {
    const result = await login(email, password);
    return result;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Not logged in → show login
  if (!user) return <PlatformLoginForm onLogin={handleLogin} />;

  // Logged in but not super admin → redirecting
  if (!isSuperAdmin) return null;

  // Logged in as super admin → show dashboard
  return <DashboardView />;
}
