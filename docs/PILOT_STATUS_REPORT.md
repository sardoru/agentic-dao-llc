---
title: "Agentic DAO LLC — Working Committee Pilot: Status Report"
subtitle: "What was done, and what still needs to be done — step by step"
date: "2026-06-24"
---

# Agentic DAO LLC — Working Committee Pilot (CGP-001)

**Testnet status report · 2026-06-24**

Repository: `github.com/sardoru/agentic-dao-llc` · main @ `70aae80` · Network: **Base Sepolia (84532)**

---

## 1. Executive summary

**Agentic DAO LLC** is a Wyoming DAO LLC in which AI agents hold delegated voting power and
govern on-chain, bounded by **one mandate enforced in three independent layers** — smart
contracts, the agent runtime, and the legal operating agreement — with **constitutional
separation** (the Governor holds no admin roles; a guardian multisig holds them all).

This report covers the **Working Committee DAO pilot** (proposal CGP-001): a separate,
ring-fenced sandbox that proves the framework at low stakes before any CougarDAO adoption.

**Where it stands today:**

- The pilot is **instantiated in code** (profiled Reserved Matters, four agent mandates, the
  CougarDAO ring-fence) and the full test gate is green.
- The **dashboard is deployed and public** on Vercel (SIWE wallet login, branded OG/favicon).
- The **contracts are deployed on Base Sepolia** (constitutional separation verified on-chain), and
  **every contract's source is verified on Basescan** (Etherscan v2, "Pass - Verified") and mirrored
  on **Sourcify** (exact-match) — public, inspectable source, not just bytecode.
- The **four pilot agents are registered on-chain** with their canonical mandate hashes.
- The **guardian is funded** and the **two operational agents (OPS-01, TREAS-01) are activated** —
  on-chain spending caps + allow-list + active flag are set and verified.

**What remains** is (a) the rest of the _operational activation_ (voting delegation, a little gas
to the agent accounts, IPFS-pinned mandates), (b) _finishing the auth surface_ (email/passkey +
hardening), (c) _wiring live indexed data_ into the dashboard, and (d) the larger _production /
mainnet gates_. Each is broken into concrete steps in §5.

---

## 2. Live artifacts (quick reference)

| Thing               | Value                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| Dashboard (public)  | **https://agentic-dao-pilot.vercel.app**                                        |
| Vercel project      | `sardorus-projects/agentic-dao-pilot`                                           |
| Governor (Basescan) | https://sepolia.basescan.org/address/0xcf7F6de0D63e8E239dd959b6aa8582F9Ce5465B5 |
| Repo / branch       | `sardoru/agentic-dao-llc` @ `70aae80`                                           |

**Base Sepolia deployment (pilot profile, demo timings):**

| Contract             | Address                                      |
| -------------------- | -------------------------------------------- |
| MembershipToken      | `0x6521A771CA57fD2e22C76486FE17830E3D742c01` |
| GuardedTimelock      | `0xCCea7837Ae5C555c13F9bb984A39C39d4C8736CD` |
| DaoGovernor          | `0xcf7F6de0D63e8E239dd959b6aa8582F9Ce5465B5` |
| AgentRegistry        | `0xCc6A8ADd07B1fD670Da953750d8eFDa599186319` |
| RolesModifier        | `0xf3CBebdD405031c4BA0806aF62a796a78084afFc` |
| RationaleAnchor      | `0x84F19BA66D0a779C38FF14102ddd448996136037` |
| Treasury             | `0x902f219A170240218D022b35d58B4328B44562D3` |
| Guardian (demo)      | `0x924C2CF41cc502EfA98416EE42A8a05e3923baDB` |
| Deployer / principal | `0xD3013c2b198E80806de8e7886237De5eBB8880ED` |

