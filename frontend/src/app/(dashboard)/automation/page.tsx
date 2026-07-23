"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getWorkflowRules, createWorkflowRule, deleteWorkflowRule,
  getEscalationRules, createEscalationRule, deleteEscalationRule, runEscalationsNow,
  getScoringRules, createScoringRule, deleteScoringRule, rescoreAllLeads,
  getEmailTemplates, createEmailTemplate, deleteEmailTemplate,
  getScheduledJobs, runScheduledJobsNow,
  getAuditLogs, getWorkflowLogs,
} from "@/lib/api";
import {
  Loader2, Plus, X, Play, Trash2, Zap, Clock, BarChart3, Mail, Calendar, ScrollText,
} from "lucide-react";

const ENTITY_TYPES = ["lead", "contact", "opportunity", "account", "activity", "task"];
const TRIGGER_EVENTS = ["on_create", "on_update", "on_status_change", "on_field_change"];
const CONDITION_OPERATORS = ["equals", "not_equals", "contains", "not_empty", "empty", "greater_than", "less_than"];
const ESCALATION_TYPES = ["no_activity_days", "overdue_days", "stage_stale_days", "status_stale_days"];
const SCORING_FIELDS = ["email", "phone", "company", "industry", "rating", "source", "annual_revenue", "number_of_employees", "title"];
const TEMPLATE_CATEGORIES = ["general", "lead_followup", "proposal", "meeting", "task_reminder", "welcome", "custom"];

