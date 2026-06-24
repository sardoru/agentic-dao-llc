// Stateless session: a signed JWT in an httpOnly cookie. Edge-compatible (jose),
// so it can be verified in middleware. No database — the wallet's SIWE signature
// is the credential; the JWT just carries the result for the session's lifetime.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface SessionData {
  address: `0x${string}`;
  chainId: number;
  /** Resolved on login: always includes "connected"; plus "member" / "guardian" when applicable. */
  roles: string[];
  /** How the user authenticated. */
  method: "wallet" | "magic-link" | "passkey";
}

export const SESSION_COOKIE = "adao_session";
export const NONCE_COOKIE = "adao_siwe_nonce";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const ISSUER = "agentic-dao-dashboard";

function secret(): Uint8Array {
  const s = process.env["AUTH_SESSION_SECRET"];
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SESSION_SECRET must be set (min 16 chars) in production — see .env.example.",
    );
  }
  // Dev/demo fallback ONLY. Not for production; sessions invalidate if this changes.
  return new TextEncoder().encode("dev-insecure-agentic-dao-session-secret-change-me");
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ chainId: data.chainId, roles: data.roles, method: data.method })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(data.address)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER });
    const p = payload as JWTPayload & Partial<SessionData>;
    if (!p.sub) return null;
    return {
      address: p.sub as `0x${string}`,
      chainId: typeof p.chainId === "number" ? p.chainId : 84532,
      roles: Array.isArray(p.roles) ? p.roles : [],
      method: (p.method as SessionData["method"]) ?? "wallet",
    };
  } catch {
    return null;
  }
}
