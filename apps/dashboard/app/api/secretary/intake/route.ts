import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "../../../lib/auth/session";
import { isApproved, callerLabel } from "../../../lib/approved";
import { parseProposalRequest } from "../../../lib/secretary";
import { saveIntake, store } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prompting the Secretary is GATED. Only an approved, signed-in caller (a
// registered committee agent, the guardian, or an on-chain member) may submit a
// proposal request. The public can read the feed but cannot prompt the AI.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Sign in to submit a proposal request." }, { status: 401 });
  }
  if (!isApproved(session)) {
    return NextResponse.json(
      { error: "Your address is not an approved committee agent or member." },
      { status: 403 },
    );
  }
  if (!store()) {
    return NextResponse.json({ error: "Store is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const request = (body as { request?: unknown })?.request;
  if (typeof request !== "string" || request.trim().length < 8) {
    return NextResponse.json(
      { error: "Describe the proposal (at least 8 characters)." },
      { status: 400 },
    );
  }
  if (request.length > 4000) {
    return NextResponse.json({ error: "Too long (max 4000 characters)." }, { status: 400 });
  }

  const result = await parseProposalRequest(request.trim());
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  try {
    const saved = await saveIntake({
      agentId: callerLabel(session),
      agentAddress: session.address,
      rawRequest: request.trim(),
      parsed: result.parsed,
    });
    return NextResponse.json({ record: saved });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save." },
      { status: 500 },
    );
  }
}
