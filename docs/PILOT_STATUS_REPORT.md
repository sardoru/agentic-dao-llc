---
title: "Agentic DAO LLC — Working Committee Pilot: Status Report"
subtitle: "What was done, and what still needs to be done — step by step"
date: "2026-06-24"
---

# Agentic DAO LLC — Working Committee Pilot (CGP-001)

**Testnet status report · 2026-06-24**

Repository: `github.com/sardoru/agentic-dao-llc` · main @ `9617f1e` · Network: **Base Sepolia (84532)**

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
- The **contracts are deployed and verified on Base Sepolia**; constitutional separation holds
  on-chain.
- The **four pilot agents are registered on-chain** with their canonical mandate hashes.

**What remains** is (a) _operational activation_ of the agents (spending caps, voting delegation,
IPFS-pinned mandates), (b) _finishing the auth surface_ (email/passkey + hardening), (c) _wiring
live indexed data_ into the dashboard, and (d) the larger _production / mainnet gates_. Each is
broken into concrete steps in §4.

---

## 2. Live artifacts (quick reference)

| Thing               | Value                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| Dashboard (public)  | **https://agentic-dao-pilot.vercel.app**                                        |
| Vercel project      | `sardorus-projects/agentic-dao-pilot`                                           |
| Governor (Basescan) | https://sepolia.basescan.org/address/0xcf7F6de0D63e8E239dd959b6aa8582F9Ce5465B5 |
| Repo / branch       | `sardoru/agentic-dao-llc` @ `9617f1e`                                           |

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

**Registered pilot agents (AgentRegistry):**

| Agent        | Account                                      | Mandate hash       |
| ------------ | -------------------------------------------- | ------------------ |
| OPS-01       | `0x4e9C86Fd2758A200734d2e7C6F72288dd5Be97c6` | `0x85aec66e…463cb` |
| TREAS-01     | `0xc9dc10c15bCBB9b1b6BEE3C6187172C2e22dC384` | `0x8a633ddc…4cef4` |
| GOV-01       | `0x3f073C95B25D7F16770595402352e71F6345dbBe` | `0xfb0b2d33…b5dd`  |
| DILIGENCE-01 | `0x63695C0b2Ee628B753bCaB2947B9059639084a65` | `0x0a36e27c…66ce`  |

**Credentials (testnet-only) — in `~/Downloads/`:** `agentic-dao-base-sepolia-deployer.txt`,
`agentic-dao-base-sepolia-guardian.txt`, `agentic-dao-agent-{OPS-01,TREAS-01,GOV-01,DILIGENCE-01}.txt`.

---

## 3. What was done — step by step

### 3.1 Pilot instantiation (CGP-001) — commit `ba0f7ec`

The three handed files (`~/Downloads/files-agentic-dao`: the CGP-001 proposal, a profiled
`reserved-matters.yaml`, and `mandate.schema.json`) were adopted and **reconciled to the repo's
real contracts** (an AccessControl-role guardian + an in-house RolesModifier — not the Safe/Zodiac
canonical names the handed YAML assumed).

1. **Mapped the real contract surface** (roles, selectors, deploy address book) with a recon
   sub-agent, to avoid fabricating selectors that don't exist.
2. **Profiled the Reserved Matters source of truth** (`pilot` / `production`). The generator
   (`scripts/gen-reserved-matters.mjs --profile`, default `pilot`) now classifies each matter's
   enforcement as `selector` / `target` / `cap` / `legal`. The pilot's reserved **selector set is
   byte-identical** to the prior set — the pilot only _adds_ two guards.
3. **Added a new deny-by-target policy primitive (RM-PILOT-002):** the engine denies any action
   whose target is a CougarDAO production asset _before_ the per-mandate allow-list — `$COUG`
   baked into `RESERVED_TARGET_SET`, the rest as deploy-time placeholders + an injectable
   `EvalContext.reservedTargets`.
4. **Added the cap guard (RM-PILOT-001)** — the float ceiling, enforced by the RolesModifier caps.
5. **Authored the four pilot agent mandates** (`mandates/pilot/`) + the `OPERATING_EXPENSE`
   proposal type; each forbids every reserved selector and allow-lists no CougarDAO target.
