"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { getUsers, apiClient } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Plus, Search, Loader2, X, Shield, UserCog, Trash2 } from "lucide-react";

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee", department: "", designation: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => { try { const r = await getUsers({ limit: 100 }); if (r.success && r.data) setUsers(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async (e: React.FormEvent) => { e.preventDefault(); setSubmitting(true); try { const r = await apiClient.post("/users", form); if (r.data?.success) { setUsers((p) => [r.data.data, ...p]); setShowAdd(false); setForm({ name: "", email: "", password: "", role: "employee", department: "", designation: "", phone: "" }); } } catch {} finally { setSubmitting(false); } };
  const handleDeactivate = async (id: string) => { try { await apiClient.delete(`/users/${id}`); setUsers((p) => p.map((u) => u.id === id ? { ...u, status: "inactive" } : u)); } catch {} };

  const getInitials = (n: string) => n?.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2) || "??";
  const getRoleBadge = (r: string) => { switch (r) { case "admin": return <Badge className="bg-purple-100 text-purple-700"><Shield className="h-3 w-3 mr-1" />Admin</Badge>; case "manager": return <Badge className="bg-blue-100 text-blue-700"><UserCog className="h-3 w-3 mr-1" />Manager</Badge>; default: return <Badge variant="secondary" className="capitalize">{r}</Badge>; } };

  if (currentUser?.role !== "admin") return <div className="flex flex-col h-full"><Header title="Access Denied" subtitle="" /><div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Admin only.</p></div></div>;

  return (
    <div className="flex flex-col h-full">
      <Header title="User Management" subtitle="Manage team members" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="search" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-80 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>
        </div>
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(u.name)}</AvatarFallback></Avatar><div><p className="font-medium">{u.name}</p><p className="text-sm text-muted-foreground">{u.email}</p></div></div></TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell>{u.department || "-"}</TableCell>
                  <TableCell><Badge variant={u.status === "active" ? "outline" : "destructive"} className="capitalize">{u.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatRelativeTime(u.created_at)}</TableCell>
                  <TableCell className="text-right">{u.id !== currentUser?.id && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeactivate(u.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}{filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>}</TableBody></Table>
          )}
        </CardContent></Card>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add User</h2><Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button></div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="text-sm font-medium">Name *</label><input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
              <div><label className="text-sm font-medium">Email *</label><input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
              <div><label className="text-sm font-medium">Password *</label><input type="password" required minLength={6} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
              <div><label className="text-sm font-medium">Role</label><select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1"><option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Department</label><input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
                <div><label className="text-sm font-medium">Designation</label><input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
              </div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create User</Button></div>
            </form>
          </div></div>
        )}
      </div>
    </div>
  );
}
