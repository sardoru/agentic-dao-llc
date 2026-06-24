# Deployment Runbook — Base Sepolia (Testnet)

> **TESTNET ONLY.** This runbook deploys to Base Sepolia (chain ID 84532).
> Mainnet is **explicitly gated** — no mainnet keys, real funds, or production secrets
> anywhere in this process. See the mainnet gate section at the bottom.

---

## Prerequisites

```bash
# Required toolchain versions
node --version     # >= 20
pnpm --version     # 9.x (corepack use pnpm@9.15.0)
forge --version    # latest stable Foundry
cast --version
anvil --version
```

Copy `.env.example` to `.env` and fill all testnet values before proceeding:

```bash
cp .env.example .env
```

### Environment variables (from `.env.example`)

```
# Chain
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Deployed addresses — leave blank; fill after Step 1
MEMBERSHIP_TOKEN=
GOVERNOR=
TIMELOCK=
AGENT_REGISTRY=
ROLES_MODIFIER=
TREASURY_SAFE=
GUARDIAN_SAFE=
RATIONALE_ANCHOR=

# Simulation — Tenderly primary, anvil-fork fallback
TENDERLY_ACCOUNT=
TENDERLY_PROJECT=
TENDERLY_ACCESS_KEY=
ANVIL_FORK_RPC_URL=https://sepolia.base.org

# IPFS
IPFS_PROVIDER=pinata          # pinata | web3storage
IPFS_TOKEN=
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Signer — DEV ONLY local keystore
SIGNER_BACKEND=local          # local | turnkey | kms
SIGNER_KEYSTORE_PATH=./.keystore/agent.json
SIGNER_KEYSTORE_PASSWORD=
# Turnkey fields (prod only — leave blank for testnet)
TURNKEY_API_PUBLIC_KEY=
TURNKEY_API_PRIVATE_KEY=
TURNKEY_ORGANIZATION_ID=

# Indexer (Ponder)
PONDER_RPC_URL_84532=https://sepolia.base.org
PONDER_DATABASE_URL=          # empty = pglite (local dev)

# Dashboard
NEXT_PUBLIC_INDEXER_URL=http://localhost:42069
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
NEXT_PUBLIC_CHAIN_ID=84532
```

> The local signer (`SIGNER_BACKEND=local`) is **dev-only**. Production requires Turnkey or
> KMS behind the `Signer` interface. Mainnet is gated on this hardening.

---

## Step 1 — Deploy contracts (Foundry)

Contracts are deployed in this exact order. Each subsequent contract depends on the
address of the previous one.

```bash
# From the contracts/ directory
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

The deploy script (`contracts/script/Deploy.s.sol`) deploys in this order:

1. **MembershipToken** — soulbound ERC721Votes; `MEMBERSHIP_ADMIN` initially held by
   the deployer (guardian multisig address must be provided as a constructor argument or
   set immediately after).
2. **TimelockController** — OZ standard; constructor arguments:
   - `minDelay`: 48 hours (172800 seconds) — the guardian veto window.
   - `proposers`: `[]` (empty; set via role wiring below).
   - `executors`: `[]` (empty; set via role wiring below).
   - `admin`: guardian multisig address (will hold `TIMELOCK_ADMIN`).
3. **DaoGovernor** — constructor: `MembershipToken` address, `TimelockController` address,
   initial settings (votingDelay=1h, votingPeriod=48h, proposalThreshold=1, quorumFraction=40).
4. **AgentRegistry** — constructor: guardian multisig address (holds `REGISTRY_ADMIN`).
5. **RolesModifier** — per-agent Safe modifier; constructor: guardian multisig address
   (holds `ROLES_ADMIN`). One instance per agent Safe (or a shared registry — see
   `contracts/src/RolesModifier.sol`).
6. **RationaleAnchor** — small anchor contract; no privileged roles.
7. **Treasury Safe** — deploy a Gnosis Safe with owner = TimelockController address.
   (Deploy via Safe SDK or `cast send` to the Safe factory; see Gnosis docs for current
   factory address on Base Sepolia.)

After deployment, record all addresses and fill the `MEMBERSHIP_TOKEN`, `GOVERNOR`,
`TIMELOCK`, `AGENT_REGISTRY`, `ROLES_MODIFIER`, `TREASURY_SAFE`, `GUARDIAN_SAFE`,
and `RATIONALE_ANCHOR` fields in `.env`.

---

## Step 2 — Wire roles (constitutional separation)

This is the most critical configuration step. After deploying, roles must be set so:
- **DaoGovernor** is the Timelock's `PROPOSER` and `EXECUTOR`.
- **Guardian multisig** is the Timelock's `CANCELLER` and `TIMELOCK_ADMIN`.
- **Guardian multisig** holds all constitutional admin roles:
  `MEMBERSHIP_ADMIN`, `REGISTRY_ADMIN`, `ROLES_ADMIN`, `UPGRADE_ADMIN`,
  and `DEFAULT_ADMIN_ROLE` (GUARDIAN_ADMIN) on all constitutional contracts.
- **DaoGovernor holds NONE of the above roles.**

```bash
# Grant Governor = Timelock proposer + executor
cast send $TIMELOCK "grantRole(bytes32,address)" \
  $(cast keccak "PROPOSER_ROLE") $GOVERNOR \
  --rpc-url $RPC_URL --private-key $DEPLOYER_KEY

