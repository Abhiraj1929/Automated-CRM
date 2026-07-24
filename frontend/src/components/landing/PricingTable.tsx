"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PlanFeature {
  text: string;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: PlanFeature[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    annualPrice: 15,
    description: "For small teams getting started with CRM.",
    features: [
      { text: "Up to 5 users" },
      { text: "1,000 contacts & deals" },
      { text: "100 AI lead scores / mo" },
      { text: "Basic pipeline views" },
      { text: "Email logging" },
      { text: "Standard support" },
    ],
    cta: "Select Starter",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "For growing teams that need full CRM power.",
    features: [
      { text: "Unlimited users" },
      { text: "15,000 contacts & deals" },
      { text: "5,000 AI lead scores / mo" },
      { text: "3-tier role management (RBAC)" },
      { text: "Batch ML scoring" },
      { text: "Kanban + list views" },
      { text: "CSV / Excel import & export" },
      { text: "Priority support" },
    ],
    cta: "Select Pro",
    highlighted: true,
    badge: "Best Value",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 149,
    annualPrice: 119,
    description: "For organisations that need full control.",
    features: [
      { text: "Unlimited contacts & deals" },
      { text: "Unlimited AI lead scores" },
      { text: "Custom ML model retraining" },
      { text: "Dedicated tenant database" },
      { text: "Custom workflow automations" },
      { text: "SSO / SAML integration" },
      { text: "SLA & priority support" },
      { text: "Dedicated account manager" },
    ],
    cta: "Select Enterprise",
  },
];

export function PricingTable() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
      className="py-20 sm:py-28"
      style={{ backgroundColor: "hsl(220, 14%, 96%)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "hsl(221, 83%, 53%)" }}
          >
            Pricing
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: "hsl(220, 13%, 18%)" }}
          >
            Simple, transparent pricing
          </h2>
          <p
            className="mx-auto mt-3 max-w-xl text-lg"
            style={{ color: "hsl(220, 9%, 46%)" }}
          >
            Start free, upgrade when you&apos;re ready. All plans include a 14-day
            trial.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium ${!annual ? "text-gray-900" : ""}`}
            style={!annual ? { color: "hsl(220, 13%, 18%)" } : { color: "hsl(220, 9%, 46%)" }}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{
              backgroundColor: annual ? "hsl(221, 83%, 53%)" : "hsl(220, 13%, 83%)",
            }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
              style={{
                transform: annual ? "translateX(22px)" : "translateX(3px)",
              }}
            />
          </button>
          <span
            className="text-sm font-medium"
            style={{ color: "hsl(220, 9%, 46%)" }}
          >
            Annual
          </span>
          <Badge className="bg-green-100 text-green-700 text-xs font-semibold">
            Save 20%
          </Badge>
        </div>

        {/* Plan Cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl p-6 transition-all ${
                  plan.highlighted ? "shadow-lg ring-2" : "shadow-sm"
                }`}
                style={{
                  backgroundColor: "white",
                  border: plan.highlighted
                    ? "none"
                    : "1px solid hsl(220, 13%, 91%)",
                  ...(plan.highlighted
                    ? {
                        ringColor: "hsl(221, 83%, 53%)",
                        boxShadow:
                          "0 4px 24px 0 hsl(221, 83%, 53% / 0.12)",
                      }
                    : {}),
                }}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <h3
                  className="text-lg font-semibold"
                  style={{ color: "hsl(220, 13%, 18%)" }}
                >
                  {plan.name}
                </h3>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "hsl(220, 9%, 46%)" }}
                >
                  {plan.description}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: "hsl(220, 13%, 18%)" }}
                  >
                    ${price}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "hsl(220, 9%, 46%)" }}
                  >
                    /mo
                  </span>
                </div>
                {annual && (
                  <p className="mt-1 text-xs text-green-600 font-medium">
                    Billed ${price * 12}/year
                  </p>
                )}

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: "hsl(221, 83%, 53%)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "hsl(220, 9%, 46%)" }}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`mt-6 w-full ${
                    plan.highlighted ? "" : "variant-outline"
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link
                    href={`/signup?plan=${plan.id}${annual ? "&billing=annual" : ""}`}
                  >
                    {plan.cta}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
