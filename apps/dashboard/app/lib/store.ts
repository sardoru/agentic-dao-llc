// Persistent store (Supabase Postgres). Server-only — all access is mediated by
// server routes using the service-role key; the browser never touches Supabase
// directly. Degrades to null when not configured (routes then return 503).
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function store(): SupabaseClient | null {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  if (!cached) cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** Secretary-01's normalized, machine-ingestible parse of a proposal request. */
export interface ParsedProposal {
  proposalType: "OPERATING_EXPENSE" | "TREASURY_PAYMENT" | "PARAM_TUNE_NONRESERVED" | "TEXT_SIGNAL";
  title: string;
  summary: string;
  targets: string[];
  action: string;
  estimatedValueUsd: number | null;
  reservedMatter: boolean;
  reservedMatterReason: string | null;
  rationale: string;
}

export interface IntakeRecord {
  id: string;
  created_at: string;
  agent_id: string;
  agent_address: string;
  raw_request: string;
  parsed: ParsedProposal;
  status: string;
}

export async function saveIntake(input: {
  agentId: string;
  agentAddress: string;
  rawRequest: string;
  parsed: ParsedProposal;
}): Promise<IntakeRecord | null> {
  const db = store();
  if (!db) return null;
  const { data, error } = await db
    .from("proposal_intake")
    .insert({
      agent_id: input.agentId,
      agent_address: input.agentAddress,
      raw_request: input.rawRequest,
      parsed: input.parsed,
      status: "parsed",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as IntakeRecord;
}

export async function listIntake(limit = 50): Promise<IntakeRecord[]> {
  const db = store();
  if (!db) return [];
  const { data, error } = await db
    .from("proposal_intake")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as IntakeRecord[];
}
