"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle, CreditCard, Loader2 } from "lucide-react";

const planDetails: Record<string, { name: string; price: number; annual: number }> = {
  starter: { name: "Starter", price: 19, annual: 15 },
  pro: { name: "Pro", price: 49, annual: 39 },
  enterprise: { name: "Enterprise", price: 149, annual: 119 },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") || "pro";
  const billing = searchParams.get("billing") || "monthly";
  const plan = planDetails[planId] || planDetails.pro;
  const isAnnual = billing === "annual";
  const price = isAnnual ? plan.annual : plan.price;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billing }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Unable to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: "hsl(220, 14%, 96%)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "hsl(221, 83%, 53%)" }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: "hsl(220, 13%, 18%)" }}
          >
            OptiRev
          </span>
        </Link>

        {/* Checkout Card */}
        <div
          className="rounded-xl p-8 shadow-sm"
          style={{
            backgroundColor: "white",
            border: "1px solid hsl(220, 13%, 91%)",
          }}
        >
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "hsl(221, 83%, 53% / 0.08)" }}
            >
              <CreditCard
                className="h-6 w-6"
                style={{ color: "hsl(221, 83%, 53%)" }}
              />
            </div>
            <h2
              className="text-xl font-semibold"
              style={{ color: "hsl(220, 13%, 18%)" }}
            >
              Complete your subscription
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: "hsl(220, 9%, 46%)" }}
            >
              Secure checkout powered by Stripe
            </p>
          </div>

          {/* Plan Summary */}
          <div
            className="mb-6 rounded-lg p-4"
            style={{ backgroundColor: "hsl(220, 14%, 98%)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="font-semibold"
                  style={{ color: "hsl(220, 13%, 18%)" }}
                >
                  {plan.name} Plan
                </p>
                <p
                  className="text-sm"
                  style={{ color: "hsl(220, 9%, 46%)" }}
                >
                  {isAnnual ? "Billed annually" : "Billed monthly"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-bold"
                  style={{ color: "hsl(220, 13%, 18%)" }}
                >
                  ${price}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "hsl(220, 9%, 46%)" }}
                >
                  /month
                </p>
              </div>
            </div>
            {isAnnual && (
              <Badge className="mt-2 bg-green-100 text-green-700 text-xs">
                You save ${(plan.price - plan.annual) * 12}/year
              </Badge>
            )}
          </div>

          {/* Features */}
          <div className="mb-6 space-y-2">
            {[
              "14-day free trial included",
              "Cancel anytime, no lock-in",
              "Instant workspace provisioning",
              "AI lead scoring from day one",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 shrink-0"
                  style={{ color: "hsl(160, 60%, 40%)" }}
                />
                <span
                  className="text-sm"
                  style={{ color: "hsl(220, 9%, 46%)" }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div
              className="mb-4 rounded-lg p-3 text-center text-sm"
              style={{
                backgroundColor: "hsl(0, 84%, 60% / 0.08)",
                color: "hsl(0, 84%, 60%)",
              }}
            >
              {error}
            </div>
          )}

          <Button
            className="h-11 w-full text-base"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              `Start Free Trial — $${price}/mo`
            )}
          </Button>

          <p
            className="mt-4 text-center text-xs"
            style={{ color: "hsl(220, 9%, 60%)" }}
          >
            By subscribing, you agree to our{" "}
            <a href="#" className="underline hover:text-gray-900">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-gray-900">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <p
          className="mt-6 text-center text-sm"
          style={{ color: "hsl(220, 9%, 46%)" }}
        >
          <a href="/" className="font-medium text-blue-600 hover:underline">
            &larr; Back to home
          </a>
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

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckoutContent />
    </Suspense>
  );
}
