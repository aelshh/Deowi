"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Film,
  ScrollText,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Media", icon: Film },
  { href: "/dashboard/kits", label: "Marketing Kits", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col border-r-2 border-primary bg-sidebar"
    >
      <div className="flex h-14 items-center gap-2 border-b-2 border-primary px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center bg-primary text-xs font-bold text-primary-foreground shadow-[4px_4px_0_0_#0A0A0A]">
            D
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-heading font-semibold"
            >
              Deowi
            </motion.span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto flex size-6 items-center justify-center text-muted_foreground transition-colors hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>
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
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 font-mono text-sm font-medium uppercase tracking-[0.1em] transition-colors",
                isActive
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 bg-accent"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
