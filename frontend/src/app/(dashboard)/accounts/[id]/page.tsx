"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccount, updateAccount, deleteAccount, getContacts } from "@/lib/api";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Account, Contact } from "@/types/crm";
import { ArrowLeft, Loader2, Mail, Phone, Building2, Globe, MapPin, Users, DollarSign, Pencil, Trash2 } from "lucide-react";

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Account>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [aR, cR] = await Promise.all([getAccount(id), getContacts({ account_id: id })]);
      if (aR.success && aR.data) { setAccount(aR.data); setForm(aR.data); }
      if (cR.success && cR.data) setContacts(cR.data);
    } catch { router.push("/accounts"); } finally { setLoading(false); }
  }, [id, router]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSubmitting(true);
    try { const r = await updateAccount(id, form); if (r.success && r.data) { setAccount(r.data); setEditing(false); } } catch {} finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this account?")) return;
    try { await deleteAccount(id); router.push("/accounts"); } catch {}
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!account) return null;

  return (
    <div className="flex flex-col h-full">
      <Header title={account.name} subtitle="Account Detail" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/accounts")}><ArrowLeft className="h-4 w-4 mr-2" />Back to Accounts</Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4 mr-2" />{editing ? "Cancel" : "Edit"}</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-lg">Account Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-3">
                  <div><label className="text-sm font-medium">Name</label><input value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Industry</label><input value={form.industry || ""} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Website</label><input value={form.website || ""} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Phone</label><input value={form.phone || ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Email</label><input value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
                  <div className="grid grid-cols-3 gap-3"><div><label className="text-sm font-medium">City</label><input value={form.city || ""} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">State</label><input value={form.state || ""} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Country</label><input value={form.country || ""} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Revenue ($)</label><input type="number" value={form.annual_revenue || ""} onChange={(e) => setForm((p) => ({ ...p, annual_revenue: +e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Employees</label><input type="number" value={form.number_of_employees || ""} onChange={(e) => setForm((p) => ({ ...p, number_of_employees: +e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
                  <Button size="sm" onClick={handleSave} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div><div><h2 className="text-xl font-semibold">{account.name}</h2>{account.industry && <Badge variant="secondary">{account.industry}</Badge>}</div></div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {account.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{account.email}</div>}
                    {account.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{account.phone}</div>}
                    {account.website && <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-muted-foreground" />{account.website}</div>}
                    {(account.city || account.state || account.country) && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{[account.city, account.state, account.country].filter(Boolean).join(", ")}</div>}
                    {account.annual_revenue && <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-muted-foreground" />{formatCurrency(account.annual_revenue)}</div>}
                    {account.number_of_employees && <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted-foreground" />{account.number_of_employees.toLocaleString()} employees</div>}
                  </div>
                  {account.description && <p className="text-sm text-muted-foreground mt-2">{account.description}</p>}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Contacts ({contacts.length})</CardTitle></CardHeader>
            <CardContent>
              {contacts.length > 0 ? (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/contacts/${c.id}`)}>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{c.first_name[0]}{c.last_name[0]}</div>
                      <div><p className="text-sm font-medium">{c.first_name} {c.last_name}</p><p className="text-xs text-muted-foreground">{c.email || c.phone || ""}</p></div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No contacts</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
