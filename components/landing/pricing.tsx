"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { staggerContainer } from "@/lib/motion";

const monthlyPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for trying out Deowi.",
    features: [
      "3 uploads per month",
      "Up to 30 min recordings",
      "Blog post + newsletter",
      "Basic transcription",
    ],
    cta: "Get started",
    href: "/auth/signup",
  },
  {
    name: "Pro",
    price: "$19",
    description: "For serious content creators.",
    features: [
      "50 uploads per month",
      "Up to 2hr recordings",
      "All content formats",
      "Full transcription + chapters",
      "Priority processing",
      "Export to markdown",
    ],
    cta: "Start free trial",
    href: "/auth/signup",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    description: "For teams and agencies.",
    features: [
      "Unlimited uploads",
      "Unlimited recording length",
      "All content formats",
      "Team collaboration",
      "Custom AI fine-tuning",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact sales",
    href: "#",
  },
];

const yearlyPlans = monthlyPlans.map((plan) => {
  if (plan.price === "$0") return plan;
  const price = parseInt(plan.price.slice(1));
  return {
    ...plan,
    price: `$${Math.round(price * 10 * 0.75)}`,
  };
});

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  const plans = yearly ? yearlyPlans : monthlyPlans;

  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-sm text-accent font-medium">Pricing</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </motion.div>

        <div className="mt-10 flex items-center justify-center gap-3 text-sm">
          <span className={yearly ? "text-muted-foreground" : "text-foreground font-semibold"}>
            Monthly
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              yearly ? "bg-accent" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block size-4 rounded-full bg-white transition-transform duration-200 ${
                yearly ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className={yearly ? "text-foreground font-semibold" : "text-muted-foreground"}>
            Yearly
          </span>
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
            Save 25%
          </span>
        </div>

        <motion.div
          className="mt-10 grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05 } },
              }}
              className={`relative rounded-2xl p-8 flex flex-col transition-colors duration-200 ${
                plan.popular
                  ? "border-2 border-accent/50 bg-surface shadow-glow"
                  : "border border-border/50 bg-surface/50 hover:border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.price !== "$0" && (
                    <span className="text-sm text-muted-foreground">
                      /{yearly ? "yr" : "mo"}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <ul className="mb-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-sm text-foreground/80"
                  >
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <Check className="size-3 text-accent" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all duration-200 ${
                  plan.popular
                    ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-md hover:shadow-glow hover:brightness-110"
                    : "border border-border bg-surface text-foreground hover:bg-surface-hover"
                }`}
                data-testid="cta-button"
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
