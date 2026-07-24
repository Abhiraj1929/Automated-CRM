"use client";

import React from "react";
import {
  Bot,
  LayoutDashboard,
  Shield,
  MessageSquare,
  Database,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "ML Predictive Lead Scoring",
    description:
      "Python FastAPI backend evaluating deal conversion probabilities in real time. 3-class model (High / Moderate / Low) with 90%+ accuracy.",
    color: "hsl(221, 83%, 53%)",
    bgColor: "hsl(221, 83%, 53% / 0.08)",
  },
  {
    icon: LayoutDashboard,
    title: "Dynamic Kanban Pipelines",
    description:
      "Drag-and-drop deal stage progression with custom stage automation and workflow triggers at every step.",
    color: "hsl(160, 60%, 40%)",
    bgColor: "hsl(160, 60%, 40% / 0.08)",
  },
  {
    icon: Shield,
    title: "Multi-Tier Role Hierarchy",
    description:
      "Granular access control built for Admins, Managers, and Employees. Row-level security enforces data boundaries.",
    color: "hsl(280, 60%, 50%)",
    bgColor: "hsl(280, 60%, 50% / 0.08)",
  },
  {
    icon: MessageSquare,
    title: "Interaction Timeline",
    description:
      "Integrated call, email, and meeting logging with full activity history on every contact and opportunity.",
    color: "hsl(30, 80%, 50%)",
    bgColor: "hsl(30, 80%, 50% / 0.08)",
  },
  {
    icon: Database,
    title: "High-Performance SQL Stack",
    description:
      "Built on Supabase PostgreSQL with Row Level Security (RLS), real-time subscriptions, and automatic backups.",
    color: "hsl(200, 70%, 45%)",
    bgColor: "hsl(200, 70%, 45% / 0.08)",
  },
  {
    icon: BarChart3,
    title: "Global Analytics & Reports",
    description:
      "Team performance metrics, revenue forecasts, and conversion funnels. Export as PDF, CSV, or XLSX.",
    color: "hsl(350, 65%, 50%)",
    bgColor: "hsl(350, 65%, 50% / 0.08)",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28" style={{ backgroundColor: "white" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "hsl(221, 83%, 53%)" }}
          >
            Features
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: "hsl(220, 13%, 18%)" }}
          >
            Everything you need to close faster
          </h2>
          <p
            className="mx-auto mt-3 max-w-2xl text-lg"
            style={{ color: "hsl(220, 9%, 46%)" }}
          >
            A complete CRM platform with AI-powered insights, pipeline
            management, and enterprise-grade security.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl p-6 transition-all hover:shadow-md"
              style={{
                border: "1px solid hsl(220, 13%, 91%)",
                backgroundColor: "white",
              }}
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                style={{ backgroundColor: feature.bgColor }}
              >
                <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
              </div>
              <h3
                className="mb-2 text-base font-semibold"
                style={{ color: "hsl(220, 13%, 18%)" }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "hsl(220, 9%, 46%)" }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
