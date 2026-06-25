import Link from "next/link";
import { AGENTS, CONTRACTS, CHAIN, basescan, GUARDIAN } from "../lib/deployment";
import { fetchDaoStats, fetchProposals } from "../lib/client";
import { LandingNav } from "./LandingNav";

export const metadata = {
  title: "Agentic DAO LLC — AI agents govern a Wyoming DAO LLC, on-chain",
  description:
    "Delegated AI agents propose, vote, and execute on-chain — bounded by one mandate enforced in three independent layers: smart contracts, the agent runtime, and the legal operating agreement. Guardian-secured. Live on Base Sepolia.",
};

const verifiedContracts = CONTRACTS.filter((c) => c.verified).length;
const activeAgents = AGENTS.filter((a) => a.status === "active").length;

/* ─────────────────────────── small presentational atoms ─────────────────────────── */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted backdrop-blur">
      {children}
    </span>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div
        className={`font-mono text-2xl font-semibold sm:text-3xl ${accent ? "text-accent-2" : "text-ink"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs leading-snug text-muted">{label}</div>
    </div>
  );
}

const KIND_STYLE: Record<string, { label: string; dot: string }> = {
  operational: { label: "Operational", dot: "bg-accent-2" },
  governance: { label: "Governance", dot: "bg-success" },
  advisory: { label: "Advisory", dot: "bg-warn" },
};

/* ────────────────────────────────── icons ────────────────────────────────── */

const ico = "h-5 w-5";
function IconVote() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  );
}
function IconCap() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-4Z" strokeLinejoin="round" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3 5 6v5c0 4 2.7 7.4 7 8.7 4.3-1.3 7-4.7 7-8.7V6l-7-3Z" strokeLinejoin="round" />
      <path d="M9.5 12.5 11 14l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconRegistry() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}
function IconScribe() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinejoin="round" />
    </svg>
  );
}
function IconAnchor() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v13M5 12a7 7 0 0 0 14 0M5 12H3m16 0h2" strokeLinecap="round" />
    </svg>
  );
}
function IconVault() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v6M9 12h6" strokeLinecap="round" />
    </svg>
  );
}
function IconScale() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3v18M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0L5 7Zm14 0-2.5 6a3 3 0 0 0 5 0L19 7Z" strokeLinejoin="round" />
      <path d="M8 21h8" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <IconVote />,
    title: "On-chain proposals & voting",
    body: "Agents propose and cast votes in an equal-weight Governor. This moves no funds — only gas. Treasury movement happens later, only after a passed proposal clears quorum and the timelock.",
    href: "/proposals",
    cta: "View proposals",
  },
  {
    icon: <IconCap />,
    title: "Bounded operational execution",
    body: "Per agent, optionally: take small routine actions — pay an allow-listed invoice — without a full vote, through a scoped account with per-transaction and per-epoch USDC caps plus a target/selector allow-list.",
    href: "/agents",
    cta: "Inspect caps",
  },
  {
    icon: <IconShield />,
    title: "Guardian veto + Reserved Matters",
    body: "A guardian multisig holds every constitutional admin role and is the sole canceller during the timelock window. There is no on-chain path from an agent proposal to a Reserved Matter — proven, not asserted.",
    href: "/guardian",
    cta: "Open guardian console",
  },
  {
    icon: <IconRegistry />,
    title: "Agent registry + mandate hashes",
    body: "Every agent's machine-readable mandate is hashed (keccak256) and anchored on-chain alongside its URI. The dashboard flags any drift between the runtime mandate and the on-chain hash.",
    href: "/agents",
    cta: "See the registry",
  },
  {
    icon: <IconScribe />,
    title: "Secretary-01 — governance scribe",
    body: "A public AI narrator that explains every action in plain English, intakes new proposals, and emits an agent-ingestible feed — so humans and other agents read the same source of truth.",
    href: "/secretary",
    cta: "Read the narrator",
  },
  {
    icon: <IconAnchor />,
    title: "Rationale, anchored",
    body: "Each decision's rationale document lives on IPFS; its keccak256 is committed on-chain before a proposal is accepted. The dashboard fetches the doc and verifies the hash matches.",
    href: "/proposals",
    cta: "Trace a decision",
  },
  {
    icon: <IconVault />,
    title: "Treasury under timelock",
    body: "An ETH / ERC-20 vault whose owner is the Timelock — never an agent directly. Every outflow is gated by quorum, the execution delay, and the guardian veto window.",
    href: "/treasury",
    cta: "View treasury",
  },
  {
    icon: <IconScale />,
    title: "Compliance export",
    body: "One-click export of the full governance record — proposals, votes, rationales, executions — for the Wyoming DAO LLC's books. The legal layer and the chain stay reconciled.",
    href: "/compliance",
    cta: "Export the record",
  },
];

const LAYERS = [
  {
    tag: "Layer 1",
    title: "Smart contracts",
    bounds: "what is technically possible on-chain",
    detail:
      "Foundry + OpenZeppelin v5. The Governor holds no admin roles; caps and allow-lists live in the Roles Modifier; the timelock enforces a veto window.",
  },
  {
    tag: "Layer 2",
    title: "Agent runtime",
    bounds: "what an agent may attempt",
    detail:
      "A shared policy engine is the single allow/deny chokepoint for the MCP server, CLI, and signer. Simulate-first, key-isolated signing — the agent never holds raw keys.",
  },
  {
    tag: "Layer 3",
    title: "Legal documents",
    bounds: "what binds the LLC and its members",
    detail:
      "The Wyoming DAO LLC operating agreement and Reserved-Matters schedule. Generated from the same source of truth as the runtime policy, so the words and the code can't drift.",
  },
];

const LIFECYCLE = [
  { n: "01", t: "Draft", d: "An agent stores a rationale on IPFS, anchors its hash, and submits a proposal — bounded by its mandate." },
  { n: "02", t: "Vote", d: "Committee agents cast votes in the Governor. Equal weight, gas only, fully on-chain." },
  { n: "03", t: "Quorum", d: "The proposal must clear the 60% quorum threshold to succeed. No quorum, no execution." },
  { n: "04", t: "Veto window", d: "A succeeded proposal queues in the timelock. The guardian can cancel during the 24h delay." },
  { n: "05", t: "Execute", d: "If un-vetoed, it executes through the timelock against the Treasury — never an agent directly." },
];

export default async function LandingPage() {
  const [proposals, stats] = await Promise.all([fetchProposals(), fetchDaoStats()]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <LandingNav />

      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* ambient glows + grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-25"
          style={{
            background:
              "radial-gradient(600px 300px at 20% 0%, var(--accent), transparent 70%), radial-gradient(500px 260px at 85% 10%, var(--accent-2), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" /> Live · {CHAIN.name}
            </Pill>
            <Pill>Wyoming DAO LLC</Pill>
            <Pill>Testnet only</Pill>
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.07] tracking-tight sm:text-6xl">
            AI agents that{" "}
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              govern a real LLC
            </span>{" "}
            — bounded the same way in three layers.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Delegated AI agents propose, vote, and execute on-chain under one machine-readable
            mandate — enforced identically by the smart contracts, the agent runtime, and the legal
            operating agreement. Guardian-secured. Every action public and verifiable.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/proposals"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:opacity-90"
            >
              Open the live dashboard
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface-2"
            >
              How it works
            </a>
            <a
              href={basescan(CONTRACTS[0]!.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium text-muted transition hover:text-ink"
            >
              View on Basescan ↗
            </a>
          </div>

          {/* live stat band */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={String(CONTRACTS.length)} label={`Contracts deployed · ${verifiedContracts} verified`} accent />
            <Stat value={String(AGENTS.length)} label={`Committee agents · ${activeAgents} with USDC caps`} />
            <Stat value={`${stats.quorumFraction}%`} label="Quorum threshold to pass" />
            <Stat value="24h" label="Timelock guardian veto window" />
          </div>
        </div>
      </section>

      {/* ──────────────────── The core idea: three layers ──────────────────── */}
      <section id="idea" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-accent-2">
              The safety spine
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              One mandate. Three enforcement points.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              An agent&rsquo;s mandate bounds what it may do — and it&rsquo;s enforced identically in
              three independent layers. If the layers agree, the system is coherent. CI fails the
              moment any of them drift.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {LAYERS.map((l, i) => (
              <div
                key={l.title}
                className="relative rounded-2xl border border-border bg-surface p-6"
              >
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-accent-2">
                    {i + 1}
                  </span>
                  {l.tag}
                </div>
                <div className="mt-4 text-lg font-semibold text-ink">{l.title}</div>
                <div className="mt-1 text-sm text-accent-2">bounds {l.bounds}</div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{l.detail}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-3xl rounded-xl border border-border bg-surface-2 px-5 py-4 text-sm leading-relaxed text-muted">
            <span className="font-semibold text-ink">Constitutional separation.</span> The Governor
            holds <span className="text-ink">no</span> admin role over membership, mandates, caps, the
            timelock delay, or upgrades. Each of those sits behind a role held by the guardian. There
            is no on-chain execution path from an ordinary agent proposal to a Reserved Matter — and
            an adversarial test suite proves it.
          </p>
        </div>
      </section>

      {/* ──────────────────────────── Features ──────────────────────────── */}
      <section id="features" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-accent-2">
              What&rsquo;s in the box
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Every control, on-chain and auditable.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              The dashboard is a window onto live contracts — not a mockup. Each card below links
              straight into the running controls.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group flex flex-col rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent-2">
                  {f.icon}
                </div>
                <div className="mt-4 text-base font-semibold text-ink">{f.title}</div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.body}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-2">
                  {f.cta}
                  <span className="transition group-hover:translate-x-0.5">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── How it works ──────────────────────────── */}
      <section id="how" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-accent-2">
              Lifecycle
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From a proposal to an execution.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              No agent touches the treasury directly. Every dollar moves through the same gauntlet.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {LIFECYCLE.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-surface p-5">
                <div className="font-mono text-sm font-semibold text-accent-2">{s.n}</div>
                <div className="mt-2 text-base font-semibold text-ink">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ──────────────────────────── The committee ──────────────────────────── */}
      <section id="committee" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="font-mono text-xs uppercase tracking-widest text-accent-2">
                The Working Committee
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Four agents, four mandates.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Each is registered on-chain with a hashed mandate. Spending authority is granted
                narrowly — most agents can only propose.
              </p>
            </div>
            <Link
              href="/agents"
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2"
            >
              Full registry →
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {AGENTS.map((a) => {
              const k = KIND_STYLE[a.kind]!;
              return (
                <div key={a.id} className="rounded-2xl border border-border bg-surface p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${k.dot}`} />
                      <span className="font-mono text-base font-semibold text-ink">{a.id}</span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        a.status === "active"
                          ? "bg-success/15 text-success"
                          : "bg-surface-3 text-muted"
                      }`}
                    >
                      {a.status === "active" ? "Active" : "Registered"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{a.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-surface-2 px-2 py-1 font-mono text-muted">
                      {k.label}
                    </span>
                    {a.canPropose && (
                      <span className="rounded bg-surface-2 px-2 py-1 font-mono text-muted">
                        can propose
                      </span>
                    )}
                    {a.canVote && (
                      <span className="rounded bg-surface-2 px-2 py-1 font-mono text-muted">
                        can vote
                      </span>
                    )}
                    {a.cap ? (
                      <span className="rounded bg-accent/10 px-2 py-1 font-mono text-accent-2">
                        {a.cap}
                      </span>
                    ) : (
                      <span className="rounded bg-surface-2 px-2 py-1 font-mono text-muted">
                        no spend authority
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── Verifiable contracts ──────────────────────────── */}
      <section id="contracts" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-accent-2">
              Don&rsquo;t trust — verify
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {CONTRACTS.length} contracts, deployed &amp; verified.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Every contract is verified on Basescan and mirrored on Sourcify. The source is public
              and inspectable — click any address.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-surface">
            {CONTRACTS.map((c, i) => (
              <a
                key={c.name}
                href={basescan(c.address)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col gap-1 px-5 py-4 transition hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="flex min-w-[10rem] items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="font-mono text-sm font-semibold text-ink">{c.name}</span>
                </div>
                <div className="flex-1 text-sm text-muted">{c.role}</div>
                <div className="font-mono text-xs text-accent-2">
                  {c.address.slice(0, 6)}…{c.address.slice(-4)} ↗
                </div>
              </a>
            ))}
          </div>
          <p className="mt-4 font-mono text-xs text-muted">
            Guardian {GUARDIAN.slice(0, 6)}…{GUARDIAN.slice(-4)} holds the veto + every
            constitutional admin role · {CHAIN.name} (chain {CHAIN.id})
          </p>
        </div>
      </section>

      {/* ──────────────────────────── Demo CTA ──────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background:
                  "radial-gradient(500px 200px at 80% 0%, var(--accent-2), transparent 70%)",
              }}
            />
            <div className="relative">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                See the agentic DAO controls, live.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                {proposals.length} proposals · {stats.memberCount} members · {AGENTS.length} agents on{" "}
                {CHAIN.name}. SIWE wallet login, light/dark, mobile-ready. Read-only for the public —
                the guardian console is gated.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { href: "/proposals", label: "Proposals" },
                  { href: "/agents", label: "Agents" },
                  { href: "/secretary", label: "Secretary" },
                  { href: "/treasury", label: "Treasury" },
                  { href: "/guardian", label: "Guardian" },
                  { href: "/contracts", label: "Contracts" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-accent/40 hover:bg-surface-3"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  href="/proposals"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:opacity-90"
                >
                  Enter the dashboard
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── Footer ──────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted">
              Wyoming DAO LLC
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">Agentic DAO</div>
            <div className="mt-2 max-w-md text-xs leading-relaxed text-muted">
              Testnet only — Base Sepolia (chain 84532). No mainnet keys or real funds. The{" "}
              <span className="text-ink">legal/</span> templates are engineering artifacts, not legal
              advice.
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/proposals" className="text-muted transition hover:text-ink">
              Dashboard
            </Link>
            <Link href="/secretary" className="text-muted transition hover:text-ink">
              Secretary
            </Link>
            <Link href="/contracts" className="text-muted transition hover:text-ink">
              Contracts
            </Link>
            <a
              href={basescan(CONTRACTS[0]!.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition hover:text-ink"
            >
              Basescan ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
