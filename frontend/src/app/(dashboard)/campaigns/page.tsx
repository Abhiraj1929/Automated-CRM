"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Campaign } from "@/types/crm";
import { CAMPAIGN_TYPES, CAMPAIGN_STATUSES } from "@/types/crm";
import { Plus, Search, Loader2, X, Megaphone, DollarSign, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = { planning: "bg-slate-100 text-slate-700", active: "bg-emerald-100 text-emerald-700", paused: "bg-amber-100 text-amber-700", completed: "bg-blue-100 text-blue-700", cancelled: "bg-red-100 text-red-700" };

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "email", status: "planning", start_date: "", end_date: "", budget: "", actual_cost: "", expected_leads: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await getCampaigns({ search: search || undefined, status: filterStatus || undefined, type: filterType || undefined });
      if (r.success && r.data) setCampaigns(r.data);
    } catch {} finally { setLoading(false); }
  }, [search, filterStatus, filterType]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await createCampaign({ ...form, budget: form.budget ? +form.budget : 0, actual_cost: form.actual_cost ? +form.actual_cost : 0, expected_leads: form.expected_leads ? +form.expected_leads : 0 });
      if (r.success && r.data) { setCampaigns((p) => [r.data, ...p]); resetForm(); }
    } catch {} finally { setSubmitting(false); }
  };

  const handleEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({ name: c.name, type: c.type, status: c.status, start_date: c.start_date || "", end_date: c.end_date || "", budget: String(c.budget || ""), actual_cost: String(c.actual_cost || ""), expected_leads: String(c.expected_leads || ""), description: c.description || "" });
    setShowAdd(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingId) return; setSubmitting(true);
    try {
      const r = await updateCampaign(editingId, { ...form, budget: form.budget ? +form.budget : 0, actual_cost: form.actual_cost ? +form.actual_cost : 0, expected_leads: form.expected_leads ? +form.expected_leads : 0 });
      if (r.success && r.data) { setCampaigns((p) => p.map((x) => x.id === editingId ? r.data : x)); resetForm(); }
    } catch {} finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign? All linked leads will be unlinked.")) return;
    try { await deleteCampaign(id); setCampaigns((p) => p.filter((x) => x.id !== id)); } catch {}
  };

  const resetForm = () => { setShowAdd(false); setEditingId(null); setForm({ name: "", type: "email", status: "planning", start_date: "", end_date: "", budget: "", actual_cost: "", expected_leads: "", description: "" }); };

  // Summary stats
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.member_count || 0), 0);
  const totalConverted = campaigns.reduce((s, c) => s + (c.converted_leads || 0), 0);
  const totalPipeline = campaigns.reduce((s, c) => s + (c.pipeline_value || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Campaigns" subtitle="Marketing campaign management" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(262, 83%, 58%, 0.1)" }}><Megaphone className="h-5 w-5" style={{ color: "hsl(262, 83%, 58%)" }} /></div>
            <div><p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Campaigns</p><p className="text-xl font-bold">{campaigns.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(221, 83%, 53%, 0.1)" }}><Users className="h-5 w-5" style={{ color: "hsl(221, 83%, 53%)" }} /></div>
            <div><p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Total Leads</p><p className="text-xl font-bold">{totalLeads}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(142, 71%, 45%, 0.1)" }}><TrendingUp className="h-5 w-5" style={{ color: "hsl(142, 71%, 45%)" }} /></div>
            <div><p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Converted</p><p className="text-xl font-bold">{totalConverted}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(142, 71%, 45%, 0.1)" }}><DollarSign className="h-5 w-5" style={{ color: "hsl(142, 71%, 45%)" }} /></div>
            <div><p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Pipeline</p><p className="text-xl font-bold">{formatCurrency(totalPipeline)}</p></div>
          </CardContent></Card>
        </div>

        {/* Filters + Add */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 9%, 46%)" }} /><input type="search" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-64 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All Status</option>{CAMPAIGN_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">All Types</option>{CAMPAIGN_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}><Plus className="h-4 w-4 mr-2" />Add Campaign</Button>
        </div>

        {/* Table */}
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Converted</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const convRate = c.member_count > 0 ? ((c.converted_leads / c.member_count) * 100).toFixed(0) : "0";
                  const costPerLead = c.member_count > 0 ? (c.actual_cost / c.member_count).toFixed(0) : "0";
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/campaigns/${c.id}`} className="hover:underline">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "hsl(262, 83%, 58%, 0.1)" }}><Megaphone className="h-4 w-4" style={{ color: "hsl(262, 83%, 58%)" }} /></div>
                            <div>
                              <p className="font-medium">{c.name}</p>
                              {c.description && <p className="text-xs truncate max-w-[200px]" style={{ color: "hsl(220, 9%, 46%)" }}>{c.description}</p>}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{c.type}</Badge></TableCell>
                      <TableCell><Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{c.status}</Badge></TableCell>
                      <TableCell><div className="text-sm"><span className="font-medium">{c.member_count || 0}</span><span style={{ color: "hsl(220, 9%, 46%" }}> / {c.expected_leads || "?"}</span></div></TableCell>
                      <TableCell><div className="text-sm"><span className="font-medium" style={{ color: "hsl(142, 71%, 45%)" }}>{c.converted_leads || 0}</span><span style={{ color: "hsl(220, 9%, 46%)" }}> ({convRate}%)</span></div></TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(c.budget)}</TableCell>
                      <TableCell className="text-sm font-medium" style={{ color: "hsl(142, 71%, 45%)" }}>{formatCurrency(c.pipeline_value || 0)}</TableCell>
                      <TableCell><span className="text-sm font-medium" style={{ color: (c.roi || 0) > 0 ? "hsl(142, 71%, 45%)" : "hsl(220, 9%, 46%)" }}>{c.roi || 0}%</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/campaigns/${c.id}`}><Button variant="ghost" size="sm" className="h-7 text-xs">View</Button></Link>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(c)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" style={{ color: "hsl(0, 84%, 60%)" }} onClick={() => handleDelete(c.id)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {campaigns.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8" style={{ color: "hsl(220, 9%, 46%)" }}>No campaigns found</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>

        {/* Add/Edit Dialog */}
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{editingId ? "Edit Campaign" : "Add Campaign"}</h2><Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
            <div><label className="text-sm font-medium">Name *</label><input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Type</label><select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1">{CAMPAIGN_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
              <div><label className="text-sm font-medium">Status</label><select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1">{CAMPAIGN_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="grid grid-cols-3 gap-4"><div><label className="text-sm font-medium">Budget ($)</label><input type="number" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Actual Cost ($)</label><input type="number" value={form.actual_cost} onChange={(e) => setForm((p) => ({ ...p, actual_cost: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Expected Leads</label><input type="number" value={form.expected_leads} onChange={(e) => setForm((p) => ({ ...p, expected_leads: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button><Button type="submit" disabled={submitting} style={{ backgroundColor: "hsl(221, 83%, 53%" }}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingId ? "Update" : "Create"}</Button></div>
          </form>
        </div></div>}
      </div>
    </div>
  );
}
