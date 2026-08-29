"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, RefreshCw } from "lucide-react";

export default function AdminActivityPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const r = await apiClient.get("/admin/activity", { params: { limit: 50 } });
      if (r.data?.success) setFeed(r.data.data);
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

  const typeBadge = (type: string) => {
    switch (type) {
      case "activity": return <Badge className="bg-blue-100 text-blue-700">Activity</Badge>;
      case "opportunity": return <Badge className="bg-green-100 text-green-700">Opportunity</Badge>;
      case "lead": return <Badge className="bg-purple-100 text-purple-700">Lead</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity Feed" subtitle="Recent activity across your organization" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{feed.length} events</p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : feed.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No activity yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {feed.map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/50">
                    <span className="text-xl mt-0.5">{ev.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{ev.text}</p>
                        {typeBadge(ev.type)}
                      </div>
                      {ev.detail && (
                        <p className="text-xs text-muted-foreground">{ev.detail}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {ev.user && (
                          <p className="text-[11px] text-muted-foreground">by {ev.user}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(ev.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
