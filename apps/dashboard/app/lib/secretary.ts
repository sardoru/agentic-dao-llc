// Secretary-01 — the Working Committee DAO's public AI scribe.
// Server-only. Reads the public on-chain/governance facts and asks Claude to
// produce a plain-language public briefing ("minutes"). Degrades gracefully to a
// curated static briefing when ANTHROPIC_API_KEY is not configured.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS, CONTRACTS, CHAIN } from "./deployment";
import type { ParsedProposal } from "./store";

export interface BriefingSection {
  title: string;
  body: string;
}

export interface Briefing {
  /** true = generated live by Claude; false = static fallback (key not configured). */
  live: boolean;
  generatedAt: string;
  model: string | null;
  headline: string;
  summary: string;
  sections: BriefingSection[];
  minutes: string;
}

const MODEL = process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-6";

function governanceFacts(): string {
  const agents = AGENTS.map(
    (a) =>
      `- ${a.id} (${a.kind}): ${a.summary} Status: ${a.status}.${a.cap ? ` Spending cap: ${a.cap}.` : " No spending authority."}`,
  ).join("\n");
  const contracts = CONTRACTS.map((c) => `- ${c.name}: ${c.role}`).join("\n");
  return `THE WORKING COMMITTEE DAO (proposal CGP-001)
A separate, ring-fenced sandbox sub-entity of CougarDAO, deployed on ${CHAIN.name} (chain ${CHAIN.id}) — testnet only. It exists to prove, at low stakes, whether AI agents can help operate a DAO before any adoption in CougarDAO proper. It holds only a small operating float; it can never touch CougarDAO's real property, treasury, or the $COUG token (a "Reserved Matter" called RM-PILOT-002 forbids it at the protocol level).

GOVERNANCE MODEL — one mandate, enforced in three layers:
1. Smart contracts (caps + allow-lists revert on-chain).
2. The agent runtime (a policy engine re-checks every action before it is signed; simulation-first).
3. The legal operating agreement (a Reserved Matters schedule).
Constitutional separation: the Governor (where agents vote) holds NO admin roles; a human Guardian multisig holds them all, plus a veto (a ~15-minute timelock cancel window on testnet) and a kill switch. Voting is equal-weight (one member = one vote), and a committee vote is only valid if at least 60% of members participate (the quorum) — a high participation bar so no small, unrepresentative subset can act for the committee. Crucially, the Working Committee is only a FILTER: its agents draft, vet, and forward proposals, but it cannot bind CougarDAO. Binding approval of anything material is escalated to the parent DAO, where the token-weighted majority of $COUG holders decides. Reserved Matters (changing the guardian set, caps, mandates, membership, dissolution, etc.) can never be effected by agents or ordinary committee proposals — only the parent DAO's human supermajority.

THE COMMITTEE AGENTS (registered on-chain in the AgentRegistry; each bound to a machine-readable mandate hash):
${agents}

DEPLOYED CONTRACTS (all verified on Basescan and mirrored on Sourcify — source is public):
${contracts}

CURRENT STATE: The contracts are deployed and verified. All four agents are registered; OPS-01 and TREAS-01 are activated with their spending caps. The pilot has not yet processed live member proposals — it is in the setup/probation phase. Remaining steps include delegating voting weight to the agents and pinning the agent mandate documents to IPFS.`;
}

const SYSTEM = `You are Secretary-01, the public scribe of the Working Committee DAO — a ring-fenced testnet sandbox where delegated AI agents help govern, bounded by one mandate enforced in three layers, under a human Guardian veto. Your role is to explain the DAO's governance to members and the public in clear, accurate, neutral, and accessible language, and to keep public "minutes." This is a "building in public" project, so transparency and plain-spoken clarity matter most. Never invent facts, addresses, numbers, or events that are not in the provided context. If something has not happened yet (e.g. no live proposals), say so plainly. Always return your briefing by calling the publish_briefing tool.`;

const BRIEFING_TOOL = {
  name: "publish_briefing",
  description: "Publish the public governance briefing for the Working Committee DAO.",
  input_schema: {
    type: "object" as const,
    properties: {
      headline: { type: "string", description: "A short, plain-language headline." },
      summary: { type: "string", description: "2-3 sentence plain-language summary." },
      sections: {
        type: "array",
        description:
          "4-5 sections covering: how the DAO is governed; the agents; how proposals/votes/quorum/the guardian veto work; the current state; what to watch.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string", description: "2-3 short paragraphs." },
          },
          required: ["title", "body"],
        },
      },
      minutes: {
        type: "string",
        description: "A short minutes-style entry summarizing today's status.",
      },
    },
    required: ["headline", "summary", "sections", "minutes"],
  },
};

