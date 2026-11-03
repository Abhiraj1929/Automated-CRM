"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOpportunities, updateOpportunityStage, getPipelineStats } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Opportunity, KanbanColumn } from "@/types/crm";
import { PIPELINE_STAGES } from "@/types/crm";
import { Loader2, GripVertical, IndianRupee, Building2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

function getKanbanColumns(opps: Opportunity[]): KanbanColumn[] {
  return PIPELINE_STAGES.filter((s) => s.id !== "closed_lost").map((stage) => ({
    id: stage.id, title: stage.label, color: stage.color,
    items: opps.filter((o) => o.stage === stage.id),
  }));
}

function mapOpp(raw: any): Opportunity {
  return { id: raw.id, name: raw.name, stage: raw.stage, amount: raw.amount || 0, probability: raw.probability || 0, expected_revenue: raw.expected_revenue, close_date: raw.close_date, type: raw.type, lead_source: raw.lead_source, description: raw.description, account_id: raw.account_id, contact_id: raw.contact_id, account: raw.account, contact: raw.contact, owner: raw.owner, tags: raw.tags, created_at: raw.created_at, updated_at: raw.updated_at, products: raw.products, activities: raw.activities } as Opportunity;
}

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<any>(null);

  useEffect(() => {
    Promise.all([getOpportunities({ limit: 200 }), getPipelineStats()])
      .then(([oppR, statR]) => { if (oppR.success && oppR.data) setOpps(oppR.data.map(mapOpp)); if (statR.success && statR.data) setPipeline(statR.data); })
      .finally(() => setLoading(false));
  }, []);

  const columns: KanbanColumn[] = useMemo(() => getKanbanColumns(opps), [opps]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newColumns = [...columns];
    const srcIdx = newColumns.findIndex((c) => c.id === source.droppableId);
    const dstIdx = newColumns.findIndex((c) => c.id === destination.droppableId);
    const [moved] = newColumns[srcIdx].items.splice(source.index, 1);
    (moved as any).stage = destination.droppableId;
    newColumns[dstIdx].items.splice(destination.index, 0, moved);
    setOpps((prev) => prev.map((o) => o.id === moved.id ? { ...o, stage: destination.droppableId as any } : o));

    try { await updateOpportunityStage(draggableId, destination.droppableId); }
    catch { const r = await getOpportunities({ limit: 200 }); if (r.success && r.data) setOpps(r.data.map(mapOpp)); }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Opportunities" subtitle="Sales pipeline management" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {pipeline && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pipeline Value</p><p className="text-2xl font-bold">{formatCurrency(pipeline.totalValue || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Weighted</p><p className="text-2xl font-bold">{formatCurrency(pipeline.weightedValue || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Win Rate</p><p className="text-2xl font-bold">{pipeline.winRate || 0}%</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Opps</p><p className="text-2xl font-bold">{pipeline.totalOpps || 0}</p></CardContent></Card>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-[calc(100vh-300px)] overflow-x-auto pb-4">
              {columns.map((col) => (
                <div key={col.id} className="flex flex-col w-80 min-w-[320px] bg-muted/30 rounded-lg">
                  <div className={cn("flex items-center justify-between p-3 rounded-t-lg border-b", col.id === "closed_won" ? "bg-emerald-50 dark:bg-emerald-950/30" : "")}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", col.color)} />
                      <h3 className="font-medium text-sm">{col.title}</h3>
                      <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
                    </div>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={cn("flex-1 p-2 overflow-y-auto min-h-[100px]", snapshot.isDraggingOver && "bg-primary/5")}>
                        <div className="space-y-2">
                          {col.items.map((opp, index) => (
                            <Draggable key={opp.id} draggableId={opp.id} index={index}>
                              {(prov, snap) => (
                                <div ref={prov.innerRef} {...prov.draggableProps} className={cn(snap.isDragging && "rotate-2 shadow-xl")}>
                                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                    <CardContent className="p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div {...prov.dragHandleProps} className="cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></div>
                                        <Badge variant="secondary" className="text-[10px]">{opp.probability}%</Badge>
                                      </div>
                                      <h4 className="font-medium text-sm mb-1">{opp.name}</h4>
                                      {opp.account && <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2"><Building2 className="h-3 w-3" /><span>{opp.account.name}</span></div>}
                                      <div className="flex items-center gap-1 text-sm font-semibold"><IndianRupee className="h-3 w-3" /><span>{formatCurrency(opp.amount)}</span></div>
                                      {opp.close_date && <p className="text-[10px] text-muted-foreground mt-2">Close: {opp.close_date}</p>}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