const inputCls = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const labelCls = "text-sm font-medium";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        {children}
      </div>
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

  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [wfForm, setWfForm] = useState({ name: "", entity_type: "lead", trigger_event: "on_create" });
  const [escForm, setEscForm] = useState({ name: "", entity_type: "lead", condition_type: "no_activity_days", threshold_days: 7 });
  const [scForm, setScForm] = useState({ name: "", field: "email", condition: "not_empty", value: "", score: 10 });
  const [tplForm, setTplForm] = useState({ name: "", subject: "", body: "", category: "general" });

  const fetchAll = useCallback(async () => {
    try {
      const [wf, esc, sc, tp, jb, al] = await Promise.all([
        getWorkflowRules().catch(() => ({ data: [] })),
        getEscalationRules().catch(() => ({ data: [] })),
        getScoringRules().catch(() => ({ data: [] })),
        getEmailTemplates().catch(() => ({ data: [] })),
        getScheduledJobs().catch(() => ({ data: [] })),
        getAuditLogs().catch(() => ({ data: [] })),
      ]);
      setWorkflows(wf.data || []);
      setEscalations(esc.data || []);
      setScoring(sc.data || []);
      setTemplates(tp.data || []);
      setJobs(jb.data || []);
      setAuditLogs(al.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await createWorkflowRule(wfForm);
      if (r.success && r.data) { setWorkflows((p) => [r.data, ...p]); setShowWorkflow(false); setWfForm({ name: "", entity_type: "lead", trigger_event: "on_create" }); }
    } finally { setSubmitting(false); }
  };

  const handleCreateEscalation = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await createEscalationRule(escForm);
      if (r.success && r.data) { setEscalations((p) => [r.data, ...p]); setShowEscalation(false); setEscForm({ name: "", entity_type: "lead", condition_type: "no_activity_days", threshold_days: 7 }); }
    } finally { setSubmitting(false); }
  };

  const handleCreateScoring = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await createScoringRule(scForm);
      if (r.success && r.data) { setScoring((p) => [r.data, ...p]); setShowScoring(false); setScForm({ name: "", field: "email", condition: "not_empty", value: "", score: 10 }); }
    } finally { setSubmitting(false); }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await createEmailTemplate(tplForm);
      if (r.success && r.data) { setTemplates((p) => [r.data, ...p]); setShowTemplate(false); setTplForm({ name: "", subject: "", body: "", category: "general" }); }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, type: string) => {
    try {
      if (type === "workflow") { await deleteWorkflowRule(id); setWorkflows((p) => p.filter((w) => w.id !== id)); }
      else if (type === "escalation") { await deleteEscalationRule(id); setEscalations((p) => p.filter((e) => e.id !== id)); }
      else if (type === "scoring") { await deleteScoringRule(id); setScoring((p) => p.filter((s) => s.id !== id)); }
      else if (type === "template") { await deleteEmailTemplate(id); setTemplates((p) => p.filter((t) => t.id !== id)); }
    } catch {}
  };

  const handleRunEscalations = async () => { setSubmitting(true); try { await runEscalationsNow(); await fetchAll(); } finally { setSubmitting(false); } };
  const handleRescore = async () => { setSubmitting(true); try { await rescoreAllLeads(); await fetchAll(); } finally { setSubmitting(false); } };
  const handleRunJobs = async () => { setSubmitting(true); try { await runScheduledJobsNow(); await fetchAll(); } finally { setSubmitting(false); } };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleString() : "-";

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Automation" subtitle="Manage workflows, rules, and scheduled jobs" />
        <div className="flex-1 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Automation" subtitle="Manage workflows, rules, and scheduled jobs" />
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

          {/* ===== Workflows ===== */}
          <TabsContent value="workflows">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Workflow Rules</h3>
                  <Button size="sm" onClick={() => setShowWorkflow(true)}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Entity</TableHead><TableHead>Trigger</TableHead>
                    <TableHead>Conditions</TableHead><TableHead>Actions</TableHead><TableHead>Runs</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {workflows.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{w.entity_type}</Badge></TableCell>
                        <TableCell>{w.trigger_event?.replace(/_/g, " ")}</TableCell>
                        <TableCell>{w.conditions?.length || 0}</TableCell>
                        <TableCell>{w.actions?.length || 0}</TableCell>
                        <TableCell>{w.run_count || 0}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(w.id, "workflow")}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {workflows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No workflow rules</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Escalations ===== */}
          <TabsContent value="escalations">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Escalation Rules</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRunEscalations} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Run Now
                    </Button>
                    <Button size="sm" onClick={() => setShowEscalation(true)}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
                  </div>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Entity</TableHead><TableHead>Condition</TableHead>
                    <TableHead>Threshold (days)</TableHead><TableHead>Active</TableHead><TableHead>Last Run</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {escalations.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{e.entity_type}</Badge></TableCell>
                        <TableCell>{e.condition_type?.replace(/_/g, " ")}</TableCell>
                        <TableCell>{e.threshold_days}</TableCell>
                        <TableCell><Badge variant={e.active !== false ? "success" : "secondary"}>{e.active !== false ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell>{fmtDate(e.last_run)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(e.id, "escalation")}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {escalations.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No escalation rules</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Scoring ===== */}
          <TabsContent value="scoring">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Scoring Rules</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRescore} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}Re-score All
                    </Button>
                    <Button size="sm" onClick={() => setShowScoring(true)}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
                  </div>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Field</TableHead><TableHead>Condition</TableHead>
                    <TableHead>Value</TableHead><TableHead>Score</TableHead><TableHead className="w-12"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {scoring.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.field}</TableCell>
                        <TableCell>{s.condition?.replace(/_/g, " ")}</TableCell>
                        <TableCell>{s.value || "-"}</TableCell>
                        <TableCell><Badge variant={s.score > 0 ? "success" : "destructive"}>{s.score > 0 ? "+" : ""}{s.score}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id, "scoring")}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {scoring.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scoring rules</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Templates ===== */}
          <TabsContent value="templates">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Email Templates</h3>
              <Button size="sm" onClick={() => setShowTemplate(true)}><Plus className="h-4 w-4 mr-2" />Add Template</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium truncate">{t.name}</h4>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDelete(t.id, "template")}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <Badge variant="info" className="mb-2 text-xs">{t.category}</Badge>
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.subject}</p>
                  </CardContent>
                </Card>
              ))}
              {templates.length === 0 && <p className="text-center py-8 text-muted-foreground col-span-3">No email templates</p>}
            </div>
          </TabsContent>

          {/* ===== Jobs ===== */}
          <TabsContent value="jobs">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Scheduled Jobs</h3>
                  <Button variant="outline" size="sm" onClick={handleRunJobs} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Run All Now
                  </Button>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Interval</TableHead>
                    <TableHead>Active</TableHead><TableHead>Last Run</TableHead><TableHead>Next Run</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {jobs.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.name}</TableCell>
                        <TableCell><Badge variant="outline">{j.type}</Badge></TableCell>
                        <TableCell>{j.interval || j.schedule || "-"}</TableCell>
                        <TableCell><Badge variant={j.active !== false ? "success" : "secondary"}>{j.active !== false ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell>{fmtDate(j.last_run)}</TableCell>
                        <TableCell>{fmtDate(j.next_run)}</TableCell>
                      </TableRow>
                    ))}
                    {jobs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scheduled jobs</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Audit ===== */}
          <TabsContent value="audit">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Audit Logs</h3>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Entity Type</TableHead><TableHead>Action</TableHead>
                    <TableHead>User</TableHead><TableHead>Details</TableHead><TableHead>Timestamp</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {auditLogs.map((l, i) => (
                      <TableRow key={l.id || i}>
                        <TableCell><Badge variant="outline" className="capitalize">{l.entity_type}</Badge></TableCell>
                        <TableCell>{l.action}</TableCell>
                        <TableCell>{l.user_name || l.user_id || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{l.details ? (typeof l.details === "string" ? l.details : JSON.stringify(l.details)) : "-"}</TableCell>
                        <TableCell>{fmtDate(l.timestamp || l.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {auditLogs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== Modals ===== */}
      <Modal open={showWorkflow} onClose={() => setShowWorkflow(false)} title="Add Workflow Rule">
        <form onSubmit={handleCreateWorkflow} className="space-y-4">
          <div><label className={labelCls}>Name</label><input required value={wfForm.name} onChange={(e) => setWfForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div><label className={labelCls}>Entity Type</label><select value={wfForm.entity_type} onChange={(e) => setWfForm((p) => ({ ...p, entity_type: e.target.value }))} className={`${inputCls} mt-1`}>{ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className={labelCls}>Trigger Event</label><select value={wfForm.trigger_event} onChange={(e) => setWfForm((p) => ({ ...p, trigger_event: e.target.value }))} className={`${inputCls} mt-1`}>{TRIGGER_EVENTS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowWorkflow(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
        </form>
      </Modal>

      <Modal open={showEscalation} onClose={() => setShowEscalation(false)} title="Add Escalation Rule">
        <form onSubmit={handleCreateEscalation} className="space-y-4">
          <div><label className={labelCls}>Name</label><input required value={escForm.name} onChange={(e) => setEscForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div><label className={labelCls}>Entity Type</label><select value={escForm.entity_type} onChange={(e) => setEscForm((p) => ({ ...p, entity_type: e.target.value }))} className={`${inputCls} mt-1`}>{["lead", "task", "opportunity"].map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className={labelCls}>Condition Type</label><select value={escForm.condition_type} onChange={(e) => setEscForm((p) => ({ ...p, condition_type: e.target.value }))} className={`${inputCls} mt-1`}>{ESCALATION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select></div>
          <div><label className={labelCls}>Threshold (Days)</label><input type="number" min="1" required value={escForm.threshold_days} onChange={(e) => setEscForm((p) => ({ ...p, threshold_days: +e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowEscalation(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
        </form>
      </Modal>

      <Modal open={showScoring} onClose={() => setShowScoring(false)} title="Add Scoring Rule">
        <form onSubmit={handleCreateScoring} className="space-y-4">
          <div><label className={labelCls}>Name</label><input required value={scForm.name} onChange={(e) => setScForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div><label className={labelCls}>Field</label><select value={scForm.field} onChange={(e) => setScForm((p) => ({ ...p, field: e.target.value }))} className={`${inputCls} mt-1`}>{SCORING_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
          <div><label className={labelCls}>Condition</label><select value={scForm.condition} onChange={(e) => setScForm((p) => ({ ...p, condition: e.target.value }))} className={`${inputCls} mt-1`}>{CONDITION_OPERATORS.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select></div>
          <div><label className={labelCls}>Value</label><input value={scForm.value} onChange={(e) => setScForm((p) => ({ ...p, value: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div><label className={labelCls}>Score</label><input type="number" required value={scForm.score} onChange={(e) => setScForm((p) => ({ ...p, score: +e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowScoring(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
        </form>
      </Modal>

      <Modal open={showTemplate} onClose={() => setShowTemplate(false)} title="Add Email Template">
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div><label className={labelCls}>Name</label><input required value={tplForm.name} onChange={(e) => setTplForm((p) => ({ ...p, name: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div><label className={labelCls}>Subject</label><input required value={tplForm.subject} onChange={(e) => setTplForm((p) => ({ ...p, subject: e.target.value }))} className={`${inputCls} mt-1`} /></div>
          <div><label className={labelCls}>Body</label><textarea required rows={5} value={tplForm.body} onChange={(e) => setTplForm((p) => ({ ...p, body: e.target.value }))} className={`${inputCls} mt-1 resize-none`} /></div>
          <div><label className={labelCls}>Category</label><select value={tplForm.category} onChange={(e) => setTplForm((p) => ({ ...p, category: e.target.value }))} className={`${inputCls} mt-1`}>{TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowTemplate(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
        </form>
      </Modal>
    </div>
  );
}
