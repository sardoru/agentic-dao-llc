import { type Hex, keccak256, stringToBytes } from "viem";

/** The result of pinning a rationale doc: its CID and the keccak256 of its bytes. */
export interface PinResult {
  /** Content identifier (ipfs://<cid> form available via `uri`). */
  cid: string;
  uri: string;
  /** keccak256 of the exact UTF-8 bytes pinned — anchored on-chain via RationaleAnchor. */
  contentHash: Hex;
}

/**
 * Rationale/mandate doc pinning. Every write pins a rationale and records the
 * content hash; no rationale → no submission (build spec §11c). Real Pinata /
 * web3.storage live behind this interface, env-gated; dev uses {@link StubIpfsClient}.
 */
export interface IpfsClient {
  pinJson(value: unknown): Promise<PinResult>;
  pinText(text: string): Promise<PinResult>;
  readonly provider: string;
}

/** Canonical JSON (sorted keys, no insignificant whitespace) so the hash is deterministic. */
function canonicalJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v !== null && typeof v === "object") {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = sort((v as Record<string, unknown>)[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

/**
 * Deterministic dev IPFS client. Returns a stable, content-addressed CID derived
 * from the keccak256 of the bytes (so the same rationale always yields the same CID)
 * and the matching content hash. No network — exercises the full "pin → hash → anchor"
 * path offline. NOT for production (the CID is a local convention, not a real IPFS CID).
 */
export class StubIpfsClient implements IpfsClient {
  readonly provider = "stub" as const;

  async pinText(text: string): Promise<PinResult> {
    const contentHash = keccak256(stringToBytes(text));
    // Stable pseudo-CID: "bafy" + the hash hex (deterministic, content-addressed).
    const cid = `bafy${contentHash.slice(2)}`;
    return { cid, uri: `ipfs://${cid}`, contentHash };
  }

  async pinJson(value: unknown): Promise<PinResult> {
    return this.pinText(canonicalJson(value));
  }
}

export { canonicalJson };
