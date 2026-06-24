# ADR 0006 — Dashboard Authentication: SIWE Wallet-Connect, Multi-Method

**Status:** Accepted

---

## Context

The governance dashboard (`apps/dashboard`) shipped as a read-only fixtures view whose only
identity signal was wallet connection (`wagmi` `injected()`), used to show/hide a guardian
cancel button. There was no notion of a logged-in user, no server session, and no API surface.

For a DAO whose participants are identified on-chain — members hold a soulbound `MembershipToken`,
the guardian holds the `CANCELLER` role, agents are bound in the `AgentRegistry` — the natural
credential is the wallet itself. We want users to **authenticate**, not merely connect, so the app
can (a) gate sensitive routes (the guardian console) and (b) resolve who the connected address is
(member / guardian) for the UI.

The request was to add wallet-connect authentication "in addition to" a magic-link/passkey login.
No such login existed in this repo, so this ADR introduces the app's first auth layer, designed so
the other two methods are first-class extension points rather than an afterthought.

## Decision

**Primary method — Sign-In With Ethereum (EIP-4361 / SIWE).** Implemented end to end:

1. `GET /api/auth/nonce` issues a single-use nonce bound to the browser in a short-lived httpOnly
   cookie.
2. The client builds an EIP-4361 message (`viem/siwe` `createSiweMessage`) for the connected
   address + chain + site domain + nonce, and asks the wallet to `personal_sign` it (free; **never**
   a transaction).
3. `POST /api/auth/verify` validates the message (chain, nonce, domain binding, signature) via
   `viem/siwe` `verifySiweMessage` — which supports both EOAs and ERC-1271 smart-contract wallets
   (e.g. a guardian multisig) — then resolves roles and issues the session.

**Session — stateless signed JWT cookie.** A `jose` HS256 JWT in an httpOnly, SameSite=Lax,
Secure-in-prod cookie (`adao_session`). No database: the SIWE signature is the credential; the JWT
just carries `{ address, chainId, roles, method }` for the session lifetime (7 days). Being a JWT,
it verifies on the **edge runtime**, so `middleware.ts` can gate routes without a DB round-trip.

**Connectors.** `injected()` + `coinbaseWallet()` always; `walletConnect()` (mobile / QR) when
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set. So "wallet connect" covers browser, Coinbase, and the
WalletConnect protocol.

**Role resolution.** On login, `resolveRoles(address)` best-effort reads on-chain: guardian (env
compare) and member (`MembershipToken.balanceOf > 0`). Reads are wrapped — pre-deploy (addresses
unset) or RPC error degrades gracefully to `["connected"]` rather than failing login. Agent-role
detection from the `AgentRegistry` is a follow-up.

**Route gating.** `middleware.ts` requires a valid session for `/guardian` (redirect to
`/login?next=…`). The guardian page additionally checks the `guardian` role before showing the
cancel button — and on-chain access control is the real enforcement (a non-guardian cancel reverts).
The other read-only pages stay public.

**Magic-link + passkey — first-class extension points, not yet enabled.** `/login` is a
multi-method surface (Wallet / Email link / Passkey). The two non-wallet methods POST to
`/api/auth/magic-link` and `/api/auth/passkey`, which return **501 + a "configure to enable"** hint.
Enabling them is deliberately left as an explicit infra/secrets decision:

- **Magic link:** wire an email sender (e.g. Resend) and/or identity store (e.g. Supabase) + a
  single-use token + a verify handler that issues the same session cookie (`method: "magic-link"`).
- **Passkey:** wire WebAuthn (e.g. `@simplewebauthn/server` + `/browser`) + a credential store +
  register/authenticate handlers issuing the same session cookie (`method: "passkey"`).

Both converge on the **same session model**, so adding them needs no change to gating or the session
format.

## Consequences

- **Good:** wallet-native auth that matches how DAO identity actually works; stateless sessions
  (no DB, edge-verifiable); ERC-1271 support for multisig guardians; the other login methods slot in
  without rework; the app runs zero-config in dev (insecure built-in secret with a warning) and fails
  closed in production if `AUTH_SESSION_SECRET` is unset.
- **Trade-offs / follow-ups:** SIWE domain binding mitigates phishing but the nonce is a stateless
  cookie (not a server store) — fine for this app, revisit if stricter replay guarantees are needed.
  CSRF is mitigated by SameSite=Lax + the nonce; add a CSRF token if cross-site POST flows appear.
  Agent-role resolution and wiring the deployed contract addresses into role reads are tracked as
  issues. Magic-link/passkey are intentionally inert until configured.

## Configuration

`AUTH_SESSION_SECRET` (required in prod), `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (optional),
`NEXT_PUBLIC_GUARDIAN_ADDRESS` / `NEXT_PUBLIC_MEMBERSHIP_TOKEN_ADDRESS` / `NEXT_PUBLIC_RPC_URL`
(optional role resolution). See `.env.example`.
