import Link from "next/link";

const links = [
  { href: "/auth/login", label: "Sign in" },
  { href: "/auth/signup", label: "Get started" },
  { href: "#", label: "Documentation" },
  { href: "#", label: "Changelog" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              D
            </div>
            <span className="text-sm font-medium">Deowi</span>
          </div>
          <nav className="flex gap-6">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Deowi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
