import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Extension point for passkey / WebAuthn login. Disabled until a WebAuthn
// relying-party + credential store is configured — see docs/adr/0006-authentication.md.
// Enabling it needs:
//   • a WebAuthn library (e.g. @simplewebauthn/server + /browser),
//   • a credential store keyed by user/address,
//   • register + authenticate handlers that issue the same session cookie as the
//     wallet path (method: "passkey").
export async function POST() {
  return NextResponse.json(
    {
      error: "passkey login is not configured",
      enable:
        "See docs/adr/0006-authentication.md — wire WebAuthn (e.g. @simplewebauthn) + a credential store.",
    },
    { status: 501 },
  );
}
