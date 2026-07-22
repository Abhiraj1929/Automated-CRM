"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { sampleLeads } from "@/lib/sample-data";
import { getScoreColor, formatCurrency } from "@/lib/utils";
import { Brain, Zap, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function AiScoringPage() {
  const [isScoring, setIsScoring] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  // Sort leads by score for display
  const scoredLeads = [...sampleLeads].sort((a, b) => b.leadScore - a.leadScore);

  const handleScoreLeads = async () => {
    setIsScoring(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsScoring(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="AI Lead Scoring"
        subtitle="Machine learning-powered lead scoring and prioritization"
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* AI Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">High-Value Leads</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sampleLeads.filter((l) => l.scoreCategory === "high").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Score ≥ 70
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sampleLeads.filter((l) => l.scoreCategory === "medium").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Score 40-69
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sampleLeads.filter((l) => l.scoreCategory === "low").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Score &lt; 40
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Score Action */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Lead Scoring Engine
                </CardTitle>
                <CardDescription>
                  Run the ML model to score and prioritize your leads based on engagement and fit
                </CardDescription>
              </div>
              <Button onClick={handleScoreLeads} disabled={isScoring}>
                {isScoring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scoring...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Score All Leads
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scoredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLead(lead.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.title} · {formatCurrency(lead.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right min-w-[100px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Progress value={lead.leadScore} className="h-2 w-20" />
                        <span className="text-sm font-medium">{lead.leadScore}</span>
                      </div>
                    </div>
                    <Badge className={getScoreColor(lead.scoreCategory)}>
                      {lead.scoreCategory.charAt(0).toUpperCase() + lead.scoreCategory.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
