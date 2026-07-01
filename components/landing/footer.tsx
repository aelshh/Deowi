import Link from "next/link";

const productLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "/auth/login", label: "Sign in" },
];

const resourceLinks = [
  { href: "#", label: "Documentation" },
  { href: "#", label: "API Reference" },
  { href: "#", label: "Changelog" },
  { href: "#", label: "Status" },
];

const companyLinks = [
  { href: "#", label: "About" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Careers" },
  { href: "#", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t-2 border-primary py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center bg-primary text-xs font-bold text-primary-foreground shadow-[4px_4px_0_0_#0A0A0A]">
                D
              </div>
              <span className="text-sm font-heading font-semibold">Deowi</span>
            </Link>
            <p className="text-xs leading-relaxed text-muted_foreground">
              Turn any recording into a marketing kit. Upload once, publish
              everywhere.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-mono font-semibold uppercase tracking-[0.2em] text-foreground">
              Product
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted_foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-mono font-semibold uppercase tracking-[0.2em] text-foreground">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted_foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-mono font-semibold uppercase tracking-[0.2em] text-foreground">
              Company
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted_foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t-2 border-primary pt-6 md:flex-row">
          <p className="text-xs text-muted_foreground">
            &copy; {new Date().getFullYear()} Deowi. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="#"
              className="text-xs font-mono uppercase tracking-[0.1em] text-muted_foreground transition-colors hover:text-foreground"
            >
              Twitter
            </Link>
            <Link
              href="#"
              className="text-xs font-mono uppercase tracking-[0.1em] text-muted_foreground transition-colors hover:text-foreground"
            >
              GitHub
            </Link>
            <Link
              href="#"
              className="text-xs font-mono uppercase tracking-[0.1em] text-muted_foreground transition-colors hover:text-foreground"
            >
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
