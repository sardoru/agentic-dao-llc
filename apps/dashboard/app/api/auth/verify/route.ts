import { NextResponse, type NextRequest } from "next/server";
import { verifySiwe } from "../../../lib/auth/siwe";
import { resolveRoles } from "../../../lib/auth/roles";
import {
  signSession,
  SESSION_COOKIE,
  NONCE_COOKIE,
  SESSION_TTL_SECONDS,
} from "../../../lib/auth/session";

// viem readContract needs the Node fetch/runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { message, signature } = (body ?? {}) as { message?: unknown; signature?: unknown };
  if (typeof message !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "message and signature are required" }, { status: 400 });
  }

  const nonce = req.cookies.get(NONCE_COOKIE)?.value;
  if (!nonce) {
    return NextResponse.json(
      { error: "missing or expired nonce — request a new one" },
      { status: 400 },
    );
  }

  const host = req.headers.get("host") ?? undefined;
  const result = await verifySiwe(message, signature as `0x${string}`, { nonce, domain: host });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const roles = await resolveRoles(result.address);
  const token = await signSession({
    address: result.address,
    chainId: result.chainId,
    roles,
    method: "wallet",
  });

  const res = NextResponse.json({ address: result.address, chainId: result.chainId, roles });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  // Burn the nonce (single use).
  res.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
