# CGP-001 — Establish the Working Committee DAO: an Agent-Governance Pilot Sandbox

|                 |                                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proposal ID** | CGP-001 (revised — supersedes the direct-adoption draft)                                                                                                                                                    |
| **Title**       | Establish a separate, ring-fenced Working Committee DAO to pilot agent-operated governance                                                                                                                  |
| **Status**      | Draft → for member discussion, then on-chain vote                                                                                                                                                           |
| **Type**        | Treasury + Formation (fund and authorize a sandbox sub-entity)                                                                                                                                              |
| **Framework**   | CougarDAO governance (token-weighted) funds/forms a _separate_ DAO; CougarDAO's own governance is unchanged. The sandbox runs **this repository's stack**.                                                  |
| **Requires**    | Standard governance threshold (see §10). Graduation to CougarDAO later requires a _separate constitutional supermajority_ vote.                                                                             |
| **Companion**   | [`reserved-matters.yaml`](../reserved-matters.yaml) (`pilot` profile) · [`mandates/pilot/`](../mandates/pilot/) · [`mandates/schema.json`](../mandates/schema.json) · [`BUILD_SCOPE.md`](../BUILD_SCOPE.md) |

> **This document is drafting scaffolding, not legal advice.** The sub-entity
> formation and operating agreement must be reviewed by counsel. The on-chain
> encoding is written against **this repository's** contracts — confirm against
> the version you deploy. See [`legal/DISCLAIMER.md`](../legal/DISCLAIMER.md).
>
> **Where this repo fits.** This repository _is_ the technical implementation of
> the sandbox stack described in §3 and §5: the OZ Governor + `GuardedTimelock` +
> `AgentRegistry` + in-house `RolesModifier` + soulbound `MembershipToken`,
> bounded by **one mandate enforced in three layers** (contracts · runtime · legal).
> The pilot is instantiated by the **`pilot` profile** of `reserved-matters.yaml`
> and the four agent mandates in `mandates/pilot/`.

---

## 1. Summary (TL;DR)

Form and fund a **separate Working Committee DAO** — a small, ring-fenced sandbox
entity — with the full agent-operated governance stack built in from day one:
human committee members delegate authority to AI agents that draft proposals, vote
on routine matters, and execute pre-approved operational actions, all **bounded by
enforced mandates, blocked from a defined set of Reserved Matters, and subject to a
human Guardian veto**.

The sandbox holds **only a small capped operating float** — no property, no Fabrica
deeds, no ownership-token authority. Its relationship to CougarDAO is
**advisory-only**: it may draft acquisition memos and monitor portfolio/MetaStreet
risk, but it **cannot touch any CougarDAO production asset or contract** (enforced by
`RM-PILOT-002`).

We run it testnet-first (the `pilot` profile + the local end-to-end harness), then on
mainnet at low caps, observe the audit trail and Guardian controls under real
(low-stakes) conditions, and — only if defined **graduation criteria** are met —
bring a _separate_ constitutional proposal to adopt the framework in CougarDAO.

---

## 2. Why a sandbox first

Adopting AI-agent governance directly in the entity that holds real property, RWA
debt, and the treasury concentrates a lot of novel risk into one step. A sandbox
inverts that:

- **Risk isolation.** Any agent bug, key compromise, prompt-injection, or
  correlated-model failure is ring-fenced to a small float in a separate entity.
  CougarDAO's deeds, titles, treasury, and token are structurally out of reach.
- **Learn in low stakes.** We get a real audit trail — actual agent proposals, votes,
  executions, vetoes, simulation results — on operations that don't matter much if
  they go wrong.
- **Cheaper to iterate.** Mandate tuning, cap-setting, threshold calibration, and
  runtime fixes happen without renegotiating CougarDAO's constitution each time.
- **A clean graduation decision.** Members vote to adopt in CougarDAO _after_ seeing
  evidence, not on a promise.

---

## 3. Specification

### 3.1 The Working Committee DAO entity

A **separate entity**, recommended as a **wholly-owned subsidiary DAO LLC of
CougarDAO** (Wyoming), so liability and asset exposure are isolated while CougarDAO
remains the parent/member. The sandbox has its **own** governance deployment, its
**own** small committee/membership token, and its **own** Guardian — none of which
are CougarDAO's production contracts.

The on-chain stack is the one in this repo:

