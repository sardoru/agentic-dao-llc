// Server-side SIWE (EIP-4361) verification. Uses viem's built-in SIWE utilities
// (no extra dependency) and a public client so it works for both EOAs and
// ERC-1271 smart-contract wallets (e.g. a guardian multisig).
import { createPublicClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";

export const AUTH_CHAIN = baseSepolia;

function rpcTransport() {
  return http(process.env["RPC_URL"] ?? process.env["NEXT_PUBLIC_RPC_URL"]);
}

export type SiweResult =
  | { ok: true; address: Address; chainId: number }
  | { ok: false; error: string };

/**
 * Validate a signed SIWE message. Checks the chain, the server-issued nonce, the
 * binding domain (anti-phishing), and the signature itself.
 */
export async function verifySiwe(
  message: string,
  signature: `0x${string}`,
  opts: { nonce: string; domain?: string },
): Promise<SiweResult> {
  const fields = parseSiweMessage(message);
  if (!fields.address) return { ok: false, error: "message is missing an address" };
  if (fields.chainId !== AUTH_CHAIN.id) {
    return { ok: false, error: `wrong chain (expected ${AUTH_CHAIN.id})` };
  }
  const client = createPublicClient({ chain: AUTH_CHAIN, transport: rpcTransport() });
  const valid = await verifySiweMessage(client, {
    message,
    signature,
    nonce: opts.nonce,
    ...(opts.domain ? { domain: opts.domain } : {}),
  });
  if (!valid) return { ok: false, error: "invalid nonce, domain, or signature" };
  return { ok: true, address: fields.address, chainId: fields.chainId };
}
