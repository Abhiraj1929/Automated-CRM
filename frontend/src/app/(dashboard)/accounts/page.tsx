"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccounts, createAccount, exportData, importData } from "@/lib/api";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Account } from "@/types/crm";
import { Plus, Search, Loader2, X, Building2, Download, Upload } from "lucide-react";

export default function AccountsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", website: "", phone: "", email: "", city: "", state: "", country: "", annual_revenue: "", number_of_employees: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const r = await getAccounts({ limit: 100, search: search || undefined }); if (r.success && r.data) setAccounts(r.data); } catch {} finally { setLoading(false); }
  }, [search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try { const r = await createAccount({ ...form, annual_revenue: form.annual_revenue ? +form.annual_revenue : null, number_of_employees: form.number_of_employees ? +form.number_of_employees : null }); if (r.success && r.data) { setAccounts((p) => [r.data, ...p]); setShowAdd(false); setForm({ name: "", industry: "", website: "", phone: "", email: "", city: "", state: "", country: "", annual_revenue: "", number_of_employees: "", description: "" }); } } catch {} finally { setSubmitting(false); }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    setExporting(true);
    try {
      const response = await exportData("accounts", format);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `accounts.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importData("accounts", file);
      await fetchData();
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Accounts" subtitle="Manage your companies" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="search" placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-80 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} />
            <Button size="sm" variant="outline" disabled={exporting || importing} onClick={() => handleExport("csv")}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export CSV
            </Button>
            <Button size="sm" variant="outline" disabled={exporting || importing} onClick={() => handleExport("xlsx")}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export XLSX
            </Button>
            <Button size="sm" variant="outline" disabled={exporting || importing} onClick={() => fileInputRef.current?.click()}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Account</Button>
          </div>
        </div>
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Industry</TableHead><TableHead>Revenue</TableHead><TableHead>Employees</TableHead><TableHead>Owner</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>{accounts.map((a) => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/accounts/${a.id}`)}>
                  <TableCell><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div><div><p className="font-medium">{a.name}</p>{a.email && <p className="text-sm text-muted-foreground">{a.email}</p>}</div></div></TableCell>
                  <TableCell>{a.industry ? <Badge variant="secondary">{a.industry}</Badge> : "-"}</TableCell>
                  <TableCell>{a.annual_revenue ? formatCurrency(a.annual_revenue) : "-"}</TableCell>
                  <TableCell>{a.number_of_employees || "-"}</TableCell>
                  <TableCell>{a.owner?.name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatRelativeTime(a.created_at)}</TableCell>
                </TableRow>
              ))}{accounts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No accounts</TableCell></TableRow>}</TableBody></Table>
          )}
        </CardContent></Card>
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Account</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div><label className="text-sm font-medium">Name *</label><input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Industry</label><input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Website</label><input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Phone</label><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Email</label><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="grid grid-cols-3 gap-4"><div><label className="text-sm font-medium">City</label><input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">State</label><input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Country</label><input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Revenue ($)</label><input type="number" value={form.annual_revenue} onChange={(e) => setForm((p) => ({ ...p, annual_revenue: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Employees</label><input type="number" value={form.number_of_employees} onChange={(e) => setForm((p) => ({ ...p, number_of_employees: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
          </form>
        </div></div>}
      </div>
    </div>
  );
}
