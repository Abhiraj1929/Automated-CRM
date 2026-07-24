"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowRight,
  Bot,
  Star,
  TrendingUp,
  Users,
  GripVertical,
} from "lucide-react";

export function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "hsl(220, 14%, 96%)" }}
    >
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(220,13%,18%) 1px, transparent 1px), linear-gradient(90deg, hsl(220,13%,18%) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column — Copy */}
          <div>
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              AI-Driven Lead Scoring Engine Included
            </Badge>

            <h1
              className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ color: "hsl(220, 13%, 18%)" }}
            >
              Close Deals 3x Faster with{" "}
              <span className="text-blue-600">AI Lead Scoring</span>
            </h1>

            <p
              className="mt-5 max-w-lg text-lg leading-relaxed"
              style={{ color: "hsl(220, 9%, 46%)" }}
            >
              An open, modular CRM combining Kanban deal management, role-based
              controls (Admin, Manager, Employee), and real-time machine learning
              predictive analytics.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/signup" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Explore Demo Dashboard</Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Star
                  className="h-4 w-4 fill-yellow-400"
                  style={{ color: "hsl(48, 96%, 50%)" }}
                />
                <Star
                  className="h-4 w-4 fill-yellow-400"
                  style={{ color: "hsl(48, 96%, 50%)" }}
                />
                <Star
                  className="h-4 w-4 fill-yellow-400"
                  style={{ color: "hsl(48, 96%, 50%)" }}
                />
                <Star
                  className="h-4 w-4 fill-yellow-400"
                  style={{ color: "hsl(48, 96%, 50%)" }}
                />
                <Star
                  className="h-4 w-4 fill-yellow-400"
                  style={{ color: "hsl(48, 96%, 50%)" }}
                />
                <span
                  className="ml-1 font-medium"
                  style={{ color: "hsl(220, 9%, 46%)" }}
                >
                  4.9/5 from 200+ teams
                </span>
              </div>
            </div>
          </div>

          {/* Right Column — Live Preview Card */}
          <div className="hidden lg:block">
            <div
              className="rounded-2xl p-6 shadow-xl"
              style={{
                backgroundColor: "white",
                border: "1px solid hsl(220, 13%, 91%)",
              }}
            >
              {/* Mock Kanban Header */}
              <div className="mb-4 flex items-center justify-between">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "hsl(220, 13%, 18%)" }}
                >
                  Deal Pipeline
                </h3>
                <Badge className="bg-green-100 text-green-700 text-xs">
                  3 Active Deals
                </Badge>
              </div>

              {/* Mock Kanban Columns */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    stage: "Prospecting",
                    deals: [
                      {
                        name: "Acme Corp",
                        value: "$24,500",
                        score: 92,
                        color: "green",
                      },
                    ],
                  },
                  {
                    stage: "Negotiation",
                    deals: [
                      {
                        name: "TechStart Inc",
                        value: "$18,200",
                        score: 78,
                        color: "blue",
                      },
                    ],
                  },
                  {
                    stage: "Closing",
                    deals: [
                      {
                        name: "GlobalSoft",
                        value: "$42,000",
                        score: 95,
                        color: "green",
                      },
                    ],
                  },
                ].map((col) => (
                  <div
                    key={col.stage}
                    className="rounded-lg p-2.5"
                    style={{ backgroundColor: "hsl(220, 14%, 98%)" }}
                  >
                    <p
                      className="mb-2 text-[11px] font-medium uppercase tracking-wider"
                      style={{ color: "hsl(220, 9%, 46%)" }}
                    >
                      {col.stage}
                    </p>
                    {col.deals.map((deal) => (
                      <div
                        key={deal.name}
                        className="rounded-md p-2.5 shadow-sm"
                        style={{
                          backgroundColor: "white",
                          border: "1px solid hsl(220, 13%, 91%)",
                        }}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <GripVertical
                            className="h-3 w-3"
                            style={{ color: "hsl(220, 9%, 83%)" }}
                          />
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: "hsl(220, 13%, 18%)" }}
                          >
                            {deal.value}
                          </span>
                        </div>
                        <p
                          className="mb-1.5 text-xs font-medium"
                          style={{ color: "hsl(220, 13%, 18%)" }}
                        >
                          {deal.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <Bot
                            className="h-3 w-3"
                            style={{ color: "hsl(221, 83%, 53%)" }}
                          />
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: "hsl(221, 83%, 53%)" }}
                          >
                            Score: {deal.score}/100
                          </span>
                          <Badge
                            className={`ml-auto px-1.5 py-0 text-[9px] font-bold ${
                              deal.score >= 80
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {deal.score >= 80 ? "Hot" : "Warm"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Mock Stats Bar */}
              <div
                className="mt-4 grid grid-cols-3 gap-3 rounded-lg p-3"
                style={{ backgroundColor: "hsl(220, 14%, 98%)" }}
              >
                {[
                  {
                    icon: TrendingUp,
                    label: "Pipeline",
                    value: "$84.7K",
                  },
                  { icon: Users, label: "Leads", value: "1,247" },
                  { icon: Bot, label: "AI Score", value: "92%" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <stat.icon
                      className="mx-auto mb-1 h-4 w-4"
                      style={{ color: "hsl(221, 83%, 53%)" }}
                    />
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "hsl(220, 9%, 46%)" }}
                    >
                      {stat.label}
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "hsl(220, 13%, 18%)" }}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
