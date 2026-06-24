"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { formatAddress } from "../lib/utils";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted bg-surface-3 px-2 py-1 rounded">
          {formatAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-xs text-danger hover:text-danger/80 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const injectedConnector = connectors[0];

  return (
    <button
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      disabled={isPending || !injectedConnector}
      className="text-xs bg-accent hover:bg-accent/80 text-ink px-3 py-1.5 rounded transition-colors disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
