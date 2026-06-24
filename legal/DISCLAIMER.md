# DISCLAIMER

> **IMPORTANT — READ BEFORE RELYING ON ANYTHING IN THIS DIRECTORY**

## These Are Engineering Templates, Not Legal Documents

The files in this `legal/` directory are **engineering templates** generated to accompany a software build of an algorithmically-governed Wyoming DAO LLC. They are:

- **NOT legal advice.**
- **NOT filed or final documents.**
- **NOT a substitute for qualified legal counsel.**
- **NOT verified to comply with current law as of any particular date.**

They exist solely to illustrate the structural relationship between the on-chain governance system (contracts, mandate schema, policy engine) and the legal wrapper that may be used to incorporate the organization. They are placeholders that must be reviewed, revised, and completed by a licensed Wyoming attorney — and, where applicable, by tax counsel, securities counsel, and regulatory counsel — before any reliance, filing, or organizational action.

---

## Specific Areas of Legal Risk

The following areas carry **real legal consequences** and must be reviewed by qualified counsel before any organizational action is taken:

1. **Wyoming DAO LLC formation.** The Wyoming Decentralized Autonomous Organization Supplement (Wyo. Stat. §§ 17-31-101 et seq.) imposes specific requirements for articles of organization, public smart contract identifiers, algorithmic management eligibility, the statutory Notice of Restrictions on Duties and Transfers, and the one-year-inactivity auto-dissolution rule. These requirements change as the legislature amends the statute. Verify current law.

2. **Algorithmic management.** Algorithmic management of a Wyoming DAO LLC is only permissible if the underlying smart contracts are upgradeable. The conditions for and consequences of this designation — including amendment obligations triggered by contract upgrades — require counsel review.

3. **Fiduciary duty modification.** Wyoming law permits the operating agreement to modify, limit, or eliminate fiduciary duties. The scope of permissible modification, the enforceability of code-deference clauses, and indemnification structures for AI-agent errors are unsettled legal questions in most jurisdictions. They must be drafted and reviewed by counsel.

4. **Securities treatment.** Membership tokens that are soulbound and non-transferable are designed to reduce securities-law exposure, but this is not a legal conclusion. Whether membership interests constitute securities under federal or state law (including the Howey test and related analysis) must be determined by qualified securities counsel for any particular deployment.

5. **Tax treatment.** A Wyoming DAO LLC is, by default, treated as a partnership for U.S. federal income tax purposes unless an election is made. The tax consequences of token issuance, member distributions, and agent-executed transactions must be reviewed by qualified tax counsel.

6. **The enforceability of code-deference and Reserved-Matters provisions.** The principle that the LLC defers to validly-executed deployed code — subject to the carve-outs defined in the operating agreement — is not established by appellate authority in most jurisdictions. Its interaction with traditional fiduciary-duty law, fraudulent-transfer law, and creditor rights is uncertain.

7. **Agent mandate enforceability.** The legal enforceability of machine-readable mandate documents as binding exhibits to the operating agreement, and their interaction with the operating-agreement carve-outs, is novel and untested law.

8. **Money transmission and regulatory compliance.** If the DAO's treasury handles or moves value for third parties, money transmission licensing, AML/KYC obligations, or other regulatory requirements may apply. Confirm with counsel.

9. **Beneficial ownership reporting.** Confirm current Corporate Transparency Act obligations with counsel.

---

## Statutory Rules Change

Wyoming has amended its DAO LLC supplement since enactment, and further amendments are possible. **Verify current statutory text** at [wyoleg.gov](https://wyoleg.gov) or equivalent official source before relying on these templates.

---

## Smart Contract Identifiers and Amendment Obligations

Under the Wyoming DAO LLC supplement, the articles of organization must include a publicly available identifier of each smart contract used to manage or operate the DAO. **These identifiers must be amended every time a contract changes**, within the statutory window, or the company risks auto-dissolution. This is a human-and-counsel step; it cannot be automated by this software system.

See `legal/articles-statements.md` for the `[SMART_CONTRACT_IDENTIFIERS]` placeholder.

---

## Cross-References

| Document | Purpose |
|---|---|
| `legal/articles-statements.md` | Wyoming DAO LLC Articles of Organization template |
| `legal/operating-agreement-clauses.md` | Key operating-agreement clause templates |
| `legal/reserved-matters-schedule.md` | Auto-generated Reserved Matters schedule (do not edit by hand) |
| `legal/agent-mandate-exhibit-template.md` | Per-agent mandate exhibit template |

---

*Generated to accompany the Agentic DAO LLC software build. Consult qualified counsel before any organizational, filing, or governance action.*
