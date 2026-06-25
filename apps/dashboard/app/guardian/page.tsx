"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { TIMELOCK_ABI } from "../lib/abis";
import type { TimelockOp } from "../lib/types";
import { formatCountdown, formatTimestamp } from "../lib/utils";
import { WalletConnect } from "../components/WalletConnect";
import { useSession } from "../lib/auth/AuthProvider";

const TIMELOCK_ADDRESS = (process.env["NEXT_PUBLIC_TIMELOCK_ADDRESS"] ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

function CancelButton({ op }: { op: TimelockOp }) {
  const { writeContract, isPending, data: txHash } = useWriteContract();

  if (txHash) {
    return (
      <div className="text-xs text-success font-mono">
        ✓ Canceled — tx:{" "}
        <a
          href={`https://sepolia.basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {txHash.slice(0, 12)}…
        </a>
      </div>
    );
  }

  return (
    <button
      disabled={isPending || op.status === "Done" || op.status === "Canceled"}
      onClick={() => {
        writeContract({
          address: TIMELOCK_ADDRESS,
          abi: TIMELOCK_ABI,
          functionName: "cancel",
          args: [op.opId as `0x${string}`],
        });
      }}
      className="text-xs bg-danger/20 text-danger hover:bg-danger/30 border border-danger/40 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
    >
      {isPending ? "Canceling…" : "Cancel"}
    </button>
  );
}

export default function GuardianPage() {
  const { isConnected } = useAccount();
  const { session } = useSession();
  const isGuardian = !!session?.roles.includes("guardian");
  const [ops, setOps] = useState<TimelockOp[]>([]);

  useEffect(() => {
    // Load fixtures client-side (server fetch not possible in "use client" page)
    import("../lib/client")
      .then(({ fetchTimelockOps }) => {
        fetchTimelockOps().then(setOps).catch(console.error);
      })
      .catch(console.error);
  }, []);

  const activeOps = ops.filter((op) => op.status === "Queued" || op.status === "Ready");

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink mb-1">Guardian Console</h1>
          <p className="text-sm text-muted">
            Monitor queued timelock operations and exercise the guardian veto during the delay
            window.
          </p>
        </div>
        <WalletConnect />
      </div>

      {!isConnected ? (
        <div className="bg-warn/10 border border-warn/40 rounded-lg px-4 py-3 mb-6 text-sm text-warn">
          Connect the guardian wallet to cancel operations.
        </div>
      ) : !isGuardian ? (
        <div className="bg-warn/10 border border-warn/40 rounded-lg px-4 py-3 mb-6 text-sm text-warn">
          This wallet is not recognized as the guardian. You can review operations, but a cancel
          will revert on-chain (only the guardian holds the CANCELLER role).
        </div>
      ) : null}

      <div className="mb-6">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
          Active Timelock Operations ({activeOps.length})
        </h2>
        {activeOps.length === 0 ? (
          <div className="text-sm text-muted">No operations currently queued.</div>
        ) : (
          <div className="space-y-3">
            {activeOps.map((op) => {
              const now = Math.floor(Date.now() / 1000);
              const ready = now >= op.eta;
              return (
                <div
                  key={op.opId}
                  className="bg-surface-2 border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-ink mb-1">{op.proposalTitle}</div>
                      <Link
                        href={`/proposals/${op.proposalId}`}
                        className="text-xs text-accent hover:underline"
                      >
                        View proposal →
                      </Link>
                    </div>
                    {isConnected && isGuardian && <CancelButton op={op} />}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs">
                    <div>
                      <span className="text-muted">Status: </span>
                      <span className={ready ? "text-success" : "text-warn"}>
                        {ready ? "Ready to execute" : "In delay window"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted">ETA: </span>
                      <span className="font-mono text-ink">{formatTimestamp(op.eta)}</span>
                    </div>
                    <div>
                      <span className="text-muted">{ready ? "Elapsed: " : "Until: "}</span>
                      <span className={ready ? "text-success" : "text-warn"}>
                        {formatCountdown(op.eta)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted font-mono truncate">opId: {op.opId}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All operations history */}
      <div>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
          All Operations
        </h2>
        <div className="bg-surface-2 border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left px-4 py-2.5 font-normal">Proposal</th>
                <th className="text-left px-4 py-2.5 font-normal">Status</th>
                <th className="text-left px-4 py-2.5 font-normal">ETA</th>
                <th className="text-left px-4 py-2.5 font-normal">Queued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ops.map((op) => (
                <tr key={op.opId} className="hover:bg-surface-3 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/proposals/${op.proposalId}`}
                      className="text-accent hover:underline"
                    >
                      {op.proposalTitle.slice(0, 50)}
                      {op.proposalTitle.length > 50 ? "…" : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        op.status === "Done"
                          ? "text-success"
                          : op.status === "Canceled"
                            ? "text-danger"
                            : op.status === "Ready"
                              ? "text-success"
                              : "text-warn"
                      }
                    >
                      {op.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">{formatTimestamp(op.eta)}</td>
                  <td className="px-4 py-2.5 text-muted">{formatTimestamp(op.queuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 text-xs text-muted">
        <span className="font-mono text-warn">Security note:</span> Only the guardian multisig holds
        the CANCELLER role on TimelockController. This interface requires a wallet connected to that
        multisig to execute cancellations.
      </div>
    </div>
  );
}
