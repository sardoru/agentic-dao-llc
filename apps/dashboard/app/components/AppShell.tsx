"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthStatus } from "./AuthStatus";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Proposals" },
  { href: "/agents", label: "Agents" },
  { href: "/members", label: "Members" },
  { href: "/treasury", label: "Treasury" },
  { href: "/contracts", label: "Contracts" },
  { href: "/guardian", label: "Guardian" },
  { href: "/compliance", label: "Compliance" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar: off-canvas drawer on mobile, fixed on desktop */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 max-w-[82%] flex-col border-r border-border bg-surface transition-transform duration-200 md:w-56 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-6">
          <div>
            <div className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
              Wyoming DAO LLC
            </div>
            <div className="text-sm font-semibold leading-tight text-ink">Agentic DAO</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-xs text-muted">Base Sepolia</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="-mr-1 flex h-7 w-7 items-center justify-center rounded text-muted hover:text-ink md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex items-center border-l-2 px-5 py-2.5 text-sm transition-colors ${
                isActive(href)
                  ? "border-accent bg-surface-2 text-ink"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border px-5 py-4">
          <div className="font-mono text-xs text-muted">testnet · read-only</div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-56">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-canvas/80 px-4 py-3 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:text-ink md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-ink md:hidden">Agentic DAO</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <AuthStatus />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
