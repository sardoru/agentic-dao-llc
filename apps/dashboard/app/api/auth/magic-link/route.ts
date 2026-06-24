import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Extension point for email magic-link login. Disabled until an email/identity
// provider is configured — see docs/adr/0006-authentication.md. Enabling it needs:
//   • an email sender (e.g. Resend) and/or an identity store (e.g. Supabase),
//   • a token table (or signed, single-use links) + a /api/auth/magic-link/verify
//     handler that issues the same session cookie as the wallet path.
// Returns 501 so the login UI can surface a clear "configure to enable" message
// rather than silently failing.
export async function POST() {
  return NextResponse.json(
    {
      error: "magic-link login is not configured",
      enable:
        "See docs/adr/0006-authentication.md — wire an email/identity provider (e.g. Resend/Supabase).",
    },
    { status: 501 },
  );
}
