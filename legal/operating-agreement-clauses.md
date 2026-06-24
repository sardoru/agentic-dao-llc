> **ENGINEERING TEMPLATE — NOT LEGAL ADVICE — NOT FILED OR FINAL.**
> See [`DISCLAIMER.md`](./DISCLAIMER.md). These clauses must be reviewed, revised,
> integrated into a complete operating agreement, and approved by qualified Wyoming
> legal counsel before any organizational reliance. Statutory requirements and
> judicial interpretation of code-deference provisions are subject to change.

---

# Operating Agreement — Key Clause Templates

## [ENTITY NAME] DAO LLC

These templates cover the clauses specific to the algorithmically-governed structure of the company. They must be integrated into a complete Wyoming LLC operating agreement (covering standard provisions such as capital accounts, allocations, distributions, tax elections, dispute resolution, and governing law) by qualified counsel.

Cross-references to `legal/reserved-matters-schedule.md` in these clauses refer to the Reserved Matters Schedule attached as **Exhibit A** to the full Operating Agreement. Cross-references to agent mandate exhibits refer to **Exhibit B-[AGENT-ID]** for each registered agent.

---

## Section [X] — Definitions

For purposes of this Agreement, the following terms have the meanings set forth below (in addition to any other defined terms in this Agreement):

**"AgentRegistry"** means the `AgentRegistry` smart contract deployed at the address identified in the Articles of Organization (as amended), which maintains the binding between each Member's address, each Delegated Agent's address, and the corresponding Mandate Hash and Mandate URI.

**"Articles"** means the Articles of Organization of the Company, as filed with the Wyoming Secretary of State and as amended from time to time.

**"Code-Deference Clause"** means Section [X+1] of this Agreement.

**"Constitutional Contract"** means each of the `MembershipToken`, `DaoGovernor`, `TimelockController`, and `AgentRegistry` contracts, and any successor contract performing equivalent constitutional governance functions, as identified in the Articles.

**"Delegated Agent"** means an AI-agent mechanism (including an automated smart account) to which a Member has delegated voting power and/or proposal authority pursuant to Section [X+2] and the corresponding Agent Mandate Exhibit. A Delegated Agent is not a Member and is not an independent manager of the Company; it is a mechanism exercising delegated authority on behalf of the Member who registered it.

**"DaoGovernor"** means the `DaoGovernor` smart contract deployed at the address identified in the Articles.

**"Guardian"** means the multisig account (currently requiring [3]-of-[5] signatories) identified in the Articles or as updated pursuant to Reserved Matter 1, which holds the constitutional admin roles described in Section [X+4] and the Reserved Matters Schedule.

**"Mandate"** or **"Agent Mandate"** means the machine-readable policy document (in JSON format conforming to `mandates/schema.json`) that bounds the authority of a Delegated Agent. Each Mandate is hashed and stored on-chain in the AgentRegistry as a `mandateHash` and published off-chain at the corresponding `mandateURI` (currently IPFS). The canonical Mandate document must have a keccak256 hash equal to the on-chain `mandateHash`; any divergence is treated as a mandate-hash mismatch and the Delegated Agent's actions are subject to rejection by the runtime policy engine.

**"Mandate Hash"** means the keccak256 hash of the canonical UTF-8 JSON of an Agent Mandate, computed using the canonicalization function defined in `packages/policy/src/mandate.ts`, and stored in the AgentRegistry as `AgentRecord.mandateHash`.

**"Reserved Matter"** means any matter listed in the Reserved Matters Schedule (Exhibit A). Reserved Matters may only be effected by a [supermajority threshold, e.g., 2/3 or 3/4] vote of the Members and/or the Guardian acting within its authority, as specified in Section [X+3] and the Reserved Matters Schedule.

**"TimelockController"** means the `TimelockController` smart contract deployed at the address identified in the Articles, through which all Governor-executed transactions must pass before execution.

**"Treasury"** means the Safe multisig contract owned by the TimelockController, which holds the Company's assets and may only disburse funds via executed Governor proposals.

---

## Section [X+1] — Smart Contract Authority and Code Deference

### [X+1].1 General Code Deference

The Company defers to the deployed Constitutional Contracts for the governance of its affairs. Actions validly executed by the DaoGovernor through the TimelockController in accordance with the procedures established in those contracts — including proposals, votes, queuing, and execution — shall constitute valid governance actions of the Company and shall be binding on the Members, subject to the carve-outs in Section [X+1].2.

### [X+1].2 Carve-Outs from Code Deference

