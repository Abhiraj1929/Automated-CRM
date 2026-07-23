"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardStats, getPipelineStats } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/types/crm";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Target, BarChart3, PieChart, Activity } from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getPipelineStats()])
      .then(([sR, pR]) => { if (sR.success && sR.data) setStats(sR.data); if (pR.success && pR.data) setPipeline(pR.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports & Analytics" subtitle="Business intelligence dashboard" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {stats && (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Pipeline Value</span></div><p className="text-2xl font-bold">{formatCurrency(stats.totalPipelineValue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-emerald-500" /><span className="text-sm text-muted-foreground">Won Revenue</span></div><p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalWonValue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Win Rate</span></div><p className="text-2xl font-bold">{stats.winRate}%</p></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Weighted Value</span></div><p className="text-2xl font-bold">{formatCurrency(stats.weightedValue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-amber-500" /><span className="text-sm text-muted-foreground">Overdue Tasks</span></div><p className="text-2xl font-bold text-amber-600">{stats.overdueTasks}</p></CardContent></Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><PieChart className="h-5 w-5" />Pipeline by Stage</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {PIPELINE_STAGES.filter((s) => s.id !== "closed_lost").map((stage) => {
                      const count = stats.oppsByStage?.[stage.id] || 0;
                      const total = stats.totalOpps || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={stage.id}>
                          <div className="flex items-center justify-between text-sm mb-1"><span>{stage.label}</span><span className="text-muted-foreground">{count} ({pct}%)</span></div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${stage.color}`} style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" />Revenue by Month</CardTitle></CardHeader>
                <CardContent>
                  {stats.revenueByMonth && Object.keys(stats.revenueByMonth).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(stats.revenueByMonth).sort().slice(-6).map(([month, rev]: [string, any]) => (
                        <div key={month} className="flex items-center gap-3">
                          <span className="text-sm w-20 text-muted-foreground">{month}</span>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (rev / Math.max(...Object.values(stats.revenueByMonth).map(Number))) * 100)}%` }} /></div>
                          <span className="text-sm font-medium w-24 text-right">{formatCurrency(rev)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">No revenue data yet</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Accounts by Industry</CardTitle></CardHeader>
                <CardContent>
                  {stats.accountsByIndustry && Object.keys(stats.accountsByIndustry).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(stats.accountsByIndustry).sort(([, a]: [string, any], [, b]: [string, any]) => b - a).map(([industry, count]: [string, any]) => (
                        <div key={industry} className="flex items-center justify-between text-sm py-1 border-b last:border-0"><span>{industry}</span><Badge variant="secondary">{count}</Badge></div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" />Leads by Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {["new", "contacted", "qualified", "unqualified", "converted"].map((status) => {
                      const count = stats.leadsByStatus?.[status] || 0;
                      const total = stats.totalLeads || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={status} className="flex items-center justify-between text-sm py-1 border-b last:border-0"><span className="capitalize">{status}</span><div className="flex items-center gap-2"><span className="text-muted-foreground">{count}</span><Badge variant="secondary" className="text-xs">{pct}%</Badge></div></div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {stats.teamPerformance && stats.teamPerformance.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Team Performance</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full"><thead><tr className="border-b"><th className="text-left p-3 text-sm font-medium text-muted-foreground">Member</th><th className="text-right p-3 text-sm font-medium text-muted-foreground">Opps</th><th className="text-right p-3 text-sm font-medium text-muted-foreground">Won</th><th className="text-right p-3 text-sm font-medium text-muted-foreground">Revenue</th><th className="text-right p-3 text-sm font-medium text-muted-foreground">Pipeline</th></tr></thead>
                    <tbody>{stats.teamPerformance.map((m: any) => (
                      <tr key={m.userId} className="border-b last:border-0"><td className="p-3 text-sm font-medium">{m.name}</td><td className="p-3 text-sm text-right">{m.totalOpps}</td><td className="p-3 text-sm text-right">{m.wonOpps}</td><td className="p-3 text-sm text-right font-medium">{formatCurrency(m.revenue)}</td><td className="p-3 text-sm text-right">{formatCurrency(m.pipeline)}</td></tr>
                    ))}</tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
