"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/landing/Navbar";
import { Features } from "@/components/landing/Features";
import { CTABanner } from "@/components/landing/CTABanner";
import { Footer } from "@/components/landing/Footer";
import {
  Sparkles, CreditCard, CheckCircle, Loader2, Shield,
  Bot, LayoutDashboard, Users, TrendingUp, Star, GripVertical, ArrowRight,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const planDetails: Record<string, { name: string; price: number; annual: number; features: string[] }> = {
  starter: {
    name: "Starter",
    price: 19,
    annual: 15,
    features: ["5 Users", "1,000 Contacts", "100 AI Scores/mo", "Email Support"],
  },
  pro: {
    name: "Pro",
    price: 49,
    annual: 39,
    features: ["Unlimited Users", "15,000 Contacts", "5,000 AI Scores/mo", "Priority Support", "Advanced Analytics"],
  },
  enterprise: {
    name: "Enterprise",
    price: 149,
    annual: 119,
    features: ["Unlimited Everything", "Unlimited Contacts", "Unlimited AI Scores", "Dedicated Support", "Custom Integrations", "SLA"],
  },
};

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // These come from the signup redirect
  const orgId = searchParams.get("org_id") || "";
  const userId = searchParams.get("user_id") || "";
  const initialPlan = searchParams.get("plan") || "pro";
  const email = searchParams.get("email") || "";

  const [plan, setPlan] = useState(initialPlan);
  const [billing, setBilling] = useState("monthly");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const planInfo = planDetails[plan] || planDetails.pro;
  const price = billing === "annual" ? planInfo.annual : planInfo.price;

  const handlePayment = async () => {
    setProcessing(true);
    setError("");

    try {
      // Redirect to checkout page with all details
      const params = new URLSearchParams({
        org_id: orgId,
        user_id: userId,
        plan,
        billing,
        email,
      });
      router.push(`/payment/checkout?${params.toString()}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(hsl(220,13%,18%) 1px, transparent 1px), linear-gradient(90deg, hsl(220,13%,18%) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-200 text-xs px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1 inline" />AI-Powered CRM Platform
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl" style={{ color: "hsl(220, 13%, 18%)" }}>
              Close deals <span className="text-blue-600">3x faster</span> with AI
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg" style={{ color: "hsl(220, 9%, 46%)" }}>
              OptiRev uses machine learning to score leads, predict conversions, and automate your sales pipeline.
              Enterprise-grade security with RBAC, audit trails, and real-time analytics.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base" onClick={() => document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" })}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })}>
                See Features
              </Button>
            </div>
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              {[
                { value: "90%+", label: "Lead Score Accuracy" },
                { value: "3x", label: "Faster Closings" },
                { value: "50+", label: "Automation Rules" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-blue-600">{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: "hsl(220, 9%, 46%)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-xl shadow-2xl" style={{ border: "1px solid hsl(220, 13%, 91%)" }}>
            <div className="p-3" style={{ backgroundColor: "hsl(220, 14%, 96%)", borderBottom: "1px solid hsl(220, 13%, 91%)" }}>
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 p-4" style={{ backgroundColor: "white" }}>
              {["Lead", "Qualified", "Proposal", "Closed Won"].map((stage, i) => (
                <div key={stage}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "hsl(220, 9%, 46%)" }}>{stage}</p>
                  {[
                    { name: "Acme Corp", score: i === 3 ? 92 : 70 + i * 5, color: i === 3 ? "bg-green-500" : "bg-blue-500" },
                    ...(i < 2 ? [{ name: "TechStart", score: 45 + i * 10, color: "bg-amber-500" }] : []),
                  ].map((card) => (
                    <div key={card.name} className="mb-2 rounded-lg p-2.5 text-xs shadow-sm" style={{ border: "1px solid hsl(220, 13%, 91%)" }}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: "hsl(220, 13%, 18%)" }}>{card.name}</span>
                        <Badge className={`${card.color} text-white text-[9px] px-1.5 py-0`}>AI {card.score}</Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        <GripVertical className="h-2.5 w-2.5" style={{ color: "hsl(220, 9%, 60%)" }} />
                        <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: "hsl(220, 14%, 94%)" }}>
                          <div className={`h-full rounded-full ${card.color}`} style={{ width: `${card.score}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div id="features-section"><Features /></div>

      {/* Payment Section */}
      <section id="payment-section" className="py-20 sm:py-28" style={{ backgroundColor: "hsl(220, 14%, 96%)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-3 bg-blue-50 text-blue-700 border-blue-200 text-xs px-3 py-1">
              <CreditCard className="h-3 w-3 mr-1 inline" />Subscription
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: "hsl(220, 13%, 18%)" }}>Choose Your Plan</h2>
            <p className="mt-3 text-lg" style={{ color: "hsl(220, 9%, 46%)" }}>
              Start your 14-day free trial. No credit card required for trial.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="mb-10 flex justify-center">
            <div className="rounded-lg p-1" style={{ backgroundColor: "hsl(220, 14%, 94%)" }}>
              <button className={`rounded-md px-5 py-2.5 text-sm font-medium transition-all ${billing === "monthly" ? "bg-white shadow-sm" : ""}`}
                style={{ color: billing === "monthly" ? "hsl(220, 13%, 18%)" : "hsl(220, 9%, 46%)" }} onClick={() => setBilling("monthly")}>Monthly</button>
              <button className={`rounded-md px-5 py-2.5 text-sm font-medium transition-all ${billing === "annual" ? "bg-white shadow-sm" : ""}`}
                style={{ color: billing === "annual" ? "hsl(220, 13%, 18%)" : "hsl(220, 9%, 46%)" }} onClick={() => setBilling("annual")}>
                Annual <Badge className="ml-1 bg-green-100 text-green-700 text-[10px]">Save 20%</Badge>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="mx-auto mb-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {Object.entries(planDetails).map(([id, p]) => {
              const isSelected = plan === id;
              const pPrice = billing === "annual" ? p.annual : p.price;
              return (
                <div key={id}
                  className={`cursor-pointer rounded-2xl p-8 transition-all ${isSelected ? "ring-2 ring-blue-600 shadow-xl scale-[1.02]" : "hover:shadow-lg"}`}
                  style={{ backgroundColor: "white", border: isSelected ? "2px solid hsl(221, 83%, 53%)" : "1px solid hsl(220, 13%, 91%)" }}
                  onClick={() => setPlan(id)}>
                  {id === "pro" && <Badge className="mb-4 bg-blue-600 text-white text-xs">Most Popular</Badge>}
                  <h3 className="text-xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>${pPrice}</span>
                    <span className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>/mo</span>
                  </div>
                  {billing === "annual" && <p className="mt-1 text-xs text-green-600 font-medium">Save ${(p.price - p.annual) * 12}/year</p>}
                  <ul className="mt-6 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>
                        <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "hsl(160, 60%, 40%)" }} />{f}
                      </li>
                    ))}
                  </ul>
                  {isSelected && (
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium" style={{ color: "hsl(221, 83%, 53%)" }}>
                      <CreditCard className="h-4 w-4" /> Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Payment Button */}
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl p-8 shadow-lg" style={{ backgroundColor: "white", border: "1px solid hsl(220, 13%, 91%)" }}>
              <h3 className="mb-4 text-lg font-semibold" style={{ color: "hsl(220, 13%, 18%)" }}>Order Summary</h3>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm" style={{ color: "hsl(220, 9%, 46%)" }}>{planInfo.name} Plan ({billing})</span>
                <span className="text-2xl font-bold" style={{ color: "hsl(220, 13%, 18%)" }}>${price}/mo</span>
              </div>

              {error && (
                <div className="mb-4 rounded-lg p-3 text-sm" style={{ backgroundColor: "hsl(0, 84%, 60% / 0.08)", color: "hsl(0, 84%, 60%)" }}>{error}</div>
              )}

              <Button className="h-12 w-full text-base" onClick={handlePayment} disabled={processing}>
                {processing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                ) : (
                  <><CreditCard className="mr-2 h-4 w-4" />Start Free Trial — ${price}/mo</>
                )}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: "hsl(220, 9%, 60%)" }}>
                <Shield className="h-3 w-3" />Secure checkout powered by Stripe
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTABanner />
      <Footer />
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

export default function PaymentPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PaymentContent />
    </Suspense>
  );
}