Code deference does not apply, and the Company retains full authority to take any legal action to remedy, rescind, or decline to recognize an on-chain action, in the following circumstances:

**(a) Demonstrable Exploit, Bug, Oracle Failure, or Unauthorized Access.** An on-chain action was the product of a demonstrable exploit of the smart contracts, a material software bug, oracle manipulation or failure, or unauthorized access to a signing key, private key, or agent account — in each case as reasonably documented and acknowledged by [a threshold, e.g., a majority of the Guardian signatories] acting in good faith. The Company shall not be required to give effect to an action tainted by such a vulnerability.

**(b) Unlawful or Ultra Vires Action.** An on-chain action is unlawful under applicable law (including without limitation applicable securities law, anti-money-laundering law, or sanctions), would expose any Member to criminal liability, or is ultra vires under the Articles or this Agreement. Members may not use code deference as a defense to a claim of illegality.

**(c) Reserved Matter Without Required Approval.** An on-chain action purports to effect, or has the practical consequence of effecting, a Reserved Matter without the human-member vote and/or Guardian approval required under Section [X+3] and the Reserved Matters Schedule. The system is designed so that the Governor holds no AccessControl admin role that would permit it to effect any Reserved Matter on-chain; however, should any such action occur due to a contract misconfiguration or upgrade, it shall not be given legal effect.

**(d) Violation of the Applicable Agent Mandate.** An on-chain action was taken by a Delegated Agent in violation of the Agent Mandate that bounds that agent, as reflected in the corresponding Mandate Hash registered in the AgentRegistry. Actions outside the scope of the applicable Mandate are not within the delegated authority of the agent and are not binding on the Member who registered that agent.

### [X+1].3 Statutory Hierarchy

The Members acknowledge and agree to the following hierarchy, which reflects the Wyoming DAO Supplement (verify current law with counsel):

1. Where these Articles and a Constitutional Contract conflict, **the smart contract controls.**
2. Where these Articles and this Operating Agreement conflict, **the Articles control.**

Nothing in this Agreement shall be construed to override an unambiguous provision of the Wyoming DAO Supplement or the Wyoming Limited Liability Company Act.

### [X+1].4 Limitation on Code Deference as Authorization

Code deference is a principle of operational recognition, not a blanket authorization for all on-chain outputs. It does not:

- authorize any action that constitutes a Reserved Matter without the required approvals;
- limit the Members' rights to seek legal remedies for unauthorized or unlawful actions;
- waive any Member's rights under applicable law; or
- relieve the Guardian of its responsibility to monitor and, where appropriate, veto or cancel actions in the timelock window.

---

## Section [X+2] — Delegated Agents

### [X+2].1 Nature of Delegated Agents

A Delegated Agent is a mechanism — currently implemented as an AI language model connected to an MCP server and an on-chain Safe account — that exercises voting power and/or proposal authority delegated to it by a Member. Delegated Agents are:

**(a) Not Members.** A Delegated Agent has no membership interest, economic rights, capital account, right to distributions, or right to information independent of the Member who registered it.

**(b) Not Independent Managers.** A Delegated Agent is not a "manager" of the Company for purposes of the Wyoming LLC Act. It is a mechanism acting under delegated authority, subject to the policy constraints of its Mandate and the Constitutional Contracts.

**(c) Mechanisms of Delegated Authority.** The human Member who registered a Delegated Agent remains at all times the principal and the economic owner of the delegated voting power. The Delegated Agent's authority is bounded at all times by (i) the Mandate registered in the AgentRegistry, (ii) the Constitutional Contracts (including the DaoGovernor, TimelockController, and agent smart-account scope enforced by the Zodiac Roles Modifier), and (iii) this Agreement (including the Reserved Matters carve-out).

### [X+2].2 Registration and Binding

A Member may register a Delegated Agent by calling `registerAgent(agentAccount, mandateHash, mandateURI)` on the AgentRegistry contract. The `mandateHash` is the Mandate Hash of the Agent Mandate Exhibit for that agent. Upon registration:

- The Delegated Agent's authority is defined by and limited to the registered Mandate.
- The Member must execute and attach the corresponding Agent Mandate Exhibit (Exhibit B-[AGENT-ID]) to this Agreement, which shall be incorporated by reference.
- The Member may deactivate the Delegated Agent at any time by calling `deactivateAgent(agentAccount)` on the AgentRegistry.

### [X+2].3 Mandate Changes as Reserved Matter

