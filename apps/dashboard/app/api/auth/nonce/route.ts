import { NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { NONCE_COOKIE } from "../../../lib/auth/session";

export const dynamic = "force-dynamic";

// Issue a fresh SIWE nonce and bind it to the browser in a short-lived httpOnly
// cookie. /api/auth/verify checks the signed message's nonce against this cookie.
export async function GET() {
  const nonce = generateSiweNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
