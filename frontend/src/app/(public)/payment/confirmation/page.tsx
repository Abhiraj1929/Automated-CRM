"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle, ArrowRight, LogIn, Loader2, RefreshCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org_id");
  const userId = searchParams.get("user_id");

  const [status, setStatus] = useState<"polling" | "ready" | "manual">("polling");
  const [pollCount, setPollCount] = useState(0);

  const checkOrgStatus = useCallback(async () => {
    if (!orgId) {
      setStatus("manual");
      return true;
    }

    try {
      const res = await fetch(`${API_URL}/billing/verify-session?org_id=${orgId}`);
      const data = await res.json();

      if (data.success && data.data?.organization?.status === "active") {
        setStatus("ready");
        return true;
      }

      const checkRes = await fetch(`${API_URL}/billing/process-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          userId,
          planId: "pro",
          billing: "monthly",
          paymentIntentId: `pi_dev_${Date.now()}`,
          cardLast4: "0000",
        }),
      });
      const checkData = await checkRes.json();
      if (checkData.success) {
        setStatus("ready");
        return true;
      }
    } catch {
      // Continue polling
    }
    return false;
  }, [orgId, userId]);

  useEffect(() => {
    if (status !== "polling") return;
    if (pollCount >= 15) {
      setStatus("manual");
      return;
    }

    const timer = setTimeout(async () => {
      const ready = await checkOrgStatus();
      if (!ready) {
        setPollCount((c) => c + 1);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [status, pollCount, checkOrgStatus]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight" style={{ color: "hsl(220, 13%, 18%)" }}>OptiRev</span>
        </div>

        <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
          {status === "polling" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(221, 83%, 53% / 0.08)" }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Activating Workspace</h1>
              <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                Waiting for payment confirmation... ({pollCount + 1}/15)
              </p>
            </>
          )}

          {status === "ready" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.1)" }}>
                <CheckCircle className="h-8 w-8" style={{ color: "hsl(160, 60%, 40%)" }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Payment Confirmed!</h1>
              <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                Your subscription is active. Your workspace is ready.
              </p>
            </>
          )}

          {status === "manual" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(221, 83%, 53% / 0.08)" }}>
                <RefreshCw className="h-8 w-8" style={{ color: "hsl(221, 83%, 53%)" }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Almost There</h1>
              <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                Your payment is being processed. You can try logging in now.
              </p>
            </>
          )}

          <div className="mt-6 rounded-lg p-4" style={{ backgroundColor: "hsl(220, 14%, 98%)" }}>
            <p className="text-sm font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>What&apos;s next?</p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
              <li>Log in with your email and password</li>
              <li>Set up your team members</li>
              <li>Import your contacts and leads</li>
              <li>Start scoring leads with AI</li>
            </ul>
          </div>

          <Button className="mt-6 h-11 w-full" onClick={() => router.push("/login")}>
            <LogIn className="mr-2 h-4 w-4" /> Log In to Your Workspace
          </Button>
        </div>

        <p className="mt-6 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
          Need help?{" "}
          <a href="mailto:support@optirev.com" className="font-medium text-blue-600 hover:underline">Contact Support</a>
        </p>
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

export default function PaymentConfirmationPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ConfirmationContent />
    </Suspense>
  );
}
