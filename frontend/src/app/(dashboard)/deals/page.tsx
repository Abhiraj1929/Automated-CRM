"use client";

import React, { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { StatsCards } from "@/components/crm/StatsCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sampleLeads, getKanbanColumns } from "@/lib/sample-data";
import type { Lead, KanbanColumn } from "@/types/crm";
import { Plus, Filter, Download, RefreshCw } from "lucide-react";

export default function DealsPage() {
  // State for leads
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);
  const [filterOwner, setFilterOwner] = useState<string>("all");

  // Generate Kanban columns from leads
  const columns: KanbanColumn[] = useMemo(() => getKanbanColumns(leads), [leads]);

  // Handle lead move (drag-drop)
  const handleLeadMove = (leadId: string, newStatus: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: newStatus as Lead["status"],
              updatedAt: new Date().toISOString(),
            }
          : lead
      )
    );
    console.log(`Lead ${leadId} moved to ${newStatus}`);
  };

  // Filter leads by owner
  const filteredColumns = useMemo(() => {
    if (filterOwner === "all") return columns;

    return columns.map((col) => ({
      ...col,
      leads: col.leads.filter((lead) => lead.owner.id === filterOwner),
    }));
  }, [columns, filterOwner]);

  // Calculate totals for stats
  const totalRevenue = leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Deals Pipeline"
        subtitle="Manage your sales pipeline with drag-and-drop"
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <StatsCards
          totalLeads={leads.length}
          totalDeals={leads.filter((l) => l.status !== "lost").length}
          totalRevenue={totalRevenue}
          conversionRate={
            leads.length > 0
              ? (leads.filter((l) => l.status === "won").length / leads.length) *
                100
              : 0
          }
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Owner Filter */}
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                <SelectItem value="1">Sarah Chen</SelectItem>
                <SelectItem value="2">Marcus Johnson</SelectItem>
                <SelectItem value="3">Emily Rodriguez</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          initialColumns={filteredColumns}
          onLeadMove={handleLeadMove}
        />
      </div>
    </div>
  );
}
