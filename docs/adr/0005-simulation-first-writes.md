# ADR 0005 — Simulation-First Writes with Action-Hash Gate

**Status:** Accepted

---

## Context

AI agents constructing on-chain transactions may produce calls that succeed syntactically
but revert at execution time (insufficient balance, access-control failure, stale state,
incorrect calldata encoding). Beyond gas waste, a failed execution in a DAO context wastes
the voting period and timelock delay — potentially days of governance time.

More critically, an agent could be manipulated into submitting a transaction that looks
benign in the proposal description but behaves differently on-chain. A pre-submission
simulation makes the actual on-chain effects visible before the transaction is broadcast.

The question is: how do we enforce that simulation always precedes writes, without relying
on the brain to remember to call it?

Two options considered:

**Option A — Advisory simulation:** `simulate_action` is available as a tool. The brain
is instructed to call it first. Nothing technically prevents skipping it.

**Option B — Gate-enforced simulation:** The signer maintains a map of
`actionHash → simulationResult`. Before signing any write, it checks that a matching,
non-expired simulation result exists. No result → no signature. The brain cannot bypass
this by claiming it already simulated.

Option B was chosen.

---

## Decision

Every write path — `create_proposal`, `cast_vote`, `op_execute` — is gated by an
action-hash check in the `Signer`:

1. **Before any write**, the brain (or MCP tool) must call `simulate_action` with the
   exact transaction payload (targets, values, calldatas, or op arguments).
2. The `Simulator` returns a result and the signer stores it keyed by
   `actionHash = keccak256(abi.encode(targets, values, calldatas, mandateHash))`.
3. When `signGovernanceTx` or `signOpTx` is called, the signer recomputes the `actionHash`
   from the transaction request and looks up the stored result.
4. If no result exists, or the result is expired (recorded block is more than `STALENESS_BLOCKS`
   old, default 64 blocks / ~2 minutes on Base), the signer throws `SIMULATION_REQUIRED`.
5. If the stored simulation shows `success: false`, the signer throws
   `SIMULATION_PREDICTED_REVERT` with the revert reason — the brain must not submit
   transactions predicted to fail.
6. The simulation result (gas used, asset deltas, revert reason if any) is included in
   the IPFS rationale document. Its content hash is anchored on-chain via `RationaleAnchor`
   as part of the same submission flow.

### Action-hash definition

```typescript
// From packages/signer/src/actionHash.ts
export function computeActionHash(
  targets: Address[],
  values: bigint[],
  calldatas: Hex[],
  mandateHash: Hex,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address[]" }, { type: "uint256[]" }, { type: "bytes[]" }, { type: "bytes32" }],
      [targets, values, calldatas, mandateHash],
    ),
  );
}
```

Changing any element of the transaction (even a single byte of calldata) produces a
different `actionHash` and requires a fresh simulation.

### Rationale gate

No IPFS rationale pinned → no submission. The `create_proposal` and `op_execute` tools
enforce this: they pin the rationale (which must include the simulation result) to IPFS,
call `RationaleAnchor.anchor(actionHash, ipfsURI, contentHash)`, and only then call
`signGovernanceTx`. The signer verifies the anchor call is included in the same transaction
batch.

---

## Consequences

**Positive:**

- Agents cannot submit writes without a matching prior simulation. The gate is
  enforced in code, not by instruction.
- The simulation result is permanently recorded on-chain (via rationale anchor) and on IPFS,
  creating an auditable trail of "what the agent predicted vs. what actually happened."
- Failed simulations surface early, saving voting time.
- The staleness window (64 blocks) prevents reuse of simulations run against materially
  different chain state. On Base (~2-second blocks), 64 blocks is ~2 minutes — sufficient
  for normal submission latency.

**Negative / trade-offs:**

- `cast_vote` is low-risk but still simulated for gas estimation and revert detection.
  This adds latency to voting. For a governance system with 24-hour voting periods, this
  is negligible.
- The in-memory `actionHash → result` map does not persist across signer process restarts
  in the dev implementation. A process crash between `simulate_action` and the write call
  requires re-simulating. In production, the result store should be persisted (e.g.,
  Redis or the database backing the indexer).
- The staleness window is a configuration constant. If chain reorganizations or high block
  times cause legitimate simulations to expire before the signing call completes, the window
  may need tuning. Document this in the runbook if it becomes an issue on testnet.
- Simulation via the Tenderly API introduces an external dependency. The anvil-fork fallback
  mitigates this for offline dev, but production reliability depends on Tenderly availability.

**Follow-up:**

- `test_WriteBlockedWithoutSimulation` must remain in the adversarial suite and must test
  both the case of "no simulation at all" and "simulation for a different action hash."
- Consider adding `test_WriteBlockedOnStaleSimulation` once the staleness window logic is
  implemented.
- Add the `SIMULATION_PREDICTED_REVERT` case to the dashboard: if an agent submits a
  proposal that the simulation predicted would fail, show a warning on the proposal detail
  page.
- Before mainnet, make the simulation result store persistent and add a monitoring alert
  if the Tenderly API is unavailable for more than N minutes (falling back to anvil-fork).
