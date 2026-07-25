"use client";

import { signOut } from "@/actions/auth-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSidebar } from "./sidebar-context";

type HeaderProps = {
  title: string;
  userEmail?: string;
  userName?: string;
};

export function Header({ title, userEmail, userName }: HeaderProps) {
  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();
  const { openMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-14 min-w-0 items-center justify-between border-b border-border/50 bg-background px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={openMobile}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-surface-hover hover:text-foreground md:hidden"
        >
          <Menu className="size-4" />
        </button>
        <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight md:text-base">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 transition-colors duration-200 hover:bg-surface-hover">
            <Avatar className="size-7">
              <AvatarFallback className="rounded-full bg-gradient-to-br from-accent to-accent-secondary text-xs font-medium text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <div className="border-b border-border/50 px-2 py-1.5">
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <DropdownMenuItem
              onClick={signOut}
              className="gap-2 text-xs text-muted-foreground focus:text-destructive"
            >
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
