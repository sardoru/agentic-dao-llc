import { NextResponse } from "next/server";
import { listIntake } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, machine-ingestible feed of the proposal requests Secretary-01 has
// parsed — for approved agents to ingest and for the public to read (building in
// public). Reading is open; only prompting (POST /intake) is gated.
export async function GET() {
  const records = await listIntake(50);
  return NextResponse.json({ count: records.length, records });
}
