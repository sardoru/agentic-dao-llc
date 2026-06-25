import Link from "next/link";
import { fetchTreasury } from "../lib/client";
import { formatAddress, formatBigInt, formatTimestamp } from "../lib/utils";

const BASESCAN = "https://sepolia.basescan.org/tx/";

export default async function TreasuryPage() {
  const treasury = await fetchTreasury();
  const spendPct = Math.min(
    100,
    Math.round((treasury.weeklySpentUsd / treasury.weeklyCapUsd) * 100),
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink mb-1">Treasury</h1>
        <p className="text-sm text-muted">
          Total value:{" "}
          <span className="text-ink font-semibold">${treasury.totalValueUsd.toLocaleString()}</span>{" "}
          · Treasury Safe owned by TimelockController
        </p>
      </div>

      {/* Balances */}
      <section className="mb-8">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Balances</h2>
        <div className="bg-surface-2 border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left px-4 py-2.5 font-normal">Token</th>
                <th className="text-left px-4 py-2.5 font-normal">Address</th>
                <th className="text-right px-4 py-2.5 font-normal">Balance</th>
                <th className="text-right px-4 py-2.5 font-normal">USD Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {treasury.balances.map((b) => (
                <tr key={b.token}>
                  <td className="px-4 py-3 text-ink font-semibold">{b.symbol}</td>
                  <td className="px-4 py-3 font-mono text-muted">
                    {b.token === "0x0000000000000000000000000000000000000000"
                      ? "native"
                      : formatAddress(b.token)}
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-ink">
                    {formatBigInt(b.balance, b.decimals)} {b.symbol}
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-ink">
                    ${b.valueUsd.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Weekly spend vs cap */}
      <section className="mb-8">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
          Weekly Spend vs. Cap
        </h2>
        <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>${treasury.weeklySpentUsd.toLocaleString()} spent this epoch</span>
            <span>${treasury.weeklyCapUsd.toLocaleString()} weekly cap</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${spendPct >= 90 ? "bg-danger" : spendPct >= 70 ? "bg-warn" : "bg-accent"}`}
              style={{ width: `${spendPct}%` }}
            />
          </div>
          <div className="text-xs text-muted">{spendPct}% of weekly cap consumed</div>
        </div>
      </section>

      {/* Recent spends */}
      <section>
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
          Recent Executed Spends
        </h2>
        <div className="bg-surface-2 border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left px-4 py-2.5 font-normal">Date</th>
                <th className="text-left px-4 py-2.5 font-normal">To</th>
                <th className="text-left px-4 py-2.5 font-normal">Amount</th>
                <th className="text-left px-4 py-2.5 font-normal">Proposal</th>
                <th className="text-left px-4 py-2.5 font-normal">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {treasury.recentSpends.map((spend) => (
                <tr key={spend.id} className="hover:bg-surface-3 transition-colors">
                  <td className="px-4 py-2.5 text-muted">{formatTimestamp(spend.executedAt)}</td>
                  <td className="px-4 py-2.5 font-mono text-muted">{formatAddress(spend.to)}</td>
                  <td className="px-4 py-2.5 font-mono text-ink">
                    {formatBigInt(spend.amount, spend.symbol === "USDC" ? 6 : 18)} {spend.symbol}
                    <span className="text-muted ml-1">(${spend.amountUsd})</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/proposals/${spend.proposalId}`}
                      className="text-accent hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <a
                      href={`${BASESCAN}${spend.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-2 hover:underline font-mono"
                    >
                      {spend.txHash.slice(0, 10)}…
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
