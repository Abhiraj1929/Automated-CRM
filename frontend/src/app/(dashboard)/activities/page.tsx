"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getActivities, createActivity, updateActivity } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Activity, ActivityType } from "@/types/crm";
import { Plus, Loader2, X, Phone, Mail, Calendar, CheckSquare, FileText, CheckCircle2 } from "lucide-react";

const TYPE_ICONS: Record<ActivityType, any> = { call: Phone, email: Mail, meeting: Calendar, task: CheckSquare, note: FileText };
const TYPE_COLORS: Record<ActivityType, string> = { call: "bg-blue-100 text-blue-700", email: "bg-purple-100 text-purple-700", meeting: "bg-amber-100 text-amber-700", task: "bg-emerald-100 text-emerald-700", note: "bg-slate-100 text-slate-700" };

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "task" as ActivityType, subject: "", description: "", priority: "normal", due_date: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const params: any = { limit: 100 }; if (filter !== "all") params.type = filter; const r = await getActivities(params); if (r.success && r.data) setActivities(r.data); } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => { e.preventDefault(); setSubmitting(true); try { const r = await createActivity({ ...form, due_date: form.due_date || null }); if (r.success && r.data) { setActivities((p) => [r.data, ...p]); setShowAdd(false); setForm({ type: "task", subject: "", description: "", priority: "normal", due_date: "" }); } } catch {} finally { setSubmitting(false); } };
  const handleComplete = async (id: string) => { try { const r = await updateActivity(id, { status: "completed" }); if (r.success && r.data) setActivities((p) => p.map((a) => a.id === id ? { ...a, status: "completed" } : a)); } catch {} };

  return (
    <div className="flex flex-col h-full">
      <Header title="Activities" subtitle="Track calls, emails, meetings, and tasks" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {["all", "task", "call", "email", "meeting", "note"].map((t) => (
              <Button key={t} variant={filter === t ? "default" : "outline"} size="sm" onClick={() => setFilter(t)} className="capitalize">{t}</Button>
            ))}
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Activity</Button>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="space-y-3">
            {activities.map((act) => { const Icon = TYPE_ICONS[act.type] || FileText; return (
              <Card key={act.id} className="hover:shadow-md transition-shadow"><CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${TYPE_COLORS[act.type]}`}><Icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><h3 className="font-medium text-sm">{act.subject}</h3><Badge variant={act.status === "completed" ? "outline" : "secondary"} className="text-xs capitalize">{act.status}</Badge>{(act.priority === "high" || act.priority === "urgent") && <Badge variant="destructive" className="text-xs">{act.priority}</Badge>}</div>
                    {act.description && <p className="text-sm text-muted-foreground line-clamp-2">{act.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground"><span className="capitalize">{act.type}</span>{act.due_date && <span>Due: {new Date(act.due_date).toLocaleDateString()}</span>}{act.owner && <span>By {act.owner.name}</span>}<span>{formatRelativeTime(act.created_at)}</span></div>
                  </div>
                  {act.status === "open" && <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleComplete(act.id)}><CheckCircle2 className="h-4 w-4" /></Button>}
                </div>
              </CardContent></Card> ); })}
            {activities.length === 0 && <div className="text-center py-12 text-muted-foreground">No activities found</div>}
          </div>
        )}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Activity</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Type</label><select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ActivityType }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"><option value="task">Task</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option></select></div>
                <div><label className="text-sm font-medium">Priority</label><select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              </div>
              <div><label className="text-sm font-medium">Subject *</label><input required value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
              <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" /></div>
              <div><label className="text-sm font-medium">Due Date</label><input type="datetime-local" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
            </form>
          </div></div>
        )}
      </div>
    </div>
  );
}
