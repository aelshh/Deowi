"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  Film,
  ScrollText,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSidebar } from "./sidebar-context";

const navItems = [
  { href: "/dashboard", label: "Media", icon: Film },
  { href: "/dashboard/kits", label: "Marketing Kits", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, closeMobile } = useSidebar();

  const navContent = (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
        onClick={closeMobile}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
              isActive
                ? "bg-accent/10 text-foreground"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon className="size-4 shrink-0" />
            {(!collapsed || mobileOpen) && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarHeader = (
    <div className={cn(
      "flex h-14 items-center border-b border-border/50",
      collapsed && !mobileOpen ? "justify-center px-2" : "gap-2 px-4",
    )}>
      {(!collapsed || mobileOpen) ? (
        <>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-semibold tracking-tight"
            >
              Deowi
            </motion.span>
          </Link>
          <button
            onClick={closeMobile}
            className="ml-auto flex size-6 items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-foreground md:hidden"
          >
            <X className="size-4" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden size-6 items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-foreground md:flex"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </>
      ) : (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex size-6 items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <PanelLeft className="size-4" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 hidden h-dvh flex-col border-r border-border/50 bg-sidebar md:flex"
      >
        {sidebarHeader}
        {navContent}
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            onClick={closeMobile}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />
            <motion.aside
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border/50 bg-sidebar md:hidden"
            >
              {sidebarHeader}
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
