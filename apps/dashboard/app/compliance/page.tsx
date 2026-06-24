"use client";

import { useEffect, useState } from "react";
import type { Proposal } from "../lib/types";

export default function CompliancePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    import("../lib/client")
      .then(({ fetchProposals }) => fetchProposals())
      .then((data) => {
        setProposals(data);
        setLoaded(true);
      })
      .catch(console.error);
  }, []);

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportProposalsCsv() {
    const header = [
      "id",
      "title",
      "state",
      "proposerAgent",
      "proposerAgentId",
      "proposerPrincipal",
      "proposerPrincipalName",
      "forVotes",
      "againstVotes",
      "abstainVotes",
      "rationaleHash",
      "createdAt",
    ].join(",");
    const rows = proposals.map((p) =>
      [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`,
        p.state,
        p.proposerAgent,
        p.proposerAgentId,
        p.proposerPrincipal,
        p.proposerPrincipalName ?? "",
        p.forVotes.toString(),
        p.againstVotes.toString(),
        p.abstainVotes.toString(),
        p.rationaleHash,
        new Date(p.createdAt * 1000).toISOString(),
      ].join(","),
    );
    downloadBlob([header, ...rows].join("\n"), "dao-proposals.csv", "text/csv");
  }

  function exportVotesCsv() {
    const header = [
      "proposalId",
      "proposalTitle",
      "voterAgent",
      "agentId",
      "principal",
      "support",
      "weight",
      "reason",
      "txHash",
    ].join(",");
    const rows = proposals.flatMap((p) =>
      p.votes.map((v) =>
        [
          p.id,
          `"${p.title.replace(/"/g, '""')}"`,
          v.agentAddress,
          v.agentId,
          v.principal,
          v.support === 1 ? "For" : v.support === 0 ? "Against" : "Abstain",
          v.weight.toString(),
          `"${v.reason.replace(/"/g, '""')}"`,
          v.txHash,
        ].join(","),
      ),
    );
    downloadBlob([header, ...rows].join("\n"), "dao-votes.csv", "text/csv");
  }

  function exportExecutionsJson() {
    const executed = proposals
      .filter((p) => p.state === "Executed")
      .map((p) => ({
        id: p.id,
        title: p.title,
        state: p.state,
        proposerAgent: p.proposerAgent,
        proposerAgentId: p.proposerAgentId,
        proposerPrincipal: p.proposerPrincipal,
        decodedCalls: p.decodedCalls ?? [],
        rationaleURI: p.rationaleURI,
        rationaleHash: p.rationaleHash,
        rationaleVerified: p.rationaleVerified ?? false,
        txHash: p.txHash,
        executedAt: new Date(p.createdAt * 1000).toISOString(),
        forVotes: p.forVotes.toString(),
        againstVotes: p.againstVotes.toString(),
        abstainVotes: p.abstainVotes.toString(),
      }));
    downloadBlob(JSON.stringify(executed, null, 2), "dao-executions.json", "application/json");
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink mb-1">Compliance Export</h1>
        <p className="text-sm text-muted">
          Members have statutory inspection rights per Wyoming DAO LLC Act. Export proposals, votes,
          and execution records for the LLC&rsquo;s books.
        </p>
      </div>

      <div className="bg-surface-2 border border-border rounded-lg p-6 space-y-4">
        <div className="text-xs text-muted mb-4 font-mono">
          {loaded ? (
            <span className="text-success">✓ {proposals.length} proposals loaded</span>
          ) : (
            <span>Loading…</span>
          )}
        </div>

        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-4 p-4 bg-surface-3 rounded-lg">
            <div>
              <div className="text-sm text-ink font-medium mb-1">Proposals CSV</div>
              <div className="text-xs text-muted">
                All proposals with state, proposer agent+principal, vote tallies, and rationale
                hashes.
              </div>
            </div>
            <button
              disabled={!loaded}
              onClick={exportProposalsCsv}
              className="text-xs bg-accent/20 text-accent-2 hover:bg-accent/30 border border-accent/40 px-4 py-2 rounded transition-colors disabled:opacity-40 shrink-0"
            >
              Export CSV
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 bg-surface-3 rounded-lg">
            <div>
              <div className="text-sm text-ink font-medium mb-1">Votes CSV</div>
              <div className="text-xs text-muted">
                All votes with agent address, agent ID, principal, support direction, weight, and
                on-chain reason.
              </div>
            </div>
            <button
              disabled={!loaded}
              onClick={exportVotesCsv}
              className="text-xs bg-accent/20 text-accent-2 hover:bg-accent/30 border border-accent/40 px-4 py-2 rounded transition-colors disabled:opacity-40 shrink-0"
            >
              Export CSV
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 bg-surface-3 rounded-lg">
            <div>
              <div className="text-sm text-ink font-medium mb-1">Executions JSON</div>
              <div className="text-xs text-muted">
                Executed proposals with full decoded calls, rationale URIs, content hashes, and
                verification status.
              </div>
            </div>
            <button
              disabled={!loaded}
              onClick={exportExecutionsJson}
              className="text-xs bg-accent/20 text-accent-2 hover:bg-accent/30 border border-accent/40 px-4 py-2 rounded transition-colors disabled:opacity-40 shrink-0"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-muted border border-border rounded-lg p-3">
        <span className="text-warn font-mono">Legal:</span> These exports are derived from on-chain
        events indexed by the Ponder indexer. They are records of on-chain transactions and do not
        constitute legal advice. For statutory inspection requests, provide the raw blockchain data
        alongside these exports. Rationale hash verification requires the IPFS documents to be
        accessible at the recorded URIs.
      </div>
    </div>
  );
}
