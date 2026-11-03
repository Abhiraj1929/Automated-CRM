"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  Trophy,
  Building2,
  Users,
  UserPlus,
  Target,
  Clock,
  Loader2,
  ArrowUpRight,
  Briefcase,
  Activity,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";
import { getDashboardStats } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  needs_analysis: "Needs Analysis",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMonthHover, setActiveMonthHover] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then((r) => {
        if (r.success && r.data) setStats(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Overview of your OptiRev workspace" />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm font-medium text-slate-500">Loading workspace intelligence...</p>
        </div>
      </>
    );
  }

  if (!stats) return null;

  const revenueByMonth = stats.revenueByMonth || {};
  const months = Object.keys(revenueByMonth).sort().slice(-6);
  const maxRevenue = Math.max(...months.map((m) => revenueByMonth[m] || 0), 1);
  const totalRevenueAllMonths = Object.values(revenueByMonth).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
  const topMonth = months.reduce((top, m) => ((revenueByMonth[m] || 0) > (revenueByMonth[top] || 0) ? m : top), months[0] || "");

  const oppsByStage = stats.oppsByStage || {};
  const totalOppsCount = stats.totalOpps || Object.values(oppsByStage).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0) || 1;

  // Primary Executive KPI Cards
  const primaryKpis = [
    {
      title: "Closed-Won Revenue",
      value: formatCurrency(stats.totalWonValue || 0),
      subtitle: `${stats.winRate || 0}% overall win rate`,
      badge: "Won Deals",
      icon: DollarSign,
      trend: "Realized",
      trendPositive: true,
    },
    {
      title: "Active Pipeline Value",
      value: formatCurrency(stats.totalPipelineValue || 0),
      subtitle: `Weighted: ${formatCurrency(stats.weightedValue || 0)}`,
      badge: "Open Pipeline",
      icon: TrendingUp,
      trend: "Forecast",
      trendPositive: true,
    },
    {
      title: "Prospect Pipeline",
      value: String(stats.totalLeads || 0),
      subtitle: `${stats.hotLeads || 0} high-intent scored`,
      badge: "Total Leads",
      icon: UserPlus,
      trend: "Lead Volume",
      trendPositive: true,
    },
    {
      title: "Win Rate & Velocity",
      value: `${stats.winRate || 0}%`,
      subtitle: `${stats.totalOpps || 0} tracked opportunities`,
      badge: "Conversion",
      icon: Trophy,
      trend: "Performance",
      trendPositive: true,
    },
  ];

  // Secondary operational metrics
  const secondaryKpis = [
    {
      title: "Corporate Accounts",
      value: String(stats.totalAccounts || 0),
      sub: "Active Organizations",
      icon: Building2,
      href: "/accounts",
    },
    {
      title: "Key Contacts",
      value: String(stats.totalContacts || 0),
      sub: "Decision Makers",
      icon: Users,
      href: "/contacts",
    },
    {
      title: "Sales Pipeline",
      value: String(stats.totalOpps || 0),
      sub: "Active Deals",
      icon: Briefcase,
      href: "/opportunities",
    },
    {
      title: "Task Queue",
      value: String(stats.totalActivities || 0),
      sub: stats.overdueTasks > 0 ? `${stats.overdueTasks} Overdue` : "All on track",
      icon: Clock,
      alert: stats.overdueTasks > 0,
      href: "/tasks",
    },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Real-time revenue performance and sales analytics" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Workspace Quick-Action & Context Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Live Workspace Status</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">OptiRev Technologies Enterprise CRM</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/opportunities">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-100">
                Pipeline Board
              </Button>
            </Link>
            <Link href="/leads">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-100">
                Manage Leads
              </Button>
            </Link>
            <Link href="/reports">
              <Button size="sm" className="h-8 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Export Reports
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary KPI Cards (Monochromatic Executive Palette) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryKpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.title}
                className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">
                      {kpi.title}
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {kpi.value}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-normal">
                        {kpi.subtitle}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Secondary Operational Quick-Stats Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {secondaryKpis.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="group">
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/70 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">{item.title}</p>
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{item.value}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.alert ? (
                      <Badge variant="outline" className="text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200">
                        {item.sub}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
                        {item.sub}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Main Analytics Grid: Revenue by Month & Pipeline Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue by Month Bar Chart */}
          <Card className="lg:col-span-2 bg-white border border-slate-200/80 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-600" />
                  Revenue Realization by Month
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Closed-won deal revenue trends over the past 6 billing cycles
                </CardDescription>
              </div>
              {topMonth && (
                <Badge variant="outline" className="text-[11px] font-medium bg-slate-100 text-slate-700 border-slate-200">
                  Peak: {topMonth}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-6 pb-4">
              {months.length > 0 ? (
                <div className="space-y-4">
                  {/* Visual Chart Canvas */}
                  <div className="h-60 flex items-end gap-4 sm:gap-6 pt-6 px-2 border-b border-slate-200">
                    {months.map((month) => {
                      const amount = revenueByMonth[month] || 0;
                      const percentage = Math.max(12, Math.round((amount / maxRevenue) * 100));
                      const isHovered = activeMonthHover === month;
                      const isTop = month === topMonth;

                      return (
                        <div
                          key={month}
                          className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                          onMouseEnter={() => setActiveMonthHover(month)}
                          onMouseLeave={() => setActiveMonthHover(null)}
                        >
                          {/* Value callout on hover or top */}
                          <div
                            className={`text-[11px] font-semibold text-slate-800 tabular-nums transition-opacity duration-200 mb-1.5 ${
                              isHovered || isTop ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            {formatCurrency(amount)}
                          </div>

                          {/* Bar Element */}
                          <div
                            className={`w-full max-w-[48px] rounded-t-md transition-all duration-300 ${
                              isTop
                                ? "bg-slate-900 hover:bg-slate-800"
                                : "bg-slate-700 hover:bg-slate-900"
                            } ${isHovered ? "ring-2 ring-slate-400 ring-offset-2" : ""}`}
                            style={{ height: `${percentage}%` }}
                          />

                          {/* Month Label */}
                          <div className="mt-3 text-xs font-medium text-slate-500 group-hover:text-slate-900 transition-colors">
                            {month}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chart Summary Footnote */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 px-2">
                    <span>
                      Tracked Total: <strong className="text-slate-800 font-semibold">{formatCurrency(totalRevenueAllMonths)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-slate-900" />
                      Highest Velocity: {topMonth} ({formatCurrency(revenueByMonth[topMonth] || 0)})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <BarChart3 className="h-8 w-8 mb-2 stroke-[1.5]" />
                  <p className="text-sm font-medium text-slate-600">No historical revenue data recorded yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Win opportunities to populate monthly revenue trends</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Stage Funnel & Deal Summary */}
          <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
                <span>Pipeline Stage Funnel</span>
                <Badge variant="outline" className="text-[10px] font-medium border-slate-200 text-slate-600">
                  {stats.totalOpps || 0} Deals
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Current deal volume across sales pipeline stages
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 pb-5 space-y-4">
              {/* Highlight Metric */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 text-center">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Total Active Deal Value
                </span>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 tabular-nums">
                  {formatCurrency(stats.totalPipelineValue || 0)}
                </p>
                <div className="flex items-center justify-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Win Rate: <strong className="text-slate-700">{stats.winRate || 0}%</strong></span>
                  <span>·</span>
                  <span>Won: <strong className="text-slate-700">{formatCurrency(stats.totalWonValue || 0)}</strong></span>
                </div>
              </div>

              {/* Stage Bars */}
              <div className="space-y-3 pt-1">
                {Object.entries(STAGE_LABELS).map(([stageKey, stageLabel]) => {
                  const count = oppsByStage[stageKey] || 0;
                  const pct = Math.round((count / totalOppsCount) * 100);
                  if (count === 0 && ["needs_analysis", "closed_lost"].includes(stageKey)) return null;

                  return (
                    <div key={stageKey} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{stageLabel}</span>
                        <span className="text-slate-500 tabular-nums">
                          {count} {count === 1 ? "deal" : "deals"} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            stageKey === "closed_won"
                              ? "bg-emerald-600"
                              : stageKey === "proposal" || stageKey === "negotiation"
                              ? "bg-slate-900"
                              : "bg-slate-600"
                          }`}
                          style={{ width: `${Math.max(count > 0 ? 8 : 0, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Link href="/opportunities" className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center justify-between group">
                  <span>Open Interactive Kanban Board</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Team Leaderboard & Activity Breakdown */}
        {stats.teamPerformance && stats.teamPerformance.length > 0 && (
          <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-slate-600" />
                  Team Revenue Performance
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Individual quotas, closed revenue, and active pipeline allocation
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600">
                {stats.teamPerformance.length} Active Sales Members
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {stats.teamPerformance.map((member: any, index: number) => {
                  const initials = member.name
                    ? member.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "U";

                  const winRatio = member.totalOpps > 0 ? Math.round((member.wonOpps / member.totalOpps) * 100) : 0;

                  return (
                    <div
                      key={member.userId || index}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-[200px]">
                        <span className="text-xs font-semibold text-slate-400 w-4">#{index + 1}</span>
                        <Avatar className="h-9 w-9 border border-slate-200 bg-slate-100 text-slate-700">
                          <AvatarFallback className="bg-slate-100 text-slate-800 text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">
                            {member.totalOpps} Total Deals · {member.wonOpps} Won ({winRatio}%)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 sm:gap-12 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-medium text-slate-500">Pipeline Assigned</p>
                          <p className="text-sm font-semibold text-slate-800 tabular-nums">
                            {formatCurrency(member.pipeline || 0)}
                          </p>
                        </div>

                        <div className="text-right min-w-[120px]">
                          <p className="text-xs font-medium text-slate-500">Won Revenue</p>
                          <p className="text-base font-bold text-slate-900 tabular-nums">
                            {formatCurrency(member.revenue || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
