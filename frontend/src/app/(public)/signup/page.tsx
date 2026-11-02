"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Mail, Lock, User, Building2, AlertCircle, Loader2, CheckCircle, ArrowRight, CreditCard,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "pro";

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", companyName: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [resumePayment, setResumePayment] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    try {
      // Step 1: Create PENDING user + org (no JWT issued)
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          companyName: form.companyName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Step 2: Redirect directly to checkout with org info
      // Handles both new signup AND resume (user exists but payment incomplete)
      const orgId = data.data?.organization?.id || "";
      const userId = data.data?.user?.id || "";
      const resumePayment = data.data?.resumePayment || false;

      if (resumePayment) {
        // User already registered but didn't complete payment — go straight to checkout
        setResumePayment(true);
        setStep("success");
        setTimeout(() => {
          router.push(`/payment/checkout?org_id=${orgId}&user_id=${userId}&plan=${data.data?.organization?.plan || selectedPlan}&email=${encodeURIComponent(form.email)}&billing=monthly`);
        }, 1500);
      } else {
        // New signup — normal flow to checkout
        setStep("success");
        setTimeout(() => {
          router.push(`/payment/checkout?org_id=${orgId}&user_id=${userId}&plan=${selectedPlan}&email=${encodeURIComponent(form.email)}&billing=monthly`);
        }, 1500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12" style={{ color: "hsl(160, 60%, 40%)" }} />
          <h2 className="text-xl font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>
            {resumePayment ? "Resuming Your Payment" : "Account Created!"}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
            {resumePayment
              ? "You already have an account. Redirecting to complete payment..."
              : "Redirecting to payment to activate your workspace..."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} />
            <span className="text-sm font-medium" style={{ color: "hsl(221, 83%, 53%)" }}>Setting up checkout</span>
          </div>
        </div>
      </div>
    );
  }

  const planLabels: Record<string, string> = {
    starter: "Starter ($19/mo)",
    pro: "Pro ($49/mo)",
    enterprise: "Enterprise ($149/mo)",
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight" style={{ color: "hsl(220, 13%, 18%)" }}>OptiRev</span>
        </Link>

        <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>Create your workspace</h2>
            <p className="mt-1 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
              Start your 14-day free trial. No credit card required for trial.
            </p>
            {selectedPlan && (
              <Badge variant="secondary" className="mt-3 px-3 py-1 text-xs font-medium">
                Plan: {planLabels[selectedPlan] || selectedPlan}
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg p-3 text-sm" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.08)", color: "hsl(0, 84%, 60%)" }}>
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input id="companyName" name="companyName" type="text" placeholder="Acme Corp" value={form.companyName} onChange={handleChange} required
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Your Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input id="name" name="name" type="text" placeholder="John Doe" value={form.name} onChange={handleChange} required
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input id="email" name="email" type="email" placeholder="john@acmecorp.com" value={form.email} onChange={handleChange} required
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input id="password" name="password" type="password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} required minLength={6}
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange} required minLength={6}
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "hsl(220, 13%, 91%)", color: "hsl(220, 13%, 18%)" }} />
              </div>
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
              ) : (
                <><ArrowRight className="mr-2 h-4 w-4" />Continue to Payment</>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
            Already have an account?{" "}
            <a href="/login" className="font-medium text-blue-600 hover:underline">Sign in</a>
          </p>
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

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SignupContent />
    </Suspense>
  );
}
