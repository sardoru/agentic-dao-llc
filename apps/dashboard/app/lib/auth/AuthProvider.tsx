"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";

export interface Session {
  address: `0x${string}`;
  chainId: number;
  roles: string[];
  method: "wallet" | "magic-link" | "passkey";
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  session: Session | null;
  status: AuthStatus;
  /** Set while the SIWE round-trip (nonce → sign → verify) is in flight. */
  signingIn: boolean;
  error: string | null;
  /** Sign in with the connected wallet via SIWE. Requires a connected account. */
  signInWithWallet: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = (await r.json()) as { session: Session | null };
      setSession(j.session);
      setStatus(j.session ? "authenticated" : "unauthenticated");
    } catch {
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInWithWallet = useCallback(async () => {
    setError(null);
    if (!isConnected || !address) {
      setError("Connect a wallet first.");
      return;
    }
    setSigningIn(true);
    try {
      const nonceRes = await fetch("/api/auth/nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = createSiweMessage({
        address,
        chainId: chainId ?? 84532,
        domain: window.location.host,
        uri: window.location.origin,
        nonce,
        version: "1",
        statement:
          "Sign in to the Agentic DAO governance dashboard. This does not authorize any transaction.",
      });

      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) {
        const e = (await verifyRes.json().catch(() => ({}))) as { error?: string };
        setError(e.error ?? "Sign-in failed.");
        return;
      }
      await refresh();
    } catch (e) {
      // User rejected the signature, or a network error.
      const msg = e instanceof Error ? e.message : "Sign-in failed.";
      setError(/rejected|denied/i.test(msg) ? "Signature request was rejected." : msg);
    } finally {
      setSigningIn(false);
    }
  }, [address, chainId, isConnected, signMessageAsync, refresh]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSession(null);
      setStatus("unauthenticated");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        status,
        signingIn,
        error,
        signInWithWallet,
        signOut,
        refresh,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used within <AuthProvider>");
  return ctx;
}
