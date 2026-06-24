> **ENGINEERING TEMPLATE — NOT LEGAL ADVICE — NOT FILED OR FINAL.**
> See [`DISCLAIMER.md`](./DISCLAIMER.md). This template must be reviewed, revised,
> and completed by qualified Wyoming legal counsel before any filing or organizational
> action. Statutory requirements change; verify current law.

---

# Articles of Organization

## Wyoming Decentralized Autonomous Organization Limited Liability Company

**[ENTITY NAME] DAO LLC**
_(Name must include "DAO LLC", "LAO LLC", or "DAO" as required by Wyo. Stat. § 17-31-104(a)(iv);
confirm current statutory naming requirements with counsel.)_

---

## Article I — Name

The name of the Decentralized Autonomous Organization Limited Liability Company is:

> **[ENTITY NAME] DAO LLC**

The company name complies with the naming requirements of the Wyoming Decentralized Autonomous Organization Supplement, Wyo. Stat. §§ 17-31-101 et seq. (the "Wyoming DAO Supplement"), and includes the required designation. Confirm current naming requirements with counsel.

---

## Article II — Statement That the Company Is a Decentralized Autonomous Organization

Pursuant to Wyo. Stat. § 17-31-104(a)(i), the company hereby states that it is a **Decentralized Autonomous Organization** (DAO) as defined in the Wyoming DAO Supplement. The company is organized under and subject to the Wyoming DAO Supplement in addition to the Wyoming Limited Liability Company Act, Wyo. Stat. §§ 17-29-101 et seq., to the extent not inconsistent with the Wyoming DAO Supplement.

---

## Article III — Statutory Notice of Restrictions on Duties and Transfers

**Pursuant to Wyo. Stat. § 17-31-104(a)(iii) and any other applicable provision of the Wyoming DAO Supplement, the following notice is hereby given:**

> **NOTICE OF RESTRICTIONS ON DUTIES AND TRANSFERS**
>
> The rights of members in a decentralized autonomous organization may differ materially from the rights of members in other limited liability companies. The Wyoming Decentralized Autonomous Organization Supplement, underlying smart contracts, articles of organization, and operating agreement, if applicable, of a decentralized autonomous organization may define, reduce, or eliminate fiduciary duties and may restrict the transfer of ownership interests, rights to information, and other rights belonging to members in other limited liability companies. Before acquiring membership in or interests in a decentralized autonomous organization, a prospective member or transferee should review the Wyoming Decentralized Autonomous Organization Supplement and any underlying smart contracts, articles of organization, and operating agreement for that decentralized autonomous organization.

_Note for counsel: Confirm the exact statutory text of this notice as required by current law, including any amendments after the date of this template._

---

## Article IV — Smart Contract Identifiers

Pursuant to Wyo. Stat. § 17-31-104(a)(ii), the publicly available identifier(s) of the smart contract(s) used to manage or operate the Decentralized Autonomous Organization are as follows:

```
[SMART_CONTRACT_IDENTIFIERS]

This placeholder must be completed with the deployed contract addresses and
publicly accessible identifiers BEFORE these articles are filed. The identifiers
are to be entered following Phase 6 of the software build (see docs/runbook.md,
Step 7) once contracts are deployed to the target network.

For each smart contract, include at minimum:
  - Contract name (e.g., "MembershipToken", "DaoGovernor", "TimelockController",
    "AgentRegistry", "Treasury Safe")
  - Deployed address (e.g., 0x...)
  - Network / chain identifier (e.g., Base Mainnet, Chain ID 8453)
  - Block explorer URL (e.g., https://basescan.org/address/0x...)
  - Source code verification URL (e.g., verified on Basescan)

AMENDMENT OBLIGATION:
Whenever a smart contract used to manage or operate the DAO is changed or
replaced, these articles MUST be amended to reflect the new contract
identifier(s) within the statutory window (currently 30 days under the Wyoming
DAO Supplement; verify current law with counsel). Failure to amend may constitute
inactivity or non-compliance that triggers automatic dissolution under Article VIII.

This amendment obligation must be integrated into the deployment runbook
(docs/runbook.md) as a required human-and-counsel step on every contract upgrade.
```

---

## Article V — Management

