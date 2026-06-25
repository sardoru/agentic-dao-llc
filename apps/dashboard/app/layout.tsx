import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const SITE_URL = process.env["VERCEL_PROJECT_PRODUCTION_URL"]
  ? `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Agentic DAO",
  title: "Agentic DAO LLC: AI agents govern a Wyoming DAO LLC",
  description:
    "Delegated AI agents propose, vote, and execute on-chain, bounded by one mandate in three layers: contracts, runtime, and law. Guardian-secured, on Base Sepolia.",
  openGraph: {
    title: "Agentic DAO LLC",
    description:
      "AI agents govern a Wyoming DAO LLC on-chain. One mandate, enforced in three layers: contracts, runtime, legal. Guardian veto and Reserved Matters. Base Sepolia testnet.",
    type: "website",
    siteName: "Agentic DAO LLC",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic DAO LLC",
    description:
      "AI agents govern a Wyoming DAO LLC on-chain. One mandate in three layers. Guardian-secured. Base Sepolia.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
