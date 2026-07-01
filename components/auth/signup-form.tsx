"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SocialButton } from "@/components/auth/social-button";
import {
  signUpWithEmail,
  signInWithGoogle,
  signInWithGithub,
} from "@/actions/auth-actions";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import Link from "next/link";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Letter", met: /[a-zA-Z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special char", met: /[^a-zA-Z0-9]/.test(password) },
  ];
  const metCount = checks.filter((c) => c.met).length;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 transition-colors ${
              metCount >= level
                ? metCount >= 3
                  ? "bg-accent"
                  : "bg-accent/60"
                : "bg-border"
            }`}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center gap-1.5 font-mono text-xs text-muted_foreground"
          >
            {check.met ? (
              <Check className="size-3 text-accent" />
            ) : (
              <X className="size-3 text-muted_foreground/50" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpWithEmail, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold uppercase tracking-tight">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted_foreground">
          It&apos;s free and takes about 30 seconds
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SocialButton provider="google" onClick={signInWithGoogle} />
        <SocialButton provider="github" onClick={signInWithGithub} />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-primary" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted_foreground font-mono uppercase tracking-[0.1em]">
            or continue with email
          </span>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-mono text-xs uppercase tracking-[0.1em]">Full name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="font-mono text-xs uppercase tracking-[0.1em]">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="font-mono text-xs uppercase tracking-[0.1em]">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted_foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {password && <PasswordStrength password={password} />}
        </div>

        {state?.error && (
          <p className="text-xs font-mono text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs font-mono text-accent">{state.success}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="font-mono text-xs text-muted_foreground">
          By creating an account, you agree to our{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.1em] text-muted_foreground">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
