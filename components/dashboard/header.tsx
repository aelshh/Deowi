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

type HeaderProps = {
  title: string;
  userEmail?: string;
  userName?: string;
};

export function Header({ title, userEmail, userName }: HeaderProps) {
  const initial = (userName || userEmail || "U").charAt(0).toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b-2 border-primary px-6">
      <h1 className="font-heading text-base font-semibold uppercase tracking-tight">{title}</h1>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 p-1 transition-colors hover:bg-muted">
            <Avatar className="size-7">
              <AvatarFallback className="bg-accent text-accent_foreground text-xs font-mono shadow-[2px_2px_0_0_#0A0A0A]">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <div className="border-b-2 border-primary px-2 py-1.5">
              <p className="truncate text-xs text-muted_foreground">
                {userEmail}
              </p>
            </div>
            <DropdownMenuItem
              onClick={signOut}
              className="gap-2 font-mono text-xs uppercase tracking-[0.1em] text-muted_foreground focus:text-destructive"
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
