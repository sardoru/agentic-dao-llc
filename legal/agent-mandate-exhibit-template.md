> **ENGINEERING TEMPLATE — NOT LEGAL ADVICE — NOT FILED OR FINAL.**
> See [`DISCLAIMER.md`](./DISCLAIMER.md). This exhibit must be reviewed, completed,
> and executed by the registering Member and reviewed by qualified counsel before
> any organizational reliance. One completed exhibit must be attached per Delegated
> Agent registered in the AgentRegistry.

---

# Agent Mandate Exhibit
## Exhibit B-[AGENT-ID] to the Operating Agreement of [ENTITY NAME] DAO LLC

**Exhibit Identifier:**       B-[AGENT-ID]
**Agent Identifier:**         [AGENT-ID] *(e.g., "treasury-agent-01"; must match `agentId` in the Mandate JSON)*
**Date of Execution:**        [DATE]
**Operating Agreement Date:** [OA_DATE]

---

## 1. Parties

**Registering Member (Principal):**

```
Member Name / Identifier:   [MEMBER_NAME_OR_PSEUDONYM]
Wallet Address (Principal):  [MEMBER_WALLET_ADDRESS]
```

**Delegated Agent:**

```
Agent Account Address:       [AGENT_SAFE_ADDRESS]
Agent Type:                  AI-agent mechanism / Safe smart account
                             (not a member, not a manager — see Operating Agreement § [X+2])
```

**Company:**

```
Entity Name:                 [ENTITY NAME] DAO LLC
Wyoming Secretary of State:  [FILING_NUMBER]
```

---

## 2. Purpose

This Exhibit binds the Registering Member, the Delegated Agent account identified above, and the Agent Mandate described in Section 3. It is incorporated by reference into the Operating Agreement as Exhibit B-[AGENT-ID] and supplements the general Delegated Agent provisions in Section [X+2] of the Operating Agreement.

The Registering Member acknowledges that:

(a) The Delegated Agent is a mechanism, not a person, member, or manager;

(b) The Registering Member remains at all times the principal and the economic owner of the delegated voting power;

(c) The authority of the Delegated Agent is bounded by and limited to the Mandate described in this Exhibit; and

(d) Actions taken by the Delegated Agent outside the scope of this Mandate, or in violation of the Operating Agreement, are not valid Company actions and may expose the Registering Member to liability (see Operating Agreement § [X+4].4(b)).

---

## 3. Agent Mandate Identification

### 3.1 On-Chain Record

The Agent Mandate is registered in the `AgentRegistry` contract at:

```
AgentRegistry Contract Address:  [AGENT_REGISTRY_ADDRESS]
Network / Chain:                  [CHAIN_NAME] (Chain ID: [CHAIN_ID])
Block Explorer:                   [BLOCK_EXPLORER_URL/address/AGENT_REGISTRY_ADDRESS]
```

The on-chain `AgentRecord` for this agent is:

```
AgentRecord.principal:    [MEMBER_WALLET_ADDRESS]
AgentRecord.mandateHash:  [MANDATE_HASH_HEX]
                          (keccak256 of the canonical UTF-8 Mandate JSON)
AgentRecord.mandateURI:   [MANDATE_IPFS_URI]
                          (e.g., ipfs://[CID])
AgentRecord.active:       true
```

*The `mandateHash` and `mandateURI` are the authoritative references. In any conflict between the on-chain record and this Exhibit, the on-chain record controls for purposes of the Constitutional Contracts and the runtime policy engine. In any conflict between this Exhibit and the on-chain record for purposes of legal interpretation, the parties agree to treat this Exhibit and the on-chain record as equally authoritative and to resolve conflicts by amending both to be consistent.*

### 3.2 Off-Chain Mandate Document

The off-chain Mandate document (the "Mandate JSON") is the machine-readable policy that bounds the Delegated Agent. It is stored at:

```
IPFS URI:    [MANDATE_IPFS_URI]
IPFS CID:    [MANDATE_CID]
Gateway URL: [IPFS_GATEWAY_URL/ipfs/MANDATE_CID]
             (for human-readable access; the IPFS URI is authoritative)
```

The keccak256 hash of the canonical UTF-8 Mandate JSON **must equal** `AgentRecord.mandateHash`. This equality is:

- verified in CI (`pnpm test` includes a mandate-hash check);
- verified by the runtime policy engine (`packages/policy`) before any agent action;
- displayed in the dashboard with a **mandate-hash-mismatch warning** if divergence is detected.

Any detected divergence between the off-chain document and the on-chain hash must be treated as a material discrepancy. The Registering Member must notify the Guardian and take steps to reconcile promptly.

