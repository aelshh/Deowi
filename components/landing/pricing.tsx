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
    <section id="pricing" className="border-b-2 border-primary py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-xs font-mono uppercase tracking-[0.2em] text-muted_foreground">
            Pricing
          </p>
          <h2 className="font-heading text-4xl font-semibold tracking-tighter uppercase md:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-muted_foreground">
            Start free. Upgrade when you need more.
          </p>
        </motion.div>

        <div className="mt-10 flex items-center justify-center gap-3 font-mono text-sm uppercase tracking-[0.1em]">
          <span className={yearly ? "text-muted_foreground" : "text-foreground font-semibold"}>
            Monthly
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative inline-flex h-6 w-11 items-center border-2 border-primary transition-colors ${
              yearly ? "bg-accent" : "bg-surface"
            }`}
          >
            <span
              className={`inline-block size-4 bg-primary transition-transform ${
                yearly ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className={yearly ? "text-foreground font-semibold" : "text-muted_foreground"}>
            Yearly
          </span>
          <span className="bg-accent px-2 py-0.5 text-xs font-mono text-accent_foreground uppercase tracking-[0.1em]">
            Save 25%
          </span>
        </div>

        <motion.div
          className="mt-10 grid gap-0 border-2 border-primary md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05 } },
              }}
              className={`bg-surface p-8 relative flex flex-col ${plan.popular ? "border-2 border-accent md:border-0 md:border-l-2 md:border-r-2 md:border-accent -mx-0.5 z-10 md:-mx-0" : ""} ${i < plans.length - 1 ? "border-b-2 border-primary md:border-b-0 md:border-r-2 md:border-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent px-3 py-1 text-xs font-mono uppercase tracking-[0.1em] text-accent_foreground shadow-[4px_4px_0_0_#0A0A0A]">
                  Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-heading text-lg font-semibold uppercase tracking-tight">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-bold tracking-tighter">
                    {plan.price}
                  </span>
                  {plan.price !== "$0" && (
                    <span className="text-sm font-mono text-muted_foreground">
                      /{yearly ? "yr" : "mo"}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted_foreground">
                  {plan.description}
                </p>
              </div>
              <ul className="mb-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-foreground/80"
                  >
                    <Check className="size-4 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`flex items-center justify-center gap-2 py-3 font-mono text-sm font-medium uppercase tracking-[0.2em] border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] transition-all hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 ${
                  plan.popular
                    ? "bg-accent text-accent_foreground"
                    : "bg-surface text-primary"
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
