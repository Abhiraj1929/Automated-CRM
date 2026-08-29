"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Users, Briefcase } from "lucide-react";
import { apiClient as api } from "@/lib/api";

interface InviteData {
  email: string;
  role: string;
  department: string | null;
  designation: string | null;
  organizationName: string;
  inviterName: string;
}

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: "", password: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No invitation token found. Please check your invitation link.");
      setLoading(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await api.get(`/invitations/verify/${token}`);
      setInviteData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid or expired invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!formData.name.trim()) {
      setPasswordError("Name is required");
      return;
    }
    if (formData.password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/invitations/accept", {
        token,
        name: formData.name,
        password: formData.password,
      });
      setSuccess(true);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: "hsl(221, 83%, 53%)" }} />
          <p style={{ color: "hsl(220, 9%, 46%)" }}>Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <XCircle className="h-16 w-16 mb-4" style={{ color: "hsl(0, 84%, 60%)" }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: "hsl(220, 13%, 18%)" }}>Invitation Invalid</h2>
            <p className="text-sm text-center" style={{ color: "hsl(220, 9%, 46%)" }}>{error}</p>
            <Button className="mt-6" variant="outline" onClick={() => window.location.href = "/login"}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-16 w-16 mb-4" style={{ color: "hsl(142, 71%, 45%)" }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: "hsl(220, 13%, 18%)" }}>Welcome Aboard!</h2>
            <p className="text-sm text-center mb-6" style={{ color: "hsl(220, 9%, 46%)" }}>
              You have joined <strong>{inviteData?.organizationName}</strong>. You can now log in.
            </p>
            <Button onClick={() => window.location.href = "/login"} style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl mx-auto mb-3" style={{ backgroundColor: "hsl(221, 83%, 53% / 0.1)" }}>
            <Users className="h-6 w-6" style={{ color: "hsl(221, 83%, 53%)" }} />
          </div>
          <CardTitle className="text-xl">Join the Team</CardTitle>
          <CardDescription>
            <strong>{inviteData?.inviterName}</strong> invited you to join
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invite Info */}
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "hsl(220, 14%, 96%)", border: "1px solid hsl(220, 13%, 91%)" }}>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="h-4 w-4" style={{ color: "hsl(220, 9%, 46%)" }} />
              <span className="font-medium text-sm" style={{ color: "hsl(220, 13%, 18%)" }}>{inviteData?.organizationName}</span>
            </div>
            <div className="text-xs space-y-1" style={{ color: "hsl(220, 9%, 46%)" }}>
              <p>Email: {inviteData?.email}</p>
              <p>Role: <span className="capitalize">{inviteData?.role}</span></p>
              {inviteData?.department && <p>Department: {inviteData.department}</p>}
              {inviteData?.designation && <p>Designation: {inviteData.designation}</p>}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Your Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Set Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 characters"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                className="mt-1.5"
                required
              />
            </div>

            {passwordError && (
              <p className="text-sm" style={{ color: "hsl(0, 84%, 60%)" }}>{passwordError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              style={{ backgroundColor: "hsl(221, 83%, 53%)" }}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Accept Invitation & Join
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
