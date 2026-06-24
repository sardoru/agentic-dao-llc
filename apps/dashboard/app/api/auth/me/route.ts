import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "../../../lib/auth/session";

export const dynamic = "force-dynamic";

// Return the current session (or null). Used by the client AuthProvider on mount.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  return NextResponse.json({ session });
}
