"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp, Users, IndianRupee, CheckSquare, BarChart3,
  RefreshCw, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const r = await apiClient.get("/admin/analytics");
      if (r.data?.success) setData(r.data.data);
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

  return (
    <div className="flex flex-col h-full">
      <Header title="Analytics" subtitle="Organization performance and pipeline insights" />
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
        ) : !data ? (
          <p className="text-center text-muted-foreground py-12">No data available.</p>
        ) : (
          <>
            {/* Top Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Pipeline</p>
                      <p className="text-2xl font-bold mt-1">₹{(data.total_pipeline_value || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <IndianRupee className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs text-green-600 flex items-center gap-0.5">
                      <ArrowUpRight className="h-3 w-3" />Won ₹{(data.won_value || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-red-500 flex items-center gap-0.5">
                      <ArrowDownRight className="h-3 w-3" />Lost ₹{(data.lost_value || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Leads</p>
                      <p className="text-2xl font-bold mt-1">{data.leads_summary?.total || 0}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.leads_summary?.conversion_rate || 0}% conversion rate
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activities (This Month)</p>
                      <p className="text-2xl font-bold mt-1">{data.activities_summary?.total_this_month || 0}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.activities_summary?.completed || 0} completed, {data.activities_summary?.overdue || 0} overdue
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold mt-1">{data.leads_summary?.conversion_rate || 0}%</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.leads_summary?.converted || 0} of {data.leads_summary?.total || 0} converted
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Pipeline by Stage */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />Pipeline by Stage
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(data.pipeline || {}).map(([stage, info]: [string, any]) => {
                      const maxVal = Math.max(...Object.values(data.pipeline).map((s: any) => s.value), 1);
                      return (
                        <div key={stage}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium capitalize">{stage.replace(/_/g, " ")}</span>
                            <span className="text-xs text-muted-foreground">{info.count} opps · ₹{(info.value || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.max((info.value / maxVal) * 100, 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(data.pipeline || {}).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No pipeline data</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Leads by Source */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />Leads by Source
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(data.leads_summary?.by_source || {}).map(([source, count]: [string, any]) => {
                      const total = data.leads_summary?.total || 1;
                      return (
                        <div key={source}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium capitalize">{source}</span>
                            <span className="text-xs text-muted-foreground">{count} ({Math.round((count / total) * 100)}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${(count / total) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(data.leads_summary?.by_source || {}).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No lead data</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />6-Month Trend
                </h3>
                <div className="grid grid-cols-6 gap-2">
                  {data.monthly_trend?.map((m: any) => {
                    const maxLeads = Math.max(...(data.monthly_trend || []).map((x: any) => x.leads), 1);
                    return (
                      <div key={m.month} className="text-center">
                        <div className="h-32 flex items-end justify-center mb-2">
                          <div className="w-full max-w-[40px] rounded-t bg-blue-500 transition-all" style={{ height: `${Math.max((m.leads / maxLeads) * 100, 4)}%` }} />
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground">{m.label}</p>
                        <p className="text-xs font-bold">{m.leads}</p>
                        <p className="text-[10px] text-muted-foreground">₹{(m.pipeline_value || 0).toLocaleString("en-IN")}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Team Performance */}
            <Card>
              <CardContent className="p-0">
                <div className="px-5 py-4" style={{ borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />Team Performance
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Member</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Leads</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Opportunities</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Pipeline</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Activities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.team_performance?.map((tp: any) => (
                        <tr key={tp.user.id} className="hover:bg-muted/50" style={{ borderBottom: "1px solid hsl(220, 13%, 94%)" }}>
                          <td className="px-5 py-3">
                            <p className="font-medium">{tp.user.name}</p>
                            <p className="text-xs text-muted-foreground">{tp.user.email}</p>
                          </td>
                          <td className="px-5 py-3">{tp.leads}</td>
                          <td className="px-5 py-3">{tp.opportunities}</td>
                          <td className="px-5 py-3">₹{(tp.pipeline_value || 0).toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3">{tp.completed_activities}/{tp.activities}</td>
                        </tr>
                      ))}
                      {(!data.team_performance || data.team_performance.length === 0) && (
                        <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">No team data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
