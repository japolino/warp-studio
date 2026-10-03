import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { TEMPLATES } from "../warp.js";
import { run, type CommandIO } from "./commands.js";
import { handleRpc, lineReader, TOOLS } from "./mcp.js";
import { checkReport, checkText, guideMarkdown, guideText, previewText, templateText, VERSION_LINE } from "./rulebook-tools.js";

const FIXTURES = new URL("../fixtures/", import.meta.url);
const fixturePath = (name: string) => new URL(name, FIXTURES).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function memIO(files: Record<string, string> = {}): CommandIO & { stdout: string[]; stderr: string[]; written: Record<string, string> } {
  const io = {
    stdout: [] as string[], stderr: [] as string[], written: {} as Record<string, string>,
    out: (t: string) => { io.stdout.push(t); },
    err: (t: string) => { io.stderr.push(t); },
    readFile: (p: string) => { if (p in files) return files[p]; return readFileSync(p, "utf8"); },
    writeFile: (p: string, t: string) => { io.written[p] = t; },
  };
  return io;
}

describe("the checker", () => {
  test("every template comes out clean", () => {
    for (const t of TEMPLATES) {
      const rep = checkReport([templateText(t.id)!]);
      expect({ t: t.id, ok: rep.ok, warnings: rep.warnings, legacy: rep.legacy }).toEqual({ t: t.id, ok: true, warnings: [], legacy: [] });
      expect(checkText(rep)).toContain("✓ Clean");
    }
  });

  test("it says what's wrong and where; a broken file exits 1", () => {
    const io = memIO({ "bad.yaml": "stats: [oops", "warn.yaml": "name: W\nactions:\n  hit: { label: Hit, effects: { hpp: -1 } }\n" });
    expect(run(["check", "bad.yaml"], io)).toBe(1);
    expect(io.stdout.join("\n")).toContain("✕ ERRORS (1)");
    expect(run(["check", "warn.yaml"], io)).toBe(0);
    expect(io.stdout.at(-1)).toContain('"hpp" isn\'t a stat or a known effect');
  });

  test("an old-format file gets the banner and Warp's per-key warnings", () => {
    const io = memIO();
    expect(run(["check", fixturePath("legacy.yaml")], io)).toBe(0);
    const text = io.stdout.join("\n");
    expect(text).toMatch(/This rulebook uses \d+ parts Warp no longer runs \(perks, weather, fronts/);
    expect(text).toContain("was removed from Warp");
  });

  test("--json gives the report as data", () => {
    const io = memIO({ "a.yaml": templateText(TEMPLATES[0].id)! });
    expect(run(["check", "a.yaml", "--json"], io)).toBe(0);
    const rep = JSON.parse(io.stdout[0]);
    expect(rep.ok).toBe(true);
    expect(rep.sections.length).toBeGreaterThan(1);
  });

  test("preview reads the same file", () => {
    const p = previewText([templateText(TEMPLATES[0].id)!]);
    expect(p).toContain("STATUS PANEL AT THE START");
    expect(p).toContain("WHAT THE NARRATOR IS TOLD");
  });
});

describe("commands", () => {
  test("--version names the Studio version, the ruleset format and the engine pin", () => {
    const io = memIO();
    expect(run(["--version"], io)).toBe(0);
    expect(io.stdout[0]).toBe(VERSION_LINE);
    expect(VERSION_LINE).toMatch(/^warp-rulebook \d+\.\d+\.\d+ \(ruleset format \d+, engine warp#[0-9a-f]{7}\)$/);
  });

  test("template, templates, unknown template, no file, help", () => {
    const io = memIO();
    expect(run(["templates"], io)).toBe(0);
    for (const t of TEMPLATES) expect(io.stdout[0]).toContain(t.id);
    expect(run(["template", TEMPLATES[0].id], io)).toBe(0);
    expect(io.stdout.at(-1)).toContain("--- # core");
    expect(run(["template", "nope"], io)).toBe(1);
    expect(run(["check"], io)).toBe(1);
    expect(io.stderr.at(-1)).toContain("Give the ruleset file");
    expect(run([], io)).toBe(0);
    expect(run(["frobnicate"], io)).toBe(1);
    expect(io.stdout.at(-1)).toContain("Warp Studio → Import a rulebook");
  });

  test("guide --markdown --out writes the generated guide; --topic narrows it", () => {
    const io = memIO();
    expect(run(["guide", "--markdown", "--out", "g.md"], io)).toBe(0);
    expect(io.written["g.md"]).toBe(guideMarkdown());
    expect(guideText("all", "items")).toContain("items");
    expect(guideText("all", "zzzz")).toMatch(/^Nothing about "zzzz"\. Topics: /);
    expect(guideText("workflow")).toContain("SECTIONS");
  });
});

describe("the MCP server", () => {
  const io = { readFile: (p: string) => (p === "t.yaml" ? templateText(TEMPLATES[0].id)! : readFileSync(p, "utf8")) };

  test("initialize → tools/list → tools/call", () => {
    const init = handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }, io)!;
    expect((init.result as { protocolVersion: string; serverInfo: { name: string } }).protocolVersion).toBe("2025-03-26");
    expect((init.result as { serverInfo: { name: string } }).serverInfo.name).toBe("warp-rulebook");
    const list = handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, io)!;
    expect((list.result as { tools: { name: string }[] }).tools.map((t) => t.name))
      .toEqual(["warp_guide", "warp_templates", "warp_template", "warp_check", "warp_simulate", "warp_preview"]);
    const call = handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "warp_check", arguments: { path: "t.yaml" } } }, io)!;
    const content = (call.result as { content: { text: string }[]; isError?: boolean });
    expect(content.isError).toBeUndefined();
    expect(content.content[0].text).toContain("✓ Clean");
  });

  test("errors come back as tool errors, unknown methods as JSON-RPC errors, notifications get no answer", () => {
    const bad = handleRpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "warp_check", arguments: {} } }, io)!;
    expect((bad.result as { isError: boolean }).isError).toBe(true);
    expect(handleRpc({ jsonrpc: "2.0", id: 5, method: "nope" }, io)!.error).toEqual({ code: -32601, message: "Method not found: nope" });
    expect(handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, io)).toBeNull();
    expect(TOOLS).toHaveLength(6);
  });

  test("the stdio reader handles split lines and bad JSON", () => {
    const out: string[] = [];
    const feed = lineReader(io, (l) => out.push(l));
    feed('{"jsonrpc":"2.0","id":1,"me');
    expect(out).toEqual([]);
    feed('thod":"ping"}\nnot json\n');
    expect(out.map((l) => JSON.parse(l))).toEqual([{ jsonrpc: "2.0", id: 1, result: {} }, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }]);
  });
});

test("docs/RULEBOOK_GUIDE.md is the generated guide (run `bun run guide` after a pin bump)", () => {
  expect(readFileSync(new URL("../../docs/RULEBOOK_GUIDE.md", import.meta.url), "utf8")).toBe(guideMarkdown());
});