### 3.3 Mandate Version and Expiry

```
Mandate Version:   [MANDATE_VERSION]   (e.g., "1.0"; matches `version` field in Mandate JSON)
Mandate Created:   [MANDATE_CREATED_AT]
Mandate Expires:   [MANDATE_EXPIRES_AT]
                   (After expiry the runtime policy engine will deny all agent actions;
                    a new or renewed Mandate requires Guardian approval as a Reserved Matter.)
```

---

## 4. Summary of Mandate Scope

*The following is a human-readable summary for counsel and Member review. The Mandate JSON at the URI in Section 3.2 is the authoritative and machine-enforced statement of scope. In any conflict between this summary and the Mandate JSON, the Mandate JSON controls.*

### 4.1 Governance Authority

```
Can Propose Governance Actions:   [YES / NO]
Can Cast Votes:                    [YES / NO]
Permitted Proposal Types:          [List from mandates JSON scope.proposalTypes,
                                    e.g., TREASURY_PAYMENT, PARAM_TUNE_NONRESERVED,
                                    TEXT_SIGNAL]
```

### 4.2 Operational (Unilateral) Execution Authority

```
Has Bounded Operational Authority:  [YES / NO]
                                     (If NO, this agent may only propose and vote;
                                      it has no direct treasury or operational access.)

Allowed Target Contracts:           [List from scope.allowedTargets]
Allowed Function Selectors:         [List from scope.allowedSelectors, if specified]
Forbidden Selectors:                [List from scope.forbiddenSelectors — these include
                                     all Reserved Matter selectors from reserved-matters.yaml]
```

### 4.3 Spending Cap

```
Spending Token:          [TOKEN_ADDRESS] ([TOKEN_SYMBOL])
Per-Transaction Cap:     [PER_TX_CAP] [TOKEN_SYMBOL] ([PER_TX_CAP_RAW] raw units)
Per-Epoch Cap:           [PER_EPOCH_CAP] [TOKEN_SYMBOL] ([PER_EPOCH_CAP_RAW] raw units)
Epoch Duration:          [EPOCH_SECONDS] seconds ([EPOCH_HUMAN_READABLE])
```

*These caps are enforced in three independent layers: (1) the Zodiac Roles Modifier on the agent's Safe account (on-chain); (2) the runtime policy engine (off-chain, in the MCP server and CLI); and (3) this Agreement (legal). The on-chain enforcement is the strongest and is proven by `test_AgentCannotExceedSpendingCap` in `contracts/test/`.*

### 4.4 Human Ratification Threshold

```
Value Threshold (USD):   Actions with estimated USD value >= $[HUMAN_RATIFICATION_USD_THRESHOLD]
                         require human ratification before submission (the runtime generates
                         a draft for Member review rather than auto-submitting).
Impact Levels:           Actions classified as [HIGH / MED / as specified] also require
                         human ratification.
```

### 4.5 Reserved Matters Exclusion

The Delegated Agent has **no authority** to take any action that touches a Reserved Matter as defined in the Operating Agreement and the Reserved Matters Schedule (Exhibit A). The Mandate JSON's `forbiddenSelectors` field includes all Reserved Matter on-chain selectors from `reserved-matters.yaml`. The runtime policy engine enforces this independently of the on-chain Roles configuration.

### 4.6 Simulation and Rationale Requirements

```
Simulation Required Before Submission:   [YES / NO — typically YES per mandate.requireSimulation]
Rationale Storage:                        [IPFS / as specified in mandate.rationaleStorage]
```

Every governance proposal or operational execution by this agent must be accompanied by a rationale document pinned to IPFS and anchored on-chain with its content hash. The runtime will not submit any action without a rationale. No rationale = no submission.

### 4.7 Guardian Reference

```
Guardian Multisig Address:   [GUARDIAN_SAFE_ADDRESS]
```

The Guardian retains the `CANCELLER` role on the TimelockController and the `REGISTRY_ADMIN` role on the AgentRegistry. The Guardian may cancel any queued action by this agent during the timelock window and may deactivate or update this agent's Mandate at any time as a Reserved Matter.

---

## 5. Mandate Change Procedure

**Changes to this Mandate are a Reserved Matter (Reserved Matter 4 in Exhibit A).** The Registering Member may not unilaterally expand this Mandate. Any change requires:

