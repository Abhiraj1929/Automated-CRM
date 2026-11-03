"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Campaign, CampaignResponse } from "@/types/crm";
import { ArrowLeft, Loader2, Megaphone, Users, IndianRupee, TrendingUp, Target, Mail, Phone, MessageSquare, Plus, X, Trash2, Eye } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = { planning: "bg-slate-100 text-slate-700", active: "bg-emerald-100 text-emerald-700", paused: "bg-amber-100 text-amber-700", completed: "bg-blue-100 text-blue-700", cancelled: "bg-red-100 text-red-700" };

const RESPONSE_COLORS: Record<string, string> = {
  sent: "bg-slate-100 text-slate-700",
  opened: "bg-blue-100 text-blue-700",
  clicked: "bg-purple-100 text-purple-700",
  replied: "bg-emerald-100 text-emerald-700",
  bounced: "bg-red-100 text-red-700",
  converted: "bg-emerald-100 text-emerald-700",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", type: "email", status: "planning", start_date: "", end_date: "", budget: "", actual_cost: "", expected_leads: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  // Link leads dialog
  const [showLinkLeads, setShowLinkLeads] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [linking, setLinking] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const r = await apiClient.get(`/campaigns/${campaignId}`);
      if (r.data?.success) setCampaign(r.data.data);
    } catch {} finally { setLoading(false); }
  }, [campaignId]);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const r = await apiClient.get(`/campaigns/${campaignId}/leads`, {
        params: { status: statusFilter || undefined, search: search || undefined, page, limit: 20 },
      });
      if (r.data?.success) { setLeads(r.data.data || []); setLeadsTotal(r.data.total || 0); }
    } catch {} finally { setLeadsLoading(false); }
  }, [campaignId, statusFilter, search, page]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Edit campaign
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await apiClient.put(`/campaigns/${campaignId}`, {
        ...editForm,
        budget: editForm.budget ? +editForm.budget : 0,
        actual_cost: editForm.actual_cost ? +editForm.actual_cost : 0,
        expected_leads: editForm.expected_leads ? +editForm.expected_leads : 0,
      });
      if (r.data?.success) { setCampaign((p) => p ? { ...p, ...r.data.data } : null); setShowEdit(false); }
    } catch (err: any) { alert(err.response?.data?.error || "Failed to update"); }
    finally { setSubmitting(false); }
  };

  // Open edit with current values
  const openEdit = () => {
    if (!campaign) return;
    setEditForm({
      name: campaign.name, type: campaign.type, status: campaign.status,
      start_date: campaign.start_date || "", end_date: campaign.end_date || "",
      budget: String(campaign.budget || ""), actual_cost: String(campaign.actual_cost || ""),
      expected_leads: String(campaign.expected_leads || ""), description: campaign.description || "",
    });
    setShowEdit(true);
  };

  // Link leads
  const openLinkLeads = async () => {
    setShowLinkLeads(true); setSelectedLeadIds([]); setLeadSearch("");
    try {
      const r = await apiClient.get("/leads", { params: { limit: 200 } });
      if (r.data?.success) {
        // Filter out leads already linked to this campaign
        const available = (r.data.data || []).filter((l: any) => l.campaign_id !== campaignId);
        setAvailableLeads(available);
      }
    } catch {}
  };

  const handleLinkLeads = async () => {
    if (selectedLeadIds.length === 0) return;
    setLinking(true);
    try {
      await apiClient.post(`/campaigns/${campaignId}/leads`, { lead_ids: selectedLeadIds });
      setShowLinkLeads(false);
      fetchCampaign(); fetchLeads();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to link leads"); }
    finally { setLinking(false); }
  };

  const handleUnlinkLead = async (leadId: string) => {
    if (!confirm("Remove this lead from the campaign?")) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/leads/${leadId}`);
      fetchCampaign(); fetchLeads();
    } catch {}
  };

  const filteredAvailableLeads = availableLeads.filter((l) =>
    l.first_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.last_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.email?.toLowerCase().includes(leadSearch.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} /></div>;
  }

  if (!campaign) {
    return <div className="text-center py-20"><p>Campaign not found</p><Link href="/campaigns"><Button variant="outline" className="mt-4">Back to Campaigns</Button></Link></div>;
  }

  const conversionRate = campaign.member_count > 0 ? ((campaign.converted_leads / campaign.member_count) * 100).toFixed(1) : "0";
  const costPerLead = campaign.member_count > 0 ? (campaign.actual_cost / campaign.member_count).toFixed(2) : "0";

  return (
    <div className="flex flex-col h-full">
      <Header title="" subtitle="" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Back + Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link href="/campaigns" className="mt-1"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>{campaign.name}</h1>
                <Badge className={`text-xs ${STATUS_COLORS[campaign.status]}`}>{campaign.status}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">{campaign.type}</Badge>
              </div>
              {campaign.description && <p className="text-sm mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>{campaign.description}</p>}
              <p className="text-xs mt-2" style={{ color: "hsl(220, 9%, 46%)" }}>
                {campaign.start_date || "?"} → {campaign.end_date || "?"} · Owner: {campaign.owner?.name || "Unassigned"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={openEdit}>Edit Campaign</Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-medium" style={{ color: "hsl(220, 9%, 46%)" }}>Total Leads</p><p className="text-2xl font-bold mt-1">{campaign.member_count}</p></div>
                <Users className="h-8 w-8" style={{ color: "hsl(221, 83%, 53%)", opacity: 0.2 }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-medium" style={{ color: "hsl(220, 9%, 46%)" }}>Converted</p><p className="text-2xl font-bold mt-1" style={{ color: "hsl(142, 71%, 45%)" }}>{campaign.converted_leads}</p><p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>{conversionRate}% rate</p></div>
                <TrendingUp className="h-8 w-8" style={{ color: "hsl(142, 71%, 45%)", opacity: 0.2 }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-medium" style={{ color: "hsl(220, 9%, 46%)" }}>Cost / Lead</p><p className="text-2xl font-bold mt-1">{formatCurrency(+costPerLead)}</p><p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Budget: {formatCurrency(campaign.budget)}</p></div>
                <IndianRupee className="h-8 w-8" style={{ color: "hsl(220, 9%, 46%)", opacity: 0.2 }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-medium" style={{ color: "hsl(220, 9%, 46%)" }}>ROI</p><p className="text-2xl font-bold mt-1" style={{ color: campaign.roi > 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)" }}>{campaign.roi}%</p><p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Pipeline: {formatCurrency(campaign.pipeline_value)}</p></div>
                <Megaphone className="h-8 w-8" style={{ color: "hsl(280, 67%, 55%)", opacity: 0.2 }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {[
                { label: "Leads", value: campaign.member_count, color: "hsl(221, 83%, 53%)" },
                { label: "Converted Leads", value: campaign.converted_leads, color: "hsl(262, 83%, 58%)" },
                { label: "Contacts", value: campaign.converted_contacts, color: "hsl(199, 89%, 48%)" },
                { label: "Opportunities", value: campaign.converted_opportunities, color: "hsl(142, 71%, 45%)" },
                { label: "Closed Won", value: formatCurrency(campaign.closed_value), color: "hsl(142, 71%, 45%)" },
              ].map((step, i) => (
                <React.Fragment key={step.label}>
                  {i > 0 && <div className="h-px flex-1" style={{ backgroundColor: "hsl(220, 13%, 90%)" }} />}
                  <div className="text-center flex-shrink-0">
                    <p className="text-xl font-bold" style={{ color: step.color }}>{step.value}</p>
                    <p className="text-xs mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>{step.label}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Linked Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Linked Leads ({leadsTotal})</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={openLinkLeads}><Plus className="h-3.5 w-3.5 mr-1.5" /> Link Leads</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Input placeholder="Search leads..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {leadsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} /></div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>No leads linked to this campaign yet.</p>
                <Button size="sm" className="mt-3" onClick={openLinkLeads}><Plus className="h-3.5 w-3.5 mr-1.5" /> Link Your First Leads</Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{lead.first_name} {lead.last_name}</p>
                            <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>{lead.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{lead.company || "-"}</TableCell>
                        <TableCell><Badge variant={lead.status === "converted" ? "default" : "secondary"} className="text-xs capitalize">{lead.status}</Badge></TableCell>
                        <TableCell><span className="font-medium">{lead.lead_score || 0}</span></TableCell>
                        <TableCell className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{lead.source || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Link href={`/leads/${lead.id}`}><Button variant="ghost" size="sm" className="h-7"><Eye className="h-3.5 w-3.5" /></Button></Link>
                            <Button variant="ghost" size="sm" className="h-7" onClick={() => handleUnlinkLead(lead.id)} style={{ color: "hsl(0, 84%, 60%)" }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {leadsTotal > 20 && (
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <span className="text-sm py-2 px-3" style={{ color: "hsl(220, 9%, 46%)" }}>Page {page} of {Math.ceil(leadsTotal / 20)}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= leadsTotal}>Next</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {campaign.responses && campaign.responses.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.responses.map((r: CampaignResponse) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.lead ? `${r.lead.first_name} ${r.lead.last_name}` : r.contact ? `${r.contact.first_name} ${r.contact.last_name}` : "-"}</TableCell>
                      <TableCell><Badge className={`text-xs ${RESPONSE_COLORS[r.response_type] || ""}`}>{r.response_type}</Badge></TableCell>
                      <TableCell className="text-sm capitalize">{r.channel}</TableCell>
                      <TableCell className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        {showEdit && (
          <Dialog open={showEdit} onOpenChange={setShowEdit}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Edit Campaign</DialogTitle></DialogHeader>
              <form onSubmit={handleEdit} className="space-y-4 mt-4">
                <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="mt-1.5" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Type</Label><Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="social">Social Media</SelectItem><SelectItem value="webinar">Webinar</SelectItem><SelectItem value="event">Event</SelectItem><SelectItem value="ads">Paid Ads</SelectItem><SelectItem value="referral">Referral</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                  <div><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planning">Planning</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>End Date</Label><Input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} className="mt-1.5" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Budget ($)</Label><Input type="number" value={editForm.budget} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>Actual Cost ($)</Label><Input type="number" value={editForm.actual_cost} onChange={(e) => setEditForm({ ...editForm, actual_cost: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>Expected Leads</Label><Input type="number" value={editForm.expected_leads} onChange={(e) => setEditForm({ ...editForm, expected_leads: e.target.value })} className="mt-1.5" /></div>
                </div>
                <div><Label>Description</Label><textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1.5" /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Changes</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Link Leads Dialog */}
        {showLinkLeads && (
          <Dialog open={showLinkLeads} onOpenChange={setShowLinkLeads}>
            <DialogContent className="max-w-lg max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Link Leads to Campaign</DialogTitle>
                <DialogDescription>Select leads to associate with &quot;{campaign.name}&quot;</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Search leads..." value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                <div className="max-h-64 overflow-auto border rounded-md">
                  {filteredAvailableLeads.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>No available leads</p>
                  ) : (
                    filteredAvailableLeads.map((lead) => (
                      <label key={lead.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={(e) => setSelectedLeadIds((p) => e.target.checked ? [...p, lead.id] : p.filter((id) => id !== lead.id))}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs truncate" style={{ color: "hsl(220, 9%, 46%)" }}>{lead.email} {lead.company ? `· ${lead.company}` : ""}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{lead.source || "Direct"}</Badge>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{selectedLeadIds.length} leads selected</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowLinkLeads(false)}>Cancel</Button>
                    <Button onClick={handleLinkLeads} disabled={linking || selectedLeadIds.length === 0} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
                      {linking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Link {selectedLeadIds.length} Leads
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
