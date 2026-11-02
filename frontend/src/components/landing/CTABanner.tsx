"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Loader2, CheckCircle } from "lucide-react";

export function CTABanner() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: "white" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-2xl px-8 py-14 text-center sm:px-14"
          style={{
            background:
              "linear-gradient(135deg, hsl(220, 20%, 14%) 0%, hsl(221, 30%, 10%) 100%)",
          }}
        >
          {/* Decorative dots */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(hsl(0,0%,100%) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative">
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: "white" }}
            >
              Ready to Supercharge Your Sales Pipeline?
            </h2>
            <p
              className="mx-auto mt-4 max-w-lg text-lg"
              style={{ color: "hsl(220, 14%, 70%)" }}
            >
              Join 200+ sales teams using OptiRev to close deals faster with
              AI-powered lead scoring.
            </p>

            {submitted ? (
              <div className="mt-8 flex items-center justify-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Thanks! We&apos;ll be in touch shortly.
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Mail
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: "hsl(220, 9%, 55%)" }}
                  />
                  <input
                    type="email"
                    placeholder="Enter your business email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 w-full rounded-lg pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: "hsl(220, 15%, 18%)",
                      border: "1px solid hsl(220, 10%, 28%)",
                      color: "white",
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
