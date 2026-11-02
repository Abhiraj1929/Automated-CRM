"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Database, RefreshCw, Plus, Trash2, ExternalLink, Upload,
  Mail, MessageSquare, ShoppingCart, Globe, AlertCircle,
  CheckCircle, Clock, Loader2, X, Eye, EyeOff,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface DataSource {
  id: string;
  name: string;
  type: string;
  platform: string;
  status: string;
  config: Record<string, any>;
  last_sync_at: string | null;
  last_sync_result: any;
  total_leads_collected: number;
  error_message: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, any> = {
  property_portal: Globe,
  email: Mail,
  whatsapp: MessageSquare,
  ecommerce: ShoppingCart,
  csv: Upload,
  webhook: ExternalLink,
};

// ============================================================
// Platform definitions — what credentials each platform needs
// ============================================================
const PLATFORMS = [
  // ---- Property Portals ----
  {
    id: "99acres",
    name: "99acres",
    type: "property_portal",
    icon: "🏠",
    description: "Fetch buyer inquiries from 99acres seller account",
    color: "hsl(142, 70%, 45%)",
    fields: [
      { key: "email", label: "99acres Login Email", placeholder: "seller@example.com", type: "email", required: true },
      { key: "password", label: "99acres Password", placeholder: "Your 99acres password", type: "password", required: true },
      { key: "city", label: "City (optional)", placeholder: "Mumbai", type: "text", required: false },
      { key: "keywords", label: "Property Type (optional)", placeholder: "2 BHK apartment", type: "text", required: false },
    ],
  },
  {
    id: "housing",
    name: "Housing.com",
    type: "property_portal",
    icon: "🏡",
    description: "Fetch buyer leads from Housing seller account",
    color: "hsl(221, 83%, 53%)",
    fields: [
      { key: "email", label: "Housing Login Email", placeholder: "seller@example.com", type: "email", required: true },
      { key: "password", label: "Housing Password", placeholder: "Your Housing password", type: "password", required: true },
      { key: "city", label: "City (optional)", placeholder: "Delhi", type: "text", required: false },
    ],
  },
  {
    id: "magicbricks",
    name: "MagicBricks",
    type: "property_portal",
    icon: "🏘️",
    description: "Fetch buyer leads from MagicBricks seller account",
    color: "hsl(24, 95%, 53%)",
    fields: [
      { key: "email", label: "MagicBricks Login Email", placeholder: "seller@example.com", type: "email", required: true },
      { key: "password", label: "MagicBricks Password", placeholder: "Your MagicBricks password", type: "password", required: true },
      { key: "city", label: "City (optional)", placeholder: "Bangalore", type: "text", required: false },
    ],
  },
  {
    id: "nobroker",
    name: "NoBroker",
    type: "property_portal",
    icon: "🏗️",
    description: "Fetch buyer leads from NoBroker seller account",
    color: "hsl(160, 60%, 40%)",
    fields: [
      { key: "email", label: "NoBroker Login Email", placeholder: "seller@example.com", type: "email", required: true },
      { key: "password", label: "NoBroker Password", placeholder: "Your NoBroker password", type: "password", required: true },
    ],
  },

  // ---- Email ----
  {
    id: "gmail",
    name: "Gmail",
    type: "email",
    icon: "📧",
    description: "Auto-fetch leads from forwarded portal emails",
    color: "hsl(0, 84%, 60%)",
    fields: [
      { key: "email", label: "Gmail Address", placeholder: "you@gmail.com", type: "email", required: true },
      { key: "password", label: "App Password (not Gmail password)", placeholder: "xxxx-xxxx-xxxx-xxxx", type: "password", required: true, help: "Generate at myaccount.google.com → Security → App Passwords" },
    ],
  },
  {
    id: "outlook",
    name: "Outlook / Office 365",
    type: "email",
    icon: "📬",
    description: "Auto-fetch leads from Outlook inbox",
    color: "hsl(221, 83%, 53%)",
    fields: [
      { key: "email", label: "Outlook Email", placeholder: "you@company.com", type: "email", required: true },
      { key: "password", label: "Password / App Password", placeholder: "Your password", type: "password", required: true },
    ],
  },

  // ---- WhatsApp ----
  {
    id: "whatsapp_business",
    name: "WhatsApp Business",
    type: "whatsapp",
    icon: "💬",
    description: "Capture leads from WhatsApp Business messages",
    color: "hsl(160, 60%, 40%)",
    fields: [
      { key: "accessToken", label: "WhatsApp Business Access Token", placeholder: "Paste your access token", type: "password", required: true, help: "Get from developers.facebook.com → WhatsApp → API Setup" },
      { key: "phoneNumberId", label: "Phone Number ID", placeholder: "123456789", type: "text", required: true },
    ],
  },

  // ---- E-commerce ----
  {
    id: "amazon",
    name: "Amazon Seller",
    type: "ecommerce",
    icon: "📦",
    description: "Fetch customer orders and inquiries from Amazon Seller Central",
    color: "hsl(38, 92%, 50%)",
    fields: [
      { key: "sellerId", label: "Amazon Seller ID", placeholder: "A1B2C3D4E5F6G", type: "text", required: true, help: "Find in Seller Central → Settings → Account Info" },
      { key: "accessToken", label: "LWA Access Token", placeholder: "Atza|...", type: "password", required: true, help: "Get from Amazon SP-API credentials" },
      { key: "refreshToken", label: "LWA Refresh Token", placeholder: "Atzr|...", type: "password", required: true },
    ],
  },
  {
    id: "flipkart",
    name: "Flipkart Seller",
    type: "ecommerce",
    icon: "🛒",
    description: "Fetch customer orders from Flipkart Seller Hub",
    color: "hsl(221, 83%, 53%)",
    fields: [
      { key: "sellerId", label: "Flipkart Seller ID", placeholder: "Seller ID", type: "text", required: true },
      { key: "apiKey", label: "API Key", placeholder: "Your Flipkart API key", type: "password", required: true },
    ],
  },
  {
    id: "shopify",
    name: "Shopify Store",
    type: "ecommerce",
    icon: "🛍️",
    description: "Fetch customer orders from your Shopify store",
    color: "hsl(160, 60%, 40%)",
    fields: [
      { key: "storeUrl", label: "Store URL", placeholder: "https://my-store.myshopify.com", type: "text", required: true },
      { key: "accessToken", label: "Admin Access Token", placeholder: "shpat_...", type: "password", required: true, help: "Settings → Apps → Develop apps → Create an app" },
    ],
  },

  // ---- Generic ----
  {
    id: "csv",
    name: "CSV / Excel Upload",
    type: "csv",
    icon: "📄",
    description: "Import leads from a spreadsheet file",
    color: "hsl(220, 9%, 46%)",
    fields: [],
  },
];

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [error, setError] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Add form state
  const [selectedPlatform, setSelectedPlatform] = useState<typeof PLATFORMS[0] | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchDataSources(); }, []);

  const fetchDataSources = async () => {
    try {
      const res = await fetch(`${API_URL}/data-sources`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setSources(data.data);
    } catch {}
    setLoading(false);
  };

  const handleAddSource = async () => {
    if (!selectedPlatform || !sourceName) return setError("Name is required");

    // Validate required fields
    for (const field of selectedPlatform.fields) {
      if (field.required && !formData[field.key]) {
        return setError(`${field.label} is required`);
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/data-sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: sourceName,
          type: selectedPlatform.type,
          platform: selectedPlatform.id,
          config: formData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdd(false);
        setSelectedPlatform(null);
        setSourceName("");
        setFormData({});
        fetchDataSources();
      } else {
        if (data.error?.includes("relation") || data.error?.includes("does not exist") || data.error?.includes("schema cache")) {
          setError("Database table not found. Run STEP8_data_sources.sql in Supabase SQL Editor first.");
        } else {
          setError(data.error || "Failed to add");
        }
      }
    } catch {
      setError("Failed to connect. Make sure backend is running.");
    }
    setSubmitting(false);
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    setError("");
    try {
      const res = await fetch(`${API_URL}/data-sources/${id}/sync`, { method: "POST", credentials: "include" });
      const data = await res.json();
      fetchDataSources();
      if (!data.success) setError(data.error || "Sync failed");
    } catch { setError("Sync failed"); }
    setSyncing(null);
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await fetch(`${API_URL}/data-sources/sync-all`, { method: "POST", credentials: "include" });
      fetchDataSources();
    } catch {}
    setSyncingAll(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this data source?")) return;
    try { await fetch(`${API_URL}/data-sources/${id}`, { method: "DELETE", credentials: "include" }); fetchDataSources(); } catch {}
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    const formDataObj = new FormData();
    formDataObj.append("file", csvFile);
    setSyncing("csv");
    try {
      const res = await fetch(`${API_URL}/data-sources/import-csv`, { method: "POST", credentials: "include", body: formDataObj });
      const data = await res.json();
      if (data.success) { setCsvFile(null); fetchDataSources(); } else { setError(data.error || "Import failed"); }
    } catch { setError("CSV import failed"); }
    setSyncing(null);
  };

  const getInitials = (n: string) => n?.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Data Sources</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>
            Connect your portal accounts to auto-collect leads
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncAll} disabled={syncingAll}>
            {syncingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync All
          </Button>
          <Button onClick={() => { setShowAdd(true); setSelectedPlatform(null); setFormData({}); setSourceName(""); setError(""); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Source
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg p-3 text-sm" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.08)", color: "hsl(0, 84%, 60%)" }}>
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError("")} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* CSV Upload */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5" style={{ color: "hsl(221, 83%, 53%)" }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>Quick Import — Upload CSV</p>
            <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>Columns: name, email, phone, source, city</p>
          </div>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="text-sm" />
          <Button size="sm" onClick={handleCSVUpload} disabled={!csvFile || syncing === "csv"}>
            {syncing === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
          </Button>
        </div>
      </div>

      {/* Connected Sources */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} /></div>
        ) : sources.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
            <Database className="h-12 w-12 mx-auto mb-4" style={{ color: "hsl(220, 13%, 85%)" }} />
            <p className="text-lg font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>No data sources connected</p>
            <p className="text-sm mt-1 mb-4" style={{ color: "hsl(220, 9%, 46%)" }}>Connect your accounts to start collecting leads</p>
            <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Your First Source</Button>
          </div>
        ) : (
          sources.map((ds) => {
            const platform = PLATFORMS.find((p) => p.id === ds.platform);
            const Icon = TYPE_ICONS[ds.type] || Database;
            return (
              <div key={ds.id} className="rounded-xl p-5" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ backgroundColor: platform?.color ? `${platform.color}15` : "hsl(221, 83%, 53% / 0.1)" }}>
                    {platform?.icon || <Icon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>{ds.name}</p>
                      <Badge variant={ds.status === "active" ? "default" : ds.status === "error" ? "destructive" : "secondary"}>{ds.status}</Badge>
                    </div>
                    <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>
                      {ds.platform} — {ds.total_leads_collected} leads collected
                      {ds.last_sync_at && ` — Last sync: ${new Date(ds.last_sync_at).toLocaleString()}`}
                    </p>
                    {ds.error_message && <p className="text-xs mt-1" style={{ color: "hsl(0, 84%, 60%)" }}>{ds.error_message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleSync(ds.id)} disabled={syncing === ds.id}>
                      {syncing === ds.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(ds.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {ds.last_sync_result && (
                  <div className="mt-3 flex gap-4 text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>
                    <span>Found: {ds.last_sync_result.leads_found || 0}</span>
                    <span>Created: {ds.last_sync_result.leads_created || 0}</span>
                    <span>Skipped: {ds.last_sync_result.leads_skipped || 0}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* Add Source Dialog — Platform picker + credentials form */}
      {/* ============================================================ */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "white" }}>
            {/* Step 1: Choose Platform */}
            {!selectedPlatform ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Choose a Platform</h2>
                  <button onClick={() => setShowAdd(false)}><X className="h-5 w-5" /></button>
                </div>
                <p className="text-sm mb-4" style={{ color: "hsl(220, 9%, 46%)" }}>Select the platform you want to connect</p>

                <div className="grid grid-cols-2 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPlatform(p); setFormData({}); setSourceName(p.name); }}
                      className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/50"
                      style={{ borderColor: "hsl(220, 13%, 91%)" }}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "hsl(220, 13%, 18%)" }}>{p.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(220, 9%, 46%)" }}>{p.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Step 2: Enter Credentials */
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedPlatform(null)} className="text-sm underline" style={{ color: "hsl(221, 83%, 53%)" }}>← Back</button>
                    <h2 className="text-lg font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>
                      Connect {selectedPlatform.name}
                    </h2>
                  </div>
                  <button onClick={() => setShowAdd(false)}><X className="h-5 w-5" /></button>
                </div>

                <div className="rounded-lg p-3 mb-4 text-sm" style={{ backgroundColor: "hsl(221, 83%, 53% / 0.06)", border: "1px solid hsl(221, 83%, 53% / 0.15)", color: "hsl(221, 83%, 53%)" }}>
                  Enter your <strong>{selectedPlatform.name}</strong> login credentials. OptiRev will use them to fetch leads automatically.
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Source Name</Label>
                    <input
                      className="w-full rounded-lg border p-2 text-sm"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder={`My ${selectedPlatform.name} Leads`}
                      style={{ borderColor: "hsl(220, 13%, 91%)" }}
                    />
                  </div>

                  {selectedPlatform.fields.map((field) => (
                    <div key={field.key}>
                      <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
                      <div className="relative">
                        <input
                          type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                          className="w-full rounded-lg border p-2 text-sm pr-10"
                          value={formData[field.key] || ""}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          style={{ borderColor: "hsl(220, 13%, 91%)" }}
                        />
                        {field.type === "password" && (
                          <button
                            type="button"
                            onClick={() => setShowPasswords({ ...showPasswords, [field.key]: !showPasswords[field.key] })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      {field.help && <p className="text-xs mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>{field.help}</p>}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setSelectedPlatform(null)}>Back</Button>
                  <Button onClick={handleAddSource} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Connect & Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