**Source verification:** all seven contracts are **verified on Basescan** (Etherscan v2 — "Pass -
Verified") and **mirrored on Sourcify** (exact-match). The Basescan links in §3 open the published,
inspectable source — not just bytecode.

**Registered + activated pilot agents:**

| Agent        | Account                                      | Mandate hash       | Status                          |
| ------------ | -------------------------------------------- | ------------------ | ------------------------------- |
| OPS-01       | `0x4e9C86Fd2758A200734d2e7C6F72288dd5Be97c6` | `0x85aec66e…463cb` | **active** · $500/$2,000 USDC   |
| TREAS-01     | `0xc9dc10c15bCBB9b1b6BEE3C6187172C2e22dC384` | `0x8a633ddc…4cef4` | **active** · $1,000/$5,000 USDC |
| GOV-01       | `0x3f073C95B25D7F16770595402352e71F6345dbBe` | `0xfb0b2d33…b5dd`  | registered · governance         |
| DILIGENCE-01 | `0x63695C0b2Ee628B753bCaB2947B9059639084a65` | `0x0a36e27c…66ce`  | registered · advisory           |

**Credentials (testnet-only):** the deployer, guardian, and four agent private keys are secured in
an **encrypted 1Password vault** — never stored in plaintext and never committed to the repository.

---

## 3. Scan to open (QR codes + links)

Every QR encodes the link beside it. **On a computer, click the link; on a printout, scan the QR.**

### Application

| Item       | Scan                  | Link                                                                             |
| ---------- | --------------------- | -------------------------------------------------------------------------------- |
| Dashboard  | ![](qr/dashboard.png) | [agentic-dao-pilot.vercel.app](https://agentic-dao-pilot.vercel.app)             |
| Repository | ![](qr/repo.png)      | [github.com/sardoru/agentic-dao-llc](https://github.com/sardoru/agentic-dao-llc) |

### Contracts (Base Sepolia · Basescan)

| Contract        | Scan                   | Block explorer                                                                                 |
| --------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| DaoGovernor     | ![](qr/governor.png)   | [0xcf7F…65B5](https://sepolia.basescan.org/address/0xcf7F6de0D63e8E239dd959b6aa8582F9Ce5465B5) |
| GuardedTimelock | ![](qr/timelock.png)   | [0xCCea…36CD](https://sepolia.basescan.org/address/0xCCea7837Ae5C555c13F9bb984A39C39d4C8736CD) |
| MembershipToken | ![](qr/membership.png) | [0x6521…2c01](https://sepolia.basescan.org/address/0x6521A771CA57fD2e22C76486FE17830E3D742c01) |
| AgentRegistry   | ![](qr/registry.png)   | [0xCc6A…6319](https://sepolia.basescan.org/address/0xCc6A8ADd07B1fD670Da953750d8eFDa599186319) |
| RolesModifier   | ![](qr/roles.png)      | [0xf3CB…afFc](https://sepolia.basescan.org/address/0xf3CBebdD405031c4BA0806aF62a796a78084afFc) |
| RationaleAnchor | ![](qr/anchor.png)     | [0x84F1…6037](https://sepolia.basescan.org/address/0x84F19BA66D0a779C38FF14102ddd448996136037) |
| Treasury        | ![](qr/treasury.png)   | [0x902f…62D3](https://sepolia.basescan.org/address/0x902f219A170240218D022b35d58B4328B44562D3) |

### Accounts (Base Sepolia · Basescan)

| Account              | Scan                  | Block explorer                                                                                 |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| Guardian             | ![](qr/guardian.png)  | [0x924C…baDB](https://sepolia.basescan.org/address/0x924C2CF41cc502EfA98416EE42A8a05e3923baDB) |
| Deployer / principal | ![](qr/deployer.png)  | [0xD301…80ED](https://sepolia.basescan.org/address/0xD3013c2b198E80806de8e7886237De5eBB8880ED) |
| OPS-01               | ![](qr/ops.png)       | [0x4e9C…97c6](https://sepolia.basescan.org/address/0x4e9C86Fd2758A200734d2e7C6F72288dd5Be97c6) |
| TREAS-01             | ![](qr/treas.png)     | [0xc9dc…C384](https://sepolia.basescan.org/address/0xc9dc10c15bCBB9b1b6BEE3C6187172C2e22dC384) |
| GOV-01               | ![](qr/gov.png)       | [0x3f07…dbBe](https://sepolia.basescan.org/address/0x3f073C95B25D7F16770595402352e71F6345dbBe) |
| DILIGENCE-01         | ![](qr/diligence.png) | [0x6369…4a65](https://sepolia.basescan.org/address/0x63695C0b2Ee628B753bCaB2947B9059639084a65) |

---

## 4. What was done — step by step

### 4.1 Pilot instantiation (CGP-001) — commit `ba0f7ec`

The three handed files (the CGP-001 proposal, a profiled `reserved-matters.yaml`, and
`mandate.schema.json`) were adopted and **reconciled to the repo's real contracts** (an
AccessControl-role guardian + an in-house RolesModifier — not the Safe/Zodiac canonical names the
handed YAML assumed).

1. **Mapped the real contract surface** (roles, selectors, deploy address book) with a recon
   sub-agent, to avoid fabricating selectors that don't exist.
2. **Profiled the Reserved Matters source of truth** (`pilot` / `production`). The generator
   classifies each matter's enforcement as `selector` / `target` / `cap` / `legal`; the pilot's
   reserved **selector set is byte-identical** to the prior set — it only _adds_ two guards.
3. **Added a new deny-by-target policy primitive (RM-PILOT-002):** the engine denies any action
   whose target is a CougarDAO production asset _before_ the per-mandate allow-list.
4. **Added the cap guard (RM-PILOT-001)** — the float ceiling, enforced by the RolesModifier caps.
5. **Authored the four pilot agent mandates** + the `OPERATING_EXPENSE` proposal type.
6. **Added the charter, address book, and legal addendum**; +24 policy tests.
7. **Verified the full gate:** `pnpm verify`, `check:reserved`, `forge test` (29), `pnpm e2e:local`
   (52 assertions) — all green. Filed issues **#18–#24**.

### 4.2 Wallet-connect (SIWE) authentication — commit `06ffe87`

The dashboard had **no prior auth**, so this added the app's first auth layer.

1. **Sign-In With Ethereum** end-to-end: nonce → EIP-4361 message → wallet `personal_sign` (free,
   never a transaction) → server verify (chain/nonce/domain/signature; EOA **and** ERC-1271) → a
   stateless `jose` session cookie. Plus `me` / `logout` and a client `AuthProvider`.
2. **Connectors:** injected + Coinbase always; WalletConnect (mobile/QR) when a project id is set.
3. **Multi-method `/login`** (Wallet works; Email-link + Passkey are first-class "configure to
   enable" stubs). Next 16 `proxy.ts` gates `/guardian`; roles resolved on-chain at login.
4. **ADR** `docs/adr/0006-authentication.md`. Filed issues **#25–#28**.

### 4.3 Vercel deployment + OG image + favicon — commits `59f0c16`, `93afcf4`

1. **Linked** the Vercel project, set production env (`AUTH_SESSION_SECRET` + chain vars).
2. **Fixed a monorepo build break** (made the app `tsconfig.json` self-contained).
3. **Branded OG image** (`next/og`, 1200×630) + **favicon** + OpenGraph/Twitter metadata.
4. **Made public** (with approval) and verified the routes + the `/guardian → /login` proxy gate.
5. **Fixed the "wrong chain (expected 84532)" sign-in error** — the app now best-effort switches the
   wallet to Base Sepolia before signing and binds the message to 84532.

### 4.4 Base Sepolia contract deployment

1. **Generated throwaway testnet keys** (deployer + a distinct guardian); funded the deployer.
2. **Deployed** with `forge script Deploy.s.sol --broadcast --slow` → all contracts live. Demo
   timings: **15-min** timelock veto window, **5-min** voting delay, **1-h** voting period.
3. **Verified constitutional separation on-chain:** Governor→timelock wired, `minDelay`=900,
   guardian holds `DEFAULT_ADMIN`, deployer + Governor hold nothing.
4. **Wired the addresses into the dashboard** and redeployed. Recorded in
   `contracts/deployments/base-sepolia.json`.

### 4.5 Pilot agent registration — commit `9617f1e`

1. **Generated four fresh agent keypairs.**
2. **Built deployment-specific mandates** bound to the real guardian + deployer-as-principal,
   validated them, and computed each **canonical `mandateHash`**.
3. **Registered all four** via `AgentRegistry.registerAgent(...)`.
4. **Verified on-chain:** `mandateOf(agent)` returns the matching hash + principal, `active=true`.

### 4.6 Guardian funding + agent activation — commit `ef66d84`

1. **Funded the guardian** (0.00005 ETH) so it has gas for `ROLES_ADMIN` actions.
2. **Activated the two operational agents** in the RolesModifier (guardian = `ROLES_ADMIN`), all
   verified on-chain by reading the contract state:
   - **OPS-01** — `active=true`, cap **$500/tx · $2,000/epoch** USDC, `USDC.transfer` allow-listed.
   - **TREAS-01** — `active=true`, cap **$1,000/tx · $5,000/epoch** USDC, `USDC.transfer` allow-listed.
3. **GOV-01 + DILIGENCE-01** are governance/advisory and hold no RolesModifier role (no spending);
   their activation is voting delegation (see §5.1).

OPS-01 and TREAS-01 can now execute bounded `USDC.transfer` operations within caps via
`execTransactionWithRole`; the contract reverts anything over cap or off the allow-list.

### 4.7 Contract source verification — commits `6f8f237`, `70aae80`

1. **Verified all seven contracts on Sourcify** (`exact_match`) via `forge verify-contract --verifier
sourcify` — decentralized, no API key.
2. **Verified all seven on Basescan** (Etherscan v2 API, with `--guess-constructor-args`) — every
   contract reports **"Pass - Verified"**. The Basescan address pages now display published,
   human-readable source.

The deployment is now fully inspectable end to end: anyone can read the source, confirm it matches the
deployed bytecode, and re-derive the role checks (Guardian holds everything, Governor holds nothing)
from the verified code rather than taking our word for it.

---

## 5. What still needs to be done — step by step

### 5.1 Finish the pilot activation

The agents are registered and (for OPS-01/TREAS-01) operationally active. To complete the loop:

1. **Create voting power:** `MembershipToken.mintMembership(member, tokenId)` (guardian), then the
   member calls `MembershipToken.delegate(agentAccount)` so the agent carries weight (one member per
   agent under the equal-weight model).
2. **Fund the agent accounts** with a little Base Sepolia ETH so they can send their own ops.
3. **Pin the mandate docs to IPFS** (issue #3) and `AgentRegistry.updateMandate(agent, sameHash,
realURI)` (guardian) to replace the placeholder `ipfs://pending-*` URIs (the hash stays the same).
4. **Smoke-test end-to-end on Base Sepolia:** an agent drafts a proposal → votes → queue → (wait the
   timelock) → execute, plus a Roles-metered bounded op — mirroring `pnpm e2e:local` but on testnet.
   _(Tracked: #20 for activation; #1/#4 for live e2e + hash-in-CI.)_

### 5.2 Finish the authentication surface

1. **Email magic-link login** (#25) — wire an email/identity provider + verify handler.
2. **Passkey / WebAuthn login** (#26).
3. **Role resolution + agent detection** (#27) — confirm member/guardian resolve on the live site;
   add agent detection from the AgentRegistry.
4. **Auth hardening** (#28) — CSRF token, server-side nonce store, rate-limit `/api/auth/verify`.

### 5.3 Wire live indexed data into the dashboard

1. **Stand up the Ponder indexer** against the deployed contracts (#16); set `NEXT_PUBLIC_INDEXER_URL`.
2. **Replace the dashboard fixtures** with live reads so proposals / agents / members / treasury
   reflect chain state, and the mandate-hash-mismatch warning verifies the registered hashes.

### 5.4 Reserved-matter completeness

1. **Resolve the RM-PILOT-002 CougarDAO target placeholders** into the runtime ring-fence (#18).
2. **Add a live RM-PILOT-002 deny-by-target proof** to the on-chain e2e (#19).
3. **Promote RM-CONST-009 (voting-parameter changes)** into the pilot runtime deny-set (#23).

### 5.5 Replace the demo guardian with a real multisig

The deployed guardian is a single generated demo key. For any meaningful pilot, move the guardian
to a **2-of-3 / 3-of-5 committee multisig** (e.g. a Safe), and consider **production governance
timings** (the CGP-001 48-hour veto window) instead of the demo 15-minute window.

### 5.6 Production / mainnet gates (out of v1 scope, tracked)

Required before anything beyond testnet and before a CougarDAO adoption:

- **Hardened key custody** — Turnkey/KMS (#6).
- **Audited Zodiac Roles Modifier v2** (#5).
- **Formal verification** of the core contracts (#7).
- **UUPS upgradeability** with guardian-only `UPGRADE_ADMIN` (#17).
- **Counsel review** of the legal templates + sub-entity formation (#13, #24).

### 5.7 CougarDAO graduation (the `production` profile)

After the pilot's graduation criteria (CGP-001 §7) are met: implement the production-profile contract
surfaces the YAML references ($COUG token, Fabrica/MetaStreet RWA targets, voting-param setters —
#21), then bring a separate constitutional supermajority proposal to adopt the framework in CougarDAO.

---

## 6. How to operate the live pilot (mini-runbook)

### Get Base Sepolia test ETH (free)

To sign in and transact you'll need a little **Base Sepolia ETH** for gas — it's free from a faucet
(testnet, not real money). Paste your wallet address into either faucet below; a few hundredths of an
ETH is plenty for many transactions.

| Faucet            | Scan                        | Link                                                                                                                   |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Google Cloud Web3 | ![](qr/faucet-google.png)   | [cloud.google.com/application/web3/faucet/base/sepolia](https://cloud.google.com/application/web3/faucet/base/sepolia) |
| Coinbase (CDP)    | ![](qr/faucet-coinbase.png) | [portal.cdp.coinbase.com/products/faucet](https://portal.cdp.coinbase.com/products/faucet)                             |

### Operate

- **Sign in:** open the dashboard, connect a wallet, click _Sign in with Ethereum_, approve the
  "switch to Base Sepolia" prompt, and sign the (free) message. The guardian console at `/guardian`
  requires a session; the cancel button additionally requires the guardian role.
- **Add Base Sepolia to a wallet (if needed):** Chain ID `84532`, RPC `https://sepolia.base.org`,
  currency ETH, explorer `https://sepolia.basescan.org`.
- **Inspect on-chain** (examples):
  - Read the **verified source**: open any contract on [Basescan](https://sepolia.basescan.org/address/0xcf7F6de0D63e8E239dd959b6aa8582F9Ce5465B5#code) — the **Contract** tab shows the published, verified code (mirrored on Sourcify).
  - Governor's timelock: `cast call 0xcf7F…65B5 "timelock()(address)" --rpc-url https://sepolia.base.org`
  - An agent's registration: `cast call 0xCc6A…6319 "mandateOf(address)" <agentAccount> --rpc-url …`
  - An agent's cap: `cast call 0xf3CB…afFc "caps(address,address)(uint256,uint256,bool)" <agent> <USDC> …`
- **Reproduce the whole system locally (no creds):** `pnpm e2e:local` (boots anvil, drives the real
  runtime through propose→vote→queue→execute + a bounded op + a guardian veto, 52 assertions).

---

## 7. Reference

### 7.1 Commits this session

| Commit    | What                                                              |
| --------- | ----------------------------------------------------------------- |
| `ba0f7ec` | Instantiate the Working Committee DAO pilot (CGP-001)             |
| `06ffe87` | SIWE wallet-connect authentication (multi-method login)           |
| `59f0c16` | Branded OG image + favicon; self-contained tsconfig for Vercel    |
| `93afcf4` | Auto-switch wallet to Base Sepolia on sign-in + record deploy     |
| `9617f1e` | Register the 4 pilot agents in the Base Sepolia AgentRegistry     |
| `ef66d84` | Fund the guardian + activate OPS-01/TREAS-01 in the RolesModifier |
| `6f8f237` | Verify all 7 contracts on Sourcify (exact-match)                  |
| `70aae80` | Verify all 7 contracts on Basescan (Etherscan v2) + Sourcify      |

### 7.2 Open issues (grouped)

- **Pilot activation / deploy:** #20, #1, #4, #2, #3, #16.
- **Reserved matters:** #18, #19, #23, #21.
- **Auth:** #25, #26, #27, #28.
- **Mainnet gates:** #5, #6, #7, #17.
- **Legal:** #13, #14, #24.

### 7.3 Credentials (testnet only)

All testnet private keys — the deployer, the guardian, and the four agent accounts — are secured in
an **encrypted 1Password vault**. They are **never stored in plaintext on disk and never committed**
to the repository. They are Base Sepolia keys with no real value; the demo guardian must still be
replaced with a real multisig before a live pilot (see §5.5).

### 7.4 Disclaimers

Testnet only (Base Sepolia 84532). The `legal/` materials are templates, not legal advice; counsel
review gates any real filing. The demo guardian is a single generated key and must be replaced with a
real multisig. Mainnet is explicitly gated on the items in §5.6.
