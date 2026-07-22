"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { StatsCards } from "@/components/crm/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { sampleActivities, sampleLeads } from "@/lib/sample-data";
import { formatRelativeTime, formatCurrency, getScoreColor } from "@/lib/utils";
import {
  Activity,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  // Calculate quick stats
  const highValueLeads = sampleLeads
    .filter((l) => l.scoreCategory === "high")
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Dashboard"
        subtitle="Welcome back, Sarah. Here's your CRM overview."
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats Cards */}
        <StatsCards />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Badge variant="secondary">Today</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      {activity.type === "deal_updated" && (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                      {activity.type === "email_sent" && (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                      {activity.type === "lead_created" && (
                        <Activity className="h-4 w-4 text-primary" />
                      )}
                      {activity.type === "call_made" && (
                        <Phone className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.user.name} ·{" "}
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* High-Value Leads */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Hot Leads</CardTitle>
                <button className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highValueLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {lead.owner.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {lead.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.title}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(lead.amount)}
                      </p>
                      <Badge
                        className={`text-[10px] ${getScoreColor(
                          lead.scoreCategory
                        )}`}
                      >
                        {lead.leadScore}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "New", count: 24, value: 345000, color: "bg-blue-500" },
                {
                  label: "Contacted",
                  count: 18,
                  value: 523000,
                  color: "bg-amber-500",
                },
                {
                  label: "Proposal",
                  count: 12,
                  value: 892000,
                  color: "bg-purple-500",
                },
                {
                  label: "Won",
                  count: 8,
                  value: 1245000,
                  color: "bg-emerald-500",
                },
                {
                  label: "Lost",
                  count: 5,
                  value: 178000,
                  color: "bg-slate-400",
                },
              ].map((stage) => (
                <div key={stage.label} className="text-center">
                  <div
                    className={`h-2 rounded-full ${stage.color} mb-3`}
                    style={{
                      width: `${Math.min((stage.count / 24) * 100, 100)}%`,
                      margin: "0 auto",
                    }}
                  />
                  <p className="text-2xl font-bold">{stage.count}</p>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                  <p className="text-xs font-medium mt-1">
                    {formatCurrency(stage.value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