function staticFallback(): Briefing {
  return {
    live: false,
    generatedAt: new Date().toISOString(),
    model: null,
    headline: "Minutes of the Working Committee DAO",
    summary:
      "A ring-fenced testnet sandbox where AI agents help operate a DAO, bounded by one mandate enforced in three layers, under a human guardian veto. The contracts are deployed and verified; the four committee agents are registered, with OPS-01 and TREAS-01 activated.",
    sections: [
      {
        title: "How this DAO is governed",
        body: "Every agent is bound by a machine-readable mandate, enforced in three independent places: the smart contracts (caps and allow-lists revert on-chain), the agent runtime (a policy engine re-checks every action before it is signed), and the legal operating agreement. A human Guardian holds a veto and a kill switch, and the place where agents vote holds none of the admin keys.",
      },
      {
        title: "The committee agents",
        body: "OPS-01 pays the committee's own bills within a $500/$2,000 USDC cap. TREAS-01 rebalances the float within $1,000/$5,000. GOV-01 drafts proposals and votes on routine matters. DILIGENCE-01 is read-only — it watches risk and drafts memos. None of them can touch CougarDAO's real assets.",
      },
      {
        title: "How proposals, votes & quorum work",
        body: "The Working Committee is a filter, not the final authority: its agents draft and vet proposals, but binding approval of anything material rests with the parent DAO — the token-weighted majority of CougarDAO's $COUG holders. Within the committee, a vote is only valid if at least 60% of members participate (the quorum), so no small, unrepresentative subset can advance a proposal on the committee's behalf. A passing proposal is queued in a timelock, giving the Guardian a window to veto, before anything executes. Reserved Matters — like changing the guardian or the agents' caps — can never be done by the committee at all; they require the parent DAO's human supermajority.",
      },
      {
        title: "Where things stand",
        body: "The contracts are deployed on Base Sepolia and the source is verified on Basescan and Sourcify. All four agents are registered on-chain; OPS-01 and TREAS-01 are activated. The pilot has not yet processed live member proposals — it is in its setup phase.",
      },
    ],
    minutes:
      "Setup phase. Contracts deployed + verified; four agents registered; two operational agents activated with caps. Awaiting voting delegation and the first live proposals.",
  };
}

async function generate(apiKey: string): Promise<Briefing> {
  const client = new Anthropic({ apiKey });
  const prompt = `Context:\n${governanceFacts()}\n\nWrite a public governance briefing for an intelligent but non-technical reader. Cover, across 4-5 sections: how this DAO is governed; the committee agents and what each may do; how proposals, votes, quorum, and the guardian veto work; the current state of the pilot; and what to watch next. Keep each section to 2-3 short paragraphs. Be accurate to the context and candid that this is an early testnet experiment. Return the briefing via the publish_briefing tool.`;

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    tools: [BRIEFING_TOOL],
    tool_choice: { type: "tool", name: "publish_briefing" },
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Secretary: no tool_use in response");
  const parsed = block.input as Omit<Briefing, "live" | "generatedAt" | "model">;
  return {
    live: true,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    headline: parsed.headline,
    summary: parsed.summary,
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    minutes: parsed.minutes,
  };
}

export async function getSecretaryBriefing(): Promise<Briefing> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return staticFallback();
  try {
    return await generate(apiKey);
  } catch {
    // Any API / parse error → never break the page; show the curated briefing.
    return staticFallback();
  }
}

// ── Proposal intake — Secretary parses an agent's request into a machine-ingestible form ──

const SYSTEM_PARSE = `You are Secretary-01, the scribe of the Working Committee DAO. Approved committee agents submit proposal requests; you parse each into a faithful, normalized, machine-ingestible structure the other approved agents can consume. Be accurate and conservative: never invent specifics (amounts, addresses, targets) the request did not state. Flag anything that would touch a Reserved Matter — those can never be effected by agents. Always record your parse via the record_proposal tool.`;

const PARSE_TOOL = {
  name: "record_proposal",
  description:
    "Record a normalized, machine-ingestible parse of a committee agent's proposal request.",
  input_schema: {
    type: "object" as const,
    properties: {
      proposalType: {
        type: "string",
        enum: ["OPERATING_EXPENSE", "TREASURY_PAYMENT", "PARAM_TUNE_NONRESERVED", "TEXT_SIGNAL"],
      },
      title: { type: "string", description: "A short title for the proposal." },
      summary: { type: "string", description: "1-2 sentence plain-language summary." },
      targets: {
        type: "array",
        items: { type: "string" },
        description:
          "On-chain contract addresses the proposal would call; [] for a text-only signal.",
      },
      action: {
        type: "string",
        description: "A concise machine-readable description of the on-chain action.",
      },
      estimatedValueUsd: {
        type: ["number", "null"],
        description: "Estimated USD value moved, or null if none/unknown.",
      },
      reservedMatter: {
        type: "boolean",
        description:
          "True if this would touch a Reserved Matter (guardian set, caps, mandates, membership, voting params, upgrades, dissolution, or any CougarDAO production asset/$COUG) — which agents can never effect.",
      },
      reservedMatterReason: { type: ["string", "null"] },
      rationale: {
        type: "string",
        description: "Why the proposal is being made (faithful to the request).",
      },
    },
    required: [
      "proposalType",
      "title",
      "summary",
      "targets",
      "action",
      "estimatedValueUsd",
      "reservedMatter",
      "reservedMatterReason",
      "rationale",
    ],
  },
};

export type ParseResult = { ok: true; parsed: ParsedProposal } | { ok: false; error: string };

export async function parseProposalRequest(rawRequest: string): Promise<ParseResult> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey)
    return { ok: false, error: "Secretary is not configured (ANTHROPIC_API_KEY missing)." };
  try {
    const client = new Anthropic({ apiKey });
    const prompt = `Governance context (for grounding only):\n${governanceFacts()}\n\nAn approved committee agent submitted this proposal request:\n"""\n${rawRequest}\n"""\n\nParse it into a normalized, machine-ingestible structure for the other approved agents. Classify the proposalType, capture targets/action/value faithfully, and flag any Reserved Matter. Record it via the record_proposal tool.`;
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PARSE,
      tools: [PARSE_TOOL],
      tool_choice: { type: "tool", name: "record_proposal" },
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use")
      return { ok: false, error: "Parse produced no result." };
    return { ok: true, parsed: block.input as ParsedProposal };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Parse failed." };
  }
}
