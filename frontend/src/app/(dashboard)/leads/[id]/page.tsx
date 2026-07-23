"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLead, updateLead, updateLeadStatus, convertLead, deleteLead } from "@/lib/api";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import type { Lead } from "@/types/crm";
import { LEAD_STATUSES } from "@/types/crm";
import { ArrowLeft, Loader2, X, Mail, Phone, Building2, Calendar, ArrowRightLeft, Trash2, Star, TrendingUp } from "lucide-react";

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [convertForm, setConvertForm] = useState({ opportunity_name: "", opportunity_amount: "", opportunity_close_date: "" });
  const [form, setForm] = useState<Partial<Lead>>({});

  const fetchLead = useCallback(async () => {
    try { const r = await getLead(id); if (r.success && r.data) { setLead(r.data); setForm(r.data); } } catch { router.push("/leads"); } finally { setLoading(false); }
  }, [id, router]);
  useEffect(() => { fetchLead(); }, [fetchLead]);

  const handleUpdate = async (updates: Partial<Lead>) => {
    setUpdating(true);
    try { const r = await updateLead(id, updates); if (r.success && r.data) setLead(r.data); } catch {} finally { setUpdating(false); }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault(); setUpdating(true);
    try { const r = await convertLead(id, { opportunity_name: convertForm.opportunity_name || undefined, opportunity_amount: convertForm.opportunity_amount ? +convertForm.opportunity_amount : undefined, opportunity_close_date: convertForm.opportunity_close_date || undefined }); if (r.success) { setLead((p) => p ? { ...p, status: "converted" as any } : null); setShowConvert(false); } } catch {} finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this lead?")) return;
    try { await deleteLead(id); router.push("/leads"); } catch {}
  };

  const getInitials = (f?: string, l?: string) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "??";
  const getRatingColor = (r: string) => { switch (r) { case "hot": return "bg-red-100 text-red-700"; case "warm": return "bg-amber-100 text-amber-700"; default: return "bg-blue-100 text-blue-700"; } };
  const getStatusColor = (s: string) => { switch (s) { case "qualified": return "bg-emerald-100 text-emerald-700"; case "contacted": return "bg-blue-100 text-blue-700"; case "converted": return "bg-purple-100 text-purple-700"; case "unqualified": return "bg-gray-100 text-gray-700"; default: return "bg-primary/10 text-primary"; } };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!lead) return null;

  return (
    <div className="flex flex-col h-full">
      <Header title={`${lead.first_name} ${lead.last_name}`} subtitle="Lead Detail" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/leads")}><ArrowLeft className="h-4 w-4 mr-2" />Back to Leads</Button>
          <div className="flex gap-2">
            {lead.status !== "converted" && <Button size="sm" onClick={() => setShowConvert(true)}><ArrowRightLeft className="h-4 w-4 mr-2" />Convert</Button>}
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-lg">Lead Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">{getInitials(lead.first_name, lead.last_name)}</AvatarFallback></Avatar>
                <div><h2 className="text-xl font-semibold">{lead.first_name} {lead.last_name}</h2><p className="text-muted-foreground">{lead.email}</p></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{lead.phone || "No phone"}</span></div>
                <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{lead.company || "No company"}</span></div>
                <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{lead.source || "No source"}</span></div>
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Created {formatRelativeTime(lead.created_at)}</span></div>
              </div>
              {lead.description && <p className="text-sm text-muted-foreground mt-2">{lead.description}</p>}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Badge className={`${getStatusColor(lead.status)} capitalize`}>{lead.status}</Badge>
                {lead.status !== "converted" && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {LEAD_STATUSES.filter((s) => s.id !== lead.status).map((s) => (
                      <Button key={s.id} variant="outline" size="sm" className="text-xs h-7" onClick={() => handleUpdate({ status: s.id })}>{s.label}</Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Score</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{lead.lead_score}</span><span className="text-sm text-muted-foreground">/100</span></div>
                <Badge className={`${getRatingColor(lead.rating)} capitalize`}>{lead.rating}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Rating</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-1">
                  {["cold", "warm", "hot"].map((r) => (
                    <Button key={r} variant={lead.rating === r ? "default" : "outline"} size="sm" className="text-xs capitalize" onClick={() => handleUpdate({ rating: r } as any)}><Star className={`h-3 w-3 mr-1 ${lead.rating === r ? "fill-current" : ""}`} />{r}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {showConvert && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Convert Lead</h2><Button variant="ghost" size="icon" onClick={() => setShowConvert(false)}><X className="h-4 w-4" /></Button></div>
          <p className="text-sm text-muted-foreground mb-4">Creates Account + Contact + optional Opportunity.</p>
          <form onSubmit={handleConvert} className="space-y-4">
            <div><label className="text-sm font-medium">Opportunity Name (optional)</label><input value={convertForm.opportunity_name} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_name: e.target.value }))} placeholder="Leave blank to skip" className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Amount ($)</label><input type="number" value={convertForm.opportunity_amount} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_amount: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Close Date</label><input type="date" value={convertForm.opportunity_close_date} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_close_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button><Button type="submit" disabled={updating}>{updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Convert</Button></div>
          </form>
        </div></div>}
      </div>
    </div>
  );
}