| Component      | This repo                                 | Role in the sandbox                                                   |
| -------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| Governance     | `DaoGovernor` (OZ Governor stack)         | Agents propose/vote with delegated weight; holds **no** admin roles   |
| Veto window    | `GuardedTimelock`                         | 48h delay; Guardian is sole canceller; `updateDelay` re-gated         |
| Membership     | `MembershipToken` (soulbound ERC721Votes) | Committee members; weight delegated to agent accounts                 |
| Agent bounds   | `AgentRegistry`                           | Binds each agent's `mandateHash` + IPFS URI on-chain                  |
| Spending meter | `RolesModifier` (in-house)                | Per-tx / per-epoch caps on bounded ops (stand-in for Zodiac Roles v2) |
| Audit anchor   | `RationaleAnchor`                         | keccak256 of each decision rationale committed on-chain               |

### 3.2 Ring-fenced funding

The sandbox is funded with a **single capped float** from CougarDAO treasury —
**[$X in USDC]**, a deliberately small amount — for agent operating expenses and
infrastructure during the pilot. Hard rules:

- No property, no Fabrica deed NFT, no TaterDAO title is transferred to the sandbox.
- No ownership-token (`$COUG`) mint/burn/transfer authority is granted to the sandbox
  or its agents.
- Treasury movement beyond the float, or to any non-allowlisted address, is a
  **Reserved Matter** — `RM-PILOT-001` (cap-enforced) — see §3.6.

### 3.3 Governance and membership in the sandbox

The **Working Committee** (the core members who opt in — recommend a small group)
hold the sandbox committee token and **delegate** their sandbox governance weight to
agent accounts. Members keep their committee interest; agents only exercise delegated
weight, as mechanisms. Delegation is revocable.

### 3.4 Agents and mandates in the sandbox

The four-agent roster, scoped to the sandbox's own small operations. Each mandate
validates against [`mandates/schema.json`](../mandates/schema.json); caps are in USDC
base units, per-tx and per-epoch. Concrete drafts live in
[`mandates/pilot/`](../mandates/pilot/):

| Agent            | File                               | Capability                                                                                                                   |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **OPS-01**       | `mandates/pilot/OPS-01.json`       | Pays the sandbox's own allowlisted operating expenses up to its cap; drafts anything larger for ratification.                |
| **TREAS-01**     | `mandates/pilot/TREAS-01.json`     | Rebalances the sandbox float among allowlisted addresses only.                                                               |
| **GOV-01**       | `mandates/pilot/GOV-01.json`       | Drafts/posts sandbox proposals; votes on routine sandbox matters. Cannot propose/vote on any Reserved Matter.                |
| **DILIGENCE-01** | `mandates/pilot/DILIGENCE-01.json` | Read/propose-only. Watches CougarDAO portfolio + MetaStreet risk; produces alerts and draft memos. Zero execution authority. |

Actions exceeding an agent's `humanRatification` threshold become drafts for committee
approval rather than auto-executing.

### 3.5 Guardian and veto

A sandbox **Guardian multisig** (recommend **2-of-3** or **3-of-5** of the committee)
holds:

- **Canceller** authority over the **48-hour** execution-delay window on every
  agent-driven on-chain action (`GuardedTimelock`).
- A **kill switch** to pause all sandbox agents immediately (`setAgentActive(false)` /
  registry deactivation).
- The **constitutional admin roles** (§3.6) — held by the Guardian, never by ordinary
  sandbox governance, so there is no on-chain path from an agent proposal to a
  constitutional change (**constitutional separation**, proven by the Foundry
  adversarial tests).

### 3.6 Reserved Matters (pilot profile)

Generated from [`reserved-matters.yaml`](../reserved-matters.yaml) (the **`pilot`
profile**). Agents and ordinary sandbox proposals can never effect these; they require
a committee supermajority and are gated behind Guardian-held roles. On top of the
standard constitutional/token entries, the pilot profile adds:

- **`RM-PILOT-001` — No funds beyond the float.** Any movement exceeding the capped
  sandbox float (`${PILOT_FLOAT_CAP}`) or to a non-allowlisted address. _Primary
  enforcement is the agent-account allowance cap_ (`RolesModifier`); the Reserved
  Matter makes the ceiling a hard floor as defense-in-depth.
