"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useSession } from "../../lib/auth/AuthProvider";
import { ConnectWallet } from "../../components/ConnectWallet";

type Method = "wallet" | "magic-link" | "passkey";

const METHODS: { id: Method; label: string }[] = [
  { id: "wallet", label: "Wallet" },
  { id: "magic-link", label: "Email link" },
  { id: "passkey", label: "Passkey" },
];

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const { isConnected } = useAccount();
  const { status, signInWithWallet, signingIn, error, clearError } = useSession();

  const [method, setMethod] = useState<Method>("wallet");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  async function tryStub(path: string, body: Record<string, unknown>) {
    setNote(null);
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { enable?: string; error?: string };
      setNote(j.enable ?? j.error ?? "Not available yet.");
    } catch {
      setNote("Not available yet.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            Wyoming DAO LLC
          </div>
          <h1 className="mt-1 text-xl font-semibold text-ink">Sign in to Agentic DAO</h1>
          <p className="mt-2 text-sm text-muted">
            Authenticate to access the governance dashboard. Members and the guardian sign in with
            the wallet that holds their on-chain identity.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          {/* Method tabs */}
          <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMethod(m.id);
                  setNote(null);
                  clearError();
                }}
                className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                  method === m.id ? "bg-accent text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method === "wallet" && (
            <div className="space-y-3">
              <ConnectWallet />
              <button
                onClick={() => void signInWithWallet()}
                disabled={!isConnected || signingIn}
                className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/80 disabled:opacity-50"
              >
                {signingIn ? "Check your wallet…" : "Sign in with Ethereum"}
              </button>
              <p className="text-center text-xs text-muted">
                {isConnected
                  ? "You'll sign a message (free, no transaction) to prove ownership."
                  : "Connect a wallet, then sign in."}
              </p>
              {error && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}
            </div>
          )}

          {method === "magic-link" && (
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                onClick={() => void tryStub("/api/auth/magic-link", { email })}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-3"
              >
                Send magic link
              </button>
              <p className="text-center text-xs text-muted">Email sign-in (configure to enable).</p>
            </div>
          )}

          {method === "passkey" && (
            <div className="space-y-3">
              <button
                onClick={() => void tryStub("/api/auth/passkey", {})}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-3"
              >
                Sign in with a passkey
              </button>
              <p className="text-center text-xs text-muted">
                WebAuthn passkeys (configure to enable).
              </p>
            </div>
          )}

          {note && (
            <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
              {note}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Testnet (Base Sepolia). Signing in never authorizes a transaction.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
