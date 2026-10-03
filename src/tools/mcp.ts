// The MCP server's tools and its JSON-RPC handler (MCP over stdio: JSON-RPC 2.0,
// one message per line). Pure: reading a file is passed in, so tests run it in
// process. The tool names are the same as the old Warp server's, so existing
// user configs keep working.

import { checkReport, checkText, guideText, previewText, simulate, templateList, templateText, type GuideSection } from "./rulebook-tools.js";
import { STUDIO_VERSION } from "../warp.js";

export interface ToolIO { readFile(path: string): string }

const SOURCE = {
  yaml: { type: "string", description: "The ruleset YAML (the whole file)." },
  path: { type: "string", description: "Or a path to the ruleset file." },
};

export const TOOLS = [
  {
    name: "warp_guide",
    description: "The Warp ruleset authoring guide: workflow, sections, the YAML format reference and the design guide. Read it before writing a ruleset. Pass `topic` (\"items\", \"checks\"…) for only that part.",
    inputSchema: { type: "object", properties: {
      section: { type: "string", enum: ["all", "workflow", "format", "design"], description: "Default all." },
      topic: { type: "string", description: "Only what the guide says about this topic." },
    } },
  },
  { name: "warp_templates", description: "List the starting templates (complete small games to adapt).", inputSchema: { type: "object", properties: {} } },
  {
    name: "warp_template",
    description: "One template as a complete ruleset file, to adapt.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "warp_check",
    description: "Check a ruleset: Warp's load errors and lint, parts Warp no longer runs, and Studio's coverage of the 6 core systems (scene, people, checks, choices, conflict, growth) with findings (gap / thin / balance) and how to fix each. Run it after every change.",
    inputSchema: { type: "object", properties: SOURCE },
  },
  {
    name: "warp_simulate",
    description: "Playtest the whole loop with Warp's loop simulator: N turns × M seeds for each scripted player (mixed, dialogue-heavy, greedy, always the same tag), with a fake narrator. Returns Warp's quality gates (pass/fail), the greedy player's tag share, the odds of each checked tag and the contest table. Iterate until every gate passes.",
    inputSchema: { type: "object", properties: {
      ...SOURCE,
      turns: { type: "number", description: "Turns per run (default 50)." },
      seeds: { type: "number", description: "Runs per player (default 50)." },
    } },
  },
  {
    name: "warp_preview",
    description: "What the player sees at the start (status panel and actions with odds) and what the narrator is told.",
    inputSchema: { type: "object", properties: SOURCE },
  },
];

export const INSTRUCTIONS = "Tools for writing Warp rulesets (game rules that run under a Lumiverse roleplay chat). Start with warp_guide, adapt a template, run warp_check after every change until it is clean, run warp_simulate until every gate passes, preview, then the user imports the file in Warp Studio.";

function sourceOf(a: Record<string, unknown>, io: ToolIO): string[] {
  if (typeof a.yaml === "string" && a.yaml.trim()) return [a.yaml];
  if (typeof a.path === "string" && a.path.trim()) return [io.readFile(a.path)];
  throw new Error("Pass the ruleset as `yaml` (its text) or `path` (a file).");
}

/** Run one tool; errors come back as text with isError, as MCP expects. */
export function callTool(name: string, a: Record<string, unknown>, io: ToolIO): { text: string; isError?: boolean } {
  try {
    switch (name) {
      case "warp_guide": {
        const section = (["workflow", "format", "design"].includes(String(a.section)) ? a.section : "all") as GuideSection;
        return { text: guideText(section, typeof a.topic === "string" ? a.topic : undefined) };
      }
      case "warp_templates": return { text: templateList() };
      case "warp_template": {
        const t = templateText(String(a.id ?? ""));
        return t ? { text: t } : { text: `No template "${a.id ?? ""}".\n\n${templateList()}`, isError: true };
      }
      case "warp_check": return { text: checkText(checkReport(sourceOf(a, io))) };
      case "warp_simulate": {
        const res = simulate(sourceOf(a, io), { turns: Number(a.turns) || undefined, seeds: Number(a.seeds) || undefined });
        // A failed gate is a result to work on, not a tool error; a ruleset that doesn't run is.
        return res.report ? { text: res.text } : { text: res.text, isError: true };
      }
      case "warp_preview": return { text: previewText(sourceOf(a, io)) };
    }
    return { text: `Unknown tool "${name}".`, isError: true };
  } catch (e) {
    return { text: e instanceof Error ? e.message : String(e), isError: true };
  }
}

interface RpcMessage { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> }

/** One JSON-RPC message in, one reply out (null for notifications, which get no answer). */
export function handleRpc(raw: unknown, io: ToolIO): Record<string, unknown> | null {
  const msg = (raw && typeof raw === "object" ? raw : {}) as RpcMessage;
  const { id, method, params = {} } = msg;
  if (id === undefined) return null;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
  switch (method) {
    case "initialize":
      return reply({
        protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "warp-rulebook", version: STUDIO_VERSION },
        instructions: INSTRUCTIONS,
      });
    case "ping": return reply({});
    case "tools/list": return reply({ tools: TOOLS });
    case "tools/call": {
      const res = callTool(String(params.name ?? ""), (params.arguments ?? {}) as Record<string, unknown>, io);
      return reply({ content: [{ type: "text", text: res.text }], ...(res.isError ? { isError: true } : {}) });
    }
  }
  return fail(-32601, `Method not found: ${method}`);
}

/** Feed stdin text in; get every reply line out. Keeps a partial line for the next chunk. */
export function lineReader(io: ToolIO, write: (line: string) => void): (chunk: string) => void {
  let buf = "";
  return (chunk: string) => {
    buf += chunk;
    for (let nl = buf.indexOf("\n"); nl >= 0; nl = buf.indexOf("\n")) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg: unknown;
      try { msg = JSON.parse(line); } catch { write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })); continue; }
      let out: Record<string, unknown> | null;
      try { out = handleRpc(msg, io); } catch (e) {
        out = { jsonrpc: "2.0", id: (msg as RpcMessage).id ?? null, error: { code: -32603, message: e instanceof Error ? e.message : String(e) } };
      }
      if (out) write(JSON.stringify(out));
    }
  };
}
