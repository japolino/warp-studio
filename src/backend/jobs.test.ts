// Playtest, Check (waivers), Fix and Deepen through the backend, on the fake host.

import { beforeEach, describe, expect, test } from "bun:test";
import type { StudioView } from "../shared/protocol.js";
import { TEMPLATES } from "../warp.js";
import { character, fakeHost, type FakeHost } from "./fake-host.js";
import { DEEPEN_CALLS } from "./session.js";
import { handle } from "./router.js";
import { resetSessions } from "./session.js";
import { clearSettingsCache } from "./settings.js";
import { briefOf, contextOf, deepenTargets, legacyNote, partsKey } from "./jobs.js";
import { fromTemplate, fromText } from "../rulebook/workspace.js";

// An adventure-style template (Warp's adventure template has checks, tags with checks and contest kinds).
const T = TEMPLATES.find((t) => !/style:\s*story/.test(t.parts.map((p) => p.yaml).join("\n")))!;
let h: FakeHost;
const last = (): StudioView => (h.of<{ type: string; view: StudioView }>("studio").at(-1)!).view;

/** The section the helper is asked to rewrite, as it is now. */
const current = (user: string) => /section now:\n([\s\S]*?)\n\nFindings to fix/.exec(user)?.[1] ?? "";
const label = (user: string) => /"([\w -]+)" section/.exec(user)?.[1] ?? "";