Any update to a Delegated Agent's Mandate (i.e., any call to `updateMandate` on the AgentRegistry) is a **Reserved Matter** (Reserved Matter 4 in Exhibit A) and requires the approval of the Guardian (specifically, the `REGISTRY_ADMIN` role). Members may not unilaterally expand an agent's mandate after initial registration; any expansion requires Guardian approval and execution of a new or amended Agent Mandate Exhibit.

### [X+2].4 Member Responsibility for Agent Actions

Each Member is responsible for the actions of their Delegated Agent(s) to the extent those actions are within the scope of the registered Mandate. The Company's indemnification provisions (Section [X+X]) govern the allocation of liability for agent actions, including actions taken within the Mandate and actions taken outside it.

### [X+2].5 AgentRegistry as Authoritative Record

The AgentRegistry contract is the authoritative on-chain record of the binding between Members, Delegated Agents, and Mandates. The dashboard (see `apps/dashboard/`) provides a human-readable view of this record and will display a **mandate-hash-mismatch warning** whenever the on-chain Mandate Hash does not match the hash of the off-chain Mandate document at the registered URI. Members and the Guardian shall treat any such mismatch as a material discrepancy requiring prompt resolution.

---

## Section [X+3] — Reserved Matters

### [X+3].1 Reserved Matters Generally

The matters listed in the **Reserved Matters Schedule (Exhibit A)** are reserved to the Guardian and/or a high-threshold human-member vote, as specified in that Schedule. Neither the Delegated Agents, nor the DaoGovernor acting on agent proposals, may effect any Reserved Matter.

**The system is designed so that the DaoGovernor holds no AccessControl admin role over any Reserved Matter on-chain.** Adversarial tests in `contracts/test/` prove this property (see `test_GovernorLacksRoleToChangeTimelockDelay` and sibling tests). This constitutional separation is the primary technical enforcement of this section.

### [X+3].2 The Reserved Matters (Summary)

The following is a summary. The definitive list, including the on-chain selectors and guardian roles, is in **Exhibit A** (generated from `reserved-matters.yaml`):

| #   | Reserved Matter                                                       | Guardian Role      |
| --- | --------------------------------------------------------------------- | ------------------ |
| 1   | Change the guardian set                                               | `GUARDIAN_ADMIN`   |
| 2   | Change the timelock minimum delay                                     | `TIMELOCK_ADMIN`   |
| 3   | Change agent spending caps or Roles configuration                     | `ROLES_ADMIN`      |
| 4   | Change an agent mandate                                               | `REGISTRY_ADMIN`   |
| 5   | Admit or remove members (mint/burn membership)                        | `MEMBERSHIP_ADMIN` |
| 6   | Upgrade a constitutional contract                                     | `UPGRADE_ADMIN`    |
| 7   | Amend the Articles, Operating Agreement, or Reserved Matters Schedule | `GUARDIAN_ADMIN`   |
| 8   | Dissolve the company                                                  | `GUARDIAN_ADMIN`   |

_The foregoing summary is for convenience only. In any conflict between this summary and Exhibit A, Exhibit A controls. The three-layer enforcement of Reserved Matters (contracts, runtime policy engine, this Agreement) must remain in sync; see `reserved-matters.yaml` as the single source of truth._

### [X+3].3 Vote Threshold for Reserved Matters

Reserved Matters requiring a human-member vote require the approval of at least **[2/3 / 3/4 / unanimous — counsel to specify]** of the total outstanding membership votes, plus, where the Reserved Matter involves a constitutional contract role, the affirmative action of the Guardian multisig signing the corresponding role-grant or role-revoke transaction.

_Counsel note: The appropriate threshold is a key governance design decision that should reflect the number of members, the sensitivity of each Reserved Matter, and the practical ability of the Guardian to act. Consider whether different Reserved Matters warrant different thresholds._

### [X+3].4 Reserved Matters and the Code-Deference Carve-Out

Any on-chain action that purports to effect a Reserved Matter without the approval required by this Section and Exhibit A falls within the carve-out in Section [X+1].2(c) and is not entitled to code deference. The Guardian may veto such an action in the Timelock window pursuant to its canceller role.

---

## Section [X+4] — Fiduciary Duties; Indemnification; Liability for Agent Errors

### [X+4].1 Modification of Fiduciary Duties

Pursuant to Wyoming law (verify current applicable provision with counsel), the Members hereby **modify and limit** the fiduciary duties otherwise applicable to members, managers, and agents of the Company as follows:

**(a) Elimination of Duty of Loyalty in Algorithmic Context.** The duty of loyalty is modified to the extent that a Member's Delegated Agent votes or proposes in accordance with the registered Mandate. A Member shall not be deemed to have breached any duty of loyalty solely by reason of the agent acting within its Mandate, even if the resulting action confers a benefit on that Member or an affiliate, provided the benefit is disclosed and the Member abstains from the relevant human-ratification decision where required under the Mandate.

