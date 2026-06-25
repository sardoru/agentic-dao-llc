import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "./components/AppShell";

const SITE_URL = process.env["VERCEL_PROJECT_PRODUCTION_URL"]
  ? `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Agentic DAO",
  title: "Agentic DAO LLC — Governance Dashboard",
  description:
    "On-chain governance dashboard for the Wyoming Agentic DAO LLC: AI agents propose, vote, and execute — guardian-secured, on Base Sepolia.",
  openGraph: {
    title: "Agentic DAO LLC — AI-governed Wyoming DAO LLC",
    description:
      "Delegated AI agents govern on-chain, bounded by one mandate enforced in three layers (contracts · runtime · legal). Guardian veto + Reserved Matters. Base Sepolia testnet.",
    type: "website",
    siteName: "Agentic DAO LLC",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic DAO LLC — AI-governed Wyoming DAO LLC",
    description:
      "Delegated AI agents govern on-chain, bounded by one mandate in three layers. Guardian-secured. Base Sepolia.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-canvas text-ink">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
