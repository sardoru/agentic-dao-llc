# Agentic DAO LLC

> A legally-wrapped (Wyoming DAO LLC, algorithmically managed) organization whose
> day-to-day governance is operated by **AI agents acting under delegated authority**
> from human members — where every agent action is bounded the same way in **three
> independent layers**.

**Testnet only.** Base Sepolia. No mainnet keys, no real funds. See [`docs/threat-model.md`](docs/threat-model.md)
and [`legal/DISCLAIMER.md`](legal/DISCLAIMER.md).

---

## The core principle: one mandate, three enforcement points

A delegated agent's **mandate** is enforced in:

| Layer | What it bounds | Where |
| --- | --- | --- |
| **Smart contracts** | what is technically possible on-chain | `contracts/` (Foundry + OZ v5) |
| **Agent runtime** | what the agent may *attempt* | `packages/policy` → `packages/mcp` + `packages/cli` + `packages/signer` |
| **Legal documents** | what binds the LLC and its members | `legal/` (templates) |

If the three agree, the system is coherent. The whole repo is built to keep them aligned —
the **Reserved Matters** in [`reserved-matters.yaml`](reserved-matters.yaml) are the single
source of truth that generates the runtime policy constants **and** the legal schedule, and
are proven against the on-chain access-control layer by adversarial tests.

Two distinct agent capabilities, never conflated:

- **Governance participation** — agents `propose` and `castVote`. Moves no funds; costs gas.
  Treasury movement only happens when a *passed* proposal executes through the timelock under
  quorum + guardian veto.
- **Bounded unilateral operational execution** (optional per agent) — small, routine actions
  (e.g. pay a recurring invoice up to a cap) via a scoped account with per-tx / per-epoch caps.

## Constitutional separation (the safety spine)

The **DaoGovernor holds no AccessControl admin role** over membership, mandates, spending
caps, the timelock delay, or upgrades. Those are gated behind roles held by the **guardian
multisig**. There is therefore *no on-chain execution path* from an ordinary agent-driven
proposal to a Reserved Matter. This is proven, not asserted — see the adversarial tests.

## Architecture

```
Humans ── delegate ──▶ Agent accounts ──┐
   │  registerAgent                      │  propose / castVote (gas only)
   ▼                                      ▼
AgentRegistry            Agent brain ▶ MCP server ─▶ Policy engine ─▶ Signer ─▶ DaoGovernor ─▶ Timelock ─▶ Treasury
(member↔agent↔mandate)        (LLM)      (chokepoint)   (shared)    (key-isolated)      ▲ guardian cancel in delay window
                                                │                                        │
                                            Simulator (sim-first)                   Guardian multisig (CANCELLER + all constitutional roles)
                                                │
                          on-chain events ─▶ Ponder indexer ─▶ Next.js dashboard ◀─ IPFS (rationale + mandate docs)
```

## Monorepo layout

```
contracts/          Foundry: MembershipToken, DaoGovernor, TimelockController,
                    AgentRegistry, RolesModifier, RationaleAnchor, Treasury + tests
packages/policy     mandate schema, canonical hashing, the policy engine  ← imported everywhere
packages/signer     policy-gated Signer (local dev impl + Turnkey/KMS stub)
packages/chain      viem clients, addresses, ABIs, contract wrappers
packages/sim        Simulator (Tenderly + anvil-fork fallback)
packages/mcp        MCP server (agent-facing governance tools; the policy chokepoint)
packages/cli        scriptable mirror of the MCP tools (same policy module)
indexer/            Ponder
apps/dashboard      Next.js dashboard + guardian console
mandates/           agent mandate JSON + JSON Schema
legal/              TEMPLATES ONLY — see DISCLAIMER
docs/               ADRs, runbook, threat model, interface contract
reserved-matters.yaml   single source of truth → policy constants + legal schedule
```

## Quickstart

```bash
# 0. toolchain: Node >= 20, pnpm 9, Foundry (forge/cast/anvil)
corepack use pnpm@9.15.0
pnpm install

# 1. generate the reserved-matters artifacts (policy constants + legal schedule)
pnpm gen:reserved

# 2. build + test the TypeScript packages
pnpm build && pnpm test

# 3. build + test the contracts
forge build  --root contracts
forge test   --root contracts -vvv

# 4. full local gate (what CI runs)
pnpm ci
```

Copy `.env.example` to `.env` and fill testnet values. The local signer is **dev-only**.

## Build phases

The system is built phase by phase (see [`docs/`](docs/) and the build spec). Acceptance
criteria for each phase live in the spec; the adversarial contract tests are the proof that
the safety properties hold and are not optional.

0. **Scaffold** — monorepo, tooling, CI, reserved-matters source of truth ✅
1. **Core governance contracts** — token, governor, timelock, registry + lifecycle tests
2. **Agent accounts + policy + adversarial tests** — caps, reserved-matter separation
3. **Indexer** — Ponder views
4. **Runtime** — MCP + CLI + signer + simulation, scripted end-to-end agent
5. **Dashboard** — all views + guardian console
6. **Testnet deploy + legal + docs**

## Safety model in one paragraph

A compromised or jail-broken agent brain **cannot extract a key** (the signer isolates it),
**cannot get a non-compliant transaction signed** (the signer re-runs the policy engine
independently), and **cannot construct a Reserved Matter** (it is not expressible in the MCP
surface and the Governor lacks the on-chain role to execute it). Worst case for a fully
compromised agent is bounded by its mandate's allow-list and spending caps, and the guardian
can cancel any queued proposal inside the timelock delay window.

## License

MIT for the code. The `legal/` templates are **not legal advice** — see the disclaimer.
