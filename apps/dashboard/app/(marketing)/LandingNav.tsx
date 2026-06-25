"use client";

import Link from "next/link";
import { ThemeToggle } from "../components/ThemeToggle";

const ANCHORS = [
  { href: "#idea", label: "Safety spine" },
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#committee", label: "Agents" },
  { href: "#contracts", label: "Contracts" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3 5 6v5c0 4 2.7 7.4 7 8.7 4.3-1.3 7-4.7 7-8.7V6l-7-3Z" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-ink group-hover:text-accent-2">
            Agentic DAO
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-5 lg:flex">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className="text-sm text-muted transition hover:text-ink">
              {a.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/proposals"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
