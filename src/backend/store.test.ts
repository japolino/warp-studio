import { beforeEach, describe, expect, test } from "bun:test";
import { checkParts, fromTemplate } from "../rulebook/workspace.js";
import { loadRuleset, STAMP, TEMPLATES } from "../warp.js";
import { asRulesetParts } from "../rulebook/workspace.js";
import { book, character, fakeHost, type FakeHost } from "./fake-host.js";
import { publish, readBook, readCharacterRules } from "./store.js";

const T = TEMPLATES[0].id;
let h: FakeHost;

describe("reading what Warp loads", () => {
  test("only the latest installed snapshot counts; older ones are listed as backups", async () => {
    h = fakeHost({
      characters: [character({ id: "c1", name: "Mira", world_book_ids: ["old", "lore", "new"] })],
      books: [
        book({ id: "old", name: "warp-ruleset", metadata: { warp: { installedRulebook: 1 } }, entries: [["warp-ruleset · core", "name: Old\n"]] }),
        book({ id: "lore", name: "Mira's world", entries: [["Town", "The town is small."]] }),
        book({ id: "new", name: "warp-ruleset", metadata: { warp: { installedRulebook: 1, format: 2, by: "warp_studio@0.1.0" } }, entries: [["warp-ruleset · core", "name: New\n"], ["warp-ruleset · stats", "stats: {}\n"]] }),
      ],
    });
    const r = (await readCharacterRules("c1"))!;
    expect(r.parts.map((p) => [p.label, p.yaml])).toEqual([["core", "name: New\n"], ["stats", "stats: {}\n"]]);
    expect(r.view.books.map((b) => [b.id, b.active, b.installed, b.format, b.by])).toEqual([
      ["old", false, true, null, null],
      ["new", true, true, 2, "warp_studio@0.1.0"],
    ]);
    expect(r.view.source).toBe("warp-ruleset (2 entries)");
    expect(r.card.name).toBe("Mira");
  });

  test("an older layout merges every ruleset book and every entry titled warp-ruleset…", async () => {
    h = fakeHost({
      characters: [character({ id: "c1", name: "Mira", world_book_ids: ["a", "b"] })],
      books: [
        book({ id: "a", name: "warp-ruleset", entries: [["anything", "name: A\n"]] }),
        book({ id: "b", name: "Lore", entries: [["warp-ruleset · stats", "stats: {}\n"], ["Town", "not rules"], ["[Mira] warp-ruleset · stats", "stats: { hp: { kind: meter } }\n"]] }),
      ],
    });
    const r = (await readCharacterRules("c1"))!;
    expect(r.parts.map((p) => p.label)).toEqual(["anything", "stats", "stats 2"]);
    expect(r.view.books.every((b) => b.active)).toBe(true);
  });

  test("no rules: no parts, no source; an unknown character is null", async () => {
    h = fakeHost({ characters: [character({ id: "c1", name: "Mira", world_book_ids: ["missing"] })] });
    const r = (await readCharacterRules("c1"))!;
    expect(r.parts).toEqual([]);
    expect(r.view.source).toBeNull();
    expect(await readCharacterRules("nope")).toBeNull();
  });

  test("one backup book can be read on its own", async () => {
    h = fakeHost({ books: [book({ id: "old", name: "warp-ruleset", entries: [["warp-ruleset · core", "name: Old"]] })] });
    expect(await readBook("old")).toEqual({ name: "warp-ruleset", parts: [{ label: "core", yaml: "name: Old\n" }] });
    expect(await readBook("nope")).toBeNull();
  });
});

describe("publishing on Install", () => {
  beforeEach(() => {
    h = fakeHost({
      characters: [character({ id: "c1", name: "Mira", world_book_ids: ["old"] })],
      books: [book({ id: "old", name: "warp-ruleset", metadata: { warp: { installedRulebook: 1 } }, entries: [["warp-ruleset · core", "name: Old\n"]] })],
    });
  });

  test("adds a verified, stamped book last and keeps the old one attached", async () => {
    const parts = fromTemplate(T, { name: "Mira" })!;
    const bookId = await publish("c1", parts);
    expect(h.characters.get("c1")!.world_book_ids).toEqual(["old", bookId]);
    const b = h.books.get(bookId)!;
    expect(b.name).toBe("warp-ruleset");
    expect(b.metadata).toEqual({ warp: { ...STAMP, installedRulebook: 1 } });
    expect(b.entries.map((e) => [e.comment, e.disabled])).toEqual(parts.map((p) => [`warp-ruleset · ${p.label}`, true]));
    // Warp reads back exactly the reviewed ruleset.
    const r = (await readCharacterRules("c1"))!;
    expect(JSON.stringify(checkParts(r.parts).ruleset)).toBe(JSON.stringify(loadRuleset(asRulesetParts(parts)).ruleset));
  });

  test("a read-back mismatch attaches nothing and removes the staged book", async () => {
    h.tamper = (_id, data) => data.map((e) => ({ ...e, content: e.content.replace(/start: \d+/, "start: 1") }));
    await expect(publish("c1", fromTemplate(T)!)).rejects.toThrow("did not match");
    expect(h.characters.get("c1")!.world_book_ids).toEqual(["old"]);
    expect([...h.books.keys()]).toEqual(["old"]);
  });

  test("a draft with errors is refused before anything is written", async () => {
    await expect(publish("c1", [{ label: "core", yaml: "stats: [oops\n" }])).rejects.toThrow("Fix the rulebook errors");
    expect(h.writes).toEqual([]);
  });

  test("a failure after the host attached a verified book keeps it", async () => {
    h.failUpdate = { afterCommit: true };
    const bookId = await publish("c1", fromTemplate(T)!);
    expect(h.characters.get("c1")!.world_book_ids).toEqual(["old", bookId]);
  });
});
