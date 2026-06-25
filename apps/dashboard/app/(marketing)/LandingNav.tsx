"use client";

import Link from "next/link";
import { ThemeToggle } from "../components/ThemeToggle";

const ANCHORS = [
  { href: "#thesis", label: "The model" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#lifecycle", label: "Lifecycle" },
  { href: "#committee", label: "Agents" },
  { href: "#contracts", label: "Contracts" },
];

/* Brand mark: three stacked bars = the three enforcement layers. */
function Mark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4f46e5]">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#fff" strokeWidth="1.6">
        <path d="M2 4h11M2 7.5h11M2 11h11" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <Mark />
          <span className="text-sm font-semibold tracking-tight text-ink">Agentic DAO</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-6 lg:flex">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {a.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/proposals"
            className="rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4338ca]"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
