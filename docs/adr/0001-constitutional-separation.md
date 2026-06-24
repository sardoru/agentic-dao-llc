# ADR 0001 — Constitutional Separation: Governor Holds No Reserved AccessControl Roles

**Status:** Accepted

---

## Context

The system gives AI agents delegated voting and proposal power in the `DaoGovernor`. If the
Governor could also call administrative functions — changing the timelock delay, minting
membership tokens, updating agent mandates, or modifying spending caps — a majority of
agents (whether legitimately or through compromise) could vote to change the rules governing
future agent behavior. This is the self-amendment threat (threat-model.md §4).

The question is: what is the simplest, most verifiable bound on the Governor's on-chain
blast radius?

Two design options were considered:

**Option A — Governor role allowlist:** Grant the Governor a broad admin role but add a
policy-layer filter that checks each proposed calldata against a forbidden list before
execution.

**Option B — Constitutional separation:** Grant the Governor only `PROPOSER` and
`EXECUTOR` roles on the Timelock. All admin/constitutional roles are held exclusively by
the guardian multisig. The Governor structurally cannot call administrative functions even
if a malicious proposal reaches execution.

Option B was chosen.

---

## Decision

The `DaoGovernor` is granted exactly two roles on the `TimelockController`:
- `PROPOSER_ROLE` — allows the Governor to schedule operations after a proposal passes.
- `EXECUTOR_ROLE` — allows the Governor to execute operations after `minDelay` elapses.

The Governor holds **no** `AccessControl` admin roles on any constitutional contract.
Specifically, the Governor does NOT hold:

| Role | Contract | Effect |
|---|---|---|
| `MEMBERSHIP_ADMIN` | MembershipToken | Mint/burn membership tokens |
| `REGISTRY_ADMIN` | AgentRegistry | Update agent mandate hashes |
| `ROLES_ADMIN` | RolesModifier | Change agent targets/caps |
| `TIMELOCK_ADMIN` | TimelockController | Change `minDelay` |
| `UPGRADE_ADMIN` | All upgradeable contracts | Authorize upgrades |
| `DEFAULT_ADMIN_ROLE` | All | Grant/revoke any role |

All of the above are held exclusively by the **guardian multisig** (a 3-of-5 Safe).

This means there is *no on-chain execution path* from an ordinary (agent-driven) proposal
to a Reserved Matter. A proposal that attempts to call `grantRole`, `updateDelay`,
`mintMembership`, `updateMandate`, `setSpendingCap`, `upgradeTo`, or any reserved function
will be submitted to the Timelock by the Governor — but when the Timelock calls the target
contract, the Timelock (acting as the Governor's executor) does not hold the required role,
and the call reverts with `AccessControl: account ... is missing role ...`.

The runtime (`packages/policy`) adds a second layer: the Reserved Matters guard in
`reservedMatters.ts` denies any proposed action whose (target, selector) pair is in the
reserved set. The MCP server and CLI do not expose tools that construct such calls. This
second layer is defense-in-depth, not the primary control.

---

## Consequences

**Positive:**
- The safety property is structurally enforced, not policy-enforced. It holds even if the
  policy engine has a bug or is bypassed.
- It is trivially verifiable: the adversarial test suite (`test_GovernorLacksRole*`) proves
  it on every CI run.
- The blast radius of any agent — including a fully compromised one — is bounded by its
  mandate scope and the Timelock delay. It cannot change the rules it operates under.
- There is a clear human-only on-ramp for constitutional changes: the guardian multisig.

**Negative / trade-offs:**
- Legitimate governance changes to constitutional parameters (e.g., adjusting quorum) must
  go through the guardian, not a member vote. This is intentional — it is slower but safer.
  If the DAO wants member-voted constitutional changes in a future version, that mechanism
  must itself require guardian co-signature or a supermajority that makes it a Reserved
  Matter equivalent.
- The guardian multisig is a single-point-of-human-control for constitutional changes.
  Guardian key loss or compromise is a critical threat. Mitigated by a 3-of-5 multisig
  threshold, key isolation, and the `GUARDIAN_ADMIN` role enabling key rotation (which is
  itself a Reserved Matter requiring the existing guardian quorum).

**Follow-up:**
- The adversarial test `test_GovernorLacksRoleToChangeTimelockDelay` and its siblings must
  never be removed or weakened. Consider adding a CI gate that explicitly asserts these
  tests are present in the suite.
- If a future version adds an "emergency Governor" with elevated authority, a new ADR must
  re-evaluate this decision.
