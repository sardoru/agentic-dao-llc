import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "./app/lib/auth/session";

// Next 16 proxy (formerly "middleware"). Gates sensitive routes behind a valid
// SIWE session. The dashboard's read-only pages stay public; the guardian console
// requires authentication (and the page itself further checks the guardian role).
// jose verifies on the edge runtime.
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/guardian", "/guardian/:path*"],
};