### 5.1 Algorithmic Management

This company is managed algorithmically, in whole or in part, pursuant to Wyo. Stat. § 17-31-106 (or equivalent current provision). Management of the company's governance is delegated to the smart contracts identified in Article IV, which are operated by AI agents acting under delegated authority from human members in accordance with the Operating Agreement and the agent mandates registered in the AgentRegistry contract.

**Counsel note — algorithmic management eligibility:** Under the Wyoming DAO Supplement, algorithmic management is only permissible if the underlying smart contracts are **upgradeable**. Counsel must confirm at the time of filing that the deployed contracts satisfy this requirement, and must re-confirm on any contract upgrade. The upgrade authority itself is a Reserved Matter controlled by the guardian multisig under the Operating Agreement (see `reserved-matters-schedule.md`, Item 6).

### 5.2 Human Members and Guardian

Notwithstanding algorithmic management, the company has human members who hold soulbound (non-transferable) membership interests. Certain constitutional matters are reserved to a high-threshold human-member vote and/or the guardian multisig, as specified in the Operating Agreement and the Reserved Matters Schedule (Exhibit A to the Operating Agreement). The guardian multisig holds constitutional admin roles that the DaoGovernor contract does not hold, ensuring that agents and ordinary governance proposals cannot effect Reserved Matters.

### 5.3 Interaction of Articles, Operating Agreement, and Smart Contracts

Pursuant to the Wyoming DAO Supplement:

- Where these articles of organization and a smart contract conflict, **the smart contract controls.**
- Where these articles of organization and the operating agreement conflict, **these articles control.**

This hierarchy is reflected in the Operating Agreement's code-deference clause and must be taken into account by counsel when drafting the full operating agreement.

---

## Article VI — Registered Agent and Registered Office

```
Registered Agent:    [REGISTERED AGENT NAME]
Registered Office:   [STREET ADDRESS]
                     [CITY], Wyoming [ZIP CODE]
```

_Note: A Wyoming physical street address is required. A P.O. Box is not sufficient. Confirm current registered-agent requirements with counsel._

---

## Article VII — Organizer(s)

```
Organizer Name:    [ORGANIZER NAME]
Organizer Address: [ORGANIZER ADDRESS]
```

---

## Article VIII — Dissolution and One-Year Inactivity Rule

**Automatic Dissolution Warning:** Under the Wyoming DAO Supplement, a DAO LLC that has not made any proposal or transaction in the **preceding one (1) year** may be subject to automatic dissolution. The company and its members must take steps to ensure ongoing governance activity to avoid triggering this provision.

Members and the guardian multisig are responsible for monitoring governance activity. The dashboard (see `apps/dashboard/`) provides a real-time view of proposal and transaction history. Counsel should advise on what constitutes sufficient "activity" under the current statute and any safe-harbor practices.

Voluntary dissolution, if elected, is a **Reserved Matter** requiring guardian-multisig action and a high-threshold human-member vote. See the Operating Agreement and Reserved Matters Schedule (Item 8).

---

## Article IX — Operating Agreement

The company is governed by an Operating Agreement among the members. The Operating Agreement, together with these articles and the smart contracts identified in Article IV, constitute the full governance framework of the company. In the event of conflict, the hierarchy in Article V.3 governs.

The Operating Agreement includes, at minimum, the following subjects:

- Smart Contract Authority and Code Deference (with carve-outs)
- Delegated Agents (AI agent definitions, AgentRegistry binding, mandate exhibits)
- Reserved Matters (mirroring the Reserved Matters Schedule)
- Fiduciary Duty Modification and Indemnification
- Guardian Authority and Limits

---

## Exhibit A — Reserved Matters Schedule

_Incorporated by reference. See `legal/reserved-matters-schedule.md`._

---

## Exhibit B — Agent Mandate Exhibits

_One exhibit per registered agent. See `legal/agent-mandate-exhibit-template.md`._

---

## Signature

```
Organizer's Signature: _______________________________

Printed Name:          [ORGANIZER NAME]

Date:                  ________________________________
```

---

_This template was generated by software to accompany the Agentic DAO LLC build. It is not a filed or final document. Review and complete with qualified Wyoming legal counsel before filing with the Wyoming Secretary of State._
