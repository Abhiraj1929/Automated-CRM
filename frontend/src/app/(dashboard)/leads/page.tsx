"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLeads, createLead, convertLead } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Lead } from "@/types/crm";
import { Plus, Search, Loader2, X, ArrowRightLeft } from "lucide-react";

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showConvert, setShowConvert] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", industry: "", source: "" });
  const [convertForm, setConvertForm] = useState({ opportunity_name: "", opportunity_amount: "", opportunity_close_date: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const r = await getLeads({ limit: 100, search: search || undefined }); if (r.success && r.data) setLeads(r.data); } catch {} finally { setLoading(false); }
  }, [search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try { const r = await createLead(form); if (r.success && r.data) { setLeads((p) => [r.data, ...p]); setShowAdd(false); setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", industry: "", source: "" }); } } catch {} finally { setSubmitting(false); }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showConvert) return; setSubmitting(true);
    try { const r = await convertLead(showConvert, { opportunity_name: convertForm.opportunity_name || undefined, opportunity_amount: convertForm.opportunity_amount ? +convertForm.opportunity_amount : undefined, opportunity_close_date: convertForm.opportunity_close_date || undefined }); if (r.success) { setLeads((p) => p.map((l) => l.id === showConvert ? { ...l, status: "converted" } : l)); setShowConvert(null); setConvertForm({ opportunity_name: "", opportunity_amount: "", opportunity_close_date: "" }); } } catch {} finally { setSubmitting(false); }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "??";
  const getRatingColor = (r: string) => { switch (r) { case "hot": return "bg-red-100 text-red-700"; case "warm": return "bg-amber-100 text-amber-700"; default: return "bg-blue-100 text-blue-700"; } };

  return (
    <div className="flex flex-col h-full">
      <Header title="Leads" subtitle="Manage and convert your leads" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="search" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-80 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Lead</Button>
        </div>
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <Table><TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Company</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead>Score</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell onClick={() => router.push(`/leads/${lead.id}`)}><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(lead.first_name, lead.last_name)}</AvatarFallback></Avatar><div><p className="font-medium">{lead.first_name} {lead.last_name}</p><p className="text-sm text-muted-foreground">{lead.email}</p></div></div></TableCell>
                  <TableCell onClick={() => router.push(`/leads/${lead.id}`)}>{lead.company || "-"}</TableCell>
                  <TableCell onClick={() => router.push(`/leads/${lead.id}`)}><Badge className={`text-xs ${getRatingColor(lead.rating)}`}>{lead.rating}</Badge></TableCell>
                  <TableCell onClick={() => router.push(`/leads/${lead.id}`)}><Badge variant="outline" className="capitalize">{lead.status}</Badge></TableCell>
                  <TableCell onClick={() => router.push(`/leads/${lead.id}`)}>{lead.lead_score}</TableCell>
                  <TableCell className="text-right">{lead.status !== "converted" && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConvert(lead.id)} title="Convert"><ArrowRightLeft className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}{leads.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads</TableCell></TableRow>}</TableBody></Table>
          )}
        </CardContent></Card>
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Lead</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">First Name *</label><input required value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Last Name *</label><input required value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium">Email *</label><input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Phone</label><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Company</label><input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
          </form>
        </div></div>}
        {showConvert && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Convert Lead</h2><Button variant="ghost" size="icon" onClick={() => setShowConvert(null)}><X className="h-4 w-4" /></Button></div>
          <p className="text-sm text-muted-foreground mb-4">Creates Account + Contact + optional Opportunity.</p>
          <form onSubmit={handleConvert} className="space-y-4">
            <div><label className="text-sm font-medium">Opportunity Name (optional)</label><input value={convertForm.opportunity_name} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_name: e.target.value }))} placeholder="Leave blank to skip" className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Amount ($)</label><input type="number" value={convertForm.opportunity_amount} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_amount: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Close Date</label><input type="date" value={convertForm.opportunity_close_date} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_close_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowConvert(null)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Convert</Button></div>
          </form>
        </div></div>}
      </div>
    </div>
  );
}
