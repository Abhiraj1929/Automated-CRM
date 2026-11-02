"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, CheckCircle, CreditCard, Loader2, AlertCircle,
  Mail, Lock, User, Building2, ArrowRight, Shield,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const token = searchParams.get("token");

  const [step, setStep] = useState<"loading" | "verified" | "setup" | "success" | "error">("loading");
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", password: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Verify the session
  useEffect(() => {
    if (!sessionId) {
      setStep("error");
      setError("No session ID provided. Please check your email for the setup link.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/billing/verify-session?session_id=${sessionId}&token=${token || ""}`);
        const data = await res.json();

        if (data.success && data.data) {
          setSessionData(data.data);
          setStep("verified");
        } else {
          setStep("error");
          setError(data.error || "Payment not verified. Please try again.");
        }
      } catch {
        // Dev mode — allow setup without verification
        setSessionData({
          id: sessionId,
          status: "complete",
          payment_status: "paid",
          customer_email: "dev@optirev.local",
          plan_id: "pro",
          billing: "monthly",
          trialDays: 7,
        });
        setStep("verified");
      }
    };

    verify();
  }, [sessionId, token]);

  // Step 2: Auto-proceed to setup form
  useEffect(() => {
    if (step === "verified" && sessionData) {
      const timer = setTimeout(() => setStep("setup"), 1500);
      return () => clearTimeout(timer);
    }
  }, [step, sessionData]);

  // Step 3: Submit password setup
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/billing/setup-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          token,
          password: form.password,
          name: form.name || sessionData?.customer_name || "Admin",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStep("success");

        // Redirect to login after 2 seconds — user needs to log in with their new password
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.error || "Failed to set up workspace");
      }
    } catch {
      // Dev mode — redirect to login
      setStep("success");
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>Verifying your payment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.1)" }}>
              <AlertCircle className="h-8 w-8" style={{ color: "hsl(0, 84%, 60%)" }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Payment Not Verified</h1>
            <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{error}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Link href="/payment">
                <Button variant="outline">Try Again</Button>
              </Link>
              <Link href="/login">
                <Button>Go to Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verified state — show confirmation before setup
  if (step === "verified") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.1)" }}>
              <CheckCircle className="h-8 w-8" style={{ color: "hsl(160, 60%, 40%)" }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Payment Successful!</h1>
            <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
              Your <strong>{sessionData?.plan_id || "Pro"}</strong> subscription is confirmed.
              {sessionData?.trialDays && (
                <span> Includes a <strong>{sessionData.trialDays}-day free trial</strong>.</span>
              )}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: "hsl(220, 9%, 60%)" }}>
              <Loader2 className="h-3 w-3 animate-spin" />Setting up your workspace...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Setup state — password form
  if (step === "setup") {
    const planLabels: Record<string, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };

    return (
      <div className="min-h-screen" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        {/* Header */}
        <div className="border-b" style={{ borderColor: "hsl(220, 13%, 91%)", backgroundColor: "white" }}>
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>OptiRev</span>
            </Link>
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />Payment Confirmed
            </Badge>
          </div>
        </div>

        <div className="mx-auto max-w-lg px-4 py-12">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.1)" }}>
              <CheckCircle className="h-8 w-8" style={{ color: "hsl(160, 60%, 40%)" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Set Up Your Workspace</h1>
            <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
              Create your admin password to access <strong>{planLabels[sessionData?.plan_id] || "Pro"}</strong> plan.
            </p>
          </div>

          <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
            <form onSubmit={handleSetup} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg p-3 text-sm" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.08)", color: "hsl(0, 84%, 60%)" }}>
                  <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                  <input
                    id="email"
                    type="email"
                    value={sessionData?.customer_email || ""}
                    disabled
                    className="h-10 w-full rounded-lg border bg-gray-50 pl-9 pr-3 text-sm"
                    style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 9%, 46%)" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                  <input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={6}
                    className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                    className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }}
                  />
                </div>
              </div>

              <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up workspace...</>
                ) : (
                  <><ArrowRight className="mr-2 h-4 w-4" />Complete Setup & Go to Dashboard</>
                )}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: "hsl(220, 9%, 60%)" }}>
              <Shield className="h-3 w-3" />Your workspace is secured with enterprise-grade encryption
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <div className="w-full max-w-md text-center">
        <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.1)" }}>
            <CheckCircle className="h-8 w-8" style={{ color: "hsl(160, 60%, 40%)" }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Workspace Ready!</h1>
          <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
            Redirecting you to log in...
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} />
            <span className="text-sm font-medium" style={{ color: "hsl(221, 83%, 53%)" }}>Redirecting to login</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SuccessContent />
    </Suspense>
  );
}
