# Build Scope — Agentic DAO LLC

**Status:** testnet-only · v0.1.0 · Phases 0–6 delivered at the code level
**Target chain:** Base Sepolia (84532)
**Authoritative for:** what is in scope, what was delivered, what remains, and what gates mainnet.

This document is the contract between the [build spec](https://github.com/sardoru/agentic-dao-llc)
and what actually exists in the repository. The README explains *how the system works*; this
file states *what was built, what is deliberately excluded, and what is left to do.*

---

## 1. Thesis

Build a working **testnet** system where AI agents, holding voting power delegated by human
members of a Wyoming DAO LLC, make and vote on proposals on-chain through a CLI/MCP interface —
**bounded by one mandate enforced identically in three independent layers** (smart contracts,
agent runtime, legal documents), with a human guardian veto and a front-end dashboard.

The single measure of correctness is **coherence**: the contracts, the runtime, and the legal
documents must agree on what an agent may do. The whole architecture exists to keep them aligned
and to *prove* the alignment holds.

---

## 2. Scope boundary

### In scope for v1 (delivered)

| Area | Delivered |
| --- | --- |
| Governance contracts | Soulbound membership, Governor stack, guarded timelock, agent registry, treasury — all with functional + adversarial tests |
| Agent accounts | In-house `RolesModifier` (target/selector allow-list + per-tx/per-epoch caps) standing in for Zodiac Roles v2 |
| Policy engine | Shared `@agentic-dao/policy` — six checks + human-ratification trigger + canonical mandate hashing |
| Constitutional separation | Governor holds zero reserved roles; guardian holds all — proven by tests |
| Reserved Matters | Single source of truth (`reserved-matters.yaml`) → policy constants + legal schedule, CI-enforced |
| Runtime | MCP server (9 tools) + CLI mirror + key-isolated signer + simulation-first writes + IPFS rationale anchoring |
| Indexer | Ponder config/schema/handlers for all seven contracts + a data API |
| Dashboard | Six Next.js views including the guardian console, with fixture fallback |
| Legal templates | Articles, operating-agreement clauses, reserved-matters schedule, agent-mandate exhibit, disclaimer |
| Docs | Interface contract, deployment runbook, threat model, five ADRs |

### Out of scope for v1 (future work — see [§7](#7-remaining-work-mapped-to-issues))

| Excluded | Why / where |
| --- | --- |
| Weighted-by-capital voting (`ERC20Votes`) | Equal weight ships in v1; vote source kept swappable. Also narrows the securities surface. ([#9](https://github.com/sardoru/agentic-dao-llc/issues/9)) |
| Full ERC-4337 account abstraction (session keys, paymasters) | v1 uses the Safe + Roles model. ([#10](https://github.com/sardoru/agentic-dao-llc/issues/10)) |
| Cross-chain governance | Single L2 in v1. ([#11](https://github.com/sardoru/agentic-dao-llc/issues/11)) |
| A "smart" LLM agent brain | v1 ships the infrastructure + a scripted reference path; an LLM brain connects to the same MCP server later. ([#12](https://github.com/sardoru/agentic-dao-llc/issues/12)) |
| Fiat rails, banking, KYC/onboarding | Not part of the on-chain governance build. |
| Production key custody (Turnkey/HSM) | **Mainnet gate** — see [§6](#6-mainnet-gating). ([#6](https://github.com/sardoru/agentic-dao-llc/issues/6)) |
| Audited Zodiac Roles Modifier v2 | **Mainnet gate.** ([#5](https://github.com/sardoru/agentic-dao-llc/issues/5)) |
| Formal verification of contracts | **Mainnet gate.** ([#7](https://github.com/sardoru/agentic-dao-llc/issues/7)) |

---

## 3. Phase delivery status

Acceptance criteria are quoted from the build spec (Section 20). Status reflects the repository
as committed.

| Phase | Acceptance criteria | Status |
| --- | --- | --- |
| **0 — Scaffold** | Monorepo builds; `pnpm i`, lint, CI green; README explains layout. | ✅ **Met.** pnpm workspace, tsconfig/eslint/prettier/turbo, two-job CI, `reserved-matters.yaml` source of truth + codegen. |
| **1 — Core governance contracts** | Functional contract tests pass; proposal lifecycle end-to-end with guardian cancel. | ✅ **Met.** MembershipToken, DaoGovernor, GuardedTimelock, AgentRegistry, Treasury; Functional/Units Foundry tests. |
| **2 — Agent accounts + policy + adversarial** | **All adversarial tests pass**; constitutional separation proven; policy unit-tested; reserved-matters three-way invariant holds in CI. | ✅ **Met.** 11 adversarial Foundry tests + 15 runtime adversarial TS tests; policy engine 32 tests; `check:reserved` in CI. |
| **3 — Indexer** | Indexer serves correct proposal/member/agent/treasury views from live events. | ✅ **Code complete.** Ponder config/schema/handlers + API for all seven contracts. Derived views finalize against a live deployment ([#16](https://github.com/sardoru/agentic-dao-llc/issues/16)). |
| **4 — Runtime** | MCP + CLI share the policy module; no write without prior simulation + rationale; signer re-checks independently; scripted agent completes a full cycle. | ✅ **Met.** Shared `GovernanceCore`; action-hash sim gate; rationale-required gate; independent signer re-evaluation. |
| **5 — Dashboard** | All views render; guardian console cancels a queued proposal; mandate-hash-mismatch warning works. | ✅ **Code complete.** Six views + guardian console + hash-mismatch warning; fixture fallback until a live indexer URL is set. |
| **6 — Testnet deploy + legal + docs** | Deployed to Base Sepolia; runbook reproducible; `/legal` templates present + identifiers populated; threat model documented. | ◑ **Partial.** Deploy script, runbook, threat model, ADRs, and legal templates are all present. The **on-chain deploy + identifier fill + live integrations are pending** ([#1](https://github.com/sardoru/agentic-dao-llc/issues/1)–[#4](https://github.com/sardoru/agentic-dao-llc/issues/4), [#13](https://github.com/sardoru/agentic-dao-llc/issues/13)). |

---

## 4. Deliverable inventory

```
contracts/        7 contracts, 4 test files (Base/Functional/Units/Adversarial), Deploy.s.sol,
                  vendored OZ v5.1.0 + forge-std (committed → builds offline)
packages/policy   types · mandate (canonical hashing) · engine (6 checks) · reservedMatters.generated
packages/chain    clients · abis · contracts · decode · env
packages/sim      types · tenderly · anvilFork · factory
packages/signer   types · base · local · turnkey (stub) · factory  (independent policy re-check)
packages/mcp      server · core (GovernanceCore) · buildCore · actionHash · indexer · ipfs  (9 tools)
packages/cli      program · cli · render  (same GovernanceCore as MCP)
indexer/          ponder.config · ponder.schema · 6 event handlers · api · local abis/
apps/dashboard/   6 views (proposals + [id], agents, members, guardian, treasury, compliance)
mandates/         schema.json + 2 example mandates
legal/            DISCLAIMER · articles-statements · operating-agreement-clauses ·
                  reserved-matters-schedule (generated) · agent-mandate-exhibit-template
docs/             interfaces · runbook · threat-model · adr/0001–0005
scripts/          gen-reserved-matters.mjs (codegen + --check drift gate)
```

**Test evidence:** 135 tests passing — **106 TypeScript** (policy 32, signer 13, sim 11, mcp 17,
cli 10, chain 23) + **29 Foundry** (functional/unit + 11 adversarial safety proofs). Typecheck and
build are clean across all eight `@agentic-dao/*` packages.

---

## 5. The coherence mechanism (why the three layers can't silently drift)

```
                         reserved-matters.yaml   ← edit here only
                                   │
              pnpm gen:reserved    │    pnpm check:reserved (CI fails on drift)
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                     ▼
  packages/policy/src/      legal/reserved-           contracts: each guardian
  reservedMatters.          matters-schedule.md       role held by guardian,
  generated.ts                                        Governor holds none
  (runtime enforcement)     (legal enforcement)       (proven by adversarial tests)
```

- **Runtime ↔ legal**: both are *generated* from the yaml; `check:reserved` re-generates and
  diffs in CI, so a hand-edit to either artifact fails the build.
- **Runtime ↔ contracts**: the policy engine's reserved `(target, selector)` set is asserted
  unconstructable by the runtime adversarial tests; the on-chain separation is asserted by the
  Foundry adversarial tests (`test_GovernorLacksRoleTo…`, `test_RoleSeparation_…`).
- **Contracts ↔ chain ↔ indexer**: all three share the canonical ABI in `docs/interfaces.md`.

---

## 6. Mainnet gating

This build is **testnet-only**. No mainnet key, real funds, or production secret belongs anywhere
in it. Each of the following is a **hard gate** before any mainnet move:

- [ ] **Key custody** — local signer replaced by Turnkey/KMS/HSM behind the `Signer` interface, policy enforced server-side. ([#6](https://github.com/sardoru/agentic-dao-llc/issues/6))
- [ ] **Roles Modifier** — minimal in-house `RolesModifier` replaced by audited **Zodiac Roles Modifier v2**. ([#5](https://github.com/sardoru/agentic-dao-llc/issues/5))
- [ ] **Formal verification** of the core contracts. ([#7](https://github.com/sardoru/agentic-dao-llc/issues/7))
- [ ] **Upgradeability** — constitutional contracts made UUPS-upgradeable with guardian-only `UPGRADE_ADMIN` (required by Wyoming algorithmic-management rules) + the articles-amendment obligation it triggers. ([#17](https://github.com/sardoru/agentic-dao-llc/issues/17))
- [ ] **Counsel review** of every `legal/` template + the post-deploy contract-identifier fill. ([#13](https://github.com/sardoru/agentic-dao-llc/issues/13))
- [ ] **Reserved-Matter vote thresholds** specified per matter. ([#14](https://github.com/sardoru/agentic-dao-llc/issues/14))

---

## 7. Remaining work (mapped to issues)

All remaining build steps are filed on
[`sardoru/agentic-dao-llc`](https://github.com/sardoru/agentic-dao-llc/issues). Grouped by label:

**Phase 6 — testnet deploy (`phase-6` / `infrastructure`)**
- [#1](https://github.com/sardoru/agentic-dao-llc/issues/1) Deploy to Base Sepolia + run the scripted end-to-end agent.
- [#2](https://github.com/sardoru/agentic-dao-llc/issues/2) Provision Tenderly credentials + validate the sim path.
- [#3](https://github.com/sardoru/agentic-dao-llc/issues/3) Provision IPFS pinning (Pinata / web3.storage).
- [#4](https://github.com/sardoru/agentic-dao-llc/issues/4) Wire the mandate-hash == on-chain-hash assertion into CI after deploy.
- [#16](https://github.com/sardoru/agentic-dao-llc/issues/16) Complete indexer derived views once contracts are live.

**Security (`security`) — most are mainnet gates**
- [#5](https://github.com/sardoru/agentic-dao-llc/issues/5) Audited Zodiac Roles Modifier v2.
- [#6](https://github.com/sardoru/agentic-dao-llc/issues/6) Production key custody (Turnkey/KMS).
- [#7](https://github.com/sardoru/agentic-dao-llc/issues/7) Formal verification.
- [#15](https://github.com/sardoru/agentic-dao-llc/issues/15) CI: committed-secret / keystore scan.
- [#8](https://github.com/sardoru/agentic-dao-llc/issues/8) Encrypted keystore decryption in `LocalSigner` (dev convenience).

**Legal (`legal`)**
- [#13](https://github.com/sardoru/agentic-dao-llc/issues/13) Counsel review + post-deploy identifier fill.
- [#14](https://github.com/sardoru/agentic-dao-llc/issues/14) Reserved-Matter vote thresholds per matter.

**Future work (`future-work`)**
- [#9](https://github.com/sardoru/agentic-dao-llc/issues/9) Weighted-by-capital voting (`ERC20Votes`).
- [#10](https://github.com/sardoru/agentic-dao-llc/issues/10) Full ERC-4337 account abstraction.
- [#11](https://github.com/sardoru/agentic-dao-llc/issues/11) Cross-chain governance.
- [#12](https://github.com/sardoru/agentic-dao-llc/issues/12) Connect an LLM-driven agent brain to the MCP server.
- [#17](https://github.com/sardoru/agentic-dao-llc/issues/17) Make constitutional contracts upgradeable (UUPS).

---

## 8. Definition of done

- **v1 (this build):** all six phases code-complete; 135 tests green; reserved-matters three-way
  invariant holds in CI; the adversarial safety proofs pass. ✅
- **Testnet live:** issues [#1](https://github.com/sardoru/agentic-dao-llc/issues/1)–[#4](https://github.com/sardoru/agentic-dao-llc/issues/4) + [#16](https://github.com/sardoru/agentic-dao-llc/issues/16) closed — deployed to Base Sepolia, indexer/dashboard reading live events, end-to-end scripted agent run reproduced from the runbook.
- **Mainnet eligible:** every box in [§6](#6-mainnet-gating) checked. Out of scope for v1.
