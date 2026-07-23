"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DollarSign, TrendingUp, Trophy, Building2, Users, UserPlus, Target, Clock, Loader2,
} from "lucide-react";
import { getDashboardStats } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((r) => { if (r.success && r.data) setStats(r.data); }).finally(() => setLoading(false));
  }, []);

  if (loading) return (<><Header title="Dashboard" subtitle="Overview of your CRM" /><div className="flex items-center justify-center h-[calc(100vh-4rem)]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></>);
  if (!stats) return null;

  const statCards = [
    { title: "Revenue", value: formatCurrency(stats.totalWonValue || 0), icon: DollarSign, color: "text-emerald-500" },
    { title: "Pipeline", value: formatCurrency(stats.totalPipelineValue || 0), icon: TrendingUp, color: "text-blue-500" },
    { title: "Win Rate", value: `${stats.winRate || 0}%`, icon: Trophy, color: "text-amber-500" },
    { title: "Weighted", value: formatCurrency(stats.weightedValue || 0), icon: Target, color: "text-indigo-500" },
    { title: "Accounts", value: String(stats.totalAccounts || 0), icon: Building2, color: "text-purple-500" },
    { title: "Contacts", value: String(stats.totalContacts || 0), icon: Users, color: "text-cyan-500" },
    { title: "Leads", value: String(stats.totalLeads || 0), icon: UserPlus, color: "text-pink-500" },
    { title: "Overdue Tasks", value: String(stats.overdueTasks || 0), icon: Clock, color: "text-red-500" },
  ];

  const revenueByMonth = stats.revenueByMonth || {};
  const months = Object.keys(revenueByMonth).sort().slice(-6);
  const maxRevenue = Math.max(...months.map((m) => revenueByMonth[m] || 0), 1);

  return (
    <>
      <Header title="Dashboard" subtitle="Overview of your CRM" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-muted-foreground">{stat.title}</p><p className="text-2xl font-bold">{stat.value}</p></div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">Revenue by Month</CardTitle></CardHeader>
            <CardContent>
              {months.length > 0 ? (
                <div className="flex items-end gap-3 h-64">
                  {months.map((month) => (
                    <div key={month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatCurrency(revenueByMonth[month])}</span>
                      <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all" style={{ height: `${(revenueByMonth[month] / maxRevenue) * 100}%`, minHeight: 8 }} />
                      <span className="text-xs font-medium">{month}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Pipeline Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center"><p className="text-3xl font-bold text-primary">{formatCurrency(stats.weightedValue || 0)}</p><p className="text-sm text-muted-foreground mt-1">Weighted Pipeline</p></div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pipeline Value</span><span className="font-medium">{formatCurrency(stats.totalPipelineValue || 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Won Revenue</span><span className="font-medium text-emerald-600">{formatCurrency(stats.totalWonValue || 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Win Rate</span><span className="font-medium">{stats.winRate || 0}%</span></div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between text-sm font-semibold"><span>Total Opps</span><span>{stats.totalOpps || 0}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {stats.teamPerformance && stats.teamPerformance.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Team Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.teamPerformance.map((m: any) => (
                  <div key={m.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{m.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.totalOpps} opps · {m.wonOpps} won</p></div>
                    </div>
                    <div className="text-right"><p className="text-sm font-semibold">{formatCurrency(m.revenue)}</p><p className="text-xs text-muted-foreground">Pipeline: {formatCurrency(m.pipeline)}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
