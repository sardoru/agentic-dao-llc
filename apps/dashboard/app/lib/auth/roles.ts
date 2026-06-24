// Best-effort role resolution for a freshly-authenticated address. Reads the
// on-chain MembershipToken (soulbound ERC721Votes) and compares against the
// configured guardian. All reads are wrapped: pre-deploy (addresses unset) or a
// transient RPC error degrades gracefully to ["connected"] rather than failing
// the login. Agent-role detection is a follow-up (see issue: dashboard agent role).
import { createPublicClient, http, getAddress, isAddress, type Address } from "viem";
import { baseSepolia } from "viem/chains";

const MEMBERSHIP =
  process.env["NEXT_PUBLIC_MEMBERSHIP_TOKEN_ADDRESS"] ?? process.env["MEMBERSHIP_TOKEN"];
const GUARDIAN = process.env["NEXT_PUBLIC_GUARDIAN_ADDRESS"] ?? process.env["GUARDIAN_SAFE"];

const BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const eq = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export async function resolveRoles(address: Address): Promise<string[]> {
  const roles = new Set<string>(["connected"]);

  if (eq(GUARDIAN, address)) roles.add("guardian");

  if (MEMBERSHIP && isAddress(MEMBERSHIP)) {
    try {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env["RPC_URL"] ?? process.env["NEXT_PUBLIC_RPC_URL"]),
      });
      const bal = await client.readContract({
        address: getAddress(MEMBERSHIP),
        abi: BALANCE_OF_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      if (bal > 0n) roles.add("member");
    } catch {
      // pre-deploy / RPC unavailable → no membership claim, login still succeeds.
    }
  }

  return [...roles];
}
