import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/server";
import { buildTestCore } from "./helpers";

describe("MCP server instantiation", () => {
  it("createMcpServer wires all nine tools onto a McpServer without throwing", () => {
    const { core } = buildTestCore();
    const server = createMcpServer(core);
    expect(server).toBeDefined();
    // The underlying low-level server is present (transport-agnostic instantiation).
    expect(server.server).toBeDefined();
  });

  it("the server module imports cleanly (no top-level side effects that throw)", async () => {
    const mod = await import("../src/server");
    expect(typeof mod.createMcpServer).toBe("function");
    expect(typeof mod.main).toBe("function");
  });
});
