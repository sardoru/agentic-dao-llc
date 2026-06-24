# ADR 0004 — Signer Key Isolation: Brain Never Holds Keys

**Status:** Accepted

---

## Context

The agent runtime consists of two conceptually distinct components:

- **The brain** (LLM or scripted logic): decides what actions to take, constructs
  proposals and calldata, evaluates mandate compliance from a reasoning perspective.
- **The signer**: holds the cryptographic key, evaluates policy independently, and
  produces the signature that submits transactions on-chain.

If these are merged — if the brain can access the key material — then a jailbroken or
prompt-injected brain can sign arbitrary transactions. The question is: what is the
minimum isolation needed to make a compromised brain unable to cause unauthorized
on-chain writes?

Three options were considered:

**Option A — Trusted brain with key access:** The brain holds the key and is trusted
to apply policy. Fast, simple. Unsafe — a single compromise yields full signer authority.

**Option B — Brain-in-sandbox, key in same process:** The key is in the same process as
the brain but in an isolated module the brain cannot introspect. Better, but process-level
exploits still reach the key.

**Option C — Key in a separate process/service, policy enforced at that boundary:** The
brain communicates with a separate `Signer` service over a well-defined interface. The
signer runs the policy check itself and refuses to sign non-compliant requests. The brain
has no key material in its context and no way to extract it.

Option C was chosen.

---

## Decision

The `Signer` is a defined TypeScript interface in `packages/signer`:

```typescript
interface Signer {
  address(): Promise<Address>;
  signGovernanceTx(tx: GovTxRequest, mandate: Mandate): Promise<Hex>;
  signOpTx(tx: OpTxRequest, mandate: Mandate, epochSpend: bigint): Promise<Hex>;
}
```

The signer re-runs `policy.evaluate()` itself before signing. It does not trust any
upstream claim that policy was already evaluated. This is a hard invariant — the
implementation must never accept a caller-supplied `{ policyAlreadyChecked: true }` flag
or equivalent shortcut.

### Dev environment

`SIGNER_BACKEND=local` — an encrypted keystore file at `SIGNER_KEYSTORE_PATH` (default
`./.keystore/agent.json`), protected by `SIGNER_KEYSTORE_PASSWORD`. The keystore is never
passed into the MCP server or CLI process context. The signer process loads it at startup
and holds the decrypted key in memory only for the duration of a signing operation.

The local signer is **dev-only**. It is unsuitable for production because:
- The keystore file is on disk, accessible to any process with filesystem access.
- The password must be in the environment, which has a large attack surface.

### Production target

`SIGNER_BACKEND=turnkey` or `=kms` — the key is managed by Turnkey (MPC/TEE) or a
cloud KMS/HSM. The `Signer` interface is implemented by a thin adapter that calls the
Turnkey API or KMS signing endpoint. Policy is enforced server-side at the adapter before
the API call is made. The key material never leaves the TEE/HSM and never appears in the
agent process.

Mainnet is **gated** on this production signer being in place, tested, and audited.
The runbook (`docs/runbook.md`) includes this as an explicit mainnet gate.

### Interface contract

The two implementations (local and Turnkey/KMS) must satisfy the same `Signer` interface.
Swapping backends requires only changing `SIGNER_BACKEND` and providing the relevant
credentials — no caller-side code changes.

---

## Consequences

**Positive:**
- A jailbroken or prompt-injected brain cannot extract a key or sign an unauthorized
  transaction. It can only request signatures, which the signer independently validates.
- Defense in depth: even if the MCP server's policy check has a bug, the signer's
  independent re-check catches the violation.
- The production signer backend (Turnkey/KMS) provides hardware-level key protection
  at the cost of a network round-trip per signature.
- The interface is stable — adding a new signer backend (e.g., AWS KMS, Google Cloud KMS,
  Privy) is a one-file change.

**Negative / trade-offs:**
- Latency: each transaction requires a round-trip to the signer service. For
  governance actions (propose, vote) this is acceptable. For high-frequency operational
  loops it may require batching.
- The local dev signer is a real key-management risk if developers commit their keystores
  or passwords. `.gitignore` must exclude `.keystore/` and `.env`. CI must fail if either
  is found committed.
- The `policy.evaluate()` call in the signer is a shared-library dependency. A bug in
  `packages/policy` affects both the MCP-layer check and the signer check — they are
  independent executions of the same code, not truly independent implementations. A logic
  bug in the policy engine can bypass both. Mitigated by the on-chain Roles/AccessControl
  layer, which is a third independent enforcement point written in Solidity.

**Follow-up:**
- Add a CI lint rule that detects any `SIGNER_KEYSTORE_PASSWORD` or private key pattern
  in committed files.
- The `signGovernanceTx` and `signOpTx` methods must include the mandate hash in the
  signed data or verify it matches the on-chain record before signing, to prevent a
  mandate-substitution attack where the signer is called with a mandate that does not
  match the registered one.
- Before mainnet, commission an independent review of the Turnkey/KMS adapter to confirm
  key material never appears in logs, error messages, or the signer process's heap.
