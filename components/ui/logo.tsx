import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
      <path
        d="M10 22V10C10 8.89543 10.8954 8 12 8H14C15.1046 8 16 8.89543 16 10V22C16 23.1046 15.1046 24 14 24H12C10.8954 24 10 23.1046 10 22Z"
        fill="white"
        fillOpacity="0.35"
      />
      <rect x="10" y="12" width="3" height="8" rx="1.5" fill="white" />
      <rect x="14.5" y="9" width="3" height="14" rx="1.5" fill="white" />
      <rect x="19" y="11" width="3" height="10" rx="1.5" fill="white" fillOpacity="0.8" />
      <circle cx="24" cy="10" r="1.5" fill="white" />
      <path
        d="M22.5 13L24 11.5L25.5 13"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoIcon({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="logo-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-icon-gradient)" />
      <rect x="8" y="13" width="3" height="6" rx="1.5" fill="white" />
      <rect x="12.5" y="10" width="3" height="12" rx="1.5" fill="white" />
      <rect x="17" y="12" width="3" height="8" rx="1.5" fill="white" fillOpacity="0.8" />
      <rect x="21.5" y="14" width="3" height="4" rx="1.5" fill="white" fillOpacity="0.6" />
    </svg>
  );
}
