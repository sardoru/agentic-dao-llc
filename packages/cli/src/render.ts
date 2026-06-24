import type { ToolResult } from "@agentic-dao/mcp";

/** JSON.stringify replacer that renders bigints as decimal strings. */
export const bigintReplacer = (_k: string, v: unknown): unknown =>
  typeof v === "bigint" ? v.toString() : v;

/** Pretty-print a ToolResult to stdout/stderr; returns the process exit code. */
export function printResult<T>(result: ToolResult<T>): number {
  if (result.ok) {
    process.stdout.write(JSON.stringify(result.data, bigintReplacer, 2) + "\n");
    return 0;
  }
  const payload: Record<string, unknown> = { error: result.error };
  if (result.rule) payload.rule = result.rule;
  if (result.ratification) payload.ratification = result.ratification;
  process.stderr.write(JSON.stringify(payload, bigintReplacer, 2) + "\n");
  return 1;
}
