"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PaymentElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Lock, Shield, CheckCircle, Loader2, AlertCircle, ArrowLeft,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const planDetails: Record<string, { name: string; price: number; annual: number; features: string[] }> = {
  starter: { name: "Starter", price: 19, annual: 15, features: ["5 Users", "1,000 Contacts", "100 AI Scores/mo"] },
  pro: { name: "Pro", price: 49, annual: 39, features: ["Unlimited Users", "15,000 Contacts", "5,000 AI Scores/mo", "Priority Support"] },
  enterprise: { name: "Enterprise", price: 149, annual: 119, features: ["Unlimited Everything", "Dedicated Support", "Custom Integrations", "SLA"] },
};

// ============================================================
// Dev mode checkout — no Stripe, direct confirm-payment
// ============================================================
function DevCheckoutForm({
  orgId, userId, plan, billing, email, onError,
}: {
  orgId: string; userId: string; plan: string; billing: string; email: string; onError: (msg: string) => void;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const planInfo = planDetails[plan] || planDetails.pro;
  const price = billing === "annual" ? planInfo.annual : planInfo.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setStep("processing");

    try {
      const res = await fetch(`${API_URL}/billing/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: `pi_dev_${Date.now()}`,
          orgId, userId, planId: plan, billing, cardLast4: "0000",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("success");
        setTimeout(() => router.push("/payment/confirmation"), 2000);
        return;
      }
      setStep("form");
      onError(data.error || "Payment failed");
    } catch {
      setStep("form");
      onError("Payment processing failed");
    } finally {
      setProcessing(false);
    }
  };

  if (step === "processing") {
    return (
      <div className="rounded-xl p-10 shadow-sm text-center" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
        <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <h2 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Processing Payment</h2>
        <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>Securing your {planInfo.name} subscription...</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="rounded-xl p-10 shadow-sm text-center" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.1)" }}>
          <CheckCircle className="h-8 w-8" style={{ color: "hsl(160, 60%, 40%)" }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Payment Successful!</h2>
        <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>Redirecting...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dev mode: show card form placeholder */}
      <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "hsl(220, 13%, 91%)" }}>
        <p className="text-xs font-medium" style={{ color: "hsl(220, 9%, 46%)" }}>Dev Mode — Stripe not configured</p>
        <div className="rounded-lg border p-3" style={{ borderColor: "hsl(220, 13%, 91%)", backgroundColor: "hsl(220, 14%, 98%)" }}>
          <p className="text-sm" style={{ color: "hsl(220, 13%, 18%)" }}>Card: 4242 4242 4242 4242</p>
        </div>
      </div>

      <div className="rounded-lg p-3" style={{ backgroundColor: "hsl(221, 83%, 53% / 0.06)", border: "1px solid hsl(221, 83%, 53% / 0.15)" }}>
        <p className="text-xs" style={{ color: "hsl(221, 83%, 53%" }}>
          <strong>14-day free trial.</strong> You won&apos;t be charged today. Cancel anytime.
        </p>
      </div>

      <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={processing}>
        <Lock className="mr-2 h-4 w-4" />
        Start Free Trial — ${price}/mo
      </Button>

      <div className="flex items-center justify-center gap-4 pt-1">
        {["SSL Encrypted", "PCI Compliant", "30-day Guarantee"].map((t) => (
          <div key={t} className="flex items-center gap-1 text-[11px]" style={{ color: "hsl(220, 9%, 60%)" }}>
            <Shield className="h-3 w-3" />{t}
          </div>
        ))}
      </div>
    </form>
  );
}

// ============================================================
// Live Stripe checkout — uses Elements + PaymentElement
// ============================================================
function StripeCheckoutForm({
  orgId, userId, plan, billing, email, onError,
}: {
  orgId: string; userId: string; plan: string; billing: string; email: string; onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const planInfo = planDetails[plan] || planDetails.pro;
  const price = billing === "annual" ? planInfo.annual : planInfo.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setStep("processing");

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/confirmation?org_id=${orgId}&user_id=${userId}&plan=${plan}`,
        },
        redirect: "if_required",
      });

      if (error) {
        setStep("form");
        onError(error.message || "Payment failed");
      }
    } catch {
      setStep("form");
      onError("Payment processing failed");
    } finally {
      setProcessing(false);
    }
  };

  if (step === "processing") {
    return (
      <div className="rounded-xl p-10 shadow-sm text-center" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
        <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <h2 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Processing Payment</h2>
        <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>Securing your {planInfo.name} subscription...</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="rounded-xl p-10 shadow-sm text-center" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.1)" }}>
          <CheckCircle className="h-8 w-8" style={{ color: "hsl(160, 60%, 40%)" }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Payment Successful!</h2>
        <p className="mt-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>Redirecting...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border p-4" style={{ borderColor: "hsl(220, 13%, 91%)" }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      <div className="rounded-lg p-3" style={{ backgroundColor: "hsl(221, 83%, 53% / 0.06)", border: "1px solid hsl(221, 83%, 53% / 0.15)" }}>
        <p className="text-xs" style={{ color: "hsl(221, 83%, 53%)" }}>
          <strong>14-day free trial.</strong> You won&apos;t be charged today. Cancel anytime.
        </p>
      </div>

      <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={!stripe || processing}>
        <Lock className="mr-2 h-4 w-4" />
        Start Free Trial — ${price}/mo
      </Button>

      <div className="flex items-center justify-center gap-4 pt-1">
        {["SSL Encrypted", "PCI Compliant", "30-day Guarantee"].map((t) => (
          <div key={t} className="flex items-center gap-1 text-[11px]" style={{ color: "hsl(220, 9%, 60%)" }}>
            <Shield className="h-3 w-3" />{t}
          </div>
        ))}
      </div>
    </form>
  );
}

// ============================================================
// Main checkout page
// ============================================================
function CheckoutContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org_id") || "";
  const userId = searchParams.get("user_id") || "";
  const plan = searchParams.get("plan") || "pro";
  const billing = searchParams.get("billing") || "monthly";
  const email = searchParams.get("email") || "";

  const planInfo = planDetails[plan] || planDetails.pro;
  const price = billing === "annual" ? planInfo.annual : planInfo.price;

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const createIntent = async () => {
      try {
        const res = await fetch(`${API_URL}/billing/create-payment-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan, billing, email, userId, orgId }),
        });
        const data = await res.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || "Failed to initialize payment");
        }
      } catch {
        setError("Failed to connect to payment service");
      } finally {
        setLoading(false);
      }
    };
    if (orgId) createIntent();
    else setLoading(false);
  }, [orgId, plan, billing, email, userId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "hsl(220, 13%, 91%)", backgroundColor: "white" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(221, 83%, 53%)" }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>OptiRev</span>
          </Link>
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4" style={{ color: "hsl(160, 60%, 40%)" }} />
            <span className="text-xs font-medium" style={{ color: "hsl(160, 60%, 40%)" }}>Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <Link href={`/payment?org_id=${orgId}&user_id=${userId}&plan=${plan}&email=${email}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: "hsl(221, 83%, 53%)" }}>
          <ArrowLeft className="h-4 w-4" />Back to plan selection
        </Link>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Payment Form */}
          <div className="lg:col-span-3">
            <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
              <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>Payment Details</h1>
                <p className="mt-1 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                  Card data is handled securely by Stripe. Never touches our servers.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(221, 83%, 53%)" }} />
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 rounded-lg p-3 text-sm" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.08)", color: "hsl(0, 84%, 60%)" }}>
                  <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
                </div>
              ) : stripePromise && clientSecret ? (
                /* Live mode: wrap in Elements provider */
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#2563eb",
                        colorBackground: "#ffffff",
                        colorText: "#1a2332",
                        colorDanger: "#ef4444",
                        fontFamily: "system-ui, sans-serif",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <StripeCheckoutForm
                    orgId={orgId} userId={userId} plan={plan} billing={billing} email={email}
                    onError={setError}
                  />
                </Elements>
              ) : (
                /* Dev mode: no Stripe key */
                <DevCheckoutForm
                  orgId={orgId} userId={userId} plan={plan} billing={billing} email={email}
                  onError={setError}
                />
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-10 rounded-xl p-6 shadow-sm" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
              <h3 className="mb-4 text-lg font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>Order Summary</h3>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>{planInfo.name} Plan</p>
                  <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>{billing === "annual" ? "Billed annually" : "Billed monthly"}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>${price}</p>
                  <p className="text-xs" style={{ color: "hsl(220, 9%, 46%)" }}>/month</p>
                </div>
              </div>
              <div className="border-t pt-4" style={{ borderColor: "hsl(220, 13%, 91%)" }}>
                <ul className="space-y-2.5">
                  {planInfo.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(160, 60%, 40%)" }} />{f}
                    </li>
                  ))}
                </ul>
              </div>
              {billing === "annual" && (
                <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: "hsl(160, 60%, 40% / 0.08)" }}>
                  <p className="text-xs font-medium" style={{ color: "hsl(160, 60%, 40%)" }}>
                    You save ${(planInfo.price - planInfo.annual) * 12}/year
                  </p>
                </div>
              )}
            </div>
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

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckoutContent />
    </Suspense>
  );
}
