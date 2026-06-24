"use client";

import Link from "next/link";
import { useSession } from "../lib/auth/AuthProvider";
import { formatAddress } from "../lib/utils";

// Header widget: shows the signed-in identity (address + role chips) or a sign-in
// link. Reflects the SIWE session, not just wallet connection.
export function AuthStatus() {
  const { session, status, signOut } = useSession();

  if (status === "loading") {
    return <span className="text-xs text-muted">…</span>;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded bg-accent px-3 py-1.5 text-xs text-ink transition-colors hover:bg-accent/80"
      >
        Sign in
      </Link>
    );
  }

  const roleChips = session.roles.filter((r) => r !== "connected");

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-surface-3 px-2 py-1 font-mono text-xs text-ink">
        {formatAddress(session.address)}
      </span>
      {roleChips.map((r) => (
        <span
          key={r}
          className="rounded border border-accent/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent"
        >
          {r}
        </span>
      ))}
      <button
        onClick={() => void signOut()}
        className="text-xs text-danger transition-colors hover:text-danger/80"
      >
        Sign out
      </button>
    </div>
  );
}
