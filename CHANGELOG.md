# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); the project is **testnet-only** and pre-1.0.

## [Unreleased]

### Added — dashboard authentication (SIWE wallet-connect, multi-method)

- **Sign-In With Ethereum** end to end (`apps/dashboard`): `GET /api/auth/nonce` →
  client builds a nonce-bound EIP-4361 message (`viem/siwe`) → wallet `personal_sign`
  (free, never a tx) → `POST /api/auth/verify` validates chain/nonce/domain/signature
  (EOA **and** ERC-1271) and issues a stateless `jose` HS256 session cookie. `me` /
  `logout` routes + a client `AuthProvider`/`useSession`.
- **Connectors:** `injected` + `coinbaseWallet` always; `walletConnect` (mobile/QR) when
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set. New multi-method `/login` (Wallet /
  Email link / Passkey) with a header `AuthStatus` widget.
- **Route gating:** Next 16 `proxy.ts` requires a session for `/guardian`; the guardian
  cancel button is further gated on the on-chain-resolved `guardian` role.
- **Role resolution** at login (best-effort, fail-open): `guardian` (env) + `member`
  (`MembershipToken.balanceOf`). Magic-link + passkey are first-class extension points
  (`/api/auth/{magic-link,passkey}` return 501 "configure to enable"). See
  [ADR 0006](docs/adr/0006-authentication.md). Runs zero-config in dev; fails closed in
  prod without `AUTH_SESSION_SECRET`. `pnpm verify` + `next build` green.

### Added — Working Committee DAO pilot (CGP-001)

- **Profiled Reserved Matters.** `reserved-matters.yaml` now carries `pilot` / `production`
  profiles. The generator (`scripts/gen-reserved-matters.mjs`) takes `--profile` (default
  `pilot`), classifies each matter's enforcement (`selector` / `target` / `cap` / `legal`), and
  emits the pilot artifacts. The pilot selector set is **byte-identical** to the prior set; the
  pilot only _adds_ a target ring-fence and a cap guard.
- **Deny-by-target enforcement (RM-PILOT-002).** The policy engine now denies any action whose
  target is a ring-fenced CougarDAO asset, **before** the per-mandate allow-list is consulted.
  New generated exports `RESERVED_TARGETS` / `RESERVED_TARGET_SET` (with `$COUG` baked in) and
  `RESERVED_TARGET_PLACEHOLDERS` (deploy-time targets to resolve); new optional
  `EvalContext.reservedTargets` to inject resolved addresses at runtime.
- **Cap guard (RM-PILOT-001).** The ring-fenced float ceiling is documented as a hard Reserved
  Matter while remaining cap-enforced (metered selectors stay callable within caps).
- **The four pilot agents.** `mandates/pilot/{OPS-01,TREAS-01,GOV-01,DILIGENCE-01}.json` — each
  validates against the (enriched) `mandates/schema.json` + `validateMandate`, forbids every
  reserved selector, and allow-lists no CougarDAO target. Added the `OPERATING_EXPENSE` proposal
  type across the type/schema/validator. OPS-01 + TREAS-01 carry USDC caps; GOV-01 + DILIGENCE-01
  are execution-free (DILIGENCE-01 is read/propose-only).
- **Charter, config, legal.** `governance/CGP-001-working-committee-dao-pilot.md` (the pilot
  charter, adapted to this repo's stack), `config/pilot.addresses.example.json` (the deploy-time
  address book), and `legal/pilot-sandbox-addendum.md` (sandbox/subsidiary operating-agreement
  addendum).
- **Tests.** +24 policy tests: deny-by-target behaviour (RM-PILOT-002, incl. precedence over the
  allow-list and runtime injection) and a CI check that runs the real pilot mandates through
  `validateMandate` + reserved-selector coverage + ring-fence checks. Full gate stays green:
  `pnpm verify`, `check:reserved`, `forge test` (29), `pnpm e2e:local` (52 assertions).

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

### Added — documentation

- Detailed top-level `README.md` — architecture, the seven contracts, the eight Reserved
  Matters, the policy engine's six checks, the runtime request flow, all 135 tests (incl. the
  named adversarial safety proofs), command/config reference, project status, and the mainnet
  gates.
- `BUILD_SCOPE.md` — authoritative in/out-of-scope boundary, phase-by-phase delivery status
  against the spec's acceptance criteria, deliverable inventory, the three-layer coherence
  mechanism, the mainnet-gating checklist, and remaining work mapped to the filed issues.

### Added — scripted end-to-end agent (Phase 4/6 local acceptance)

- `scripts/e2e-local.mjs` (`pnpm e2e:local`) — boots a throwaway anvil, deploys the production
  wiring (`Deploy.s.sol` → `DAODeployer`), seeds members/delegation/treasury/agent-registration/
  Roles-caps, then drives the **real `GovernanceCore`** (policy → simulation → key-isolated
  signer → broadcast) end to end with **52 on-chain assertions**: mandate-hash verification; the
  four chokepoint denials (rationale, simulation, Reserved Matter, per-tx cap); the full
  simulate→propose→vote→queue→execute lifecycle (treasury paid); a Roles-metered bounded
  `op_execute`; and a guardian veto. Needs no external credentials (stub IPFS + anvil-fork
  simulator). This is the spec's Phase 4/6 "scripted reference agent," runnable locally
  (issue #1's local half).

### Fixed

- eslint flat config now declares Node globals for `scripts/**/*.mjs`, and the repo was brought
  to a clean `prettier --check` — `pnpm lint` (and the CI lint step) is green for the first time.

[Unreleased]: https://github.com/sardoru/agentic-dao-llc/commits/main
