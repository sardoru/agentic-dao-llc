"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { formatAddress } from "../lib/utils";

// Lists every configured wagmi connector (injected / Coinbase / WalletConnect when
// enabled). Connection only — the SIWE signature that authenticates happens after,
// in the login page via useSession().signInWithWallet().
export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
        <span className="font-mono text-xs text-ink">{formatAddress(address)}</span>
        <button
          onClick={() => disconnect()}
          className="text-xs text-danger hover:text-danger/80 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Dedupe by name (a browser can expose several injected providers).
  const seen = new Set<string>();
  const list = connectors.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  return (
    <div className="space-y-2">
      {list.map((c) => (
        <button
          key={c.uid}
          onClick={() => connect({ connector: c })}
          disabled={isPending}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-ink hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          <span>{c.name}</span>
          <span className="text-xs text-muted">Connect</span>
        </button>
      ))}
      {isPending && <p className="text-xs text-muted">Connecting…</p>}
    </div>
  );
}