- **`RM-PILOT-002` — No touching CougarDAO.** The sandbox may only _advise_ on
  CougarDAO matters; it may not call, sign for, or hold authority over any CougarDAO
  production contract, deed, treasury, or `$COUG`
  (`0xa78ce0420a057bd27f214318920a8ff77035f29b`). **All** selectors on those targets
  are forbidden — enforced at runtime as a **deny-by-target** Reserved Matter (the
  policy engine denies any action whose target is in the reserved-target set, before
  the per-mandate allow-list is even consulted).

### 3.7 Safety controls

Identical architecture to the target design: **simulation-first** (no simulation → no
submission), **rationale logging** to IPFS with on-chain hash (`RationaleAnchor`),
**independent signer re-check** before signing (the signer re-runs the policy engine
and never trusts the caller), and **correlated-failure mitigation** (conservative
thresholds, human ratification above an impact line, diversified agent models/policies).
Keys never enter the agent's context.

---

## 4. Relationship to CougarDAO

- **One-directional and advisory.** The sandbox consumes public/permissioned CougarDAO
  data to produce memos and alerts; it returns _recommendations_, not actions.
- **No execution surface.** Enforced by `RM-PILOT-002` and by the agent accounts simply
  not being granted any role, allowlist entry, or delegation on CougarDAO contracts.
- **Funding only.** The sole asset flow is the one-time capped float in §3.2.
- **Optional value test.** A good pilot success signal: CougarDAO members find the
  sandbox's draft acquisition memos and MetaStreet risk alerts genuinely useful — real
  utility, zero asset risk.

---

## 5. On-chain actions

Executed against a **new, separate** governance deployment for the sandbox — **not**
CougarDAO's production governance. CougarDAO's role here is limited to the funding
transfer.

**On CougarDAO governance (this proposal):**

1. Transfer the capped float **[$X USDC]** to the sandbox treasury once the sandbox
   contracts + Guardian are deployed and audited.

**On the sandbox deployment (executed by the committee after formation):**

1. Deploy the sandbox stack (`contracts/script/Deploy.s.sol`): Governor, `GuardedTimelock`,
   `MembershipToken`, `AgentRegistry`, `RolesModifier`, `RationaleAnchor`, and the
   Guardian multisig.
2. Assign the Guardian the canceller + constitutional admin roles; confirm the Governor
   holds none (the Foundry adversarial suite asserts this).
3. Register OPS-01 / TREAS-01 / GOV-01 / DILIGENCE-01 with their `mandateHash` + IPFS URIs;
   set account scopes/allowances from the `pilot` Reserved-Matters profile.
4. Point the sandbox docs pointer at the operating agreement on IPFS.

---

## 6. Legal

Subject to counsel review (not legal advice):

- **Form the Working Committee DAO** as a wholly-owned subsidiary DAO LLC (Wyoming) of
  CougarDAO, algorithmically-managed (valid only because its governance contracts are
  upgradeable; upgrade authority is Guardian-held — `RM-CONST-006`).
- **Sandbox operating agreement** containing the _Smart Contract Authority & Code
  Deference_ clause (with carve-outs), _Delegated Agents_ definition, _Reserved Matters_
  schedule (pilot profile, generated from `reserved-matters.yaml`), _Guardian_ authority,
  and Wyoming-permitted fiduciary modifications. Templates in [`legal/`](../legal/).
- **Articles smart-contract identifiers** list the sandbox registry/governance/Guardian
  addresses (amend within the statutory window on change).
- **Inter-entity terms:** a short services/advisory understanding that the sandbox
  provides advisory output to CougarDAO and that the float is the only capital
  contribution; the sandbox has no authority over CougarDAO assets.
- CougarDAO's own Articles and operating agreement are **unchanged** by this proposal.

---

## 7. Pilot plan and graduation criteria

1. **Testnet.** Deploy the sandbox stack on Base Sepolia; run the adversarial suite and
   the local end-to-end harness (`pnpm e2e:local`) and _prove_: agents cannot exceed caps,
   cannot touch any Reserved Matter (including `RM-PILOT-002` CougarDAO targets), and the
   Guardian can cancel and pause.
2. **Audit.** Independent audit of registry, agent-account scoping, and Guardian wiring
   before mainnet.
3. **Mainnet sandbox (probation).** Launch with **OPS-01 + DILIGENCE-01** at conservative
   caps for **[60–90 days]**; add TREAS-01 / GOV-01 only after initial stability.
