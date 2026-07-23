"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getContacts, createContact, getAccounts } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Contact, Account } from "@/types/crm";
import { Plus, Search, Loader2, X, Mail, Phone, Building2 } from "lucide-react";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", title: "", department: "", account_id: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const [cR, aR] = await Promise.all([getContacts({ limit: 100, search: search || undefined }), getAccounts({ limit: 200 })]); if (cR.success && cR.data) setContacts(cR.data); if (aR.success && aR.data) setAccounts(aR.data); } catch {} finally { setLoading(false); }
  }, [search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try { const r = await createContact(form); if (r.success && r.data) { setContacts((p) => [r.data, ...p]); setShowAdd(false); setForm({ first_name: "", last_name: "", email: "", phone: "", title: "", department: "", account_id: "" }); } } catch {} finally { setSubmitting(false); }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "??";

  return (
    <div className="flex flex-col h-full">
      <Header title="Contacts" subtitle="Manage your business contacts" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="search" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-80 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-4">
                <div className="flex items-start gap-3"><Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials(c.first_name, c.last_name)}</AvatarFallback></Avatar><div className="flex-1 min-w-0"><h3 className="font-medium">{c.first_name} {c.last_name}</h3>{c.title && <p className="text-sm text-muted-foreground">{c.title}</p>}{c.account && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Building2 className="h-3 w-3" />{c.account.name}</p>}</div></div>
                <div className="mt-3 space-y-1">{c.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.email}</span></div>}{c.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span>{c.phone}</span></div>}</div>
                {c.created_at && <p className="text-xs text-muted-foreground mt-2">Added {formatRelativeTime(c.created_at)}</p>}
              </CardContent></Card>
            ))}
            {contacts.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No contacts</div>}
          </div>
        )}
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Contact</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">First Name *</label><input required value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Last Name *</label><input required value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium">Email</label><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Phone</label><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Title</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium">Account</label><select value={form.account_id} onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"><option value="">None</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button></div>
          </form>
        </div></div>}
      </div>
    </div>
  );
}
