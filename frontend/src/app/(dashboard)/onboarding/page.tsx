"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Database, CheckCircle, ArrowRight, ArrowLeft, Upload, Send, Link2 } from "lucide-react";
import { apiClient as api } from "@/lib/api";

const STEPS = [
  { id: 1, title: "Add Team Members", icon: Users, description: "Invite colleagues to collaborate" },
  { id: 2, title: "Import Leads", icon: Upload, description: "Upload your existing leads" },
  { id: 3, title: "Connect Data Sources", icon: Link2, description: "Auto-collect leads from platforms" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  // Step 1 state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [invitesSent, setInvitesSent] = useState<string[]>([]);

  // Step 2 state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const r = await api.post("/invitations", { email: inviteEmail, role: inviteRole });
      if (r.data?.success) {
        setInvitesSent((p) => [...p, inviteEmail]);
        setInviteEmail("");
        setInviteRole("employee");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to send invitation");
    } finally { setLoading(false); }
  };

  const handleSkipStep = () => {
    setCompleted((p) => ({ ...p, [step]: true }));
    if (step < 3) setStep(step + 1);
    else finishOnboarding();
  };

  const handleCompleteStep = () => {
    setCompleted((p) => ({ ...p, [step]: true }));
    if (step < 3) setStep(step + 1);
    else finishOnboarding();
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      await api.put("/users/me", { onboarding_completed: true }).catch(() => {});
    } catch {} finally {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <div className="max-w-3xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "hsl(220, 13%, 18%)" }}>Welcome to CRM</h1>
          <p style={{ color: "hsl(220, 9%, 46%)" }}>Let&apos;s get your workspace set up in 3 quick steps</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = completed[s.id];
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
                  style={{
                    backgroundColor: isDone ? "hsl(142, 71%, 45%)" : isActive ? "hsl(221, 83%, 53%)" : "hsl(220, 13%, 91%)",
                    color: isDone || isActive ? "white" : "hsl(220, 9%, 46%)",
                  }}
                >
                  {isDone ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                {s.id < 3 && <div className="w-12 h-0.5" style={{ backgroundColor: isDone ? "hsl(142, 71%, 45%)" : "hsl(220, 13%, 91%)" }} />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1].title}</CardTitle>
            <CardDescription>{STEPS[step - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Invite Team */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                  />
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSendInvite} disabled={loading || !inviteEmail} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {invitesSent.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium" style={{ color: "hsl(142, 71%, 45%)" }}>Sent:</p>
                    {invitesSent.map((email) => (
                      <p key={email} className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{email}</p>
                    ))}
                  </div>
                )}
                <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>
                  Team members will receive an email with a link to set their password and join.
                </p>
              </div>
            )}

            {/* Step 2: Import Leads */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: "hsl(220, 13%, 80%)" }}>
                  <Upload className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(220, 13%, 80%)" }} />
                  <p className="text-sm mb-2" style={{ color: "hsl(220, 9%, 46%)" }}>
                    Upload a CSV file with columns: first_name, last_name, email, phone, company
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="max-w-xs mx-auto"
                  />
                </div>
                {csvFile && (
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: "hsl(142, 71%, 45% / 0.1)" }}>
                    <CheckCircle className="h-4 w-4" style={{ color: "hsl(142, 71%, 45%)" }} />
                    <span className="text-sm">{csvFile.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Connect Data Sources */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                  Connect platforms to auto-collect leads. You can do this later from Data Sources.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {["99acres", "Gmail", "WhatsApp", "Google Ads"].map((p) => (
                    <div key={p} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: "hsl(220, 13%, 91%)" }}>
                      <span className="text-xl">{p === "Gmail" ? "??" : p === "WhatsApp" ? "??" : p === "Google Ads" ? "??" : "??"}</span>
                      <span className="text-sm font-medium">{p}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>
                  Skip this and connect later from the Data Sources page.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4" style={{ borderTop: "1px solid hsl(220, 13%, 91%)" }}>
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkipStep}>Skip</Button>
                {step < 3 ? (
                  <Button onClick={handleCompleteStep} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={finishOnboarding} disabled={loading} style={{ backgroundColor: "hsl(142, 71%, 45%)" }}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Get Started
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