**(b) Business Judgment Standard for Agent Actions.** Members and the Guardian shall be protected by the business judgment standard with respect to their decisions to register, configure, and operate Delegated Agents, provided they act in good faith and in a manner they reasonably believe to be in the interest of the Company.

**(c) No Fiduciary Duty of Delegated Agents.** A Delegated Agent, as a mechanism and not a person or member, has no independent fiduciary duty to the Company or the Members. Accountability for agent actions flows through the human Member who registered the agent.

**(d) Standard of Care for Guardian.** The Guardian signatories owe a duty of reasonable care in exercising the constitutional admin roles and the veto function. This includes monitoring the timelock queue and exercising the canceller role where a queued action falls within a Code-Deference Carve-Out.

_Counsel note: This clause attempts to adapt Wyoming's permissive fiduciary-duty modification rules to the agentic governance context. The scope of permissible modification, particularly with respect to non-member mechanisms, is novel law. Counsel must review and tailor this clause._

### [X+4].2 Indemnification

**(a) Members.** The Company shall indemnify and hold harmless each Member from and against any loss, liability, or expense arising from the actions of that Member's Delegated Agent(s), provided that the loss did not arise from (i) the Member's willful misconduct or fraud, (ii) the Member's failure to deactivate an agent after actual knowledge of a mandate violation, or (iii) the Member's deliberate circumvention of the Mandate or this Agreement.

**(b) Guardian Signatories.** The Company shall indemnify and hold harmless each Guardian signatory from and against any loss, liability, or expense arising from the exercise of their constitutional admin roles in good faith, including the exercise or non-exercise of the veto/canceller function, provided that the loss did not arise from willful misconduct or gross negligence.

**(c) Limitations.** The Company shall not indemnify any person for losses arising from (i) actions taken in breach of this Agreement, (ii) actions constituting a Reserved Matter effected without required approval, (iii) violations of applicable law, or (iv) unauthorized access to a signing key where the Member failed to maintain reasonable key security.

**(d) Insurance.** The Company may maintain directors-and-officers or similar insurance covering Members, Guardian signatories, and other persons acting on behalf of the Company, in such amounts as the Members may determine.

### [X+4].3 Limitations on Liability

No Member, Guardian signatory, or other person acting on behalf of the Company shall be personally liable for any debt, obligation, or liability of the Company solely by reason of being a Member, Guardian signatory, or authorized person, except as required by Wyoming law or as otherwise provided in this Agreement.

### [X+4].4 Liability Allocation for Agent Errors

**(a) Within Mandate.** Agent actions taken within the scope of the registered Mandate and not constituting a Code-Deference Carve-Out are treated as valid Company actions. Any resulting loss is a Company liability, subject to the indemnification provisions of Section [X+4].2.

**(b) Outside Mandate.** Agent actions taken outside the scope of the registered Mandate, or in violation of this Agreement, are not valid Company actions. The registering Member may bear personal liability for such actions to the extent they authorized or failed to prevent them. Counsel must advise on the specific liability analysis.

**(c) Exploit or Unauthorized Access.** Where agent actions result from an exploit, bug, or unauthorized access (Code-Deference Carve-Out (a)), liability analysis depends on the factual circumstances, including the adequacy of the Company's security practices, key custody, and smart contract audit processes. Counsel must advise.

---

## Section [X+5] — Guardian: Authority and Limits

### [X+5].1 Guardian Composition

The Guardian is a multisig account requiring the approval of at least **[3]-of-[5]** signatories (or such other threshold as may be changed pursuant to Reserved Matter 1). The initial Guardian signatories are:

```
[GUARDIAN_SIGNATORY_1_NAME]:    [ADDRESS]
[GUARDIAN_SIGNATORY_2_NAME]:    [ADDRESS]
[GUARDIAN_SIGNATORY_3_NAME]:    [ADDRESS]
[GUARDIAN_SIGNATORY_4_NAME]:    [ADDRESS]
[GUARDIAN_SIGNATORY_5_NAME]:    [ADDRESS]
```

The Guardian multisig is deployed at: `[GUARDIAN_SAFE_ADDRESS]`

### [X+5].2 Constitutional Admin Roles

The Guardian holds the following AccessControl admin roles on the Constitutional Contracts. These roles **are not held by the DaoGovernor** and cannot be granted to the DaoGovernor by any Governor proposal (constitutional separation):

