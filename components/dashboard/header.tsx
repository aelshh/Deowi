"use client";

import { signOut } from "@/actions/auth-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type HeaderProps = {
  title: string;
  userEmail?: string;
  userName?: string;
};

export function Header({ title, userEmail, userName }: HeaderProps) {
  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 px-6">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
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