6. **Added the charter** (`governance/CGP-001-…`), **address book** (`config/`), and **legal
   addendum** (`legal/pilot-sandbox-addendum.md`); +24 policy tests.
7. **Verified the full gate:** `pnpm verify`, `check:reserved`, `forge test` (29), `pnpm e2e:local`
   (52 assertions) — all green. Filed issues **#18–#24**.

### 3.2 Wallet-connect (SIWE) authentication — commit `06ffe87`

The dashboard had **no prior auth**, so this added the app's first auth layer.

1. **Sign-In With Ethereum** end-to-end: `GET /api/auth/nonce` → client builds an EIP-4361
   message (`viem/siwe`) → wallet `personal_sign` (free, never a transaction) → `POST
/api/auth/verify` validates chain/nonce/domain/signature (EOA **and** ERC-1271) → a stateless
   `jose` HS256 session cookie. Plus `me` / `logout` routes and a client `AuthProvider` / `useSession`.
2. **Connectors:** injected + Coinbase always; WalletConnect (mobile/QR) when a project id is set.
3. **Multi-method `/login`** (Wallet works; Email-link + Passkey are first-class "configure to
   enable" stubs returning 501). Next 16 `proxy.ts` gates `/guardian`; member/guardian roles are
   resolved on-chain at login.
4. **ADR** `docs/adr/0006-authentication.md`. Filed issues **#25–#28**.

### 3.3 Vercel deployment + OG image + favicon — commits `59f0c16`, `93afcf4`

1. **Linked** `sardorus-projects/agentic-dao-pilot`, set production env (`AUTH_SESSION_SECRET`
   - chain vars).
2. **Fixed a monorepo build break:** the app `tsconfig.json` extended `../../tsconfig.base.json`,
   which isn't uploaded when Vercel's root dir = `apps/dashboard` → made the app tsconfig
   self-contained.
3. **Branded OG image** (`app/opengraph-image.tsx`, generated 1200×630 via `next/og`) + **favicon**
   (`app/icon.svg`) + `metadataBase` / OpenGraph / Twitter metadata.
4. **Made public** (with explicit approval) by disabling Vercel deployment protection.
5. **Verified:** homepage, `/login`, `/opengraph-image` (image/png), `/icon.svg`, and the
   `/guardian → /login` proxy redirect all serve correctly.
6. **Fixed the "wrong chain (expected 84532)" sign-in error:** the app now best-effort switches the
   wallet to Base Sepolia before signing and binds the SIWE message to 84532 unconditionally.

### 3.4 Base Sepolia contract deployment

1. **Generated throwaway testnet keys** (deployer + a distinct guardian); the operator funded the
   deployer; a background balance monitor auto-triggered the deploy on funding.
2. **Deployed** with `forge script Deploy.s.sol --broadcast --slow` → _"ONCHAIN EXECUTION COMPLETE
   & SUCCESSFUL"_ (all ~20 txs for ≈0.0001 ETH). Demo timings: **15-min** timelock veto window,
   **5-min** voting delay, **1-h** voting period.
3. **Verified constitutional separation on-chain:** Governor→timelock wired, `minDelay`=900,
   guardian holds `DEFAULT_ADMIN`, deployer + Governor hold nothing.
4. **Wired the addresses into the dashboard** (`NEXT_PUBLIC_TIMELOCK_ADDRESS`,
   `…_MEMBERSHIP_TOKEN_ADDRESS`, `…_GUARDIAN_ADDRESS`) and redeployed. Recorded in
   `contracts/deployments/base-sepolia.json`.

### 3.5 Pilot agent registration — commit `9617f1e`

1. **Generated four fresh agent keypairs** (OPS-01, TREAS-01, GOV-01, DILIGENCE-01).
2. **Built deployment-specific mandates** bound to the real guardian + the deployer as principal,
   validated them, and computed each **canonical `mandateHash`** (`contracts/deployments/pilot-mandates/`).
3. **Registered all four** via `AgentRegistry.registerAgent(...)` from the deployer (the registrant
   = principal). Two needed a re-send with explicit nonces (public-RPC nonce lag).
4. **Verified on-chain:** `mandateOf(agent)` returns the matching hash + principal, `active=true`,
   for all four.
5. **Wrote credentials** to `~/Downloads/agentic-dao-agent-*.txt` (testnet-only) and a registration
   record (`contracts/deployments/pilot-agents-base-sepolia.json`). No keys committed.

---

## 4. What still needs to be done — step by step

Ordered roughly by what unlocks the most, and what needs no external infrastructure first.

### 4.1 Complete the pilot activation — make the agents operational

The agents are _registered_ but cannot yet spend or vote. To make the pilot fully functional:

1. **Fund the guardian** with a little Base Sepolia ETH (it currently holds 0 and needs gas to
   run admin txs). Send from the deployer or a faucet to `0x924C…baDB`.
2. **Configure spending caps** for the operational agents (guardian holds `ROLES_ADMIN`):
   `RolesModifier.setSpendingCap(OPS-01, USDC, perTx, perEpoch)` and the same for TREAS-01, using
   the caps in their mandates (OPS-01: $500 / $2 000; TREAS-01: $1 000 / $5 000).
3. **Allow-list the bounded-op target** for each: `RolesModifier.setTargetAllowed(agent, USDC,
transferSelector, true)`.
4. **Activate** the operational agents: `RolesModifier.setAgentActive(OPS-01, true)` and for TREAS-01.
5. **Create voting power:** `MembershipToken.mintMembership(principal, tokenId)` (guardian), then the
   principal calls `MembershipToken.delegate(agentAccount)` so the agent carries weight (per the
   one-member-one-vote model, delegate per agent or use a member per agent).
6. **Pin the mandate docs to IPFS** (issue #3) and `AgentRegistry.updateMandate(agent, sameHash,
realURI)` (guardian) to replace the placeholder `ipfs://pending-*` URIs. The hash stays the same.
7. **Smoke-test the loop** end-to-end against the live deployment: an agent drafts a proposal →
   votes → queue → (wait the timelock) → execute, and a Roles-metered bounded op — mirroring
   `pnpm e2e:local` but on Base Sepolia. _(Tracked: issue #20 for caps/registration; #1/#4 for the
   live e2e + hash-in-CI.)_

### 4.2 Finish the authentication surface

1. **Email magic-link login** (issue #25): wire an email/identity provider (e.g. Resend/Supabase),
   a single-use token, and a verify handler that issues the same session cookie. The `/login` UI
   tab already exists.
2. **Passkey / WebAuthn login** (issue #26): add a WebAuthn library + credential store + register/
   authenticate handlers issuing the same session cookie.
3. **Role resolution + agent detection** (issue #27): now that addresses are deployed, confirm
   `member` (MembershipToken balance) and `guardian` (env) resolve on the live site, and add
   `agent` detection from the AgentRegistry.
4. **Auth hardening** (issue #28): confirm `AUTH_SESSION_SECRET` strength in prod, add a CSRF token
   for any cross-site POST, consider a server-side nonce store, and rate-limit `/api/auth/verify`.

### 4.3 Wire live indexed data into the dashboard

1. **Stand up the Ponder indexer** against the deployed contracts (issue #16) and set
   `NEXT_PUBLIC_INDEXER_URL`.
2. **Replace the dashboard's fixtures** with live reads (the `app/lib/client.ts` live branches are
   currently TODO stubs) so proposals / agents / members / treasury reflect chain state, and the
   mandate-hash-mismatch warning verifies the registered hashes against the (pinned) docs.

### 4.4 Reserved-matter completeness

1. **Resolve the RM-PILOT-002 CougarDAO target placeholders** into the runtime ring-fence (issue
   #18) once the CougarDAO production addresses are known — inject them via
   `EvalContext.reservedTargets` and assert at startup that none are unresolved.
2. **Add a live RM-PILOT-002 deny-by-target proof** to the on-chain e2e (issue #19).
3. **Promote RM-CONST-009 (voting-parameter changes)** into the pilot runtime deny-set after
   confirming it doesn't block legitimate governance (issue #23).

### 4.5 Replace the demo guardian with a real multisig

The deployed guardian is a single generated demo key. For any meaningful pilot, redeploy (or
rotate roles) so the guardian is a **2-of-3 / 3-of-5 committee multisig** (e.g. a Safe), and
consider moving to **production governance timings** (the CGP-001 48-hour veto window) rather than
the demo 15-minute window.

### 4.6 Production / mainnet gates (out of v1 scope, tracked)

These are required before anything beyond testnet and before a CougarDAO adoption:

- **Hardened key custody** — replace the local signer with Turnkey/KMS (issue #6).
- **Audited Zodiac Roles Modifier v2** in place of the minimal in-house one (issue #5).
- **Formal verification** of the core contracts (issue #7).
- **UUPS upgradeability** with guardian-only `UPGRADE_ADMIN` (issue #17).
- **Counsel review** of the legal templates + sub-entity formation (issues #13, #24).

### 4.7 CougarDAO graduation (the `production` profile)

Only after the pilot's graduation criteria (CGP-001 §7) are met: implement the production-profile
contract surfaces the YAML references but the repo doesn't yet ($COUG token, Fabrica/MetaStreet
RWA targets, voting-param setters — issue #21’s umbrella), then bring a separate constitutional
supermajority proposal to adopt the framework in CougarDAO.

---

## 5. How to operate the live pilot (mini-runbook)

- **Sign in:** open the dashboard, connect a wallet, click _Sign in with Ethereum_, approve the
  "switch to Base Sepolia" prompt, and sign the (free) message. The guardian console at `/guardian`
  requires a session; the cancel button additionally requires the guardian role.
- **Add Base Sepolia to a wallet (if needed):** Chain ID `84532`, RPC `https://sepolia.base.org`,
  currency ETH, explorer `https://sepolia.basescan.org`.
- **Inspect on-chain** (examples):
  - Governor's timelock: `cast call 0xcf7F…65B5 "timelock()(address)" --rpc-url https://sepolia.base.org`
  - An agent's registration: `cast call 0xCc6A…6319 "mandateOf(address)" <agentAccount> --rpc-url …`
- **Reproduce the whole system locally (no creds):** `pnpm e2e:local` (boots anvil, drives the real
  runtime through propose→vote→queue→execute + a bounded op + a guardian veto, 52 assertions).

---

## 6. Reference

### 6.1 Commits this session

| Commit    | What                                                           |
| --------- | -------------------------------------------------------------- |
| `ba0f7ec` | Instantiate the Working Committee DAO pilot (CGP-001)          |
| `06ffe87` | SIWE wallet-connect authentication (multi-method login)        |
| `59f0c16` | Branded OG image + favicon; self-contained tsconfig for Vercel |
| `93afcf4` | Auto-switch wallet to Base Sepolia on sign-in + record deploy  |
| `9617f1e` | Register the 4 pilot agents in the Base Sepolia AgentRegistry  |

### 6.2 Open issues (grouped)

- **Pilot activation / deploy:** #20 (agent caps + registration), #1 (Base Sepolia e2e), #4
  (mandate-hash in CI), #2 (Tenderly), #3 (IPFS pinning), #16 (indexer views).
- **Reserved matters:** #18 (resolve ring-fence targets), #19 (live RM-PILOT-002 proof), #23
  (promote voting-param matter), #21 (production-profile contract surfaces).
- **Auth:** #25 (magic-link), #26 (passkey), #27 (role/agent resolution), #28 (hardening).
- **Mainnet gates:** #5 (Zodiac v2), #6 (Turnkey/KMS), #7 (formal verification), #17 (UUPS).
- **Legal:** #13, #14, #24 (counsel review + Reserved-Matter thresholds).

### 6.3 Credentials inventory (testnet only)

All in `~/Downloads/`, `chmod 600`, **Base Sepolia testnet keys with no real value** — never reuse
on mainnet, never commit:

- `agentic-dao-base-sepolia-deployer.txt` — deployer / principal (funded for gas).
- `agentic-dao-base-sepolia-guardian.txt` — guardian veto + admin roles.
- `agentic-dao-agent-OPS-01.txt`, `…-TREAS-01.txt`, `…-GOV-01.txt`, `…-DILIGENCE-01.txt` — the four
  agent accounts.

### 6.4 Disclaimers

Testnet only (Base Sepolia 84532). The `legal/` materials are templates, not legal advice; counsel
review gates any real filing. The demo guardian is a single generated key and must be replaced with
a real multisig for a live pilot. Mainnet is explicitly gated on the items in §4.6.
