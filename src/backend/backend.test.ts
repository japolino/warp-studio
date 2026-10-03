import { beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { StudioView } from "../shared/protocol.js";
import { STUDIO_FORMAT, TEMPLATES } from "../warp.js";
import { book, character, fakeHost, type FakeHost } from "./fake-host.js";
import { handle } from "./router.js";
import { resetSessions, restoreWorkspace } from "./session.js";
import { clearSettingsCache, normalizeSettings } from "./settings.js";

const T = TEMPLATES[0];
const legacy = readFileSync(new URL("../fixtures/legacy.yaml", import.meta.url), "utf8");
let h: FakeHost;

const last = (): StudioView => (h.of<{ type: string; view: StudioView }>("studio").at(-1)!).view;

function setup(o: { rules?: boolean; noGeneration?: boolean } = {}) {
  resetSessions();
  clearSettingsCache();
  h = fakeHost({
    noGeneration: o.noGeneration,
    characters: [character({ id: "c1", name: "Mira Vale", description: "A courier.", world_book_ids: o.rules ? ["b1"] : [] })],
    books: o.rules ? [book({ id: "b1", name: "warp-ruleset", metadata: { warp: { installedRulebook: 1 } }, entries: T.parts.map((p) => [`warp-ruleset · ${p.label}`, p.yaml] as [string, string]) })] : [],
  });
}

describe("hello and settings", () => {
  beforeEach(() => setup());

  test("hello sends settings, the templates, the About line and the helper connections", async () => {
    await handle({ type: "hello" });
    const s = h.of<{ type: string; settings: unknown; templates: { id: string }[]; about: string; canGenerate: boolean; connections: unknown[] }>("settings")[0];
    expect(s.canGenerate).toBe(true);
    expect(s.connections).toEqual([{ id: "fast", name: "Fast helper" }]);
    expect(s.templates.map((t) => t.id)).toEqual(TEMPLATES.map((t) => t.id));
    expect(s.about).toMatch(/^Warp Studio \d+\.\d+\.\d+ · ruleset format \d+ · engine warp#[0-9a-f]{7}$/);
  });

  test("without the generation permission, Studio says so instead of failing", async () => {
    setup({ noGeneration: true });
    await handle({ type: "hello" });
    expect(h.of<{ type: string; canGenerate: boolean }>("settings")[0].canGenerate).toBe(false);
  });

  test("settings are normalized and saved", async () => {
    await handle({ type: "settings", patch: { helperConnectionId: " fast ", creative: "true", playtestTurns: 9999, playtestSeeds: "abc", showThin: 3 } });
    expect(h.storage.get("settings.json")).toEqual({ helperConnectionId: "fast", creative: true, playtestTurns: 200, playtestSeeds: 20, showThin: true });
    expect(normalizeSettings(null)).toEqual(normalizeSettings({}));
  });

  test("the character picker lists characters by name", async () => {
    await handle({ type: "characters" });
    expect(h.of<{ type: string; list: unknown }>("characters")[0].list).toEqual([{ id: "c1", name: "Mira Vale" }]);
  });
});

describe("opening and starting a draft", () => {
  test("open shows the character and what Warp loads now; no draft yet", async () => {
    setup({ rules: true });
    await handle({ type: "open", characterId: "c1" });
    const v = last();
    expect(v.character?.name).toBe("Mira Vale");
    expect(v.character?.installedParts).toBe(T.parts.length);
    expect(v.draft).toBeNull();
  });

  test("an unknown character gives a plain error", async () => {
    setup();
    await handle({ type: "start", characterId: "nope", from: { template: T.id } });
    expect(last().error).toContain("not found");
  });

  test("edit the installed rules: the draft equals them until it changes", async () => {
    setup({ rules: true });
    await handle({ type: "start", characterId: "c1", from: { installed: true } });
    let v = last();
    expect(v.draft?.base).toEqual({ kind: "installed", bookId: "b1" });
    expect(v.draft?.changed).toBe(false);
    expect(v.draft?.errors).toBe(0);
    await handle({ type: "edit", characterId: "c1", label: "core", yaml: `${v.draft!.parts[0].yaml}# a note\n` });
    v = last();
    expect(v.draft?.changed).toBe(true);
  });

  test("no installed rules: starting from them is refused", async () => {
    setup();
    await handle({ type: "start", characterId: "c1", from: { installed: true } });
    expect(last().error).toContain("no Warp rules yet");
    expect(last().draft).toBeNull();
  });

  test("start from a template: the card's character is added, the preview is ready", async () => {
    setup();
    await handle({ type: "start", characterId: "c1", from: { template: T.id } });
    const v = last();
    expect(v.draft?.base).toEqual({ kind: "template", id: T.id, name: T.name });
    expect(v.draft?.parts.some((p) => p.yaml.includes("mira_vale:"))).toBe(true);
    expect(v.draft?.errors).toBe(0);
    expect(v.draft?.preview?.panel.length).toBeGreaterThan(0);
    expect(v.draft?.installBlock).toBeNull();
  });

  test("start from a backup book", async () => {
    setup({ rules: true });
    await handle({ type: "start", characterId: "c1", from: { backup: "b1" } });
    expect(last().draft?.base).toEqual({ kind: "backup", bookId: "b1", name: "warp-ruleset" });
  });

  test("import an old-format file: banner, Warp's warnings, nothing written to the lorebook", async () => {
    setup();
    await handle({ type: "import", characterId: "c1", text: legacy, name: "old.yaml" });
    const v = last();
    expect(v.draft?.base).toEqual({ kind: "import", name: "old.yaml" });
    expect(v.draft?.banner).toMatch(/^This rulebook uses \d+ parts Warp no longer runs/);
    expect(v.draft?.warnings).toBeGreaterThan(0);
    expect(h.writes).toEqual([]);
  });

  test("an empty import is refused and the old draft stays", async () => {
    setup();
    await handle({ type: "start", characterId: "c1", from: { template: T.id } });
    await handle({ type: "import", characterId: "c1", text: "# nothing" });
    expect(last().error).toContain("doesn't look like a rulebook");
    expect(last().draft?.base.kind).toBe("template");
  });
});

describe("editing, saving, restoring", () => {
  beforeEach(() => setup());

  test("a broken section shows red, blocks Install, and is kept as typed", async () => {
    await handle({ type: "start", characterId: "c1", from: { template: T.id } });
    await handle({ type: "edit", characterId: "c1", label: "stats", yaml: "stats: [oops\n" });
    const v = last();
    const stats = v.draft!.parts.find((p) => p.label === "stats")!;
    expect(stats.status).toBe("error");
    expect(stats.yaml).toBe("stats: [oops\n");
    expect(v.draft!.installBlock).toBe("Fix the error first (marked in red).");
    expect(v.draft!.preview).toBeNull();
  });

  test("two quick edits apply in order", async () => {
    await handle({ type: "start", characterId: "c1", from: { template: T.id } });
    await Promise.all([
      handle({ type: "edit", characterId: "c1", label: "notes", yaml: "# one\n" }),
      handle({ type: "edit", characterId: "c1", label: "notes", yaml: "# two\n" }),
    ]);
    expect(last().draft!.parts.find((p) => p.label === "notes")!.yaml).toBe("# two\n");
  });

  test("the draft survives a restart; discard deletes it", async () => {
    await handle({ type: "start", characterId: "c1", from: { template: T.id } });
    resetSessions();
    await handle({ type: "open", characterId: "c1" });
    expect(last().draft?.base.kind).toBe("template");
    await handle({ type: "discard", characterId: "c1" });
    expect(last().draft).toBeNull();
    expect(h.storage.has("workspaces/c1.json")).toBe(false);
  });

  test("a stored workspace with bad fields is cleaned on read", () => {
    const w = restoreWorkspace({
      schemaVersion: 1, characterName: 7, base: { kind: "template", id: "x" },
      parts: [{ label: "Stats", yaml: "stats: {}\n" }, { label: 3, yaml: "x" }, null, { label: "core", yaml: 5 }],
      waived: { "item-dead:x": { reason: "short" }, "rel-none": { reason: "the card has no people", at: 5 } },
    }, "c1")!;
    expect(w.parts).toEqual([{ label: "stats", yaml: "stats: {}\n" }]);
    expect(w.characterName).toBe("");
    expect(w.base).toEqual({ kind: "template", id: "x", name: "x" });
    expect(w.waived).toEqual({ "rel-none": { reason: "the card has no people", at: 5 } });
    expect(restoreWorkspace({ base: { kind: "weird" }, parts: [] }, "c1")).toBeNull();
    expect(restoreWorkspace({ schemaVersion: 99, base: { kind: "import" }, parts: [] }, "c1")).toBeNull();
    expect(restoreWorkspace("junk", "c1")).toBeNull();
  });
});

describe("export", () => {
  test("the draft and the installed rules as one file", async () => {
    setup({ rules: true });
    await handle({ type: "export", characterId: "c1", from: "installed" });
    const ex = h.of<{ type: string; name: string; text: string }>("exported")[0];
    expect(ex.name).toBe("Mira Vale");
    expect(ex.text).toContain("# Warp rulebook — Mira Vale");
    expect(ex.text).toContain("Warp Studio → Import a rulebook");
    await handle({ type: "export", characterId: "c1", from: "draft" });
    expect(last().error).toBe("There is no draft to export.");
  });
});

describe("install", () => {
  beforeEach(async () => {
    setup({ rules: true });
    await handle({ type: "start", characterId: "c1", from: { template: T.id } });
  });

  test("refused while a section has errors; nothing is written", async () => {
    await handle({ type: "edit", characterId: "c1", label: "stats", yaml: "stats: [oops\n" });
    await handle({ type: "install", characterId: "c1", warp: { present: false, format: null } });
    expect(last().error).toBe("Fix the error first (marked in red).");
    expect(h.writes).toEqual([]);
  });

  test("refused when the running Warp reads an older format (or doesn't say)", async () => {
    for (const warp of [{ present: true, format: null }, { present: true, format: STUDIO_FORMAT - 1 }]) {
      await handle({ type: "install", characterId: "c1", warp });
      expect(last().error).toBe("This Warp is older than the ruleset format Studio writes. Update Warp before installing.");
    }
    expect(h.writes).toEqual([]);
  });

  test("allowed without Warp, with the same format and with a newer Warp", async () => {
    for (const warp of [{ present: false, format: null }, { present: true, format: STUDIO_FORMAT }, { present: true, format: STUDIO_FORMAT + 1 }]) {
      await handle({ type: "install", characterId: "c1", warp });
      expect(last().error).toBeNull();
    }
    expect(h.characters.get("c1")!.world_book_ids).toHaveLength(4);
  });

  test("after Install: the new book is what Warp loads, the old one is a backup, the draft matches", async () => {
    await handle({ type: "install", characterId: "c1", warp: { present: false, format: null } });
    const v = last();
    const bookId = v.installed!.bookId;
    expect(h.characters.get("c1")!.world_book_ids).toEqual(["b1", bookId]);
    expect(v.character!.books.map((b) => [b.id, b.active])).toEqual([["b1", false], [bookId, true]]);
    expect(v.draft!.base).toEqual({ kind: "installed", bookId });
    expect(v.draft!.changed).toBe(false);
    expect(v.busy).toBeNull();
    expect(h.toasts.at(-1)).toContain("Installed.");
    // The busy line was shown while it saved.
    expect(h.of<{ type: string; view: StudioView }>("studio").some((m) => m.view.busy === "Saving to the lorebook…")).toBe(true);
  });

  test("a message with no character id is ignored", async () => {
    const before = h.sent.length;
    await handle({ type: "install", warp: {} });
    await handle(null);
    expect(h.sent.length).toBe(before);
  });
});
