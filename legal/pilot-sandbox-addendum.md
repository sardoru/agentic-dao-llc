# Pilot Sandbox Addendum — Working Committee DAO (CGP-001)

> **Template — not legal advice.** See [`DISCLAIMER.md`](./DISCLAIMER.md). This addendum
> adapts the base operating-agreement clauses ([`operating-agreement-clauses.md`](./operating-agreement-clauses.md))
> for the **pilot** profile: a separate, ring-fenced sandbox sub-entity. Counsel must
> review sub-entity formation, the inter-entity advisory terms, and the Wyoming
> algorithmic-management designation before any filing.

This addendum accompanies the governance proposal
[`governance/CGP-001-working-committee-dao-pilot.md`](../governance/CGP-001-working-committee-dao-pilot.md)
and the **pilot** [Reserved Matters Schedule](./reserved-matters-schedule.md) (generated from
the `pilot` profile of `reserved-matters.yaml`).

## 1. Entity

The **Working Committee DAO** is formed as a **wholly-owned subsidiary DAO LLC (Wyoming)** of
the parent (CougarDAO LLC), with its own algorithmically-managed designation. The designation is
valid only because the sandbox's governance contracts are upgradeable and the upgrade authority
is **Guardian-held** (Reserved Matter `RM-CONST-006`).

## 2. Capital and ring-fence

- The sandbox's only capital contribution is a **single capped operating float** (`${PILOT_FLOAT_CAP}`)
  from the parent treasury. No property, deed NFT, title, or ownership-token authority is
  transferred to the sandbox.
- **`RM-PILOT-001`** (cap-enforced) reserves any movement beyond the float or to a
  non-allowlisted address.
- **`RM-PILOT-002`** (deny-by-target) reserves **any** action against parent production
  contracts, deeds, treasury, or the `$COUG` token — the sandbox may only _advise_. This is
  enforced in the runtime as an address ring-fence (the policy engine denies any action whose
  target is in the reserved-target set, before any per-mandate allow-list is consulted) and in
  law by this schedule.

## 3. Delegated agents

The four pilot agents (OPS-01, TREAS-01, GOV-01, DILIGENCE-01; see
[`mandates/pilot/`](../mandates/pilot/)) are **Delegated Agents** within the meaning of the base
operating-agreement clause. Each agent's authority is bounded by a machine-readable mandate whose
keccak256 hash is anchored on-chain in the AgentRegistry and mirrored here. Delegation is
revocable by the delegating member.

## 4. Guardian

The sandbox **Guardian multisig** holds the timelock canceller authority and every constitutional
admin role; ordinary sandbox governance (the DaoGovernor) holds none. There is therefore no
on-chain path from an agent proposal to a constitutional change (constitutional separation).

## 5. Inter-entity terms

A short services/advisory understanding provides that: (a) the sandbox furnishes advisory output
(memos, alerts) to the parent; (b) the float is the sandbox's only capital contribution; and
(c) the sandbox holds no authority over any parent asset or contract. The parent's own Articles
and operating agreement are unchanged by the pilot.

## 6. Graduation

Adoption of the framework in the parent entity is a **separate constitutional proposal** (the
`production` profile) requiring a member supermajority, gated on the graduation criteria in
CGP-001 §7. Absent graduation, the sandbox is wound down or renewed by a follow-up vote.