| Role                                    | Contract                     | Authority                                                    |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| `GUARDIAN_ADMIN` (`DEFAULT_ADMIN_ROLE`) | All Constitutional Contracts | Manage the guardian set; ultimate admin authority            |
| `MEMBERSHIP_ADMIN`                      | MembershipToken              | Mint and burn membership tokens (admit/remove members)       |
| `REGISTRY_ADMIN`                        | AgentRegistry                | Update agent mandates                                        |
| `ROLES_ADMIN`                           | Agent Safe / Zodiac Roles    | Configure agent spending caps and target/selector allowlists |
| `TIMELOCK_ADMIN`                        | TimelockController           | Change the timelock `minDelay` (veto window duration)        |
| `UPGRADE_ADMIN`                         | Constitutional Contracts     | Authorize upgrades of upgradeable contracts                  |
| `CANCELLER`                             | TimelockController           | Cancel queued proposals in the timelock window               |

### [X+5].3 Veto and Canceller Authority

The Guardian holds the `CANCELLER` role on the TimelockController. During the timelock delay window following the queuing of any Governor-approved proposal, the Guardian may cancel that proposal by calling the appropriate cancellation function. Cancellation in the timelock window is the Guardian's primary day-to-day intervention mechanism.

**The Guardian shall exercise the canceller role** where, in the judgment of the required number of signatories, a queued action falls within any of the Code-Deference Carve-Outs in Section [X+1].2 (exploit/bug, unlawfulness, Reserved Matter violation, Mandate violation), or otherwise poses material harm to the Company or its Members.

**The timelock `minDelay`** (the veto window) is itself a Reserved Matter (Reserved Matter 2). It must be set long enough for Guardian signatories to identify and cancel a harmful action. The current `minDelay` is `[TIMELOCK_MIN_DELAY]`. Rationale for this value is documented in `docs/adr/`.

### [X+5].4 Limits on Guardian Authority

The Guardian's authority is bounded as follows:

**(a) No Day-to-Day Governance.** The Guardian does not hold the `PROPOSER` or `EXECUTOR` role on the TimelockController (those roles belong to the DaoGovernor) and does not participate in ordinary governance proposals or voting. Its role is constitutional and supervisory.

**(b) Reserved Matters Only.** The Guardian's affirmative on-chain authority is limited to the Reserved Matters listed in Exhibit A and the canceller function. It may not direct the DaoGovernor, override proposal results, or take operational actions through the Treasury without a passed Governor proposal.

**(c) Fiduciary Duty and Good Faith.** Guardian signatories owe the duty of reasonable care described in Section [X+4].1(d). They must act in good faith in the interest of the Company and the Members. Abuse of the Guardian's constitutional authority for the private benefit of signatories is a breach of this duty.

**(d) Changes to the Guardian Set.** Changes to the Guardian set (adding or removing signatories, changing the signing threshold) are Reserved Matter 1. Such changes require the human-member vote threshold specified in Section [X+3].3, and must be executed by the Guardian itself via a `grantRole` or `revokeRole` transaction on the Constitutional Contracts.

### [X+5].5 Guardian Dashboard Access

The Guardian console within the Company's dashboard application (`apps/dashboard/`) provides a real-time view of proposals currently queued in the timelock, the remaining delay window, and one-click cancellation functionality for Guardian signatories. Guardian signatories are responsible for monitoring this console and responding within the timelock window.

---

## Section [X+6] — Inspection Rights and Compliance Export

Members have statutory inspection rights under Wyoming law. In addition, the dashboard provides a **Compliance Export** function (CSV/JSON) of proposals, votes, executions, and rationale hashes for the Company's governance records. Each exported record includes the on-chain transaction hash, the IPFS rationale URI, and the Mandate Hash of the Delegated Agent that proposed or executed the action.

---

## Exhibit A — Reserved Matters Schedule

_Attached and incorporated by reference. See `legal/reserved-matters-schedule.md`._
_Generated from `reserved-matters.yaml`, the single source of truth shared with the runtime policy engine and proven against the on-chain access-control layer in CI._

---

## Exhibit B — Agent Mandate Exhibits

_One exhibit per Delegated Agent. See `legal/agent-mandate-exhibit-template.md` for the template. Each exhibit is identified as Exhibit B-[AGENT-ID] and executed by the registering Member._

---

_This template was generated by software to accompany the Agentic DAO LLC build. It is not a filed or final document. It must be integrated into a complete operating agreement and reviewed by qualified Wyoming legal counsel before any organizational reliance._
