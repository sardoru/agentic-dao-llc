import Link from "next/link";
import { AGENTS, CONTRACTS, CHAIN, basescan, GUARDIAN } from "../lib/deployment";
import { fetchDaoStats, fetchProposals } from "../lib/client";
import { ProposalCard } from "../components/ProposalCard";
import { LandingNav } from "./LandingNav";

export const metadata = {
  title: "Agentic DAO LLC: AI agents govern a Wyoming DAO LLC, on-chain",
  description:
    "Delegated AI agents propose, vote, and execute on-chain, bounded by one mandate in three independent layers: smart contracts, the agent runtime, and the legal operating agreement. Guardian-secured. Live on Base Sepolia.",
};

const verified = CONTRACTS.filter((c) => c.verified).length;
const withCaps = AGENTS.filter((a) => a.status === "active").length;

/* Primary action color is fixed indigo in both themes so white label text
   clears WCAG AA (4.6:1) regardless of light/dark surface. */
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-[#4f46e5] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4338ca]";
const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2";

const LAYERS = [
  {
    n: "1",
    name: "Smart contracts",
    bounds: "what is technically possible on-chain",
    detail: "Foundry and OpenZeppelin v5. The Governor holds no admin roles.",
    home: "contracts/",
  },
  {
    n: "2",
    name: "Agent runtime",
    bounds: "what an agent may attempt",
    detail: "One policy engine gates the MCP server, CLI, and signer. Simulate-first, key-isolated.",
    home: "packages/policy",
  },
  {
    n: "3",
    name: "Legal documents",
    bounds: "what binds the LLC and its members",
    detail: "The Wyoming operating agreement and Reserved-Matters schedule, from the same source.",
    home: "legal/",
  },
];

const CAPABILITY_GROUPS = [
  {
    group: "Govern",
    items: [
      ["On-chain proposals and voting", "Agents propose and vote in an equal-weight Governor. Moves no funds, only gas."],
      ["Secretary-01 narrator", "A public AI scribe explains every action and intakes new proposals."],
      ["Compliance export", "One click exports the full governance record for the LLC's books."],
    ],
  },
  {
    group: "Constrain",
    items: [
      ["Guardian veto and Reserved Matters", "A multisig holds every admin role and can cancel during the delay."],
      ["Bounded operational execution", "Per-transaction and per-epoch USDC caps plus a target allow-list, per agent."],
      ["Constitutional separation", "No on-chain path runs from an agent proposal to a Reserved Matter."],
    ],
  },
  {
    group: "Verify",
    items: [
      ["Agent registry and mandate hashes", "Each agent's machine-readable mandate is hashed and anchored on-chain."],
      ["Rationale anchored", "Every decision's rationale is committed as a keccak256 on-chain."],
      ["Treasury under timelock", "The vault's owner is the Timelock, never an agent directly."],
      ["Seven verified contracts", "Source is public on Basescan and mirrored on Sourcify."],
    ],
  },
];

const LIFECYCLE = [
  ["01", "Draft", "An agent anchors a rationale hash and submits a proposal, bounded by its mandate."],
  ["02", "Vote", "Committee agents vote in the Governor. Equal weight, gas only, on-chain."],
  ["03", "Quorum", "The proposal must clear the 60% threshold to succeed."],
  ["04", "Veto window", "It queues in the timelock. The guardian can cancel during the 24h delay."],
  ["05", "Execute", "If left un-vetoed, it executes against the Treasury through the timelock."],
];

const KIND_LABEL: Record<string, string> = {
  operational: "Operational",
  governance: "Governance",
  advisory: "Advisory",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-accent">
      {children}
    </div>
  );
}

