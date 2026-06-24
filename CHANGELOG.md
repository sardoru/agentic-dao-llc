# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); the project is **testnet-only** and pre-1.0.

## [Unreleased]

### Added — Phase 0: scaffold + policy engine + Reserved Matters source of truth
- pnpm monorepo (workspaces, tsconfig, eslint, prettier, turbo) + CI (TypeScript + Foundry jobs).
- `reserved-matters.yaml` — the single source of truth that generates the runtime policy
  constants (`packages/policy/src/reservedMatters.generated.ts`) **and** the legal schedule
  (`legal/reserved-matters-schedule.md`); CI asserts the three-way invariant.
- `@agentic-dao/policy` — mandate types, canonical keccak256 hashing (matches on-chain
  `mandateHash`), and the policy engine with all six checks. 32 unit tests, incl. the
  policy-layer adversarial proofs.
- Mandate JSON Schema + two example mandates; `.env.example`; `docs/interfaces.md` (canonical
  on-chain interface); manifests for every workspace package.

### Added — Phases 1–6 (in progress)
- `contracts/` — MembershipToken, DaoGovernor, TimelockController, AgentRegistry, RolesModifier,
  RationaleAnchor, Treasury + functional and adversarial Foundry tests.
- `packages/{signer,chain,sim,mcp,cli}` — the agent runtime (policy chokepoint, key-isolated
  signer, simulation-first, MCP server + CLI).
- `indexer/` — Ponder views (proposals, members, agents, treasury, rationale).
- `apps/dashboard/` — Next.js dashboard + guardian console.
- `legal/` — Wyoming DAO LLC templates.
- `docs/` — threat model, deployment runbook, ADRs.

[Unreleased]: https://github.com/sardoru/agentic-dao-llc/commits/main
