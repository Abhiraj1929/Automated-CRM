"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Link2, Trash2, Eye, EyeOff, Copy, Power, PowerOff } from "lucide-react";
import { apiClient as api } from "@/lib/api";

interface Integration {
  id: string;
  platform: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  api_key_full?: string;
  webhook_endpoint?: string;
}

interface Platform {
  id: string;
  name: string;
  fields: string[];
  description: string;
}

const PLATFORM_ICONS: Record<string, string> = {
  meta_ads: "\u{1F4F1}",
  google_ads: "\u{1F50D}",
  indiamart: "\u{1F3ED}",
  justdial: "\u{1F4DE}",
  tradeindia: "\u{1F91D}",
  whatsapp: "\u{1F4AC}",
  gmail: "\u{1F4E7}",
  amazon: "\u{1F4E6}",
  flipkart: "\u{1F6D2}",
  shopify: "\u{1F6CD}",
  webhooks: "\u{1F517}",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newEndpoint, setNewEndpoint] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [integrationName, setIntegrationName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [intRes, platRes] = await Promise.all([
        api.get("/integrations"),
        api.get("/integrations/platforms"),
      ]);
      setIntegrations(intRes.data.data || []);
      setPlatforms(platRes.data.data || []);
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedPlatform || !integrationName) return;
    setSaving(true);
    try {
      const res = await api.post("/integrations", {
        platform: selectedPlatform,
        name: integrationName,
        credentials,
      });
      const data = res.data.data;
      setIntegrations((prev) => [data, ...prev]);
      setNewKey(data.api_key_full || "");
      setNewEndpoint(data.webhook_endpoint || "");
      setShowAddDialog(false);
      setShowKeyDialog(true);
      resetForm();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create integration");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await api.put(`/integrations/${id}`, { is_active: !current });
      setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !current } : i)));
    } catch {
      alert("Failed to toggle integration");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this integration?")) return;
    try {
      await api.delete(`/integrations/${id}`);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch {
      alert("Failed to delete integration");
    }
  };

  const resetForm = () => {
    setSelectedPlatform("");
    setIntegrationName("");
    setCredentials({});
    setShowPassword({});
  };

  const selectedPlat = platforms.find((p) => p.id === selectedPlatform);
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Integrations</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>
            Connect external platforms to auto-collect leads into your CRM
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
          <Plus className="h-4 w-4 mr-2" /> Add Integration
        </Button>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 mb-4" style={{ color: "hsl(220, 13%, 80%)" }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: "hsl(220, 13%, 18%)" }}>No Integrations</h3>
            <p className="text-sm mb-4" style={{ color: "hsl(220, 9%, 46%)" }}>
              Connect your first platform to start auto-collecting leads
            </p>
            <Button onClick={() => setShowAddDialog(true)} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
              <Plus className="h-4 w-4 mr-2" /> Add Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((intg) => (
            <Card key={intg.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{PLATFORM_ICONS[intg.platform] || "\u{1F517}"}</span>
                    <div>
                      <CardTitle className="text-base">{intg.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {intg.platform.replace(/_/g, " ").toUpperCase()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={intg.is_active ? "default" : "secondary"}>
                    {intg.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(intg.id, intg.is_active)}
                    className="flex-1"
                  >
                    {intg.is_active ? (
                      <PowerOff className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <Power className="h-3.5 w-3.5 mr-1" />
                    )}
                    {intg.is_active ? "Pause" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(intg.id)}
                    style={{ color: "hsl(0, 84%, 60%)", borderColor: "hsl(0, 84%, 60% / 0.3)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs mt-2" style={{ color: "hsl(220, 9%, 46%)" }}>
                  Webhook: <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">/api/ingest/{intg.platform}</code>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
            <DialogDescription>Connect a platform to start collecting leads automatically</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Platform</Label>
              <Select
                value={selectedPlatform}
                onValueChange={(v) => { setSelectedPlatform(v); setCredentials({}); }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a platform..." />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {PLATFORM_ICONS[p.id] || "\u{1F517}"} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlat && (
              <>
                <div>
                  <Label>Integration Name</Label>
                  <Input
                    value={integrationName}
                    onChange={(e) => setIntegrationName(e.target.value)}
                    placeholder={`e.g., My ${selectedPlat.name}`}
                    className="mt-1.5"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Credentials</Label>
                  <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>
                    {selectedPlat.description}
                  </p>
                  {selectedPlat.fields.map((field) => (
                    <div key={field}>
                      <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                      <div className="relative mt-1">
                        <Input
                          type={showPassword[field] ? "text" : "password"}
                          value={credentials[field] || ""}
                          onChange={(e) =>
                            setCredentials((prev) => ({ ...prev, [field]: e.target.value }))
                          }
                          placeholder={`Enter ${field.replace(/_/g, " ")}`}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                          onClick={() =>
                            setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }))
                          }
                        >
                          {showPassword[field] ? (
                            <EyeOff className="h-3.5 w-3.5" style={{ color: "hsl(220, 9%, 46%)" }} />
                          ) : (
                            <Eye className="h-3.5 w-3.5" style={{ color: "hsl(220, 9%, 46%)" }} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedPlatform || !integrationName || saving}
                style={{ backgroundColor: "hsl(221, 83%, 53%)" }}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Connect & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Integration Created</DialogTitle>
            <DialogDescription>Save your API key - it will not be shown again in full</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">API Key (save this now)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input readOnly value={newKey} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Webhook Endpoint</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input readOnly value={newEndpoint} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(newEndpoint)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>
              Use this API key in the X-API-Key header when sending leads via webhook.
            </p>
            <Button
              onClick={() => setShowKeyDialog(false)}
              className="w-full"
              style={{ backgroundColor: "hsl(221, 83%, 53%)" }}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
