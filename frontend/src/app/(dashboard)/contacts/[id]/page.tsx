"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getContact, updateContact, deleteContact } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Contact } from "@/types/crm";
import { ArrowLeft, Loader2, Mail, Phone, Building2, User, Pencil, Trash2 } from "lucide-react";

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const r = await getContact(id); if (r.success && r.data) { setContact(r.data); setForm(r.data); } } catch { router.push("/contacts"); } finally { setLoading(false); }
  }, [id, router]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSubmitting(true);
    try { const r = await updateContact(id, form); if (r.success && r.data) { setContact(r.data); setEditing(false); } } catch {} finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this contact?")) return;
    try { await deleteContact(id); router.push("/contacts"); } catch {}
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!contact) return null;

  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase() || "??";

  return (
    <div className="flex flex-col h-full">
      <Header title={`${contact.first_name} ${contact.last_name}`} subtitle="Contact Detail" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/contacts")}><ArrowLeft className="h-4 w-4 mr-2" />Back to Contacts</Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}><Pencil className="h-4 w-4 mr-2" />{editing ? "Cancel" : "Edit"}</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-lg">Contact Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">First Name</label><input value={form.first_name || ""} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Last Name</label><input value={form.last_name || ""} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
                  <div><label className="text-sm font-medium">Email</label><input value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Phone</label><input value={form.phone || ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Title</label><input value={form.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
                  <Button size="sm" onClick={handleSave} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3"><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-medium text-primary">{initials}</div><div><h2 className="text-xl font-semibold">{contact.first_name} {contact.last_name}</h2>{contact.title && <p className="text-muted-foreground">{contact.title}</p>}{contact.account && <p className="text-sm text-primary cursor-pointer hover:underline" onClick={() => router.push(`/accounts/${contact.account_id}`)}>{contact.account.name}</p>}</div></div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {contact.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{contact.email}</div>}
                    {contact.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{contact.phone}</div>}
                    {contact.department && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" />{contact.department}</div>}
                  </div>
                  {contact.created_at && <p className="text-xs text-muted-foreground mt-2">Added {formatRelativeTime(contact.created_at)}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
