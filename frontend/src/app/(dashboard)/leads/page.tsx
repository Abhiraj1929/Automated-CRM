"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLeads, createLead, convertLead, exportData, importData, apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime } from "@/lib/utils";
import type { Lead } from "@/types/crm";
import { Plus, Search, Loader2, X, ArrowRightLeft, Download, Upload, UserPlus, Check, Trash2 } from "lucide-react";

interface TeamMember { id: string; name: string; email: string; role: string; }

export default function LeadsPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, isManager } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showConvert, setShowConvert] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", industry: "", source: "" });
  const [convertForm, setConvertForm] = useState({ opportunity_name: "", opportunity_amount: "", opportunity_close_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  // Assignment state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignTarget, setAssignTarget] = useState("");
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  const canAssign = isAdmin || isManager;

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, teamRes] = await Promise.all([
        getLeads({ limit: 200, search: search || undefined }),
        canAssign ? apiClient.get("/users?limit=100").then((r) => r.data) : Promise.resolve({ success: true, data: [] }),
      ]);
      if (leadsRes.success && leadsRes.data) setLeads(leadsRes.data);
      if (teamRes.success && teamRes.data) setTeam(teamRes.data);
    } catch {} finally { setLoading(false); }
  }, [search, canAssign]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try { const r = await createLead(form); if (r.success && r.data) { setLeads((p) => [r.data, ...p]); setShowAdd(false); setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", title: "", industry: "", source: "" }); } } catch {} finally { setSubmitting(false); }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showConvert) return; setSubmitting(true);
    try { const r = await convertLead(showConvert, { opportunity_name: convertForm.opportunity_name || undefined, opportunity_amount: convertForm.opportunity_amount ? +convertForm.opportunity_amount : undefined, opportunity_close_date: convertForm.opportunity_close_date || undefined }); if (r.success) { setLeads((p) => p.map((l) => l.id === showConvert ? { ...l, status: "converted" } : l)); setShowConvert(null); } } catch {} finally { setSubmitting(false); }
  };

  // ---- Assignment ----
  const handleAssignLead = async (leadId: string, ownerId: string) => {
    setAssigningLeadId(leadId);
    try {
      const r = await apiClient.put(`/leads/${leadId}/assign`, { owner_id: ownerId });
      if (r.data?.success) {
        const assignedUser = team.find((u) => u.id === ownerId);
        setLeads((p) => p.map((l) => l.id === leadId ? { ...l, owner: assignedUser || l.owner, owner_id: ownerId } : l));
      }
    } catch {}
    setAssigningLeadId(null);
  };

  const handleBulkAssign = async () => {
    if (selectedLeads.size === 0 || !assignTarget) return;
    setAssigning(true);
    try {
      const r = await apiClient.post("/leads/bulk-assign", { lead_ids: Array.from(selectedLeads), owner_id: assignTarget });
      if (r.data?.success) {
        const assignedUser = team.find((u) => u.id === assignTarget);
        setLeads((p) => p.map((l) => selectedLeads.has(l.id) ? { ...l, owner: assignedUser || l.owner, owner_id: assignTarget } : l));
        setSelectedLeads(new Set());
        setShowBulkAssign(false);
        setAssignTarget("");
      }
    } catch {}
    setAssigning(false);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    setDeletingLeadId(leadId);
    try {
      const r = await apiClient.delete(`/leads/${leadId}`);
      if (r.data?.success) {
        setLeads((p) => p.filter((l) => l.id !== leadId));
      }
    } catch {}
    setDeletingLeadId(null);
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setImportResult(null);
    try { const result = await importData("leads", file); setImportResult(result); fetchData(); } catch { setImportResult({ success: false, message: "Import failed" }); } finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "??";
  const getRatingColor = (r: string) => { switch (r) { case "hot": return "bg-red-100 text-red-700"; case "warm": return "bg-amber-100 text-amber-700"; default: return "bg-blue-100 text-blue-700"; } };

  return (
    <div className="flex flex-col h-full">
      <Header title="Leads" subtitle="Manage, assign and convert your leads" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="search" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-80 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <div className="flex items-center gap-2">
            {canAssign && selectedLeads.size > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowBulkAssign(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign ({selectedLeads.size})
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Import
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { try { await exportData("leads", "csv"); } catch {} }}>
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Lead</Button>
          </div>
        </div>

        {importResult && (
          <div className={`rounded-md border p-4 text-sm ${importResult.success !== false ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            <div className="flex items-center justify-between">
              <div>
                {importResult.imported !== undefined && <span className="font-medium">Imported: {importResult.imported}</span>}
                {importResult.skipped !== undefined && <span className="ml-4">Skipped: {importResult.skipped}</span>}
                {importResult.message && <span className="ml-4">{importResult.message}</span>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setImportResult(null)}><X className="h-3 w-3" /></Button>
            </div>
          </div>
        )}

        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canAssign && <TableHead className="w-10"><input type="checkbox" checked={selectedLeads.size === leads.length && leads.length > 0} onChange={toggleSelectAll} className="rounded" /></TableHead>}
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  {canAssign && <TableHead>Assigned To</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className={selectedLeads.has(lead.id) ? "bg-muted/50" : ""}>
                    {canAssign && (
                      <TableCell>
                        <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => toggleSelectLead(lead.id)} className="rounded" />
                      </TableCell>
                    )}
                    <TableCell onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(lead.first_name, lead.last_name)}</AvatarFallback></Avatar>
                        <div><p className="font-medium">{lead.first_name} {lead.last_name}</p><p className="text-sm text-muted-foreground">{lead.email}</p></div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer">{lead.company || "-"}</TableCell>
                    <TableCell onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer"><Badge className={`text-xs ${getRatingColor(lead.rating)}`}>{lead.rating}</Badge></TableCell>
                    <TableCell onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer"><Badge variant="outline" className="capitalize">{lead.status}</Badge></TableCell>
                    <TableCell onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer">{lead.lead_score}</TableCell>
                    {canAssign && (
                      <TableCell>
                        <select
                          value={(lead as any).owner_id || ""}
                          onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                          disabled={assigningLeadId === lead.id}
                          className="h-8 rounded border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Unassigned</option>
                          {team.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {lead.status !== "converted" && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConvert(lead.id)} title="Convert"><ArrowRightLeft className="h-4 w-4" /></Button>}
                      {(isAdmin || isManager) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteLead(lead.id)} disabled={deletingLeadId === lead.id} title="Delete">
                          {deletingLeadId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {leads.length === 0 && <TableRow><TableCell colSpan={canAssign ? 8 : 7} className="text-center py-8 text-muted-foreground">No leads</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>

        {/* Add Lead Dialog */}
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Lead</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">First Name *</label><input required value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Last Name *</label><input required value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium">Email *</label><input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Phone</label><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Company</label><input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
          </form>
        </div></div>}

        {/* Convert Dialog */}
        {showConvert && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Convert Lead</h2><Button variant="ghost" size="icon" onClick={() => setShowConvert(null)}><X className="h-4 w-4" /></Button></div>
          <p className="text-sm text-muted-foreground mb-4">Creates Account + Contact + optional Opportunity.</p>
          <form onSubmit={handleConvert} className="space-y-4">
            <div><label className="text-sm font-medium">Opportunity Name (optional)</label><input value={convertForm.opportunity_name} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_name: e.target.value }))} placeholder="Leave blank to skip" className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Amount ($)</label><input type="number" value={convertForm.opportunity_amount} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_amount: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Close Date</label><input type="date" value={convertForm.opportunity_close_date} onChange={(e) => setConvertForm((p) => ({ ...p, opportunity_close_date: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowConvert(null)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Convert</Button></div>
          </form>
        </div></div>}

        {/* Bulk Assign Dialog */}
        {showBulkAssign && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Assign {selectedLeads.size} Leads</h2><Button variant="ghost" size="icon" onClick={() => setShowBulkAssign(false)}><X className="h-4 w-4" /></Button></div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assign to team member</label>
              <select value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1">
                <option value="">Select team member...</option>
                {team.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
              <Button onClick={handleBulkAssign} disabled={!assignTarget || assigning}>
                {assigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Assign All
              </Button>
            </div>
          </div>
        </div></div>}
      </div>
    </div>
  );
}
