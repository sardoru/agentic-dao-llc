<!-- AUTO-GENERATED from reserved-matters.yaml. Do NOT edit by hand. Run `pnpm gen:reserved`. -->

# Reserved Matters Schedule

**Profile:** `pilot` — CougarDAO Working Committee DAO (sandbox)

> **Template — not legal advice.** See [`DISCLAIMER.md`](./DISCLAIMER.md). Generated from
> `reserved-matters.yaml`, the single source of truth shared with the runtime policy
> engine and proven against the on-chain access-control layer in `contracts/test`.

These matters are reserved to the guardian multisig and a high-threshold human-member
vote. Neither the AI agents nor the DaoGovernor may effect them: on-chain they are gated
behind AccessControl roles the Governor does not hold; in the runtime the policy engine
denies any action touching a reserved selector OR a reserved target; in law this schedule
and the code-deference carve-outs bind the company.

| # | ID | Reserved Matter | Role | Enforcement | On-chain | Enforced in |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `RM-CONST-001` | Change the guardian set | `GUARDIAN_ADMIN` | selector | `grantRole(bytes32,address)` (0x2f2ff15d)<br>`revokeRole(bytes32,address)` (0xd547741f)<br>`renounceRole(bytes32,address)` (0x36568abe) | contracts · runtime · legal |
| 2 | `RM-CONST-002` | Change the timelock minimum delay | `TIMELOCK_ADMIN` | selector | `updateDelay(uint256)` (0x64d62353) | contracts · runtime · legal |
| 3 | `RM-CONST-003` | Change agent spending caps or Roles configuration | `ROLES_ADMIN` | selector | `setSpendingCap(address,address,uint256,uint256)` (0xd8804832)<br>`setTargetAllowed(address,address,bytes4,bool)` (0x6a3722c5)<br>`setAgentActive(address,bool)` (0xacb5cb8e) | contracts · runtime · legal |
| 4 | `RM-CONST-004` | Change an agent mandate | `REGISTRY_ADMIN` | selector | `updateMandate(address,bytes32,string)` (0xb51e77d5) | contracts · runtime · legal |
| 5 | `RM-CONST-005` | Admit or remove members (mint/burn membership) | `MEMBERSHIP_ADMIN` | selector | `mintMembership(address,uint256)` (0x23d91713)<br>`burnMembership(uint256)` (0xe5961754) | contracts · runtime · legal |
| 6 | `RM-CONST-006` | Upgrade a constitutional contract | `UPGRADE_ADMIN` | selector | `upgradeTo(address)` (0x3659cfe6)<br>`upgradeToAndCall(address,bytes)` (0x4f1ef286) | runtime · legal _(contract pending)_ |
| 7 | `RM-CONST-007` | Amend the articles / operating agreement / Reserved Matters schedule | `GUARDIAN_ADMIN` | legal | _(legal only)_ | legal |
| 8 | `RM-CONST-008` | Dissolve the entity | `GUARDIAN_ADMIN` | legal | _(legal only)_ | legal |
| 9 | `RM-PILOT-001` | Move funds beyond the ring-fenced pilot float | `ROLES_ADMIN` | cap | `transfer(address,uint256)` (0xa9059cbb)<br>`transferFrom(address,address,uint256)` (0x23b872dd)<br>_(cap-metered)_ | contracts · runtime · legal |
| 10 | `RM-PILOT-002` | Execute any action against CougarDAO production assets or contracts | `GUARDIAN_ADMIN` | target | _all selectors on:_<br>`0xa78ce0420a057bd27f214318920a8ff77035f29b`<br>`${COUGARDAO_GOVERNANCE_CORE}`<br>`${COUGARDAO_TREASURY}`<br>`${FABRICA_DEED_NFT}` | runtime · legal |

## Enforcement notes

- **`RM-PILOT-001`** — Primary enforcement is the agent-account allowance cap in the RolesModifier (PER_TX_CAP_EXCEEDED / PER_EPOCH_CAP_EXCEEDED); this entry makes the ceiling a hard Reserved Matter as defense-in-depth. The metered selectors stay callable within caps, so they are NOT added to RESERVED_SELECTOR_SET.

## Deploy-time targets to resolve

These symbolic targets must be resolved to concrete addresses before mainnet and supplied
to the runtime (see `config/pilot.addresses.example.json`):

- `${COUGARDAO_GOVERNANCE_CORE}`
- `${COUGARDAO_TREASURY}`
- `${FABRICA_DEED_NFT}`

## Guardian roles

- **`GUARDIAN_ADMIN`** — DEFAULT_ADMIN_ROLE across constitutional contracts; manages the guardian set and every role grant/revoke.
- **`MEMBERSHIP_ADMIN`** — Mint/burn the soulbound membership token (admit/remove members).
- **`REGISTRY_ADMIN`** — Update agent mandates bound in the AgentRegistry.
- **`ROLES_ADMIN`** — Configure agent spending caps and target/selector allowlists (RolesModifier).
- **`TIMELOCK_ADMIN`** — Change the timelock minDelay (the guardian veto window).
- **`UPGRADE_ADMIN`** — Authorize upgrades of upgradeable constitutional contracts (forward-looking; see issue: UUPS upgradeability).
