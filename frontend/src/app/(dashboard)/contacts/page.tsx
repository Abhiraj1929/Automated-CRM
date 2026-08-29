"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getContacts, createContact, getAccounts, exportData, importData } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Contact, Account } from "@/types/crm";
import { Plus, Search, Loader2, X, Mail, Phone, Building2, Download, Upload, FileUp } from "lucide-react";

const handleExportContacts = async (format: string) => {
  const response = await exportData("contacts", format);
  const blob = new Blob([response.data]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `contacts.${format}`;
  a.click();
};

const handleImportContacts = async (file: File) => {
  return await importData("contacts", file);
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", title: "", department: "", account_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try { const [cR, aR] = await Promise.all([getContacts({ limit: 100, search: search || undefined }), getAccounts({ limit: 200 })]); if (cR.success && cR.data) setContacts(cR.data); if (aR.success && aR.data) setAccounts(aR.data); } catch {} finally { setLoading(false); }
  }, [search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try { const r = await createContact(form); if (r.success && r.data) { setContacts((p) => [r.data, ...p]); setShowAdd(false); setForm({ first_name: "", last_name: "", email: "", phone: "", title: "", department: "", account_id: "" }); } } catch {} finally { setSubmitting(false); }
  };

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      await handleExportContacts(format);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      await handleImportContacts(importFile);
      setShowImport(false);
      setImportFile(null);
      await fetchData();
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImporting(false);
    }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "??";

  return (
    <div className="flex flex-col h-full">
      <Header title="Contacts" subtitle="Manage your business contacts" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="search" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-80 rounded-md border border-gray-300 bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={exporting !== null} onClick={() => handleExport("csv")}>
              {exporting === "csv" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Export CSV
            </Button>
            <Button variant="outline" size="sm" disabled={exporting !== null} onClick={() => handleExport("xlsx")}>
              {exporting === "xlsx" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Export XLSX
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
          </div>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-4">
                <div className="flex items-start gap-3"><Avatar className="h-12 w-12"><AvatarFallback className="bg-gray-100 text-gray-700 font-medium">{getInitials(c.first_name, c.last_name)}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><h3 className="font-medium">{c.first_name} {c.last_name}</h3>{c.title && <p className="text-sm text-gray-500">{c.title}</p>}{c.account && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Building2 className="h-3 w-3" />{c.account.name}</p>}</div></div>
                <div className="mt-3 space-y-1">{c.email && <div className="flex items-center gap-2 text-sm text-gray-500"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.email}</span></div>}{c.phone && <div className="flex items-center gap-2 text-sm text-gray-500"><Phone className="h-3 w-3 shrink-0" /><span>{c.phone}</span></div>}</div>
                {c.created_at && <p className="text-xs text-gray-400 mt-2">Added {formatRelativeTime(c.created_at)}</p>}
              </CardContent></Card>
            ))}
            {contacts.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No contacts</div>}
          </div>
        )}
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-900">Add Contact</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700">First Name *</label><input required value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium text-gray-700">Last Name *</label><input required value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium text-gray-700">Email</label><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700">Phone</label><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium text-gray-700">Title</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium text-gray-700">Account</label><select value={form.account_id} onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm mt-1"><option value="">None</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
          </form>
        </div></div>}
        {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-900">Import Contacts</h2><Button variant="ghost" size="icon" onClick={() => { setShowImport(false); setImportFile(null); }}><X className="h-4 w-4" /></Button></div>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Upload a CSV or Excel file containing contact data.</p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {importFile ? (
                <div className="flex flex-col items-center gap-2">
                  <FileUp className="h-8 w-8 text-blue-500" />
                  <p className="text-sm font-medium text-gray-900">{importFile.name}</p>
                  <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Click to select a file</p>
                  <p className="text-xs text-gray-500">CSV or Excel (.csv, .xlsx, .xls)</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowImport(false); setImportFile(null); }}>Cancel</Button>
              <Button disabled={!importFile || importing} onClick={handleImport}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import
              </Button>
            </div>
          </div>
        </div></div>}
      </div>
    </div>
  );
}