/** A helper that writes a voice on every band of every relationship stat (people), and leaves other sections alone. */
function helper(_system: string, user: string): string {
  const now = current(user);
  if (label(user) !== "people") return `\`\`\`yaml\n${now}\n\`\`\``;
  const voiced = now.replace(/^(\s+)(\d+): ([^{\n]+)$/gm, (_m, sp, at, text) => `${sp}${at}: { text: ${text.trim()}, voice: "{name} acts ${text.trim().toLowerCase()} toward {{user}}.", say: "{name}: ${text.trim()}.", say_down: "{name}: ${text.trim()}." }`);
  return `Here it is.\n\`\`\`yaml\n# Changed: gave every band a voice\n${voiced}\n\`\`\``;
}

async function setup(o: { helper?: (s: string, u: string) => string; delay?: number } = {}) {
  resetSessions();
  clearSettingsCache();
  h = fakeHost({ characters: [character({ id: "c1", name: "Mira Vale", description: "A courier." })], helper: o.helper ?? helper, helperDelayMs: o.delay });
  await handle({ type: "settings", patch: { playtestTurns: 5, playtestSeeds: 2 } });
  await handle({ type: "start", characterId: "c1", from: { template: T.id } });
  // A thin people section: bands as bare words, no voices, no lines.
  await handle({ type: "edit", characterId: "c1", label: "people", yaml: THIN_PEOPLE });
}

const THIN_PEOPLE = `relationships:
  open: true
  stats:
    affection:
      start: 20
      narrator: 5
      bands:
        0: Hostile
        35: Friendly
        60: Close
    trust:
      start: 20
      narrator: 5
      bands:
        0: Suspicious
        50: Trusting
  people:
    mira_vale:
      name: "Mira Vale"
`;

describe("Check in the draft", () => {
  beforeEach(() => setup());

  test("every draft that loads has a check: six systems and findings", () => {
    const c = last().draft!.check!;
    expect(c.systems.map((s) => s.id)).toEqual(["scene", "people", "checks", "choices", "conflict", "growth"]);
    expect(c.findings.length).toBeGreaterThan(0);
    expect(c.open).toBe(c.findings.length);
  });

  test("Leave as is needs a reason; it closes the finding and keeps the score; it can be undone", async () => {
    const before = last().draft!.check!;
    const f = before.findings[0];
    await handle({ type: "waive", characterId: "c1", id: f.id, reason: "meh" });
    expect(last().error).toContain("8 characters");
    await handle({ type: "waive", characterId: "c1", id: f.id, reason: "the card wants it this way" });
    const after = last().draft!.check!;
    expect(after.open).toBe(before.open - 1);
    expect(after.findings.find((x) => x.id === f.id)!.waived).toBe("the card wants it this way");
    expect(after.systems).toEqual(before.systems);
    await handle({ type: "unwaive", characterId: "c1", id: f.id });
    expect(last().draft!.check!.open).toBe(before.open);
  });
});

describe("Playtest", () => {
  beforeEach(() => setup());

  test("runs Warp's loop simulator on the draft, sends progress, and goes stale when the draft changes", async () => {
    await handle({ type: "playtest", characterId: "c1" });
    const v = last();
    expect(v.error).toBeNull();
    expect(v.draft!.playtest!.stale).toBe(false);
    expect(v.draft!.playtest!.report.gates.length).toBeGreaterThan(3);
    expect(h.of<{ type: string; share: number }>("playtest_progress").at(-1)!.share).toBe(1);
    expect(h.of<{ type: string; view: StudioView }>("studio").some((m) => m.view.busy?.startsWith("Playtest") && m.view.cancellable)).toBe(true);
    await handle({ type: "edit", characterId: "c1", label: "core", yaml: `${v.draft!.parts[0].yaml}# changed\n` });
    expect(last().draft!.playtest!.stale).toBe(true);
  });

  test("refused while the draft has errors", async () => {
    await handle({ type: "edit", characterId: "c1", label: "stats", yaml: "stats: [oops\n" });
    await handle({ type: "playtest", characterId: "c1" });
    expect(last().error).toContain("Fix the errors first");
    expect(last().draft!.check).toBeNull();
  });
});

describe("Fix and Deepen", () => {
  test("Fix one finding: one helper call, a proposal to review, nothing written until accepted", async () => {
    await setup();
    const id = last().draft!.check!.findings.find((f) => f.id.startsWith("rel-no-voice:"))!.id;
    const before = last().draft!.parts.find((p) => p.label === "people")!.yaml;
    await handle({ type: "fix", characterId: "c1", findingId: id });
    let v = last();
    expect(v.error).toBeNull();
    expect(h.quiet).toHaveLength(1);
    expect(h.quiet[0].user).toContain(id);
    expect(h.quiet[0].user).toContain("Name: Mira Vale");
    expect(h.quiet[0].temperature).toBe(0.4);
    const p = v.draft!.proposal!;
    expect(p.kind).toBe("fix");
    expect(p.sections.map((s) => [s.label, s.kept, s.summary])).toEqual([["people", true, "gave every band a voice"]]);
    expect(v.draft!.parts.find((x) => x.label === "people")!.yaml).toBe(before);
    expect(h.writes).toEqual([]);
    await handle({ type: "review", characterId: "c1", accept: "all" });
    v = last();
    expect(v.draft!.proposal).toBeNull();
    expect(v.draft!.parts.find((x) => x.label === "people")!.yaml).toContain("voice:");
    expect(v.draft!.check!.findings.some((f) => f.id.startsWith("rel-no-voice:"))).toBe(false);
    expect(h.writes).toEqual([]);
  });

  test("a finding that is gone is refused plainly", async () => {
    await setup();
    await handle({ type: "fix", characterId: "c1", findingId: "item-dead:nothing" });
    expect(last().error).toBe("That finding is gone: the draft changed.");
    expect(h.quiet).toHaveLength(0);
  });

  test("Deepen: at most 12 helper calls, then review; Discard leaves the draft as it was", async () => {
    await setup();
    const parts = last().draft!.parts;
    await handle({ type: "deepen", characterId: "c1" });
    const v = last();
    expect(v.error).toBeNull();
    expect(h.quiet.length).toBeGreaterThan(0);
    expect(h.quiet.length).toBeLessThanOrEqual(DEEPEN_CALLS);
    expect(v.draft!.proposal!.kind).toBe("deepen");
    expect(v.draft!.proposal!.sections.find((s) => s.label === "people")?.kept).toBe(true);
    // Unchanged sections are dropped with a reason, not kept.
    expect(v.draft!.proposal!.sections.filter((s) => s.label !== "people").every((s) => !s.kept && s.reason === "the helper changed nothing")).toBe(true);
    await handle({ type: "review", characterId: "c1", accept: "none" });
    expect(last().draft!.parts).toEqual(parts);
    expect(h.writes).toEqual([]);
  }, 30_000);

  test("accept only some sections", async () => {
    await setup();
    await handle({ type: "deepen", characterId: "c1" });
    await handle({ type: "review", characterId: "c1", accept: ["core"] });
    expect(last().draft!.parts.find((x) => x.label === "people")!.yaml).not.toContain("voice:");
  }, 30_000);

  test("Cancel stops a running Deepen; nothing is proposed", async () => {
    await setup({ delay: 2000 });
    const run = handle({ type: "deepen", characterId: "c1" });
    await new Promise((r) => setTimeout(r, 30));
    expect(last().cancellable).toBe(true);
    await handle({ type: "cancel", characterId: "c1" });
    await run;
    expect(last().error).toBe("Cancelled.");
    expect(last().draft!.proposal).toBeNull();
    expect(last().busy).toBeNull();
  });

  test("the creative setting writes hotter, on the chosen connection", async () => {
    await setup();
    await handle({ type: "settings", patch: { creative: true, helperConnectionId: "fast" } });
    const id = last().draft!.check!.findings.find((f) => f.id.startsWith("rel-no-voice:"))!.id;
    await handle({ type: "fix", characterId: "c1", findingId: id });
    expect(h.quiet[0]).toMatchObject({ temperature: 0.8, connection: "fast" });
  });
});

describe("what the helper is told", () => {
  test("the card brief, the ids of the other sections, and the old text of removed parts", () => {
    expect(briefOf({ id: "c", name: "Mira", description: "A courier.", personality: "", scenario: "", first_mes: "Hi.", creator_notes: "", tags: [] }))
      .toBe("Name: Mira\n\nDescription:\nA courier.\n\nGreeting:\nHi.");
    const parts = fromTemplate(T.id, { name: "Mira Vale" })!;
    const ctx = contextOf(parts, "people");
    expect(ctx).toContain("Stats: ");
    expect(ctx).not.toContain("mira_vale");
    expect(contextOf(parts, "stats")).toContain("People: mira_vale");
    const legacy = fromText("name: Old\nquests:\n  q: { name: Find the key }\nstats:\n  hp: { kind: meter }\n");
    expect(legacyNote(legacy)).toContain("quests:\n  q: { name: Find the key }");
    expect(legacyNote(legacy)).not.toContain("hp:");
    expect(legacyNote(parts)).toBe("");
    expect(partsKey(parts)).toBe(partsKey(parts.map((p) => ({ ...p, yaml: `${p.yaml}\n\n` }))));
  });

  test("Deepen leaves balance findings and waived ones out", () => {
    const f = (id: string, severity: "gap" | "thin" | "balance", part: string, waived: string | null = null) => ({ id, system: "scene" as const, severity, part, text: "t", fix: "f", waived });
    expect(deepenTargets([f("a", "gap", "world"), f("b", "balance", "world"), f("c", "thin", "people", "ok because"), f("d", "thin", "world")]))
      .toEqual([{ label: "world", findings: [f("a", "gap", "world"), f("d", "thin", "world")] }]);
  });
});