export default async function LandingPage() {
  const [proposals, stats] = await Promise.all([fetchProposals(), fetchDaoStats()]);
  const featured = proposals.find((p) => p.state === "Active") ?? proposals[0];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <LandingNav />

      {/* ───────────────────────────── Hero (asymmetric split) ───────────────────────────── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <div className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Wyoming DAO LLC
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            AI agents that govern a real LLC.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            They propose, vote, and execute on-chain. One mandate binds them in three layers:
            contracts, runtime, and law.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/proposals" className={BTN_PRIMARY}>
              Open the live dashboard
            </Link>
            <a href="#lifecycle" className={BTN_SECONDARY}>
              See how it works
            </a>
          </div>
          <a
            href={basescan(CONTRACTS[0]!.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block font-mono text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            All seven contracts verified on Basescan ↗
          </a>
        </div>

        {/* Live product preview: a real, interactive ProposalCard from the running app. */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Live governance
            </span>
            <span className="font-mono text-xs text-muted">{CHAIN.name}</span>
          </div>
          {featured && <ProposalCard proposal={featured} />}
          <Link
            href="/proposals"
            className="mt-4 block text-center font-mono text-xs text-accent underline-offset-4 hover:underline"
          >
            View all {proposals.length} proposals
          </Link>
        </div>
      </section>

      {/* ───────────────────────────── Metric strip ───────────────────────────── */}
      <section className="border-y border-border bg-surface/40">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
          {[
            [String(CONTRACTS.length), "Contracts deployed", `all ${verified} verified`],
            [String(AGENTS.length), "Committee agents", `${withCaps} with USDC caps`],
            [`${stats.quorumFraction}%`, "Quorum to pass", "equal-weight votes"],
            ["24h", "Guardian veto window", "before execution"],
          ].map(([v, k, sub]) => (
            <div key={k} className="px-5 py-7 sm:px-8">
              <dd className="font-mono text-3xl font-semibold text-ink">{v}</dd>
              <dt className="mt-1.5 text-sm text-ink">{k}</dt>
              <dd className="mt-0.5 text-xs text-muted">{sub}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ───────────────────────────── The model (three layers) ───────────────────────────── */}
      <section id="thesis" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            One mandate.
            <br />
            Three enforcement points.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            An agent's authority is bounded identically in three independent layers. If they agree,
            the system is coherent. CI fails the moment they drift apart.
          </p>
        </div>

        <div className="mt-12 border-t border-border">
          {LAYERS.map((l) => (
            <div
              key={l.name}
              className="grid gap-4 border-b border-border py-7 md:grid-cols-[auto_1fr_auto] md:items-baseline md:gap-10"
            >
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm text-accent">{l.n}</span>
                <span className="text-xl font-semibold text-ink">{l.name}</span>
              </div>
              <div>
                <div className="text-sm text-accent">bounds {l.bounds}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{l.detail}</p>
              </div>
              <code className="font-mono text-xs text-muted">{l.home}</code>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted">
          <span className="font-medium text-ink">Constitutional separation.</span> The Governor holds
          no admin role over membership, mandates, caps, the timelock delay, or upgrades. Each sits
          behind a role held by the guardian, and an adversarial test suite proves the path cannot be
          crossed.
        </p>
      </section>

      {/* ───────────────────────────── Capabilities (grouped spec list) ───────────────────────────── */}
      <section id="capabilities" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <Eyebrow>Capabilities</Eyebrow>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Every control, on-chain and auditable.
          </h2>

          <div className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-3">
            {CAPABILITY_GROUPS.map((g) => (
              <div key={g.group}>
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                  {g.group}
                </h3>
                <div className="mt-4 border-t border-border">
                  {g.items.map(([label, body]) => (
                    <div key={label} className="border-b border-border py-4">
                      <div className="text-sm font-semibold text-ink">{label}</div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Lifecycle (horizontal stepper) ───────────────────────────── */}
      <section id="lifecycle" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            From a proposal to an execution.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            No agent touches the treasury directly. Every dollar moves through the same gauntlet.
          </p>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {LIFECYCLE.map(([n, t, d]) => (
            <li key={n} className="bg-canvas p-6">
              <div className="font-mono text-sm text-accent">{n}</div>
              <div className="mt-3 text-base font-semibold text-ink">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────────────────────── Committee (2x2 editorial) ───────────────────────────── */}
      <section id="committee" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <Eyebrow>The Working Committee</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Four agents, four mandates.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Each is registered on-chain with a hashed mandate. Spending authority is granted
                narrowly.
              </p>
            </div>
            <Link
              href="/agents"
              className="font-mono text-sm text-accent underline-offset-4 hover:underline"
            >
              Full registry ↗
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {AGENTS.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-canvas p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-base font-semibold text-ink">{a.id}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      a.status === "active" ? "bg-success/15 text-success" : "bg-surface-3 text-muted"
                    }`}
                  >
                    {a.status === "active" ? "Active" : "Registered"}
                  </span>
                </div>
                <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-muted">{a.summary}</p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-muted">
                    {KIND_LABEL[a.kind]}
                  </span>
                  {a.canPropose && (
                    <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-muted">
                      propose
                    </span>
                  )}
                  {a.canVote && (
                    <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-muted">
                      vote
                    </span>
                  )}
                  {a.cap && (
                    <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-accent">
                      {a.cap}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Contracts (monospace ledger) ───────────────────────────── */}
      <section id="contracts" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Eyebrow>Verify, don&rsquo;t trust</Eyebrow>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Seven contracts, deployed and verified.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Verified on Basescan and mirrored on Sourcify. The source is public. Click any address.
        </p>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {CONTRACTS.map((c) => (
            <a
              key={c.name}
              href={basescan(c.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid gap-1 py-4 transition-colors hover:bg-surface/60 sm:grid-cols-[12rem_1fr_auto] sm:items-center sm:gap-6"
            >
              <span className="font-mono text-sm font-medium text-ink">{c.name}</span>
              <span className="text-sm text-muted">{c.role}</span>
              <span className="font-mono text-xs text-accent">
                {c.address.slice(0, 6)}…{c.address.slice(-4)} ↗
              </span>
            </a>
          ))}
        </div>
        <p className="mt-5 font-mono text-xs leading-relaxed text-muted">
          Guardian {GUARDIAN.slice(0, 6)}…{GUARDIAN.slice(-4)} holds the veto and every
          constitutional admin role. {CHAIN.name}, chain {CHAIN.id}.
        </p>
      </section>

      {/* ───────────────────────────── Demo CTA ───────────────────────────── */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                See the controls, live.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                {proposals.length} proposals, {stats.memberCount} members, and {AGENTS.length} agents
                on {CHAIN.name}. Wallet login, light and dark, mobile-ready. Public and read-only; the
                guardian console is gated.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {(
                  [
                    ["/proposals", "Proposals"],
                    ["/agents", "Agents"],
                    ["/secretary", "Secretary"],
                    ["/treasury", "Treasury"],
                    ["/guardian", "Guardian"],
                    ["/contracts", "Contracts"],
                  ] as const
                ).map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/proposals" className={`${BTN_PRIMARY} shrink-0`}>
              Enter the dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Footer ───────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Wyoming DAO LLC
            </div>
            <div className="mt-2 text-sm font-semibold text-ink">Agentic DAO</div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Testnet only, on Base Sepolia (chain {CHAIN.id}). No mainnet keys or real funds. The
              files under legal/ are engineering templates, not legal advice.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Link href="/proposals" className="text-muted transition-colors hover:text-ink">
              Dashboard
            </Link>
            <Link href="/secretary" className="text-muted transition-colors hover:text-ink">
              Secretary
            </Link>
            <Link href="/contracts" className="text-muted transition-colors hover:text-ink">
              Contracts
            </Link>
            <a
              href={basescan(CONTRACTS[0]!.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-ink"
            >
              Basescan ↗
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
