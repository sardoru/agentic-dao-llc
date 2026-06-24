<!-- AUTO-GENERATED from reserved-matters.yaml. Do NOT edit by hand. Run `pnpm gen:reserved`. -->

# Reserved Matters Schedule

> **Template — not legal advice.** See [`DISCLAIMER.md`](./DISCLAIMER.md). Generated from
> `reserved-matters.yaml`, the single source of truth shared with the runtime policy
> engine and proven against the on-chain access-control layer in `contracts/test`.

These matters are reserved to the guardian multisig and a high-threshold human-member
vote. Neither the AI agents nor the DaoGovernor may effect them: on-chain they are gated
behind AccessControl roles the Governor does not hold; in the runtime the policy engine
denies any action touching a reserved selector; in law this schedule and the
code-deference carve-outs bind the company.

| # | Reserved Matter | Guardian Role | On-chain selectors | Enforced in |
| --- | --- | --- | --- | --- |
| 1 | Change the guardian set | `GUARDIAN_ADMIN` | `grantRole(bytes32,address)` (0x2f2ff15d)<br>`revokeRole(bytes32,address)` (0xd547741f)<br>`renounceRole(bytes32,address)` (0x36568abe) | contracts · runtime · legal |
| 2 | Change the timelock minimum delay | `TIMELOCK_ADMIN` | `updateDelay(uint256)` (0x64d62353) | contracts · runtime · legal |
| 3 | Change agent spending caps or Roles configuration | `ROLES_ADMIN` | `setSpendingCap(address,address,uint256,uint256)` (0xd8804832)<br>`setTargetAllowed(address,address,bytes4,bool)` (0x6a3722c5)<br>`setAgentActive(address,bool)` (0xacb5cb8e) | contracts · runtime · legal |
| 4 | Change an agent mandate | `REGISTRY_ADMIN` | `updateMandate(address,bytes32,string)` (0xb51e77d5) | contracts · runtime · legal |
| 5 | Admit or remove members (mint/burn membership) | `MEMBERSHIP_ADMIN` | `mintMembership(address,uint256)` (0x23d91713)<br>`burnMembership(uint256)` (0xe5961754) | contracts · runtime · legal |
| 6 | Upgrade a constitutional contract | `UPGRADE_ADMIN` | `upgradeTo(address)` (0x3659cfe6)<br>`upgradeToAndCall(address,bytes)` (0x4f1ef286) | contracts · runtime · legal |
| 7 | Amend the articles / operating agreement / Reserved Matters schedule | `GUARDIAN_ADMIN` | _(legal only)_ | legal |
| 8 | Dissolve the company | `GUARDIAN_ADMIN` | _(legal only)_ | legal |

## Guardian roles

- **`GUARDIAN_ADMIN`** — DEFAULT_ADMIN_ROLE across constitutional contracts; manages the guardian set.
- **`MEMBERSHIP_ADMIN`** — Mint/burn the soulbound membership token (admit/remove members).
- **`REGISTRY_ADMIN`** — Update agent mandates bound in the AgentRegistry.
- **`ROLES_ADMIN`** — Configure agent spending caps and target/selector allowlists (Roles modifier).
- **`TIMELOCK_ADMIN`** — Change the timelock minDelay (the guardian veto window).
- **`UPGRADE_ADMIN`** — Authorize upgrades of upgradeable constitutional contracts.
