import type { Address, Hex } from "viem";
import { type Decision, type DecisionRule, evaluate, type Mandate } from "@agentic-dao/policy";
import type { BaseTxFields, GovTxRequest, OpTxRequest, Signer, SignerContext } from "./types";

/**
 * Thrown when the signer's INDEPENDENT policy re-check denies a transaction. The
 * key never signs a non-compliant tx, so even a jailbroken agent brain that
 * bypassed the MCP/CLI checks cannot get a forbidden action signed (build spec §8).
 */
export class SignerPolicyError extends Error {
  readonly rule: DecisionRule;
  readonly ratificationDraft: boolean;
  constructor(decision: Extract<Decision, { allow: false }>) {
    super(`Signer refused: [${decision.rule}] ${decision.reason}`);
    this.name = "SignerPolicyError";
    this.rule = decision.rule;
    this.ratificationDraft = decision.ratificationDraft ?? false;
  }
}

/**
 * Base class that enforces the policy gate before delegating the actual key
 * operation to a concrete backend ({@link LocalSigner}, Turnkey, KMS). Subclasses
 * implement only `address()` and `signTxFields()`; they CANNOT sign without passing
 * through `guard()`.
 */
export abstract class BaseSigner implements Signer {
  abstract address(): Promise<Address>;

  /** Concrete backends implement the raw EIP-1559 signature here. Never called pre-policy. */
  protected abstract signTxFields(fields: BaseTxFields): Promise<Hex>;

  /** Re-evaluate policy independently; throw on deny. The heart of the defense-in-depth. */
  protected guard(mandate: Mandate, tx: GovTxRequest | OpTxRequest, epochSpend: bigint, ctx: SignerContext): void {
    const decision = evaluate(mandate, tx.action, { ...ctx, epochSpend });
    if (!decision.allow) throw new SignerPolicyError(decision);
  }

  async signGovernanceTx(tx: GovTxRequest, mandate: Mandate, ctx: SignerContext): Promise<Hex> {
    // Governance actions (propose/castVote) move no funds → epochSpend is irrelevant (0).
    this.guard(mandate, tx, 0n, ctx);
    return this.signTxFields(tx);
  }

  async signOpTx(tx: OpTxRequest, mandate: Mandate, epochSpend: bigint, ctx: SignerContext): Promise<Hex> {
    this.guard(mandate, tx, epochSpend, ctx);
    return this.signTxFields(tx);
  }
}
