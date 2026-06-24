import Link from "next/link";
import { fetchAgents } from "../lib/client";
import { formatAddress } from "../lib/utils";
import { MandateHashWarning } from "../components/MandateHashWarning";

export default async function AgentsPage() {
  const agents = await fetchAgents();

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink mb-1">Registered Agents</h1>
        <p className="text-sm text-muted">
          {agents.length} agents · On-chain mandate hashes verified against IPFS documents
        </p>
      </div>

      <div className="space-y-4">
        {agents.map((agent) => (
          <div
            key={agent.address}
            className="bg-surface-2 border border-border rounded-lg p-5 space-y-4"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-accent-2 text-sm">
                    {formatAddress(agent.address)}
                  </span>
                  <span className="text-xs text-muted">({agent.agentId})</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                      agent.active
                        ? "text-success border-success/40 bg-success/10"
                        : "text-muted border-border bg-surface-3"
                    }`}
                  >
                    {agent.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  Principal:{" "}
                  <span className="text-ink">
                    {agent.principalName ?? formatAddress(agent.principal)}
                  </span>{" "}
                  <span className="font-mono text-muted/60">
                    ({formatAddress(agent.principal)})
                  </span>
                </div>
              </div>
              <Link
                href={`/?agent=${agent.address}`}
                className="text-xs text-accent hover:underline shrink-0"
              >
                View proposals →
              </Link>
            </div>

            {/* Mandate hash warning */}
            <MandateHashWarning mismatch={agent.mandateHashMismatch} />

            {/* Mandate info */}
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-muted w-24 shrink-0">Mandate URI</span>
                <a
                  href={agent.mandateURI.replace("ipfs://", "https://ipfs.io/ipfs/")}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-accent hover:underline truncate"
                >
                  {agent.mandateURI}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted w-24 shrink-0">Mandate hash</span>
                <span className="font-mono text-muted/80 truncate">
                  {agent.mandateHash}
                </span>
              </div>
            </div>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-2">
              {agent.proposalTypes.map((pt) => (
                <span
                  key={pt}
                  className="text-xs font-mono bg-surface-3 text-muted/80 px-2 py-0.5 rounded"
                >
                  {pt}
                </span>
              ))}
              {agent.canPropose && (
                <span className="text-xs font-mono bg-accent/10 text-accent-2 px-2 py-0.5 rounded">
                  can-propose
                </span>
              )}
              {agent.canVote && (
                <span className="text-xs font-mono bg-accent/10 text-accent-2 px-2 py-0.5 rounded">
                  can-vote
                </span>
              )}
            </div>

            {/* Epoch spend */}
            {agent.epochCapUsd > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Epoch spend</span>
                  <span>
                    ${agent.epochSpendUsd.toLocaleString()} /{" "}
                    ${agent.epochCapUsd.toLocaleString()} USDC
                  </span>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (agent.epochSpendUsd / agent.epochCapUsd) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
