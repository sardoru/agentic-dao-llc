import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Agentic DAO LLC — Governance Dashboard",
  description:
    "On-chain governance dashboard for the Wyoming Agentic DAO LLC. Proposals, agents, principals, guardian console.",
};

const NAV_ITEMS = [
  { href: "/", label: "Proposals" },
  { href: "/agents", label: "Agents" },
  { href: "/members", label: "Members" },
  { href: "/treasury", label: "Treasury" },
  { href: "/guardian", label: "Guardian" },
  { href: "/compliance", label: "Compliance" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink min-h-screen">
        <Providers>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-40">
              <div className="px-5 py-6 border-b border-border">
                <div className="text-xs font-mono text-muted uppercase tracking-widest mb-1">
                  Wyoming DAO LLC
                </div>
                <div className="text-ink font-semibold text-sm leading-tight">
                  Agentic DAO
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-xs text-muted">Base Sepolia</span>
                </div>
              </div>
              <nav className="flex-1 py-4">
                {NAV_ITEMS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center px-5 py-2.5 text-sm text-muted hover:text-ink hover:bg-surface-2 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-5 py-4 border-t border-border">
                <div className="text-xs text-muted font-mono">
                  testnet · read-only
                </div>
              </div>
            </aside>

            {/* Main */}
            <main className="ml-56 flex-1 min-h-screen">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