cast send $TIMELOCK "grantRole(bytes32,address)" \
  $(cast keccak "EXECUTOR_ROLE") $GOVERNOR \
  --rpc-url $RPC_URL --private-key $DEPLOYER_KEY

# Grant guardian = Timelock canceller + admin
cast send $TIMELOCK "grantRole(bytes32,address)" \
  $(cast keccak "CANCELLER_ROLE") $GUARDIAN_SAFE \
  --rpc-url $RPC_URL --private-key $DEPLOYER_KEY

cast send $TIMELOCK "grantRole(bytes32,address)" \
  $(cast keccak "TIMELOCK_ADMIN_ROLE") $GUARDIAN_SAFE \
  --rpc-url $RPC_URL --private-key $DEPLOYER_KEY

# Grant guardian = MEMBERSHIP_ADMIN, REGISTRY_ADMIN, ROLES_ADMIN, UPGRADE_ADMIN
# (repeat pattern for each contract + role)
```

After wiring, **verify** constitutional separation with the adversarial test suite:

```bash
forge test --root contracts -vvv --match-test "test_Governor"
# All test_GovernorLacks* tests must pass.
```

---

## Step 3 — Mint membership tokens; members delegate to agent Safes

```bash
# The guardian multisig calls mintMembership for each human member
# (token IDs are sequential starting from 1)
cast send $MEMBERSHIP_TOKEN "mintMembership(address,uint256)" \
  $MEMBER_ADDRESS 1 \
  --rpc-url $RPC_URL

# Each member delegates their voting power to their agent Safe address
cast send $MEMBERSHIP_TOKEN "delegate(address)" \
  $AGENT_SAFE_ADDRESS \
  --rpc-url $RPC_URL --private-key $MEMBER_KEY
```

Verify delegation:

```bash
cast call $MEMBERSHIP_TOKEN "getVotes(address)(uint256)" $AGENT_SAFE_ADDRESS \
  --rpc-url $RPC_URL
# Must return 1 (one delegated vote per member)
```

---

## Step 4 — Deploy per-agent Safes + configure Zodiac Roles

For each agent that will have bounded operational authority:

1. Deploy a Gnosis Safe with owner = the agent's signer key address (local keystore in dev,
   Turnkey/KMS in prod).
2. Deploy (or configure) the `RolesModifier` scoped to that agent's mandate:
   - Set allowed targets from `mandate.scope.allowedTargets`.
   - Set allowed (target, selector) pairs from `mandate.scope.proposalTypes` and the
     mandate's call structures.
   - Set spending caps: `setSpendingCap(agentAddress, tokenAddress, perTx, perEpoch)`.
   - Do **not** permit any selector listed in `reserved-matters.yaml`.

Verify that no reserved selector is permitted:

```bash
pnpm check:reserved --agent $AGENT_SAFE_ADDRESS
# Must report: no reserved selectors permitted
```

---

## Step 5 — Pin mandate docs to IPFS; register agents on-chain

For each agent:

```bash
# Pin the mandate JSON to IPFS
MANDATE_CID=$(pnpm ipfs:pin mandates/treasury-agent-01.json)
MANDATE_URI="ipfs://$MANDATE_CID"

# Compute the canonical hash (sorted keys, no insignificant whitespace)
MANDATE_HASH=$(pnpm mandate:hash mandates/treasury-agent-01.json)

# Register the agent on-chain (called by the member who is the principal)
cast send $AGENT_REGISTRY \
  "registerAgent(address,bytes32,string)" \
  $AGENT_SAFE_ADDRESS $MANDATE_HASH $MANDATE_URI \
  --rpc-url $RPC_URL --private-key $MEMBER_KEY
```

CI asserts that the on-chain hash equals the file hash on every run:

```bash
pnpm check:mandate-hashes
# Fails if any on-chain mandateHash != keccak256(canonical(file))
```

---

## Step 6 — Stand up indexer and dashboard

```bash
# Start the Ponder indexer (reads PONDER_RPC_URL_84532 + deployed addresses from .env)
pnpm --filter indexer dev

# Verify indexer serves data (GraphQL endpoint)
curl http://localhost:42069/graphql \
  -d '{"query":"{ proposals { id state } }"}' | jq .

