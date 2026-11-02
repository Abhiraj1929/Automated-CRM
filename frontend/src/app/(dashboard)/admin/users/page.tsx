"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { Plus, Search, Loader2, Mail, Trash2, Copy, Users, Send, Edit, Key } from "lucide-react";

interface User {
  id: string; name: string; email: string; role: string; status: string;
  department: string; designation: string; phone: string; manager_id: string | null; created_at: string;
}

interface Invitation {
  id: string; email: string; role: string; department: string; designation: string;
  status: string; expires_at: string; created_at: string;
  inviter: { name: string } | null;
}

interface Quota {
  allowed: boolean; current: number; limit: number; plan: string; error?: string;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  // Add User
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "employee", department: "", designation: "", phone: "", manager_id: "" });
  const [submitting, setSubmitting] = useState(false);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "employee", department: "", designation: "" });
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit User
  const [showEdit, setShowEdit] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", department: "", designation: "", phone: "", manager_id: "" });

  // Reset Password
  const [showResetPwd, setShowResetPwd] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Delete/Deactivate
  const [showDeactivate, setShowDeactivate] = useState<User | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, quotaRes] = await Promise.all([
        apiClient.get("/users?limit=100"),
        apiClient.get("/invitations/quota").catch(() => ({ data: { data: { allowed: true, current: 0, limit: 5, plan: "starter" } } })),
      ]);
      if (usersRes.data?.success) setUsers(usersRes.data.data);
      setQuota(quotaRes.data?.data || null);
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const r = await apiClient.get("/invitations");
      if (r.data?.success) setInvitations(r.data.data);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); fetchInvitations(); }, [fetchData, fetchInvitations]);

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // ---- Add User ----
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await apiClient.post("/users", userForm);
      if (r.data?.success) {
        setUsers((p) => [r.data.data, ...p]);
        setShowAddUser(false);
        setUserForm({ name: "", email: "", password: "", role: "employee", department: "", designation: "", phone: "", manager_id: "" });
        fetchData();
      }
    } catch (err: any) { alert(err.response?.data?.error || "Failed to create user"); }
    finally { setSubmitting(false); }
  };

  // ---- Edit User ----
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showEdit) return; setSubmitting(true);
    try {
      const r = await apiClient.put(`/users/${showEdit.id}`, editForm);
      if (r.data?.success) {
        setUsers((p) => p.map((u) => u.id === showEdit.id ? { ...u, ...editForm } : u));
        setShowEdit(null);
      }
    } catch (err: any) { alert(err.response?.data?.error || "Failed to update user"); }
    finally { setSubmitting(false); }
  };

  // ---- Reset Password ----
  const handleResetPassword = async () => {
    if (!showResetPwd || !newPassword) return;
    if (newPassword.length < 8) { alert("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    try {
      await apiClient.patch(`/users/${showResetPwd}/reset-password`, { password: newPassword });
      setShowResetPwd(null); setNewPassword(""); alert("Password reset successfully");
    } catch (err: any) { alert(err.response?.data?.error || "Failed to reset password"); }
    finally { setSubmitting(false); }
  };

  // ---- Deactivate User ----
  const handleDeactivate = async () => {
    if (!showDeactivate) return; setSubmitting(true);
    try {
      await apiClient.delete(`/users/${showDeactivate.id}`);
      setUsers((p) => p.map((u) => u.id === showDeactivate.id ? { ...u, status: "inactive" } : u));
      setShowDeactivate(null);
    } catch (err: any) { alert(err.response?.data?.error || "Failed to deactivate user"); }
    finally { setSubmitting(false); }
  };

  // ---- Invite ----
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await apiClient.post("/invitations", inviteForm);
      if (r.data?.success) {
        setInviteResult({ url: r.data.data?.inviteUrl || "" });
        fetchInvitations(); setQuota(r.data.quota || null);
      }
    } catch (err: any) { alert(err.response?.data?.error || "Failed to send invitation"); }
    finally { setSubmitting(false); }
  };

  const revokeInvite = async (id: string) => {
    if (!confirm("Revoke this invitation?")) return;
    try { await apiClient.delete(`/invitations/${id}`); setInvitations((p) => p.map((i) => i.id === id ? { ...i, status: "revoked" } : i)); } catch {}
  };

  const resendInvite = async (id: string) => {
    try { await apiClient.post(`/invitations/${id}/resend`); alert("Invitation resent!"); }
    catch (err: any) { alert(err.response?.data?.error || "Failed to resend"); }
  };

  const copyLink = (url: string) => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const getRoleBadge = (role: string) => {
    const c: Record<string, string> = { admin: "hsl(262, 83%, 58%)", manager: "hsl(221, 83%, 53%)", employee: "hsl(220, 9%, 46%)" };
    return <Badge style={{ backgroundColor: c[role] || c.employee, color: "white" }}>{role}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Team Management</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>
            {quota ? `${quota.current}/${quota.limit} users (${quota.plan} plan)` : "Manage your team members"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowInvite(true); setInviteResult(null); setInviteForm({ email: "", role: "employee", department: "", designation: "" }); }}>
            <Send className="h-4 w-4 mr-2" /> Invite Member
          </Button>
          <Button onClick={() => setShowAddUser(true)} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" /> Users ({users.length})</TabsTrigger>
          <TabsTrigger value="invitations"><Mail className="h-4 w-4 mr-1.5" /> Invitations ({invitations.filter(i => i.status === "pending").length} pending)</TabsTrigger>
        </TabsList>

        {/* ============ USERS TAB ============ */}
        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 9%, 46%)" }} />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
                          {u.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{u.department || "-"}</TableCell>
                    <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status}</Badge></TableCell>
                    <TableCell className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {u.id !== currentUser?.id && (
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" title="Edit user" onClick={() => { setShowEdit(u); setEditForm({ name: u.name, role: u.role, department: u.department || "", designation: u.designation || "", phone: u.phone || "", manager_id: u.manager_id || "" }); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Reset password" onClick={() => { setShowResetPwd(u.id); setNewPassword(""); }}>
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          {u.status === "active" && (
                            <Button variant="ghost" size="sm" title={`Delete ${u.role}`} onClick={() => setShowDeactivate(u)}>
                              <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(0, 84%, 60%)" }} />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8" style={{ color: "hsl(220, 9%, 46%)" }}>No users found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ============ INVITATIONS TAB ============ */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{getRoleBadge(inv.role)}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "pending" ? "default" : inv.status === "accepted" ? "default" : "secondary"}
                        style={{ backgroundColor: inv.status === "pending" ? "hsl(38, 92%, 50%)" : inv.status === "accepted" ? "hsl(142, 71%, 45%)" : "hsl(220, 9%, 80%)", color: "white" }}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{inv.inviter?.name || "-"}</TableCell>
                    <TableCell className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                      {inv.status === "pending" ? new Date(inv.expires_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button variant="outline" size="sm" onClick={() => resendInvite(inv.id)}>Resend</Button>
                          <Button variant="outline" size="sm" onClick={() => revokeInvite(inv.id)} style={{ color: "hsl(0, 84%, 60%)" }}>Revoke</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {invitations.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8" style={{ color: "hsl(220, 9%, 46%)" }}>No invitations yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ ADD USER DIALOG ============ */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle><DialogDescription>Create an account directly (you set their password)</DialogDescription></DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 mt-4">
            <div><Label>Name</Label><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required className="mt-1.5" /></div>
            <div><Label>Email</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="mt-1.5" /></div>
            <div><Label>Password</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={8} className="mt-1.5" /></div>
            <div>
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label><Input value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Designation</Label><Input value={userForm.designation} onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })} className="mt-1.5" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ INVITE DIALOG ============ */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          {inviteResult ? (
            <>
              <DialogHeader><DialogTitle>Invitation Sent!</DialogTitle><DialogDescription>Share this link with your team member</DialogDescription></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Input readOnly value={inviteResult.url} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyLink(inviteResult.url)}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs" style={{ color: copied ? "hsl(142, 71%, 45%)" : "hsl(220, 9%, 46%)" }}>{copied ? "Copied!" : "The invite link has also been sent via email."}</p>
                <Button onClick={() => setShowInvite(false)} className="w-full" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>Done</Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle>Invite Team Member</DialogTitle><DialogDescription>They will receive an email with a link to join</DialogDescription></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required placeholder="colleague@company.com" className="mt-1.5" /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Department</Label><Input value={inviteForm.department} onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Designation</Label><Input value={inviteForm.designation} onChange={(e) => setInviteForm({ ...inviteForm, designation: e.target.value })} className="mt-1.5" /></div>
                {quota && !quota.allowed && <p className="text-sm" style={{ color: "hsl(0, 84%, 60%)" }}>{quota.error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting || (quota !== null && !quota.allowed)} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Send Invitation
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ EDIT USER DIALOG ============ */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update {showEdit?.name}'s details</DialogDescription></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-4">
            <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="mt-1.5" /></div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label><Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Designation</Label><Input value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1.5" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ RESET PASSWORD DIALOG ============ */}
      <Dialog open={!!showResetPwd} onOpenChange={() => setShowResetPwd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle><DialogDescription>Set a new password for this user</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" className="mt-1.5" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResetPwd(null)}>Cancel</Button>
              <Button onClick={handleResetPassword} disabled={submitting || !newPassword} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DEACTIVATE DIALOG ============ */}
      <Dialog open={!!showDeactivate} onOpenChange={() => setShowDeactivate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(0, 84%, 60%)" }}>Delete {showDeactivate?.role === "manager" ? "Manager" : "Employee"}</DialogTitle>
            <DialogDescription>This action will remove {showDeactivate?.name} from your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "hsl(0, 84%, 95%)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{ backgroundColor: showDeactivate?.role === "manager" ? "hsl(221, 83%, 53%)" : "hsl(220, 9%, 46%)" }}>
                {showDeactivate?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-medium text-sm">{showDeactivate?.name}</p>
                <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>{showDeactivate?.email}</p>
                <Badge className="mt-1 text-xs" style={{ backgroundColor: showDeactivate?.role === "manager" ? "hsl(221, 83%, 53%)" : "hsl(220, 9%, 46%)", color: "white" }}>
                  {showDeactivate?.role}
                </Badge>
              </div>
            </div>
            <p className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
              {showDeactivate?.role === "manager"
                ? "This manager will lose access to all team management features and their direct reports will be unassigned."
                : "This employee will no longer be able to log in or access OptiRev."}
            </p>
            <p className="text-sm font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>
              Are you sure you want to remove <strong>{showDeactivate?.name}</strong> from your organization?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeactivate(null)}>Cancel</Button>
              <Button onClick={handleDeactivate} disabled={submitting} style={{ backgroundColor: "hsl(0, 84%, 60%)" }}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete {showDeactivate?.role === "manager" ? "Manager" : "Employee"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
