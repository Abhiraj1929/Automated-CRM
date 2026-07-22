"use client";

import React, { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { MoreHorizontal, GripVertical, DollarSign, Building2 } from "lucide-react";
import { cn, formatCurrency, getScoreColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Lead, KanbanColumn } from "@/types/crm";
import { KANBAN_COLUMNS } from "@/lib/constants";

interface KanbanBoardProps {
  initialColumns: KanbanColumn[];
  onLeadMove?: (leadId: string, newStatus: string) => void;
}

export function KanbanBoard({ initialColumns, onLeadMove }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);

  // Handle drag end
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Find source and destination columns
    const sourceCol = columns.find((col) => col.id === source.droppableId);
    const destCol = columns.find((col) => col.id === destination.droppableId);

    if (!sourceCol || !destCol) return;

    // Create new columns array
    const newColumns = [...columns];

    // Find source column index
    const sourceColIndex = newColumns.findIndex(
      (col) => col.id === source.droppableId
    );
    const destColIndex = newColumns.findIndex(
      (col) => col.id === destination.droppableId
    );

    // Move the lead
    const [movedLead] = newColumns[sourceColIndex].leads.splice(
      source.index,
      1
    );

    // Update lead status
    movedLead.status = destination.droppableId as Lead["status"];

    // Insert at new position
    newColumns[destColIndex].leads.splice(
      destination.index,
      0,
      movedLead
    );

    setColumns(newColumns);

    // Notify parent component
    onLeadMove?.(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 h-[calc(100vh-200px)] overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>
    </DragDropContext>
  );
}

// Kanban Column Component
function KanbanColumn({ column }: { column: KanbanColumn }) {
  const columnConfig = KANBAN_COLUMNS.find((col) => col.id === column.id);

  return (
    <div className="flex flex-col w-80 min-w-[320px] bg-muted/30 rounded-lg">
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-t-lg border-b",
          columnConfig?.headerBg
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", column.color)} />
          <h3 className="font-medium text-sm">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {column.leads.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-2 overflow-y-auto min-h-[100px] transition-colors",
              snapshot.isDraggingOver && "bg-primary/5"
            )}
          >
            <div className="space-y-2">
              {column.leads.map((lead, index) => (
                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        snapshot.isDragging && "rotate-2 shadow-xl"
                      )}
                    >
                      <LeadCard
                        lead={lead}
                        dragHandleProps={provided.dragHandleProps}
                      />
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
  );
}

// Lead Card Component
interface LeadCardProps {
  lead: Lead;
  dragHandleProps?: Record<string, unknown>;
}

function LeadCard({ lead, dragHandleProps }: LeadCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        {/* Drag Handle & More Actions */}
        <div className="flex items-start justify-between mb-2">
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <Badge className={cn("text-xs", getScoreColor(lead.scoreCategory))}>
            {lead.scoreCategory === "high" && "★ "}
            {lead.scoreCategory.charAt(0).toUpperCase() +
              lead.scoreCategory.slice(1)}
          </Badge>
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm mb-1 line-clamp-2">{lead.title}</h4>

        {/* Company */}
        {lead.company && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}

        {/* Amount */}
        <div className="flex items-center gap-1 text-sm font-semibold text-foreground mb-3">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(lead.amount)}</span>
        </div>

        {/* Footer: Score & Owner */}
        <div className="flex items-center justify-between">
          {/* Score Badge */}
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "h-1.5 w-12 rounded-full bg-muted overflow-hidden"
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  lead.scoreCategory === "high" && "bg-emerald-500",
                  lead.scoreCategory === "medium" && "bg-amber-500",
                  lead.scoreCategory === "low" && "bg-slate-400"
                )}
                style={{ width: `${lead.leadScore}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{lead.leadScore}</span>
          </div>

          {/* Owner Avatar */}
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {lead.owner.avatar}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lead.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
