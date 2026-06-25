import { AGENTS, PRINCIPAL, GUARDIAN, basescan, CONTRACTS } from "../lib/deployment";
import { CopyAddress } from "../components/CopyAddress";
import { formatAddress } from "../lib/utils";

export const metadata = { title: "Agents — Agentic DAO LLC" };

const REGISTRY = CONTRACTS.find((c) => c.name === "AgentRegistry")!.address;

const KIND_LABEL: Record<string, string> = {
  operational: "Operational",
  governance: "Governance",
  advisory: "Advisory",
};

function Cap({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-surface-3 px-2 py-0.5 font-mono text-xs text-muted">
      {children}
    </span>
  );
}

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold text-ink">Committee Agents</h1>
        <p className="text-sm text-muted">
          {AGENTS.length} agents registered on-chain in the{" "}
          <a
            href={basescan(REGISTRY)}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            AgentRegistry
          </a>{" "}
          — each bound to a machine-readable mandate hash. Live on Base Sepolia.
        </p>
      </div>

      <div className="space-y-4">
        {AGENTS.map((agent) => {
          const active = agent.status === "active";
          return (
            <div key={agent.address} className="rounded-lg border border-border bg-surface-2 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{agent.id}</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                        active
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-accent/40 bg-accent/10 text-accent-2"
                      }`}
                    >
                      {active ? "Active" : "Registered"}
                    </span>
                    <span className="rounded-full border border-border bg-surface-3 px-2 py-0.5 text-xs text-muted">
                      {KIND_LABEL[agent.kind]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{agent.summary}</p>
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <CopyAddress address={agent.address} />
                  <a
                    href={basescan(agent.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-accent transition-colors hover:bg-surface-3"
                  >
                    Basescan
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 17 17 7M7 7h10v10" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {agent.canPropose && (
                  <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent-2">
                    can-propose
                  </span>
                )}
                {agent.canVote && (
                  <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent-2">
                    can-vote
                  </span>
                )}
                {agent.cap ? <Cap>cap {agent.cap}</Cap> : <Cap>no spending authority</Cap>}
              </div>

              {/* Mandate hash */}
              <div className="mt-3 flex items-start gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted">Mandate hash</span>
                <span className="break-all font-mono text-muted/80">{agent.mandateHash}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        All four were registered by the principal{" "}
        <span className="font-mono text-ink">{formatAddress(PRINCIPAL)}</span>; the guardian{" "}
        <span className="font-mono text-ink">{formatAddress(GUARDIAN)}</span> set the operational
        caps. OPS-01 and TREAS-01 are activated and can execute bounded USDC transfers within their
        caps; GOV-01 and DILIGENCE-01 are governance/advisory and hold no spending role.
      </p>
    </div>
  );
}
