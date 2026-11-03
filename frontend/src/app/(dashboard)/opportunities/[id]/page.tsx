"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOpportunity, updateOpportunity, updateOpportunityStage, deleteOpportunity } from "@/lib/api";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Opportunity } from "@/types/crm";
import { PIPELINE_STAGES } from "@/types/crm";
import { ArrowLeft, Loader2, IndianRupee, Calendar, Building2, User, Pencil, Trash2, CheckCircle2 } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  prospecting: "bg-blue-100 text-blue-700",
  qualification: "bg-indigo-100 text-indigo-700",
  needs_analysis: "bg-violet-100 text-violet-700",
  proposal: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  closed_won: "bg-emerald-100 text-emerald-700",
  closed_lost: "bg-red-100 text-red-700",
};

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Opportunity>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const r = await getOpportunity(id); if (r.success && r.data) { setOpp(r.data); setForm(r.data); } } catch { router.push("/opportunities"); } finally { setLoading(false); }
  }, [id, router]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSubmitting(true);
    try { const r = await updateOpportunity(id, form); if (r.success && r.data) { setOpp(r.data); setEditing(false); } } catch {} finally { setSubmitting(false); }
  };

  const handleStageChange = async (stage: string) => {
    setSubmitting(true);
    try { const r = await updateOpportunityStage(id, stage); if (r.success) { setOpp((p) => p ? { ...p, stage: stage as any } : null); } } catch {} finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this opportunity?")) return;
    try { await deleteOpportunity(id); router.push("/opportunities"); } catch {}
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!opp) return null;

  const currentStageIdx = PIPELINE_STAGES.findIndex((s) => s.id === opp.stage);

  return (
    <div className="flex flex-col h-full">
      <Header title={opp.name} subtitle="Opportunity Detail" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/opportunities")}><ArrowLeft className="h-4 w-4 mr-2" />Back to Pipeline</Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4 mr-2" />{editing ? "Cancel" : "Edit"}</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-lg">Opportunity Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-3">
                  <div><label className="text-sm font-medium">Name</label><input value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Amount ($)</label><input type="number" value={form.amount || ""} onChange={(e) => setForm((p) => ({ ...p, amount: +e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Close Date</label><input type="date" value={form.close_date || ""} onChange={(e) => setForm((p) => ({ ...p, close_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
                  <div><label className="text-sm font-medium">Description</label><textarea value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" /></div>
                  <Button size="sm" onClick={handleSave} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><Badge className={`${STAGE_COLORS[opp.stage]}`}>{PIPELINE_STAGES.find((s) => s.id === opp.stage)?.label || opp.stage}</Badge></div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm"><IndianRupee className="h-4 w-4 text-muted-foreground" /><span className="text-lg font-semibold">{formatCurrency(opp.amount)}</span></div>
                    {opp.close_date && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />Close: {opp.close_date}</div>}
                    {opp.account && <div className="flex items-center gap-2 text-sm cursor-pointer hover:underline" onClick={() => router.push(`/accounts/${opp.account_id}`)}><Building2 className="h-4 w-4 text-muted-foreground" />{opp.account.name}</div>}
                    {opp.contact && <div className="flex items-center gap-2 text-sm cursor-pointer hover:underline" onClick={() => router.push(`/contacts/${opp.contact_id}`)}><User className="h-4 w-4 text-muted-foreground" />{opp.contact.first_name} {opp.contact.last_name}</div>}
                  </div>
                  {opp.description && <p className="text-sm text-muted-foreground">{opp.description}</p>}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Pipeline Stage</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {PIPELINE_STAGES.map((stage, i) => (
                <Button key={stage.id} variant={opp.stage === stage.id ? "default" : "outline"} size="sm" className="w-full justify-start text-xs h-8" disabled={submitting} onClick={() => handleStageChange(stage.id)}>
                  {opp.stage === stage.id && <CheckCircle2 className="h-3 w-3 mr-2" />}
                  {stage.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
