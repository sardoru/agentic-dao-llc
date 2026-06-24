# ADR 0003 — Minimal in-house RolesModifier vs. Zodiac Roles Modifier v2

- **Status:** Accepted (v1 / testnet)
- **Date:** 2026-06-24
- **Context layer:** Smart contracts (the on-chain enforcement point of the
  "one mandate, three enforcement points" principle)
- **Supersedes / relates to:** Build spec §3 (tech stack), §6.5 (agent smart
  accounts), §14 (Reserved Matters & constitutional separation), §16.2
  (adversarial tests), §21 (out of scope for v1)

## Decision

For v1 (Base Sepolia testnet) the per-agent **bounded operational authority** —
allowed `(target, selector)` pairs plus per-tx / per-epoch spending allowances —
is enforced by a **minimal, in-house `RolesModifier.sol`** rather than by the
audited **Zodiac Roles Modifier v2** behind a Gnosis Safe.

The production system **must** swap the in-house contract for the audited Zodiac
Roles Modifier v2 (deployed as a Safe module) before any mainnet move. This swap
is gated the same way as the other mainnet preconditions (key custody hardening,
formal verification) in spec §21.

## Why not just use Zodiac now

The spec names Safe + Zodiac Roles Modifier v2 as the _target_ design, and that
remains correct for production. We deferred it for v1 because:

1. **Dependency surface in this worktree.** Zodiac Roles v2 pulls in the Zodiac
   modifier framework, the Safe contracts, and their transitive dependencies,
   typically wired as git submodules. This build is constrained to a clean
   Foundry project installed via `forge soldeer` (no submodules), inside a git
   worktree where running `git` is disallowed. Vendoring the full Zodiac + Safe
   trees solely to exercise v1's safety tests is disproportionate.

2. **The v1 deliverable is the _safety proof_, not the production module.** What
   the adversarial tests (§16.2) must demonstrate is the _property_ — that an
   agent cannot exceed its `(target, selector)` scope or its spending caps, and
   that reserved selectors are unreachable through the agent path. A focused
   re-implementation of exactly those semantics proves the property with far less
   surface area and far clearer revert reasons than standing up the entire Safe +
   Zodiac stack.

3. **Interface is pinned, implementation is swappable.** `docs/interfaces.md`
   fixes the external surface (`execTransactionWithRole`, `setSpendingCap`,
   `setTargetAllowed`, `setAgentActive`, `epochSpend`, and the `AgentExecuted` /
   `ExecutionSuccess` events). `reserved-matters.yaml` fixes the reserved
   selectors. The in-house contract implements that surface verbatim, so the
   runtime policy engine, the indexer, and the CLI/MCP layers bind against the
   same ABI they will use with Zodiac. The swap is an implementation change, not
   an interface change.

## What the in-house RolesModifier does (and does NOT) cover

**Covers (the v1 safety property):**

- Per-agent **active** flag (`setAgentActive`).
- Per-agent **allow-list** of `(target, selector)` pairs (`setTargetAllowed`).
- Per-agent, per-token **spending caps**: `perTx` and a **rolling** `perEpoch`
  with epoch accounting (`setSpendingCap`, `epochSpend`).
- **Amount decoding** for the known ERC20 value-moving selectors
  (`transfer`, `transferFrom`, `approve`), metered against the caps. Malformed /
  under-length payloads revert rather than slipping past the meter.
- All three admin setters are gated by `ROLES_ADMIN` (the guardian) — a Reserved
  Matter. The Governor holds no such role.

**Does NOT cover (intentionally — Zodiac provides these in production):**

- Rich **parameter scoping** (e.g. constraining the _recipient_ of a transfer, or
  per-argument comparators / one-of sets) — Zodiac Roles v2 has a full condition
  tree; the in-house version scopes by `(target, selector)` + amount only.
- **Multi-send / nested-call unwrapping**, delegatecall guards, and the broader
  Safe module security model (module enable/disable, guard hooks).
- A configurable **epoch length per cap**: the interface in `docs/interfaces.md`
  pins `setSpendingCap(agent, token, perTx, perEpoch)` to exactly four arguments
  (so the runtime's reserved-selector list lines up), so the epoch length is a
  **contract constant** (`EPOCH_SECONDS = 7 days`) in v1 rather than a per-cap
  field. Zodiac models allowances with configurable refill intervals.
- Independent **audit** and battle-testing. The in-house contract is small and
  unit-tested here, but it is not audited. Zodiac Roles v2 is.

## A related decision recorded here: GuardedTimelock

Implementing the constitutional-separation tests surfaced a gap in the **stock OZ
`TimelockController`** that is worth recording alongside this ADR, because it has
the same root ("the agent/Governor path must run out of authority at a Reserved
Matter").

`TimelockController.updateDelay(uint256)` gates on `msg.sender == address(this)`:
the timelock administers its own delay via a scheduled self-call. With that
default, an ordinary Governor proposal could schedule `timelock.updateDelay(...)`,
and when the timelock executes the batch the caller _is_ the timelock, so it would
succeed — directly contradicting spec §6.3 / §14 ("the Governor literally lacks
the role to change its own timelock delay").

We therefore ship **`GuardedTimelock`**, a `TimelockController` subclass that:

- keeps the **exact reserved selector** `updateDelay(uint256)` (so
  `reserved-matters.yaml`, `docs/interfaces.md`, and the runtime selector list
  stay coherent), but re-gates it on a guardian-held `TIMELOCK_ADMIN` role; and
- is deployed with the timelock's **self-administration revoked**
  (`DEFAULT_ADMIN_ROLE` on `address(timelock)` is removed in `Deploy.s.sol`), so
  no executed proposal can self-grant a role and escalate around the separation.

`getMinDelay()` is the single source of truth the inherited `_schedule` already
reads, so the override stays consistent for scheduling. This is proven by
`test_GovernorLacksRoleToChangeTimelockDelay`.

For production, the same property should be preserved if the timelock
implementation changes (e.g. moving the Treasury to a Safe owned by the timelock):
the delay authority must remain a guardian-only Reserved Matter, not a
Governor-reachable self-call.

## Consequences

- v1 ships with a clear, minimal, well-tested enforcement contract whose ABI
  matches the production target, and the adversarial safety proofs pass against
  it.
- A **production hardening task** is created: replace `RolesModifier` with the
  audited Zodiac Roles Modifier v2 (as a Safe module), porting each agent's
  `(target, selector)` allow-list and allowances into Zodiac's role config and
  asserting the config contains no reserved selector. Re-run the §16.2
  adversarial suite against the Zodiac-backed deployment. Mainnet is gated on
  this (and on §21's key-custody and formal-verification items).
- The `GuardedTimelock` decision must be carried forward (or its property
  re-proven) in any future change to the execution/timelock layer.