4. **Evidence review.** Members review the dashboard audit trail, any vetoes/incidents,
   and the usefulness of DILIGENCE-01's advisory output.

**Graduation criteria** (all must hold before a CougarDAO-adoption proposal is brought):

- **[≥ N]** months of continuous operation with **zero** unauthorized actions and **zero**
  Reserved-Matter breaches.
- Every Guardian veto and the kill switch verified to function in practice (run at least
  one live cancellation drill).
- Complete, hash-verified rationale/audit trail for **100%** of agent actions.
- A written **pilot report** to members covering incidents, costs, and observed agent
  behavior.
- Affirmative committee recommendation to graduate.

Graduation to CougarDAO is a **separate constitutional proposal** (the `production`
profile) requiring **supermajority**. Absent graduation, the sandbox is wound down or
renewed by a follow-up vote.

---

## 8. Budget / treasury impact

Funded from CougarDAO treasury, amounts **[TBD by members]**:

- Ring-fenced **operating float** to the sandbox: **[$X USDC]** (small; the only capital at risk)
- Smart-contract **audit** of the sandbox stack: [$ range]
- **Deployment** gas + Guardian multisig + agent accounts: [$ range]
- **Agent runtime / infra** (hosting, signing/KMS, simulation, IPFS): [$ range, recurring]
- **Legal** — sub-entity formation + sandbox operating agreement + filings: [$ range]

No `$COUG` is minted or burned. No CougarDAO property, deed, or production contract is
transferred or exposed.

---

## 9. Risks and mitigations

- **Anything goes wrong with the agents** → ring-fenced to a small float in a separate
  entity; CougarDAO assets structurally untouched (`RM-PILOT-002`).
- **Agent key compromise / prompt injection** → bounded by account scope + caps +
  independent signer; Guardian can pause; worst case ≤ the float.
- **Correlated agent failure** → conservative thresholds, human ratification, diversified
  models — observed _in the sandbox_ before any real-asset exposure.
- **Self-amendment** → structurally blocked; ordinary sandbox governance holds no
  constitutional roles.
- **Sandbox is a poor proxy for production** → mitigated by giving DILIGENCE-01 _real_
  CougarDAO advisory tasks, so we test genuine utility, not just toy operations.
- **Wasted spend if it fails** → intentionally small float + defined graduation gate;
  failure is cheap and informative.

---

## 10. Voting

This proposal funds and authorizes a small sandbox; it does **not** alter CougarDAO's
constitution, so a standard threshold is appropriate:

- **Threshold:** **[simple majority / your standard governance threshold]** of votes cast.
- **Quorum:** **[X%]** of circulating ownership token.
- **Voting period:** **[X days]** plus grace period.
- **Options:** **For** / **Against** / **Abstain**.

A **For** vote authorizes formation and funding of the Working Committee DAO per §§3–8
(subject to testnet, audit, and legal-review gates) and directs the float transfer in §5.
**Against** retains the status quo. **Abstain** counts toward quorum only. _Adoption of
agent governance in CougarDAO itself remains a separate future proposal requiring
supermajority (the `production` profile)._

---

## Appendix — Companion artifacts

- **[`reserved-matters.yaml`](../reserved-matters.yaml)** — single source of truth; this
  pilot uses the **`pilot`** profile. Generates the runtime deny-list
  (`packages/policy/src/reservedMatters.generated.ts`) and the legal schedule
  (`legal/reserved-matters-schedule.md`). CI asserts the three layers agree
  (`pnpm check:reserved`).
- **[`mandates/schema.json`](../mandates/schema.json)** — validates each agent mandate.
- **[`mandates/pilot/`](../mandates/pilot/)** — the four concrete pilot mandates.
- **[`config/pilot.addresses.example.json`](../config/pilot.addresses.example.json)** —
  the deploy-time address book filling the `${PLACEHOLDER}` set (float cap, allowlist,
  CougarDAO targets, `$COUG`).
- **[`BUILD_SCOPE.md`](../BUILD_SCOPE.md)** — the phased, testnet-first engineering plan.

**Links:** `$COUG` token `0xa78ce0420a057bd27f214318920a8ff77035f29b` · [sandbox operating
agreement IPFS — to add] · [sandbox contract addresses — to add]
