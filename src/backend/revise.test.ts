import { describe, expect, test } from "bun:test";
import { checkParts, fromTemplate, type Part } from "../rulebook/workspace.js";
import { TEMPLATES } from "../warp.js";
import { applyProposal, extractYaml, revise, splitSummary, type Assessment, type ReviseDeps } from "./revise.js";

const base = (): Part[] => fromTemplate(TEMPLATES[0].id, { name: "Mira" })!;
const finding = (part: string, id = `x-${part}`) => ({ id, system: "people", severity: "thin", part, text: "thin", fix: "do better" });

/** Scores: "people" drops when the people section says WORSE; the gate fails when any section says GATE. */
function assess(parts: Part[]): Assessment {
  const c = checkParts(parts);
  const all = parts.map((p) => p.yaml).join("\n");
  return {
    errors: c.errors,
    partErrors: Object.fromEntries(c.parts.map((p) => [p.label, p.issues.filter((i) => i.level === "error").length])),
    scores: { people: all.includes("WORSE") ? 50 : 80, scene: 100 },
    gates: [{ id: "tags", label: "no dominant tag", pass: !all.includes("GATE") }],
  };
}

/** A scripted helper: `reply(section label, isRepair, n)`; records the order of calls. */
function deps(reply: (label: string, repair: boolean, n: number) => string, o: { delay?: number } = {}) {
  const log: { label: string; repair: boolean }[] = [];
  let inFlight = 0, maxInFlight = 0;
  const d: ReviseDeps = {
    assess,
    brief: "Name: Mira\nA courier.",
    context: () => "Stats: health",
    ask: async (_system, user) => {
      const repair = user.startsWith("This \"");
      const label = /"([\w -]+)" section/.exec(user)![1];
      log.push({ label, repair });
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, o.delay ?? 1));
      inFlight--;
      return reply(label, repair, log.filter((x) => x.label === label).length);
    },
  };
  return { d, log, maxInFlight: () => maxInFlight };
}

const good = (p: Part[], label: string, extra = "# richer\n") => `Sure!\n\`\`\`yaml\n# Changed: made ${label} richer\n${p.find((x) => x.label === label)!.yaml}${extra}\`\`\`\nDone.`;

describe("Fix", () => {
  test("one good rewrite is kept after one call, with its summary and diff", async () => {
    const parts = base();
    const { d } = deps((label) => good(parts, label));
    const p = await revise("fix", parts, [{ label: "people", findings: [finding("people")] }], d, { maxCalls: 3 });
    expect(p.calls).toBe(1);
    expect(p.sections).toHaveLength(1);
    expect(p.sections[0]).toMatchObject({ label: "people", kept: true, reason: null, summary: "made people richer", added: 1, removed: 0 });
    expect(p.sections[0].diff.some((l) => l.op === "+" && l.text === "# richer")).toBe(true);
    expect(applyProposal(parts, p, "all").find((x) => x.label === "people")!.yaml).toContain("# richer");
    expect(p.findingIds).toEqual(["x-people"]);
  });

  test("a broken rewrite is repaired (2 calls); one that never parses is dropped within 3 calls", async () => {
    const parts = base();
    const fixed = deps((label, repair) => (repair ? good(parts, label) : "```yaml\nrelationships: [oops\n```"));
    const p1 = await revise("fix", parts, [{ label: "people", findings: [finding("people")] }], fixed.d, { maxCalls: 3 });
    expect(p1.calls).toBe(2);
    expect(p1.sections[0].kept).toBe(true);

    const never = deps(() => "relationships: [oops\n");
    const p2 = await revise("fix", parts, [{ label: "people", findings: [finding("people")] }], never.d, { maxCalls: 3 });
    expect(p2.calls).toBe(3);
    expect(p2.sections[0]).toMatchObject({ kept: false, reason: 'the rewrite of "people" has 1 error' });
  });

  test("a rewrite that lowers a score or breaks a gate is dropped with the reason", async () => {
    const parts = base();
    const worse = await revise("fix", parts, [{ label: "people", findings: [finding("people")] }], deps((l) => good(parts, l, "# WORSE\n")).d, { maxCalls: 3 });
    expect(worse.sections[0]).toMatchObject({ kept: false, reason: 'the rewrite of "people" lowers people 80 → 50' });
    expect(worse.scores).toEqual({ before: { people: 80, scene: 100 }, after: { people: 80, scene: 100 } });
    const gate = await revise("fix", parts, [{ label: "people", findings: [finding("people")] }], deps((l) => good(parts, l, "# GATE\n")).d, { maxCalls: 3 });
    expect(gate.sections[0].reason).toBe('the rewrite of "people" breaks the gate "no dominant tag"');
  });

  test("no change and no answer are dropped, not errors", async () => {
    const parts = base();
    const same = await revise("fix", parts, [{ label: "people", findings: [finding("people")] }], deps((l) => parts.find((x) => x.label === l)!.yaml).d, { maxCalls: 3 });
    expect(same.sections[0].reason).toBe("the helper changed nothing");
    const silent = deps(() => { throw new Error("timeout"); });
    const p = await revise("fix", parts, [{ label: "people", findings: [finding("people")] }], silent.d, { maxCalls: 3 });
    expect(p.sections[0].reason).toBe("the helper did not answer (timeout)");
  });
});

describe("Deepen", () => {
  test("all sections at once, never more than 12 calls, even when every rewrite breaks", async () => {
    const parts = base();
    const labels = parts.map((p) => p.label);
    const run = deps(() => "stats: [oops\n", { delay: 5 });
    const p = await revise("deepen", parts, labels.map((l) => ({ label: l, findings: [finding(l)] })), run.d, { maxCalls: 12 });
    expect(p.calls).toBeLessThanOrEqual(12);
    expect(run.maxInFlight()).toBe(labels.length);
    expect(run.log.slice(0, labels.length).every((x) => !x.repair)).toBe(true);
    expect(p.sections.every((s) => !s.kept)).toBe(true);
  });

  test("good sections are kept even when another one is dropped", async () => {
    const parts = base();
    const run = deps((label) => (label === "people" ? good(parts, label, "# WORSE\n") : good(parts, label)));
    const p = await revise("deepen", parts, [{ label: "core", findings: [] }, { label: "people", findings: [finding("people")] }], run.d, { maxCalls: 12 });
    expect(p.sections.map((s) => [s.label, s.kept])).toEqual([["core", true], ["people", false]]);
    const applied = applyProposal(parts, p, "all");
    expect(applied.find((x) => x.label === "core")!.yaml).toContain("# richer");
    expect(applied.find((x) => x.label === "people")!.yaml).not.toContain("WORSE");
    expect(applyProposal(parts, p, []).map((x) => x.yaml)).toEqual(parts.map((x) => x.yaml));
  });

  test("Cancel stops the run", async () => {
    const parts = base();
    const ac = new AbortController();
    const run = deps((label) => { ac.abort(); return good(parts, label); });
    await expect(revise("deepen", parts, [{ label: "core", findings: [] }], run.d, { maxCalls: 12, signal: ac.signal })).rejects.toThrow("Cancelled.");
  });
});

test("extractYaml and the summary line", () => {
  expect(extractYaml("Here you go:\n```yaml\nstats: {}\n```\nBye")).toBe("stats: {}\n");
  expect(extractYaml("Okay.\nstats: {}\n")).toBe("stats: {}\n");
  expect(splitSummary("# Changed: added bands\nstats: {}\n")).toEqual({ yaml: "stats: {}\n", summary: "added bands" });
  expect(splitSummary("stats: {}\n")).toEqual({ yaml: "stats: {}\n", summary: null });
});
