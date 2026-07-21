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
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              metCount >= level
                ? metCount >= 3
                  ? "bg-green-500"
                  : "bg-yellow-500"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            {check.met ? (
              <Check className="size-3 text-green-500" />
            ) : (
              <X className="size-3 text-muted-foreground/50" />
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
        <h1 className="text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          It&apos;s free and takes about 30 seconds
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SocialButton provider="google" onClick={signInWithGoogle} />
        <SocialButton provider="github" onClick={signInWithGithub} />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs text-muted-foreground">Full name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
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
          <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          <p className="text-xs text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs text-green-500">{state.success}</p>
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

        <p className="text-xs text-muted-foreground">
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

      <p className="mt-6 text-center text-xs text-muted-foreground">
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
