// ============================================================
// Login Page - Email/password authentication
// ============================================================
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show timeout message if redirected due to session expiry
  useEffect(() => {
    const reason = searchParams.get("reason");
    const message = searchParams.get("message");
    if (reason === "timeout") {
      setError(message || "Your session expired due to inactivity. Please log in again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (result.user?.is_super_admin) {
        router.push("/super-admin");
      } else if (result.user?.onboarding_completed === false) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } else {
      if (result.error?.includes("awaiting payment") || result.error?.includes("workspace is awaiting")) {
        setError("");
        router.push(`/payment?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(result.error || "Login failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight" style={{ color: "hsl(220, 13%, 18%)" }}>OptiRev</span>
        </div>

        <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.08)", color: "hsl(0, 84%, 60%)" }}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ border: "1px solid hsl(220, 13%, 91%)", backgroundColor: "white", color: "hsl(220, 13%, 18%)" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 9%, 46%)" }} />
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 w-full rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ border: "1px solid hsl(220, 13%, 91%)", backgroundColor: "white", color: "hsl(220, 13%, 18%)" }}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: "hsl(220, 13%, 91%)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-center" style={{ color: "hsl(220, 9%, 46%)" }}>
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setEmail("admin@crm.com"); setPassword("Admin123!"); }}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail("marcus@company.com"); setPassword("Manager123!"); }}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors text-center"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => { setEmail("sarah@company.com"); setPassword("Employee123!"); }}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors text-center"
              >
                Employee
              </button>
            </div>
          </div>

          <p className="text-center text-sm mt-5" style={{ color: "hsl(220, 9%, 46%)" }}>
            Don&apos;t have an account?{" "}
            <a href="/signup" className="font-medium text-blue-600 hover:underline">Create one</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
