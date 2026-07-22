"use client";

import React from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface StatsCardsProps {
  totalLeads?: number;
  totalDeals?: number;
  totalRevenue?: number;
  conversionRate?: number;
}

export function StatsCards({
  totalLeads = 142,
  totalDeals = 38,
  totalRevenue = 847500,
  conversionRate = 24.8,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Leads",
      value: totalLeads.toString(),
      change: "+12.5%",
      trend: "up" as const,
      icon: Users,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Active Deals",
      value: totalDeals.toString(),
      change: "+8.2%",
      trend: "up" as const,
      icon: Target,
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: "+18.3%",
      trend: "up" as const,
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      change: "+2.4%",
      trend: "up" as const,
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={`text-xs ${
                    stat.trend === "up" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-xs text-muted-foreground">
                  vs last month
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
