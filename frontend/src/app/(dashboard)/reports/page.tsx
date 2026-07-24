"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Download,
  FileText,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  Clock,
  Plus,
  Trash2,
  X,
  Activity,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ScheduledReport {
  id: string;
  name: string;
  report_type: string;
  format: string;
  frequency: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

const downloadFile = async (url: string, filename: string) => {
  const token = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("token="))
    ?.split("=")[1];
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

const REPORT_CARDS = [
  {
    id: "pipeline",
    title: "Pipeline Report",
    description: "Export pipeline data with opportunities by stage, value, and probability.",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    endpoint: "/api/reports/pipeline",
  },
  {
    id: "revenue",
    title: "Revenue Report",
    description: "Export revenue data filtered by custom date range.",
    icon: BarChart3,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    endpoint: "/api/reports/revenue",
  },
  {
    id: "activities",
    title: "Activity Report",
    description: "Export all activities including calls, meetings, and tasks.",
    icon: Activity,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    endpoint: "/api/reports/activities",
  },
  {
    id: "lead-conversion",
    title: "Lead Conversion Report",
    description: "Export lead conversion metrics and funnel analysis.",
    icon: Target,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    endpoint: "/api/reports/lead-conversion",
  },
];

export default function ReportsPage() {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [newReport, setNewReport] = useState({
    name: "",
    report_type: "pipeline",
    format: "csv",
    frequency: "weekly",
  });

  const fetchScheduled = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const token = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];
      const res = await fetch(`${API_BASE}/api/reports/scheduled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setScheduledReports(data.data || data || []);
    } catch {
      setScheduledReports([]);
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const handleDownload = async (endpoint: string, format: string, name: string) => {
    setDownloading(`${name}-${format}`);
    try {
      let url = `${API_BASE}${endpoint}?format=${format}`;
      if (endpoint.includes("revenue")) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const ext = format === "xlsx" ? "xlsx" : "csv";
      await downloadFile(url, `${name}.${ext}`);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  const handleCreateScheduled = async () => {
    setCreating(true);
    try {
      const token = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];
      const res = await fetch(`${API_BASE}/api/reports/scheduled`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newReport),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewReport({ name: "", report_type: "pipeline", format: "csv", frequency: "weekly" });
        fetchScheduled();
      }
    } catch (err) {
      console.error("Create failed:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    try {
      const token = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("token="))
        ?.split("=")[1];
      await fetch(`${API_BASE}/api/reports/scheduled/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setScheduledReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const frequencyLabel: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports & Analytics" subtitle="Generate and schedule report exports" />

      <div className="flex-1 p-6 space-y-8 overflow-auto">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Export Reports</h2>
              <p className="text-sm text-gray-500">Download reports in CSV or XLSX format</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {REPORT_CARDS.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${report.bgColor}`}>
                      <report.icon className={`h-5 w-5 ${report.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">{report.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {report.id === "revenue" && (
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloading === `${report.id}-csv`}
                      onClick={() => handleDownload(report.endpoint, "csv", report.id)}
                    >
                      {downloading === `${report.id}-csv` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloading === `${report.id}-xlsx`}
                      onClick={() => handleDownload(report.endpoint, "xlsx", report.id)}
                    >
                      {downloading === `${report.id}-xlsx` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      XLSX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Scheduled Reports</h2>
              <p className="text-sm text-gray-500">Automate recurring report generation</p>
            </div>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Schedule
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingScheduled ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : scheduledReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-900">No scheduled reports</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Create a schedule to automatically generate reports
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Report Type</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                      <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-right p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledReports.map((report) => (
                      <tr key={report.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{report.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-700 capitalize">{report.report_type.replace("-", " ")}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="uppercase text-xs">
                            {report.format}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-700">{frequencyLabel[report.frequency] || report.frequency}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant={report.is_active ? "success" : "secondary"}>
                            {report.is_active ? "Active" : "Paused"}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteScheduled(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <Card className="relative w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">New Scheduled Report</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Report Name</label>
                <input
                  type="text"
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  placeholder="e.g. Weekly Pipeline Summary"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Report Type</label>
                  <Select
                    value={newReport.report_type}
                    onValueChange={(v) => setNewReport({ ...newReport, report_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pipeline">Pipeline</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="activities">Activities</SelectItem>
                      <SelectItem value="lead-conversion">Lead Conversion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Format</label>
                  <Select
                    value={newReport.format}
                    onValueChange={(v) => setNewReport({ ...newReport, format: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">XLSX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Frequency</label>
                <Select
                  value={newReport.frequency}
                  onValueChange={(v) => setNewReport({ ...newReport, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!newReport.name.trim() || creating} onClick={handleCreateScheduled}>
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Create Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
