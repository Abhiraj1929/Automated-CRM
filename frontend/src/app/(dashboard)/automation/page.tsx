"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getWorkflowRules, createWorkflowRule, updateWorkflowRule, deleteWorkflowRule,
  getEscalationRules, createEscalationRule, deleteEscalationRule, runEscalationsNow,
  getScoringRules, createScoringRule, deleteScoringRule, rescoreAllLeads,
  getEmailTemplates, createEmailTemplate, deleteEmailTemplate,
  getScheduledJobs, runScheduledJobsNow,
  getAuditLogs,
} from "@/lib/api";
import { Loader2, Plus, X, Play, Trash2, Zap, Clock, BarChart3, Mail, Calendar, ScrollText, ChevronDown, ChevronUp } from "lucide-react";

const ENTITY_TYPES = ["lead", "contact", "opportunity", "account", "activity", "task"];
const TRIGGER_EVENTS = ["on_create", "on_update", "on_status_change", "on_field_change", "on_any"];
const CONDITION_OPERATORS = ["equals", "not_equals", "contains", "not_contains", "not_empty", "empty", "greater_than", "less_than", "greater_equal", "less_equal", "in_list", "starts_with", "ends_with", "changed"];
const WF_FIELDS = ["first_name", "last_name", "email", "phone", "company", "industry", "source", "status", "rating", "lead_score", "score_category", "annual_revenue", "number_of_employees", "title", "stage", "amount", "name", "subject", "type", "priority"];
const ACTION_TYPES = ["update_field", "create_task", "create_notification", "send_email", "assign_owner", "change_status", "add_tag", "webhook"];
const ESC_ACTION_TYPES = ["notify_manager", "notify_admin", "auto_reassign", "change_status", "create_task", "send_email", "close_entity"];
const ESC_TYPES = ["no_activity_days", "overdue_days", "stage_stale_days", "status_stale_days"];
const SCORING_FIELDS = ["email", "phone", "company", "industry", "rating", "source", "annual_revenue", "number_of_employees", "title"];
const TPL_CATEGORIES = ["general", "lead_followup", "proposal", "meeting", "task_reminder", "welcome", "custom"];

const inputCls = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const labelCls = "text-sm font-medium";

