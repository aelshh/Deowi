"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
          ? "border-b border-border/50 bg-background/80 backdrop-blur-xl"
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
          <Link href="/" className="flex items-center gap-2.5" data-testid="nav-logo">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-secondary text-sm font-bold text-white">
              D
            </div>
            <span className="text-sm font-semibold tracking-tight">Deowi</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-secondary px-5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-glow hover:brightness-110"
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
          className="border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 pb-6 pt-4 md:hidden"
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
                className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-border/50" />
            <div className="flex items-center justify-between">
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
              <ThemeToggle />
            </div>
            <Link
              href="/auth/signup"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-secondary px-5 text-sm font-medium text-white shadow-md"
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
