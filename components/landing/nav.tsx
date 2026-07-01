"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  useEffect(() => {
    setMobileOpen(false);
  }, []);

  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b-2 border-primary bg-background"
          : "bg-transparent",
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" as const }}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between px-6 transition-all duration-300",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="flex size-8 items-center justify-center bg-primary text-sm font-bold text-primary-foreground shadow-[4px_4px_0_0_#0A0A0A]">
              D
            </div>
            <span className="text-sm font-heading font-semibold">Deowi</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative text-sm font-mono uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/auth/login"
              className="text-sm font-mono uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-9 items-center justify-center gap-1.5 bg-accent px-5 text-sm font-mono font-medium uppercase tracking-[0.2em] text-accent_foreground border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all"
              data-testid="cta-button"
            >
              Get started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          className="border-t-2 border-primary bg-background px-6 pb-6 pt-4 md:hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" as const }}
        >
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-mono uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-primary" />
            <Link
              href="/auth/login"
              className="text-sm font-mono uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 bg-accent px-5 text-sm font-mono font-medium uppercase tracking-[0.2em] text-accent_foreground border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A]"
              onClick={() => setMobileOpen(false)}
              data-testid="cta-button"
            >
              Get started
            </Link>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