# Start the dashboard
pnpm --filter dashboard dev
# Open http://localhost:3000
```

Confirm:
- Proposal feed renders (may be empty at this point).
- Agents tab shows registered agents with mandate URIs.
- Members tab shows delegated agents and voting weights.
- Guardian console shows the cancel interface.

---

## Step 7 — Run the scripted end-to-end agent test

This exercises the full path: simulate → propose → vote → queue → execute, plus a bounded
`op_execute`. It also confirms the guardian console can cancel.

```bash
# Full scripted agent run (reference agent in packages/cli or packages/mcp)
pnpm agent:e2e --network base-sepolia

# The script performs:
# 1. simulate_action for a TREASURY_PAYMENT proposal
# 2. create_proposal (pins rationale to IPFS, anchors hash on-chain, submits)
# 3. cast_vote (for each agent delegate)
# 4. Wait for voting period to end (advance time on testnet or use a short period)
# 5. queue() after proposal succeeds
# 6. Guardian leaves the main proposal; guardian cancels a *separate* test proposal
#    (confirms cancel works)
# 7. execute() after minDelay elapses

# Then test bounded operational execution:
pnpm agent:op-execute --mandate mandates/treasury-agent-01.json \
  --target $INVOICE_PAYER --selector "pay(address,uint256)" \
  --amount 100000000  # 100 USDC (within perTx cap)
```

Confirm on dashboard:
- Proposal detail shows simulation result, rationale hash, and IPFS link.
- Votes-by-agent view shows correct principals.
- Guardian console showed the cancelled proposal as "Cancelled".
- Treasury balance reflects the executed payment.

---

## Step 8 — Legal identifier loop (human/counsel step)

> **This step is not automated.** It requires a human decision and (for real filings)
> review by qualified Wyoming counsel.

After all contracts are deployed and verified:

1. Open `legal/articles-statements.md`.
2. Find the `[SMART_CONTRACT_IDENTIFIERS]` placeholder.
3. Fill in the deployed addresses:

```
Smart contract identifiers (Base Sepolia — testnet):
- MembershipToken:  <address>
- DaoGovernor:      <address>
- TimelockController: <address>
- AgentRegistry:    <address>
- RolesModifier:    <address>
- RationaleAnchor:  <address>
- Treasury Safe:    <address>
```

4. For a real Wyoming filing, these identifiers must appear in the articles of organization.
   The articles must be **amended within 30 days** whenever a controlling contract changes
   (see threat-model.md §7 — Upgrade Safety). Failure to amend risks dissolution.
5. Consult counsel before filing or relying on these templates as final legal documents
   (see `legal/DISCLAIMER.md`).

---

## Mainnet gate

Mainnet deployment is **explicitly blocked** until all of the following are in place:

- [ ] `SIGNER_BACKEND=turnkey` or `=kms` — production key custody (Turnkey/HSM) is live
      and the hardened `Signer` implementation passes all tests.
- [ ] All adversarial tests pass against the production-target contract code.
- [ ] Formal verification of the contracts (recommended; see spec §21).
- [ ] Counsel review of `legal/` templates, articles, and operating agreement.
- [ ] `[SMART_CONTRACT_IDENTIFIERS]` populated and articles amendment prepared.
- [ ] Guardian multisig tested on mainnet signers (not test keys).
- [ ] Security audit of the full stack completed.

Do not move real funds or keys into this system before these gates are cleared.

---

## Upgrade runbook (summary)

See `docs/threat-model.md §7` for the full threat analysis. Steps:

1. Deploy new implementation contract (not active yet).
2. Run adversarial tests against the new implementation on an anvil fork of mainnet state.
3. Guardian multisig executes `upgradeToAndCall(newImpl, data)` via `UPGRADE_ADMIN` role.
4. Verify adversarial tests pass on the live upgraded contract.
5. Update `legal/articles-statements.md` `[SMART_CONTRACT_IDENTIFIERS]` with the new address.
6. File articles amendment within 30-day statutory window (counsel step).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `AccessControl: missing role` on proposal execute | Governor lacks a role it needs — or trying to execute a Reserved Matter | Check role wiring (Step 2); Reserved Matters must go through guardian, not Governor |
| Simulation returns `revertReason: execution reverted` | Spending cap exceeded, target not allowed, or reserved selector | Check mandate scope vs. Roles config |
| `MANDATE_HASH_MISMATCH` warning on dashboard | On-chain hash ≠ IPFS file hash | Re-pin correct mandate doc; run `pnpm check:mandate-hashes` |
| Proposal stuck in `Queued` | `minDelay` not elapsed or guardian cancelled | Check timelock ETA in dashboard; if cancelled, it will show `Canceled` state |
| Indexer shows no data | RPC URL wrong, addresses not set in env, or indexer not caught up | Check `PONDER_RPC_URL_84532` and deployed addresses in `.env`; check indexer logs |