function CondRow({ c, i, onChange, onRemove }: { c: any; i: number; onChange: (v: any) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background border rounded-md text-xs">
      <span className="text-muted-foreground font-mono w-5">{i + 1}.</span>
      <select value={c.field || ""} onChange={(e) => onChange({ ...c, field: e.target.value })} className="h-8 rounded border bg-background px-1.5 text-xs flex-1"><option value="">field...</option>{WF_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
      <select value={c.operator || "equals"} onChange={(e) => onChange({ ...c, operator: e.target.value })} className="h-8 rounded border bg-background px-1.5 text-xs flex-1">{CONDITION_OPERATORS.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select>
      <input value={c.value || ""} onChange={(e) => onChange({ ...c, value: e.target.value })} placeholder="value" className="h-8 rounded border bg-background px-1.5 text-xs flex-1" />
      <select value={c.logic || "and"} onChange={(e) => onChange({ ...c, logic: e.target.value })} className="h-8 rounded border bg-background px-1.5 text-xs w-16"><option value="and">AND</option><option value="or">OR</option></select>
      <button type="button" onClick={onRemove} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function ActRow({ a, i, onChange, onRemove }: { a: any; i: number; onChange: (v: any) => void; onRemove: () => void }) {
  return (
    <div className="p-2 bg-background border rounded-md text-xs space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono w-5">{i + 1}.</span>
        <select value={a.type || ""} onChange={(e) => onChange({ ...a, type: e.target.value })} className="h-8 rounded border bg-background px-1.5 text-xs flex-1"><option value="">action...</option>{ACTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select>
        <button type="button" onClick={onRemove} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {a.type === "update_field" && <div className="flex gap-2 ml-7"><input value={a.field || ""} onChange={(e) => onChange({ ...a, field: e.target.value })} placeholder="field" className="h-8 rounded border bg-background px-1.5 text-xs flex-1" /><input value={a.value || ""} onChange={(e) => onChange({ ...a, value: e.target.value })} placeholder="value" className="h-8 rounded border bg-background px-1.5 text-xs flex-1" /></div>}
      {(a.type === "create_task" || a.type === "create_notification" || a.type === "send_email") && <div className="ml-7 space-y-1"><input value={a.subject || ""} onChange={(e) => onChange({ ...a, subject: e.target.value })} placeholder="Subject / Title" className="h-8 w-full rounded border bg-background px-1.5 text-xs" /><textarea value={a.body || ""} onChange={(e) => onChange({ ...a, body: e.target.value })} placeholder="Body (use {{first_name}}, {{company}}, etc.)" rows={2} className="w-full rounded border bg-background px-1.5 text-xs resize-none" /></div>}
      {a.type === "change_status" && <input value={a.new_status || ""} onChange={(e) => onChange({ ...a, new_status: e.target.value })} placeholder="status/stage" className="h-8 rounded border bg-background px-1.5 text-xs ml-7 flex-1" />}
      {a.type === "add_tag" && <input value={a.tag || ""} onChange={(e) => onChange({ ...a, tag: e.target.value })} placeholder="tag" className="h-8 rounded border bg-background px-1.5 text-xs ml-7 flex-1" />}
      {a.type === "webhook" && <input value={a.url || ""} onChange={(e) => onChange({ ...a, url: e.target.value })} placeholder="https://..." className="h-8 rounded border bg-background px-1.5 text-xs ml-7 flex-1" />}
      {a.type === "assign_owner" && <input value={a.owner_id || ""} onChange={(e) => onChange({ ...a, owner_id: e.target.value })} placeholder="user ID" className="h-8 rounded border bg-background px-1.5 text-xs ml-7 flex-1" />}
    </div>
  );
}

export default function AutomationPage() {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [scoring, setScoring] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showWf, setShowWf] = useState(false);
  const [showEsc, setShowEsc] = useState(false);
  const [showSc, setShowSc] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [sub, setSub] = useState(false);
  const [wfForm, setWfForm] = useState({ name: "", entity_type: "lead", trigger_event: "on_create", conditions: [] as any[], actions: [] as any[] });
  const [escForm, setEscForm] = useState({ name: "", entity_type: "lead", condition_type: "no_activity_days", threshold_days: 7, actions: [] as any[] });
  const [scForm, setScForm] = useState({ name: "", field: "email", condition: "not_empty", value: "", score: 10 });
  const [tplForm, setTplForm] = useState({ name: "", subject: "", body: "", category: "general" });
  const [expWf, setExpWf] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [wf, esc, sc, tp, jb, al] = await Promise.all([
        getWorkflowRules().catch(() => ({ data: [] })), getEscalationRules().catch(() => ({ data: [] })),
        getScoringRules().catch(() => ({ data: [] })), getEmailTemplates().catch(() => ({ data: [] })),
        getScheduledJobs().catch(() => ({ data: [] })), getAuditLogs().catch(() => ({ data: [] })),
      ]);
      setWorkflows(wf.data || []); setEscalations(esc.data || []); setScoring(sc.data || []);
      setTemplates(tp.data || []); setJobs(jb.data || []); setAuditLogs(al.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addCond = () => setWfForm((p) => ({ ...p, conditions: [...p.conditions, { field: "", operator: "equals", value: "", logic: "and" }] }));
  const updCond = (i: number, v: any) => setWfForm((p) => ({ ...p, conditions: p.conditions.map((x, idx) => idx === i ? v : x) }));
  const rmCond = (i: number) => setWfForm((p) => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }));
  const addAct = () => setWfForm((p) => ({ ...p, actions: [...p.actions, { type: "" }] }));
  const updAct = (i: number, v: any) => setWfForm((p) => ({ ...p, actions: p.actions.map((x, idx) => idx === i ? v : x) }));
  const rmAct = (i: number) => setWfForm((p) => ({ ...p, actions: p.actions.filter((_, idx) => idx !== i) }));
  const addEscAct = () => setEscForm((p) => ({ ...p, actions: [...p.actions, { type: "notify_manager", threshold_days: p.threshold_days }] }));
  const updEscAct = (i: number, v: any) => setEscForm((p) => ({ ...p, actions: p.actions.map((x, idx) => idx === i ? v : x) }));
  const rmEscAct = (i: number) => setEscForm((p) => ({ ...p, actions: p.actions.filter((_, idx) => idx !== i) }));

  const handleWf = async (e: React.FormEvent) => { e.preventDefault(); setSub(true); try { const r = await createWorkflowRule(wfForm); if (r.success && r.data) { setWorkflows((p) => [r.data, ...p]); setShowWf(false); setWfForm({ name: "", entity_type: "lead", trigger_event: "on_create", conditions: [], actions: [] }); } } finally { setSub(false); } };
  const toggleWf = async (id: string, v: boolean) => { try { await updateWorkflowRule(id, { is_active: !v }); setWorkflows((p) => p.map((w) => w.id === id ? { ...w, is_active: !v } : w)); } catch {} };
  const handleEsc = async (e: React.FormEvent) => { e.preventDefault(); setSub(true); try { const r = await createEscalationRule(escForm); if (r.success && r.data) { setEscalations((p) => [r.data, ...p]); setShowEsc(false); setEscForm({ name: "", entity_type: "lead", condition_type: "no_activity_days", threshold_days: 7, actions: [] }); } } finally { setSub(false); } };
  const handleSc = async (e: React.FormEvent) => { e.preventDefault(); setSub(true); try { const r = await createScoringRule(scForm); if (r.success && r.data) { setScoring((p) => [r.data, ...p]); setShowSc(false); setScForm({ name: "", field: "email", condition: "not_empty", value: "", score: 10 }); } } finally { setSub(false); } };
  const handleTpl = async (e: React.FormEvent) => { e.preventDefault(); setSub(true); try { const r = await createEmailTemplate(tplForm); if (r.success && r.data) { setTemplates((p) => [r.data, ...p]); setShowTpl(false); setTplForm({ name: "", subject: "", body: "", category: "general" }); } } finally { setSub(false); } };
  const del = async (id: string, t: string) => { try { if (t === "wf") { await deleteWorkflowRule(id); setWorkflows((p) => p.filter((w) => w.id !== id)); } else if (t === "esc") { await deleteEscalationRule(id); setEscalations((p) => p.filter((e) => e.id !== id)); } else if (t === "sc") { await deleteScoringRule(id); setScoring((p) => p.filter((s) => s.id !== id)); } else if (t === "tpl") { await deleteEmailTemplate(id); setTemplates((p) => p.filter((x) => x.id !== id)); } } catch {} };
  const runEsc = async () => { setSub(true); try { await runEscalationsNow(); await fetchAll(); } finally { setSub(false); } };
  const rescore = async () => { setSub(true); try { await rescoreAllLeads(); await fetchAll(); } finally { setSub(false); } };
  const runJobs = async () => { setSub(true); try { await runScheduledJobsNow(); await fetchAll(); } finally { setSub(false); } };
  const fmt = (d: string) => d ? new Date(d).toLocaleString() : "-";

  if (loading) return (<div className="flex flex-col h-full"><Header title="Automation" subtitle="Workflows, escalations, scoring, and jobs" /><div className="flex-1 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></div>);

  return (
    <div className="flex flex-col h-full">
      <Header title="Automation" subtitle="Workflows, escalations, scoring, and jobs" />
      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="workflows">
          <TabsList className="mb-4">
            <TabsTrigger value="workflows"><Zap className="h-4 w-4 mr-1" /> Workflows</TabsTrigger>
            <TabsTrigger value="escalations"><Clock className="h-4 w-4 mr-1" /> Escalations</TabsTrigger>
            <TabsTrigger value="scoring"><BarChart3 className="h-4 w-4 mr-1" /> Scoring</TabsTrigger>
            <TabsTrigger value="templates"><Mail className="h-4 w-4 mr-1" /> Templates</TabsTrigger>
            <TabsTrigger value="jobs"><Calendar className="h-4 w-4 mr-1" /> Jobs</TabsTrigger>
            <TabsTrigger value="audit"><ScrollText className="h-4 w-4 mr-1" /> Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <Card><CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div><h3 className="font-semibold">Workflow Rules</h3><p className="text-xs text-muted-foreground mt-1">Conditions + actions that fire on entity events. Supports all 6 entity types.</p></div>
                <Button size="sm" onClick={() => setShowWf(true)}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Name</TableHead><TableHead>Entity</TableHead><TableHead>Trigger</TableHead><TableHead>Conds</TableHead><TableHead>Actions</TableHead><TableHead>Runs</TableHead><TableHead>On</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {workflows.map((w) => (
                    <React.Fragment key={w.id}>
                      <TableRow>
                        <TableCell><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpWf(expWf === w.id ? null : w.id)}>{expWf === w.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</Button></TableCell>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{w.entity_type}</Badge></TableCell>
                        <TableCell className="text-xs">{w.trigger_event?.replace(/_/g, " ")}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{w.conditions?.length || 0}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{w.actions?.length || 0}</Badge></TableCell>
                        <TableCell>{w.run_count || 0}</TableCell>
                        <TableCell><button onClick={() => toggleWf(w.id, w.is_active)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${w.is_active ? "bg-emerald-500" : "bg-gray-300"}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${w.is_active ? "ml-4" : "ml-0.5"}`} /></button></TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(w.id, "wf")}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                      {expWf === w.id && (
                        <TableRow><TableCell colSpan={9} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-2 gap-6">
                            <div><h4 className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Conditions ({w.conditions?.length || 0})</h4>
                              {w.conditions?.length > 0 ? <div className="space-y-1">{w.conditions.map((c: any, i: number) => (<div key={i} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1 border"><span className="font-mono text-muted-foreground">{i + 1}.</span><span className="font-medium">{c.field}</span><span className="text-muted-foreground">{c.operator}</span><span>{c.value || "-"}</span>{c.logic === "or" && <Badge variant="outline" className="text-[10px]">OR</Badge>}</div>))}</div> : <p className="text-xs text-muted-foreground italic">No conditions (always runs)</p>}
                            </div>
                            <div><h4 className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Actions ({w.actions?.length || 0})</h4>
                              {w.actions?.length > 0 ? <div className="space-y-1">{w.actions.map((a: any, i: number) => (<div key={i} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1 border"><Badge variant="secondary" className="text-[10px]">{i + 1}</Badge><span className="font-medium">{a.type?.replace(/_/g, " ")}</span>{a.field && <span className="text-muted-foreground">: {a.field}={a.value}</span>}{a.subject && <span className="text-muted-foreground truncate">&quot;{a.subject}&quot;</span>}</div>))}</div> : <p className="text-xs text-muted-foreground italic">No actions</p>}
                            </div>
                          </div>
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  {workflows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No workflow rules</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="escalations">
            <Card><CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div><h3 className="font-semibold">Escalation Rules</h3><p className="text-xs text-muted-foreground mt-1">Multi-tier: 3d notify manager, 7d notify admin, 14d auto-close</p></div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={runEsc} disabled={sub}>{sub ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Run Now</Button><Button size="sm" onClick={() => setShowEsc(true)}><Plus className="h-4 w-4 mr-2" />Add Rule</Button></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Entity</TableHead><TableHead>Condition</TableHead><TableHead>Threshold</TableHead><TableHead>Tiers</TableHead><TableHead>Last Run</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {escalations.map((e) => (<TableRow key={e.id}><TableCell className="font-medium">{e.name}</TableCell><TableCell><Badge variant="outline" className="capitalize text-xs">{e.entity_type}</Badge></TableCell><TableCell className="text-xs">{e.condition_type?.replace(/_/g, " ")}</TableCell><TableCell><Badge variant="secondary" className="text-xs">{e.threshold_days}d</Badge></TableCell><TableCell><Badge variant="secondary" className="text-xs">{e.actions?.length || 0}</Badge></TableCell><TableCell className="text-xs">{fmt(e.last_run_at)}</TableCell><TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(e.id, "esc")}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}
                  {escalations.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No escalation rules</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="scoring">
            <Card><CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div><h3 className="font-semibold">Scoring Rules</h3><p className="text-xs text-muted-foreground mt-1">Score leads by field values. Scores decay for inactive leads.</p></div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={rescore} disabled={sub}>{sub ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}Re-score All</Button><Button size="sm" onClick={() => setShowSc(true)}><Plus className="h-4 w-4 mr-2" />Add Rule</Button></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Field</TableHead><TableHead>Condition</TableHead><TableHead>Value</TableHead><TableHead>Score</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {scoring.map((s) => (<TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.field}</TableCell><TableCell className="text-xs">{s.condition?.replace(/_/g, " ")}</TableCell><TableCell>{s.value || "-"}</TableCell><TableCell><Badge variant={s.score > 0 ? "success" : "destructive"}>{s.score > 0 ? "+" : ""}{s.score}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(s.id, "sc")}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}
                  {scoring.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scoring rules</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="templates">
            <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Email Templates</h3><Button size="sm" onClick={() => setShowTpl(true)}><Plus className="h-4 w-4 mr-2" />Add Template</Button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (<Card key={t.id}><CardContent className="p-4"><div className="flex justify-between items-start mb-2"><h4 className="font-medium truncate">{t.name}</h4><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => del(t.id, "tpl")}><Trash2 className="h-4 w-4" /></Button></div><Badge variant="secondary" className="mb-2 text-xs">{t.category}</Badge><p className="text-sm text-muted-foreground line-clamp-2">{t.subject}</p></CardContent></Card>))}
              {templates.length === 0 && <p className="text-center py-8 text-muted-foreground col-span-3">No templates</p>}
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <Card><CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div><h3 className="font-semibold">Scheduled Jobs</h3><p className="text-xs text-muted-foreground mt-1">Auto-runs via node-cron background scheduler</p></div>
                <Button variant="outline" size="sm" onClick={runJobs} disabled={sub}>{sub ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Run All Now</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Schedule</TableHead><TableHead>Active</TableHead><TableHead>Last Run</TableHead><TableHead>Next Run</TableHead></TableRow></TableHeader>
                <TableBody>
                  {jobs.map((j: any) => (<TableRow key={j.id}><TableCell className="font-medium">{j.name}</TableCell><TableCell><Badge variant="outline" className="text-xs">{j.job_type}</Badge></TableCell><TableCell className="text-xs">{j.cron_expression || `${j.interval_minutes}min`}</TableCell><TableCell><Badge variant={j.is_active ? "default" : "secondary"} className="text-xs">{j.is_active ? "Yes" : "No"}</Badge></TableCell><TableCell className="text-xs">{fmt(j.last_run_at)}</TableCell><TableCell className="text-xs">{fmt(j.next_run_at)}</TableCell></TableRow>))}
                  {jobs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No jobs</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card><CardContent className="p-4">
              <h3 className="font-semibold mb-4">Audit Logs</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Details</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>
                  {auditLogs.map((l: any, i: number) => (<TableRow key={l.id || i}><TableCell><Badge variant="outline" className="capitalize text-xs">{l.entity_type}</Badge></TableCell><TableCell className="text-xs">{l.action}</TableCell><TableCell className="text-xs">{l.user_name || l.user_id || "-"}</TableCell><TableCell className="text-xs max-w-xs truncate">{l.details ? (typeof l.details === "string" ? l.details : JSON.stringify(l.details)) : "-"}</TableCell><TableCell className="text-xs">{fmt(l.timestamp || l.created_at)}</TableCell></TableRow>))}
                  {auditLogs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Workflow Modal */}
      {showWf && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Workflow Rule</h2><Button variant="ghost" size="icon" onClick={() => setShowWf(false)}><X className="h-4 w-4" /></Button></div>
        <form onSubmit={handleWf} className="space-y-4">
          <div><label className={labelCls}>Name *</label><input required value={wfForm.name} onChange={(e) => setWfForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} placeholder="e.g. Auto-assign hot leads" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Entity Type</label><select value={wfForm.entity_type} onChange={(e) => setWfForm((p) => ({ ...p, entity_type: e.target.value }))} className={`${inputCls} mt-1`}>{ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={labelCls}>Trigger</label><select value={wfForm.trigger_event} onChange={(e) => setWfForm((p) => ({ ...p, trigger_event: e.target.value }))} className={`${inputCls} mt-1`}>{TRIGGER_EVENTS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></div>
          </div>
          <div><div className="flex items-center justify-between mb-2"><label className={labelCls}>Conditions</label><Button type="button" variant="outline" size="sm" onClick={addCond}><Plus className="h-3 w-3 mr-1" />Add</Button></div><div className="space-y-2">{wfForm.conditions.map((c, i) => <CondRow key={i} c={c} i={i} onChange={(v) => updCond(i, v)} onRemove={() => rmCond(i)} />)}</div>{wfForm.conditions.length === 0 && <p className="text-xs text-muted-foreground italic">No conditions = always fires</p>}</div>
          <div><div className="flex items-center justify-between mb-2"><label className={labelCls}>Actions</label><Button type="button" variant="outline" size="sm" onClick={addAct}><Plus className="h-3 w-3 mr-1" />Add</Button></div><div className="space-y-2">{wfForm.actions.map((a, i) => <ActRow key={i} a={a} i={i} onChange={(v) => updAct(i, v)} onRemove={() => rmAct(i)} />)}</div>{wfForm.actions.length === 0 && <p className="text-xs text-muted-foreground italic">No actions = nothing happens</p>}</div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowWf(false)}>Cancel</Button><Button type="submit" disabled={sub} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>{sub && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Rule</Button></div>
        </form>
      </div></div>}

      {/* Escalation Modal */}
      {showEsc && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Escalation Rule</h2><Button variant="ghost" size="icon" onClick={() => setShowEsc(false)}><X className="h-4 w-4" /></Button></div>
        <form onSubmit={handleEsc} className="space-y-4">
          <div><label className={labelCls}>Name *</label><input required value={escForm.name} onChange={(e) => setEscForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} placeholder="e.g. Stale lead escalation" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelCls}>Entity</label><select value={escForm.entity_type} onChange={(e) => setEscForm((p) => ({ ...p, entity_type: e.target.value }))} className={`${inputCls} mt-1`}>{["lead", "contact", "task", "opportunity", "account"].map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={labelCls}>Condition</label><select value={escForm.condition_type} onChange={(e) => setEscForm((p) => ({ ...p, condition_type: e.target.value }))} className={`${inputCls} mt-1`}>{ESC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></div>
            <div><label className={labelCls}>Base Days</label><input type="number" min="1" required value={escForm.threshold_days} onChange={(e) => setEscForm((p) => ({ ...p, threshold_days: +e.target.value }))} className={`${inputCls} mt-1`} /></div>
          </div>
          <div><div className="flex items-center justify-between mb-2"><label className={labelCls}>Escalation Tiers (multi-level)</label><Button type="button" variant="outline" size="sm" onClick={addEscAct}><Plus className="h-3 w-3 mr-1" />Add Tier</Button></div>
            <div className="space-y-2">{escForm.actions.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-background border rounded-md text-xs">
                <span className="font-mono text-muted-foreground">Tier {i + 1}:</span>
                <input type="number" min="1" value={a.threshold_days || ""} onChange={(e) => updEscAct(i, { ...a, threshold_days: +e.target.value })} placeholder="days" className="h-8 w-16 rounded border bg-background px-1.5 text-xs" />
                <span className="text-muted-foreground">days</span>
                <select value={a.type || "notify_manager"} onChange={(e) => updEscAct(i, { ...a, type: e.target.value })} className="h-8 rounded border bg-background px-1.5 text-xs flex-1">{ESC_ACTION_TYPES.map((et) => <option key={et} value={et}>{et.replace(/_/g, " ")}</option>)}</select>
                <button type="button" onClick={() => rmEscAct(i)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}</div>
            {escForm.actions.length === 0 && <p className="text-xs text-muted-foreground italic">Example: 3d notify manager, 7d notify admin, 14d auto-close</p>}
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowEsc(false)}>Cancel</Button><Button type="submit" disabled={sub} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>{sub && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
        </form>
      </div></div>}

      {/* Scoring Modal */}
      {showSc && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Scoring Rule</h2><Button variant="ghost" size="icon" onClick={() => setShowSc(false)}><X className="h-4 w-4" /></Button></div>
        <form onSubmit={handleSc} className="space-y-4">
          <div><label className={labelCls}>Name *</label><input required value={scForm.name} onChange={(e) => setScForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Field</label><select value={scForm.field} onChange={(e) => setScForm((p) => ({ ...p, field: e.target.value }))} className={`${inputCls} mt-1`}>{SCORING_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div><label className={labelCls}>Condition</label><select value={scForm.condition} onChange={(e) => setScForm((p) => ({ ...p, condition: e.target.value }))} className={`${inputCls} mt-1`}>{CONDITION_OPERATORS.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Value</label><input value={scForm.value} onChange={(e) => setScForm((p) => ({ ...p, value: e.target.value }))} className={`${inputCls} mt-1`} /></div>
            <div><label className={labelCls}>Score</label><input type="number" required value={scForm.score} onChange={(e) => setScForm((p) => ({ ...p, score: +e.target.value }))} className={`${inputCls} mt-1`} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowSc(false)}>Cancel</Button><Button type="submit" disabled={sub} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>{sub && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
        </form>
      </div></div>}

      {/* Template Modal */}
      {showTpl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Email Template</h2><Button variant="ghost" size="icon" onClick={() => setShowTpl(false)}><X className="h-4 w-4" /></Button></div>
        <form onSubmit={handleTpl} className="space-y-4">
          <div><label className={labelCls}>Name *</label><input required value={tplForm.name} onChange={(e) => setTplForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div><label className={labelCls}>Subject *</label><input required value={tplForm.subject} onChange={(e) => setTplForm((p) => ({ ...p, subject: e.target.value }))} className={`${inputCls} mt-1`} placeholder="Supports {{first_name}}, {{company}}" /></div>
          <div><label className={labelCls}>Body *</label><textarea required rows={5} value={tplForm.body} onChange={(e) => setTplForm((p) => ({ ...p, body: e.target.value }))} className={`${inputCls} mt-1 resize-none`} /></div>
          <div><label className={labelCls}>Category</label><select value={tplForm.category} onChange={(e) => setTplForm((p) => ({ ...p, category: e.target.value }))} className={`${inputCls} mt-1`}>{TPL_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowTpl(false)}>Cancel</Button><Button type="submit" disabled={sub} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>{sub && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
        </form>
      </div></div>}
    </div>
  );
}
