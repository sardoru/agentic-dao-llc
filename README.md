# Agentic DAO LLC

> A legally-wrapped (Wyoming DAO LLC, algorithmically managed) organization whose
> day-to-day governance is operated by **AI agents acting under delegated authority**
> from human members — where every agent action is bounded the same way in **three
> independent layers**: the smart contracts, the agent runtime, and the legal documents.

<p>
  <img alt="status: testnet-only" src="https://img.shields.io/badge/status-testnet--only-orange">
  <img alt="chain: Base Sepolia" src="https://img.shields.io/badge/chain-Base%20Sepolia%20(84532)-blue">
  <img alt="tests: 135 passing" src="https://img.shields.io/badge/tests-135%20passing-brightgreen">
  <img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-green">
</p>

> [!WARNING]
> **Testnet only.** This repository targets **Base Sepolia (chain id 84532)**. It contains
> **no** mainnet keys, real funds, or production secrets. The local signer is a development
> convenience. Mainnet is explicitly gated on hardened key custody and an audited Roles
> Modifier — see [Mainnet gating](#mainnet-gating). The files under [`legal/`](legal/) are
> **engineering templates, not legal advice** — see [`legal/DISCLAIMER.md`](legal/DISCLAIMER.md).

---

## Table of contents

- [The core idea: one mandate, three enforcement points](#the-core-idea-one-mandate-three-enforcement-points)
- [Constitutional separation (the safety spine)](#constitutional-separation-the-safety-spine)
- [Architecture](#architecture)
- [Monorepo layout](#monorepo-layout)
- [Quickstart](#quickstart)
- [The smart contracts](#the-smart-contracts)
- [Reserved Matters](#reserved-matters)
- [The policy engine — the heart of the system](#the-policy-engine--the-heart-of-the-system)
- [The agent runtime](#the-agent-runtime)
- [Indexer & dashboard](#indexer--dashboard)
- [Testing & the adversarial safety proofs](#testing--the-adversarial-safety-proofs)
- [Command reference](#command-reference)
- [Configuration](#configuration)
- [Project status](#project-status)
- [Mainnet gating](#mainnet-gating)
- [Documentation map](#documentation-map)
- [Security model in one paragraph](#security-model-in-one-paragraph)
- [Glossary](#glossary)
- [Contributing & remaining work](#contributing--remaining-work)
- [License](#license)

---

## The core idea: one mandate, three enforcement points

A delegated agent's **mandate** — the machine-readable policy that bounds what it may do — is
enforced identically in three independent layers:

| Layer | What it bounds | Where it lives |
| --- | --- | --- |
| **Smart contracts** | what is technically *possible* on-chain | [`contracts/`](contracts/) (Foundry + OpenZeppelin v5) |
| **Agent runtime** | what the agent may *attempt* | [`packages/policy`](packages/policy) → [`mcp`](packages/mcp) · [`cli`](packages/cli) · [`signer`](packages/signer) |
| **Legal documents** | what *binds* the LLC and its members | [`legal/`](legal/) (templates) |

If the three layers agree, the system is coherent. If they drift, you get an agent that can do
things on-chain the operating agreement never authorized, or vice versa. **Every design decision
in this repo exists to keep those three aligned.** The mechanism that keeps them aligned is a
single source of truth — [`reserved-matters.yaml`](reserved-matters.yaml) — which *generates*
the runtime policy constants **and** the legal schedule, and is proven against the on-chain
access-control layer by adversarial tests. CI fails if any of the three drift.

**Two distinct agent capabilities, never conflated:**

- **Governance participation** — agents `propose` and `castVote` in the Governor. This moves no
  funds directly; it only costs gas. Treasury movement happens *later*, when a **passed**
  proposal is executed through the timelock under quorum + a guardian veto window.
- **Bounded unilateral operational execution** (optional, per agent) — an agent may take small,
  routine actions (e.g. pay a recurring invoice up to a cap) without a full vote, through a
  scoped account with **per-transaction and per-epoch spending caps** and a target/selector
  allow-list. This is where caps and allow-lists do real work.

## Constitutional separation (the safety spine)

The **`DaoGovernor` holds no `AccessControl` admin role** over membership, agent mandates,
spending caps, the timelock delay, or contract upgrades. Every one of those is gated behind a
role held by the **guardian multisig**. There is therefore **no on-chain execution path** from
an ordinary, agent-driven proposal to a *Reserved Matter* (the constitutional floor).

This is *proven, not asserted.* See [`test_RoleSeparation_GovernorHoldsNothing_GuardianHoldsAll`](contracts/test/Adversarial.t.sol)
and its siblings in [Testing](#testing--the-adversarial-safety-proofs), and
[ADR-0001](docs/adr/0001-constitutional-separation.md) for the rationale.

## Architecture

```
   Human layer                      Agent runtime (off-chain)                         On-chain (Base Sepolia)
 ┌─────────────┐                 ┌──────────────────────────────┐                  ┌──────────────────────────┐
 │  Members    │── delegate ────▶│  Agent brain (LLM, pluggable)│                  │  MembershipToken         │
 │ (soulbound  │   voting power  │        │                     │                  │  (soulbound ERC721Votes) │
 │  token)     │── registerAgent │        ▼                     │                  │           │              │
 │             │      │          │   MCP server  ──┐            │   propose/vote   │           ▼              │
 │             │      │          │   CLI         ──┤            │  ───────────────▶│  DaoGovernor             │
 │ Guardian    │      │          │                 ▼            │   (gas only)     │           │              │
 │ multisig    │      │          │          Policy engine       │                  │           ▼              │
 │ (3-of-5)    │      ▼          │          (shared package)    │                  │  GuardedTimelock         │
 └──────┬──────┘  AgentRegistry  │                 │            │                  │   (delay + veto window)  │
        │         (member↔agent  │                 ▼            │   bounded ops    │           │              │
        │          ↔mandateHash) │   Simulator   Signer ────────│  ───────────────▶│  RolesModifier ─▶ Treasury│
        │                        │  (sim-first) (key-isolated)  │                  │                          │
        │ cancel in delay window └──────────────────────────────┘                  │  AgentRegistry           │
        └──────────────────────────────────────────────────────────────────────▶  │  RationaleAnchor         │
        holds CANCELLER + ALL constitutional admin roles                           └────────────┬─────────────┘
                                                                                                │ events
                  IPFS (rationale + mandate docs) ◀── anchored hash                             ▼
                                    │                                              Ponder indexer ─▶ Next.js dashboard
                                    └──────────────────────────────────────────────────────────────────▶ (+ guardian console)
```

The canonical Mermaid version of this diagram and the full component table live in the build
spec (Section 2). The on-chain interface every layer shares is pinned in
[`docs/interfaces.md`](docs/interfaces.md).

## Monorepo layout

```
contracts/              Foundry project (Solidity ^0.8.24, OpenZeppelin v5.1.0)
  src/                  MembershipToken, DaoGovernor, GuardedTimelock, AgentRegistry,
                        RolesModifier, RationaleAnchor, Treasury
  test/                 Base / Functional / Units / Adversarial Foundry tests
  script/               Deploy.s.sol
  dependencies/         vendored OZ + forge-std (committed → builds offline)

packages/
  policy/               mandate schema, canonical keccak256 hashing, the policy engine
                        ◀── imported by mcp, cli, AND signer (the single source of allow/deny)
  signer/               policy-gated Signer (local dev impl + Turnkey/KMS stub); key isolation
  chain/                viem clients, addresses, ABIs, calldata decode, contract wrappers
  sim/                  Simulator interface (Tenderly + anvil-fork fallback)
  mcp/                  MCP server — agent-facing governance tools; the policy chokepoint
  cli/                  scriptable mirror of the MCP tools (same policy/sim/signer/chain code)

apps/dashboard/         Next.js 16 (App Router) + wagmi 3 + Tailwind v4 + guardian console
indexer/                Ponder 0.16 — indexes all events, serves the dashboard's data API
mandates/               agent mandate JSON Schema + two example mandates
legal/                  TEMPLATES ONLY — Wyoming DAO LLC artifacts (see DISCLAIMER)
docs/                   ADRs, deployment runbook, threat model, interface contract
scripts/                gen-reserved-matters.mjs (codegen + CI drift check)

reserved-matters.yaml   single source of truth → policy constants + legal schedule
BUILD_SCOPE.md          what's in/out of scope, phase delivery status, mainnet gating
```

Every package is published under the `@agentic-dao/*` workspace scope (`policy`, `chain`, `sim`,
`signer`, `mcp`, `cli`, `indexer`, `dashboard`).

## Quickstart

**Toolchain:** Node ≥ 20, pnpm 9.15.0, and [Foundry](https://book.getfoundry.sh/) (`forge`/`cast`/`anvil`).

```bash
# 0. install (lockfile is committed; contracts/dependencies are vendored)
corepack use pnpm@9.15.0
pnpm install

# 1. generate the reserved-matters artifacts (policy constants + legal schedule)
pnpm gen:reserved

# 2. build + test the TypeScript packages  (106 tests)
pnpm build && pnpm test

# 3. build + test the contracts            (29 tests, incl. 11 adversarial proofs)
forge build --root contracts --sizes
forge test  --root contracts -vvv

# 4. the full local gate — exactly what CI runs
pnpm ci
```

`pnpm ci` runs, in order: the **reserved-matters three-way invariant** (`check:reserved`),
lint, typecheck, build, and the TS test suite. The contracts job (`forge test`) runs in parallel
in CI. Copy `.env.example` → `.env` and fill testnet values before any deploy. **The local
signer is dev-only and flagged everywhere.**

## The smart contracts

Solidity `^0.8.24`, OpenZeppelin Contracts v5.1.0. Seven contracts, each with one job:

| Contract | Responsibility | Notable detail |
| --- | --- | --- |
| **`MembershipToken`** | Soulbound `ERC721Votes` — one token per member, one vote (v1) | Reverts on transfer/approval; timestamp clock; `MEMBERSHIP_ADMIN` is guardian-held |
| **`DaoGovernor`** | Proposal lifecycle, quorum, counting, routing execution to the timelock | OZ Governor stack: Settings · CountingSimple · Votes · VotesQuorumFraction · TimelockControl. Holds **no** constitutional role. |
| **`GuardedTimelock`** | Execution delay + guardian veto window | Subclasses `TimelockController` to **re-gate `updateDelay`** onto a guardian role (OZ's default self-gates on `address(this)`, which a proposal could reach). Deploy revokes timelock self-admin. |
| **`AgentRegistry`** | Binds `member ↔ agent address ↔ mandateHash ↔ mandateURI` | Members register their own agent; mandate *updates* are a Reserved Matter (`REGISTRY_ADMIN`). The on-chain anchor the legal exhibit and runtime both reference. |
| **`RolesModifier`** | Per-agent target/selector allow-list + per-tx / per-epoch spending caps | Minimal in-house stand-in for Zodiac Roles v2 (v1). `EPOCH_SECONDS = 7 days`. Config changes are a Reserved Matter (`ROLES_ADMIN`). |
| **`RationaleAnchor`** | Emits `RationaleAnchored(actionId, ipfsURI, contentHash)` | Joins on-chain actions to off-chain reasoning for the dashboard/compliance export. |
| **`Treasury`** | Holds assets; spends only via executed proposals | Owned/controlled by the timelock — funds move only through the governance path. |

> [!NOTE]
> **The Governor's authority is operational only.** It cannot grant/revoke roles, change the
> timelock delay, update a mandate, mint/burn membership, change spending caps, or upgrade a
> contract. Those paths don't exist for it — by construction, and proven by the adversarial tests.

## Reserved Matters

The **constitutional floor**: matters neither the AI agents nor the Governor can effect without
separate, explicit human action by the guardian multisig. Defined once in
[`reserved-matters.yaml`](reserved-matters.yaml), which generates the runtime constants
(`packages/policy/src/reservedMatters.generated.ts`) **and** the legal schedule
(`legal/reserved-matters-schedule.md`). CI asserts all three agree.

| # | Reserved Matter | Guardian role | Gated selector(s) |
| --- | --- | --- | --- |
| 1 | Change the guardian set / transfer any admin role | `GUARDIAN_ADMIN` | `grantRole` · `revokeRole` · `renounceRole` |
| 2 | Change the timelock minimum delay | `TIMELOCK_ADMIN` | `updateDelay` |
| 3 | Change agent spending caps or Roles config | `ROLES_ADMIN` | `setSpendingCap` · `setTargetAllowed` · `setAgentActive` |
| 4 | Change an agent mandate | `REGISTRY_ADMIN` | `updateMandate` |
| 5 | Admit / remove members (mint or burn membership) | `MEMBERSHIP_ADMIN` | `mintMembership` · `burnMembership` |
| 6 | Upgrade a constitutional contract | `UPGRADE_ADMIN` | `upgradeTo` · `upgradeToAndCall` |
| 7 | Amend articles / operating agreement / this schedule | `GUARDIAN_ADMIN` | *legal-only — no single selector* |
| 8 | Dissolve the company | `GUARDIAN_ADMIN` | *legal-only — no single selector* |

Enforced in all three layers: **on-chain** (each role is guardian-held; the Governor holds none),
**runtime** (the policy engine denies any action touching a reserved tuple; the MCP/CLI cannot
construct one), and **legal** (the schedule + code-deference carve-outs mirror this list).

## The policy engine — the heart of the system

[`packages/policy`](packages/policy) is the single source of allow/deny truth, imported by the
MCP server, the CLI, **and** the signer. Its `evaluate(mandate, action, ctx)` returns a
`Decision` after running six checks, denying on the first failure and returning the failing rule:

1. **Mandate validity** — `active` and not expired (`now < expiresAt`).
2. **Capability** — `canPropose` / `canVote` allowed for this action kind.
3. **Propose guard** — `proposalType ∈ scope.proposalTypes`; every target ∈ `allowedTargets`; no selector in the forbidden/reserved set.
4. **Op guard** — target+selector allow-listed; `amount ≤ perTx` **and** `amount + epochSpend ≤ perEpoch`.
5. **Reserved-Matter guard** — any `(target, selector)` in the reserved set → deny (`RESERVED_MATTER`).
6. **Simulation guard** — if `requireSimulation` and `!ctx.simulated` → deny (`SIMULATION_REQUIRED`).

Plus a **human-ratification trigger**: an action over `humanRatification.valueUsdGte` or of a
flagged `impact` returns a special `NEEDS_HUMAN_RATIFICATION` decision that the runtime turns into
a *draft-for-human* path instead of auto-submitting.

It also owns **canonical mandate hashing**: `canonicalize()` (sorted keys, no insignificant
whitespace) → `keccak256` → the `mandateHash` stored in `AgentRegistry`. `verifyMandateHash()`
lets CI and the dashboard assert the off-chain doc matches the on-chain anchor.

## The agent runtime

A write travels through the runtime like this — every gate independent of the others:

```
agent → MCP tool / CLI command
        → policy.evaluate()                 deny? → surface the rule, stop
        → simulate (Tenderly / anvil fork)  revert? → stop; success stored with the rationale
        → pin rationale to IPFS, anchor the content hash on-chain   (no rationale → no submit)
        → Signer.sign…()  ── re-runs policy.evaluate() INDEPENDENTLY ──  deny? → throw
        → submit to chain
```

- **MCP server** ([`packages/mcp`](packages/mcp)) — built on `@modelcontextprotocol/sdk`. The
  agent-facing surface and the policy chokepoint. Nine tools: `list_proposals`, `get_proposal`,
  `get_quorum_status`, `get_voting_power`, `get_mandate`, `simulate_action`, `create_proposal`,
  `cast_vote`, `op_execute`. No write submits without a matching prior simulation (enforced by an
  **action-hash gate**, not trust). Reserved-Matter actions are not constructable at all.
- **CLI** ([`packages/cli`](packages/cli)) — a scriptable mirror (`commander`): `proposals:list`,
  `proposal:get`, `proposal:create`, `vote:cast`, `op:execute`, `agent:mandate`, `sim:run`. It
  imports the **same** policy/sim/signer/chain code — the two surfaces share code, never reimplement.
- **Signer** ([`packages/signer`](packages/signer)) — `signGovernanceTx` / `signOpTx` carry the
  semantic `ProposedAction` and **re-evaluate the policy independently** before signing. The agent
  brain never holds a key; it requests signatures. Dev impl = local keystore; prod target =
  Turnkey/KMS behind the same interface (mainnet-gated).
- **Simulator** ([`packages/sim`](packages/sim)) — Tenderly primary, `anvil --fork-url` fallback
  for offline dev. Every write path is simulated before submission.

## Indexer & dashboard

- **Indexer** ([`indexer/`](indexer), Ponder 0.16) — indexes every event from the seven contracts
  (proposals, votes, queue/execute/cancel, delegation, agent registration/mandate updates, Roles
  events, rationale anchors) and serves derived, joined views to the dashboard via `@ponder/client`.
  ABIs are kept local in `indexer/abis/` so the indexer has no build-time dependency on the chain
  package.
- **Dashboard** ([`apps/dashboard/`](apps/dashboard), Next.js 16 + wagmi 3 + Tailwind v4) — six
  views: **proposal feed**, **proposal detail** (decoded calldata, votes by agent→principal,
  simulation result, hash-verified rationale, timelock ETA), **agents** (mandate hash-verified vs
  on-chain, op-spend vs cap), **members & quorum**, **guardian console** (one-click cancel of a
  queued proposal inside the delay window), **treasury**, and **compliance export**. It falls back
  to fixtures when no live indexer is configured, and shows a visible **mandate-hash-mismatch**
  warning anywhere the on-chain hash ≠ the fetched doc.

## Testing & the adversarial safety proofs

**135 tests total — 106 TypeScript + 29 Foundry** — all passing.

```
TypeScript (vitest, 106)              Foundry (forge, 29)
  policy/engine .......... 22           Functional (lifecycle, delegation, quorum)
  policy/mandate ......... 10           Units (per-contract)
  signer ................. 13           Base (shared fixtures)
  sim .................... 11           Adversarial (11) ── the safety proofs
  mcp (server+adversarial) 17
  cli .................... 10
  chain (abis/decode/env)  23
```

The **adversarial Foundry tests are the proof that the safety properties hold** — they are not
optional. If one cannot pass, the fix is to surface the problem, never to weaken the assertion:

| Test | Property proven |
| --- | --- |
| `test_AgentCannotExceedSpendingCap` | An op over `perTx` or cumulative over `perEpoch` is denied (Roles **and** policy layers). |
| `test_EpochRollsAfterWindow` | Spending allowance resets after `EPOCH_SECONDS`. |
| `test_AgentCannotCallReservedSelector` | A reserved `(target, selector)` is denied by policy and not callable via Roles. |
| `test_GuardianCanCancelInTimelockWindow` | The guardian cancels a queued proposal before the delay elapses; execution then fails. |
| `test_GovernorLacksRoleToChangeTimelockDelay` | A proposal to change `minDelay` reverts — the Governor holds no such role. |
| `test_GovernorLacksRoleToUpdateMandate` | Same property for agent mandates. |
| `test_GovernorLacksRoleToMintMembership` | Same property for membership mint/burn. |
| `test_GovernorLacksRoleToChangeRolesConfig` | Same property for spending caps / Roles config. |
| `test_RoleSeparation_GovernorHoldsNothing_GuardianHoldsAll` | The full constitutional-separation invariant. |
| `test_NonMemberCannotVote` | An address with no delegated power has zero weight. |
| `test_SoulboundTransferReverts` | The membership token cannot be transferred. |

The TS adversarial suite ([`packages/mcp/test/adversarial.test.ts`](packages/mcp/test/adversarial.test.ts),
15 tests) mirrors the runtime-layer proofs: no write without simulation, no write without a
rationale, mandate-hash-mismatch rejection, and Reserved Matters being unconstructable.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the **three-way reserved-matters
invariant**, lint, typecheck, build, and TS tests in one job, and `forge build`/`forge test` in a
parallel job that builds offline from the vendored dependencies.

## Command reference

| Command | What it does |
| --- | --- |
| `pnpm gen:reserved` | Regenerate policy constants + legal schedule from `reserved-matters.yaml`. |
| `pnpm check:reserved` | Assert no drift between the yaml, policy constants, and legal schedule (CI). |
| `pnpm build` | Build all `packages/*` (tsup → ESM + CJS + d.ts). |
| `pnpm test` | Run the vitest suites across packages. |
| `pnpm typecheck` | `tsc --noEmit` across the workspace. |
| `pnpm lint` / `pnpm format` | ESLint + Prettier check / write. |
| `pnpm ci` | The full local gate: `check:reserved` → lint → typecheck → build → test. |
| `pnpm contracts:build` / `pnpm contracts:test` | `forge build` / `forge test -vvv` on `contracts/`. |

## Configuration

Copy [`.env.example`](.env.example) → `.env`. Key groups: chain (`RPC_URL`, `CHAIN_ID=84532`),
deployed addresses (filled after deploy), Tenderly simulation, IPFS pinning, signer backend
(`local` for dev; `turnkey`/`kms` for prod), the Ponder database URL, and the dashboard's public
indexer + IPFS gateway URLs. **Never commit real secrets.** `.gitignore` excludes `.env*`,
`*.keystore`, and keystore directories.

## Project status

All six build phases are complete **at the code level**; Phase 6's on-chain deploy and the
external integrations it needs (Tenderly, IPFS, a funded testnet guardian) are tracked as issues
and require human/infra action. See [`BUILD_SCOPE.md`](BUILD_SCOPE.md) for the authoritative,
phase-by-phase delivery status, acceptance criteria, and the in/out-of-scope boundary.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Scaffold — monorepo, tooling, CI, reserved-matters source of truth | ✅ Complete |
| 1 | Core governance contracts + lifecycle tests | ✅ Complete |
| 2 | Agent accounts + policy engine + **adversarial tests** | ✅ Complete |
| 3 | Indexer (Ponder views) | ✅ Complete (views finalize against live events — [#16](https://github.com/sardoru/agentic-dao-llc/issues/16)) |
| 4 | Runtime — MCP + CLI + signer + simulation | ✅ Complete |
| 5 | Dashboard + guardian console | ✅ Complete |
| 6 | Testnet deploy + legal + docs | ◑ Docs/legal/scripts ready; **deploy pending** ([#1](https://github.com/sardoru/agentic-dao-llc/issues/1)–[#4](https://github.com/sardoru/agentic-dao-llc/issues/4), [#13](https://github.com/sardoru/agentic-dao-llc/issues/13)) |

## Mainnet gating

This is a **testnet build**. Before *any* mainnet move, the following are hard gates (tracked as
issues, mirrored in [`docs/threat-model.md`](docs/threat-model.md) and `BUILD_SCOPE.md`):

- **Production key custody** — replace the local signer with Turnkey/KMS/HSM behind the `Signer` interface ([#6](https://github.com/sardoru/agentic-dao-llc/issues/6)).
- **Audited Roles Modifier** — swap the minimal in-house `RolesModifier` for the audited **Zodiac Roles Modifier v2** ([#5](https://github.com/sardoru/agentic-dao-llc/issues/5)).
- **Formal verification** of the core contracts ([#7](https://github.com/sardoru/agentic-dao-llc/issues/7)).
- **Counsel review** of every `legal/` template + the post-deploy contract-identifier fill ([#13](https://github.com/sardoru/agentic-dao-llc/issues/13)).

## Documentation map

| Document | What it covers |
| --- | --- |
| [`BUILD_SCOPE.md`](BUILD_SCOPE.md) | In/out of scope, phase delivery status, deliverable inventory, mainnet gating, remaining work. |
| [`docs/interfaces.md`](docs/interfaces.md) | The canonical on-chain interface shared by contracts, chain package, and indexer. |
| [`docs/runbook.md`](docs/runbook.md) | The testnet deployment runbook (Base Sepolia), step by step. |
| [`docs/threat-model.md`](docs/threat-model.md) | Threats addressed: key compromise, prompt injection, correlated agent failure, self-amendment, oracle drift, upgrade safety, regulatory flags. |
| [`docs/adr/`](docs/adr) | ADR-0001 constitutional separation · 0002 equal-weight voting · 0003 minimal RolesModifier vs Zodiac · 0004 signer key isolation · 0005 simulation-first writes. |
| [`legal/`](legal) | Wyoming DAO LLC **templates** — articles, operating-agreement clauses, the reserved-matters schedule, the agent-mandate exhibit, and the disclaimer. |

## Security model in one paragraph

A compromised or jail-broken agent brain **cannot extract a key** (the signer isolates it),
**cannot get a non-compliant transaction signed** (the signer re-runs the policy engine
independently of the caller), and **cannot construct a Reserved Matter** (it is not expressible in
the MCP surface, and the Governor lacks the on-chain role to execute one). The worst case for a
fully compromised agent is bounded by its mandate's allow-list and per-tx/per-epoch spending caps,
and the guardian can cancel any queued proposal inside the timelock delay window. Each of these
claims has a corresponding adversarial test.

## Glossary

- **Member** — human owner of the LLC; holds one soulbound membership token (one vote in v1).
- **Delegated Agent** — a *mechanism* exercising a member's delegated voting/proposal power; **not** a member or manager. The human remains principal and economic owner.
- **Mandate** — the machine-readable policy bounding an agent; hashed on-chain (`AgentRegistry`), doc on IPFS, mirrored in the legal exhibit.
- **Guardian** — the human-member multisig holding the timelock `CANCELLER` role and **all** constitutional admin roles.
- **Reserved Matter** — a constitutional change agents/Governor cannot effect; guardian/human-only, enforced in all three layers.
- **Code deference** — the operating-agreement principle that the LLC defers to validly-executed deployed code, **subject to carve-outs** (exploit/bug/oracle failure/unauthorized access, unlawful/ultra-vires acts, unapproved Reserved-Matter changes, mandate violations).
- **Constitutional separation** — the architectural fact that the Governor holds no admin role over constitutional parameters, bounding an agent's on-chain blast radius.

## Contributing & remaining work

Remaining build steps are filed as **GitHub issues** on
[`sardoru/agentic-dao-llc`](https://github.com/sardoru/agentic-dao-llc/issues), labeled
`infrastructure`, `security`, `legal`, `future-work`, and `phase-6`. `BUILD_SCOPE.md` maps each
to its phase and the mainnet gates. When a design choice is ambiguous, prefer the **more
constrained** option and write an ADR under [`docs/adr/`](docs/adr).

## License

**MIT** for the code (see [`LICENSE`](LICENSE)). The [`legal/`](legal) templates are **not legal
advice** and are **not filed or final** — see [`legal/DISCLAIMER.md`](legal/DISCLAIMER.md).
