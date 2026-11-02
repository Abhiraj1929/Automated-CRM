"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getActivities, createActivity, updateActivity, apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Activity } from "@/types/crm";
import { Plus, Search, Loader2, X, CheckCircle2, Circle, AlertTriangle } from "lucide-react";

type FilterType = "all" | "open" | "completed" | "overdue";
const PRIORITY_COLORS: Record<string, string> = { urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", normal: "bg-blue-100 text-blue-700", low: "bg-gray-100 text-gray-700" };

interface TeamMember { id: string; name: string; email: string; role: string; }

export default function TasksPage() {
  const { user: currentUser, isAdmin, isManager } = useAuth();
  const canAssign = isAdmin || isManager;
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("open");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "normal", due_date: "", owner_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const r = await apiClient.get("/users?limit=100");
      if (r.data?.success && r.data?.data) setTeam(r.data.data);
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const params: any = { type: "task", limit: 200 };
      if (filter === "open") params.status = "open";
      else if (filter === "completed") params.status = "completed";
      const r = await getActivities(params);
      if (r.success && r.data) {
        let filtered = r.data;
        if (filter === "overdue") filtered = filtered.filter((t: Activity) => t.status === "open" && t.due_date && new Date(t.due_date) < new Date());
        if (search) filtered = filtered.filter((t: Activity) => t.subject.toLowerCase().includes(search.toLowerCase()));
        setTasks(filtered);
      }
    } catch {} finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload: any = { type: "task", subject: form.subject, description: form.description, priority: form.priority, due_date: form.due_date || null, status: "open" };
      if (form.owner_id) payload.owner_id = form.owner_id;
      const r = await createActivity(payload);
      if (r.success && r.data) { setTasks((p) => [r.data, ...p]); setShowAdd(false); setForm({ subject: "", description: "", priority: "normal", due_date: "", owner_id: "" }); }
    } catch {} finally { setSubmitting(false); }
  };

  const handleAssignTask = async (taskId: string, ownerId: string) => {
    setAssigningTaskId(taskId);
    try {
      const r = await updateActivity(taskId, { owner_id: ownerId });
      if (r.success && r.data) {
        setTasks((p) => p.map((t) => t.id === taskId ? r.data : t));
      }
    } catch {}
    setAssigningTaskId(null);
  };

  const toggleComplete = async (task: Activity) => {
    const newStatus = task.status === "completed" ? "open" : "completed";
    try { const r = await updateActivity(task.id, { status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }); if (r.success && r.data) setTasks((p) => p.map((t) => t.id === task.id ? r.data : t)); } catch {}
  };

  const openCount = tasks.filter((t) => t.status === "open").length;
  const overdueCount = tasks.filter((t) => t.status === "open" && t.due_date && new Date(t.due_date) < new Date()).length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Tasks" subtitle="Manage your tasks and to-dos" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("open")}><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Circle className="h-5 w-5 text-blue-500" /></div><div><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold">{openCount}</p></div></CardContent></Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("overdue")}><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-red-500" /></div><div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-red-600">{overdueCount}</p></div></CardContent></Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("completed")}><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{tasks.filter((t) => t.status === "completed").length}</p></div></CardContent></Card>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["all", "open", "completed", "overdue"] as FilterType[]).map((f) => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-xs h-8 capitalize" onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="search" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-64 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Task</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <Table><TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>Task</TableHead><TableHead>Priority</TableHead><TableHead>Due Date</TableHead><TableHead>Assigned To</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{tasks.map((task) => {
                const isOverdue = task.status === "open" && task.due_date && new Date(task.due_date) < new Date();
                return (
                  <TableRow key={task.id} className={isOverdue ? "bg-red-50/50" : ""}>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleComplete(task)}>{task.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}</Button></TableCell>
                    <TableCell><div><p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.subject}</p>{task.description && <p className="text-xs text-muted-foreground truncate max-w-[300px]">{task.description}</p>}</div></TableCell>
                    <TableCell><Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge></TableCell>
                    <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : <span className="text-muted-foreground">None</span>}</TableCell>
                    <TableCell>
                      {canAssign ? (
                        <select
                          value={(task as any).owner_id || ""}
                          onChange={(e) => handleAssignTask(task.id, e.target.value)}
                          disabled={assigningTaskId === task.id}
                          className="h-8 rounded border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {team.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-muted-foreground">{task.owner?.name || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-xs">{task.status}</Badge></TableCell>
                  </TableRow>
                );
              })}{tasks.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tasks</TableCell></TableRow>}</TableBody></Table>
          )}
        </CardContent></Card>
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Task</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div><label className="text-sm font-medium">Subject *</label><input required value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Priority</label><select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              <div><label className="text-sm font-medium">Due Date</label><input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            </div>
            {canAssign && team.length > 0 && (
              <div><label className="text-sm font-medium">Assign To</label>
                <select value={form.owner_id} onChange={(e) => setForm((p) => ({ ...p, owner_id: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1">
                  <option value="">Myself</option>
                  {team.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
          </form>
        </div></div>}
      </div>
    </div>
  );
}