1. Preparation of a new or amended Mandate JSON document, canonically serialized;
2. Pin the new Mandate JSON to IPFS; record the new CID and URI;
3. Compute the keccak256 Mandate Hash of the canonical document;
4. Guardian multisig calls `updateMandate(agentAccount, newMandateHash, newMandateURI)` on the AgentRegistry;
5. Execute and attach an amended version of this Exhibit (Exhibit B-[AGENT-ID]-v[N]) to the Operating Agreement;
6. Update `mandates/[AGENT-ID].json` in the repository and verify CI hash check passes.

Mandate reductions (restricting scope, lowering caps, adding forbidden selectors) may be made at any time by the Registering Member in coordination with the Guardian. Mandate expansions require the full Reserved Matter approval process.

---

## 6. Representations and Acknowledgments of the Registering Member

By executing this Exhibit, the Registering Member represents, warrants, and acknowledges as follows:

(a) **Accuracy.** The information in this Exhibit, including the agent account address, Mandate Hash, and Mandate URI, is accurate as of the date of execution.

(b) **Hash Verification.** The Registering Member has verified (or caused to be verified) that the keccak256 hash of the Mandate JSON document at the Mandate URI equals the `mandateHash` registered in the AgentRegistry.

(c) **Scope Compliance.** The Mandate scope described in Section 4 does not include any Reserved Matter and does not authorize any action that would violate the Operating Agreement or applicable law.

(d) **Key Security.** The Registering Member is responsible for maintaining reasonable security over the signing keys used by the Delegated Agent and will promptly notify the Guardian and other Members if those keys are compromised.

(e) **Monitoring.** The Registering Member will monitor the Delegated Agent's activity through the dashboard and will promptly deactivate the agent and notify the Guardian if it acts outside its Mandate or in a manner that triggers a Code-Deference Carve-Out under the Operating Agreement.

(f) **No Legal Advice.** The Registering Member has had the opportunity to consult with qualified counsel regarding the legal implications of registering a Delegated Agent and executing this Exhibit.

---

## 7. Signatures

```
REGISTERING MEMBER:

Signature:     _____________________________________

Printed Name:  [MEMBER_NAME]

Wallet Address: [MEMBER_WALLET_ADDRESS]

Date:          _____________________________________


ACKNOWLEDGED BY THE COMPANY
(authorized signatory or Guardian representative):

Signature:     _____________________________________

Printed Name:  [AUTHORIZED_SIGNATORY_NAME]

Capacity:      [Guardian Signatory / Member / Authorized Representative]

Date:          _____________________________________
```

---

## Appendix A — Mandate JSON (Attached for Reference)

*The canonical Mandate JSON document at [`[MANDATE_IPFS_URI]`]([IPFS_GATEWAY_URL/ipfs/MANDATE_CID]) is the authoritative version. The following is a copy attached for counsel and Member reference at the time of execution. If there is any divergence between this copy and the IPFS document at the URI above, the IPFS document (whose hash equals `[MANDATE_HASH_HEX]` as registered in the AgentRegistry) controls.*

```jsonc
// Paste canonical Mandate JSON here at time of execution.
// Verify that keccak256(canonicalize(this document)) == [MANDATE_HASH_HEX].
// See packages/policy/src/mandate.ts for the canonicalize() function.
{
  "version": "[MANDATE_VERSION]",
  "agentId": "[AGENT-ID]",
  "principal": "[MEMBER_WALLET_ADDRESS]",
  "agentAccount": "[AGENT_SAFE_ADDRESS]",
  "scope": {
    "canPropose": /* true|false */,
    "canVote": /* true|false */,
    "proposalTypes": [ /* ... */ ],
    "allowedTargets": [ /* ... */ ],
    "forbiddenSelectors": [ /* all Reserved Matter selectors from reserved-matters.yaml */ ],
    "spendingCap": {
      "token": "[TOKEN_ADDRESS]",
      "perTx": "[PER_TX_CAP_RAW]",
      "perEpoch": "[PER_EPOCH_CAP_RAW]",
      "epochSeconds": /* number */
    }
  },
  "votingPolicy": "ipfs://[VOTING_POLICY_CID]",
  "humanRatification": {
    "valueUsdGte": /* number */,
    "impact": [ /* "HIGH", "MED", etc. */ ]
  },
  "requireSimulation": true,
  "rationaleStorage": "ipfs",
  "guardian": "[GUARDIAN_SAFE_ADDRESS]",
  "createdAt": "[MANDATE_CREATED_AT]",
  "expiresAt": "[MANDATE_EXPIRES_AT]"
}
```

---

*This template was generated by software to accompany the Agentic DAO LLC build. It is not a filed or final document. Review and complete with qualified legal counsel before any organizational reliance.*
