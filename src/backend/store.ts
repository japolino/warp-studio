// The character's warp-ruleset lorebook: read exactly what Warp loads, and
// publish a new complete snapshot on Install. All of the lorebook protocol is
// Warp's own (backend/rulebook-install.ts): `attachedRulebooks` (which book is
// active), `rulesetEntries` + `labelOf` (the entries Warp runs, and their
// section labels) and `publishRulebook`. Studio adds the list of books for its
// "older books" view and the format stamp.

import type { WorldBookEntryDTO } from "lumiverse-spindle-types";
import { cleanLabel, type Part } from "../rulebook/workspace.js";
import type { BookView, CharacterView } from "../shared/protocol.js";
import {
  attachedRulebooks, isInstalledRulebook, isRulesetBookName, isRulesetEntryTitle, labelOf, publishRulebook, rulesetEntries, STAMP,
} from "../warp.js";
import { host } from "./host.js";

export interface Card {
  id: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  creator_notes: string;
  tags: string[];
}

export interface CharacterRules {
  card: Card;
  view: CharacterView;
  /** What Warp loads now, as sections (empty without rules). */
  parts: Part[];
}

async function listAll(bookId: string, userId?: string): Promise<WorldBookEntryDTO[]> {
  const out: WorldBookEntryDTO[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const page = await host().world_books.entries.list(bookId, { limit: 200, offset, userId });
    out.push(...page.data);
    if (page.data.length === 0 || out.length >= page.total) break;
  }
  return out;
}

const metaOf = (b: { metadata?: unknown }) => ((b.metadata as { warp?: Record<string, unknown> } | undefined)?.warp ?? {});

/** Entries as sections, in the order given; a repeated label gets " 2", " 3" (older layouts can repeat one). */
function partsOf(entries: { label: string; content: string }[]): Part[] {
  const out: Part[] = [];
  for (const e of entries) {
    const base = cleanLabel(e.label);
    let label = base;
    for (let n = 2; out.some((p) => p.label === label); n++) label = `${base} ${n}`;
    out.push({ label, yaml: e.content.endsWith("\n") ? e.content : `${e.content}\n` });
  }
  return out;
}

/** The character, its books with rules, and the sections Warp loads now. */
export async function readCharacterRules(characterId: string, userId?: string): Promise<CharacterRules | null> {
  const c = await host().characters.get(characterId, userId);
  if (!c) return null;
  const card: Card = {
    id: c.id, name: c.name ?? "", description: c.description ?? "", personality: c.personality ?? "", scenario: c.scenario ?? "",
    first_mes: c.first_mes ?? "", creator_notes: c.creator_notes ?? "", tags: c.tags ?? [],
  };
  // A published snapshot supersedes older books without erasing them: the last attached one wins.
  const { books, active } = await attachedRulebooks(c, userId);
  const views: BookView[] = [];
  for (const b of books) {
    const whole = isRulesetBookName(b.name);
    const n = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment)).length;
    if (!n && !whole) continue;
    const meta = metaOf(b);
    views.push({
      id: b.id, name: b.name, installed: isInstalledRulebook(b), active: (!active || active.id === b.id) && n > 0,
      format: typeof meta.format === "number" ? meta.format : null, by: typeof meta.by === "string" ? meta.by : null, entries: n,
    });
  }
  const parts = partsOf((await rulesetEntries(characterId, userId)).entries);
  const shown = views.filter((v) => v.active);
  return {
    card,
    view: {
      id: c.id, name: card.name, books: views,
      source: shown.length ? shown.map((v) => `${v.name} (${v.entries} ${v.entries === 1 ? "entry" : "entries"})`).join(", ") : null,
      installedParts: parts.length,
    },
    parts,
  };
}

/** One attached book's rule sections (to start a draft from a backup). */
export async function readBook(bookId: string, userId?: string): Promise<{ name: string; parts: Part[] } | null> {
  const b = await host().world_books.get(bookId, userId);
  if (!b) return null;
  const whole = isRulesetBookName(b.name);
  const entries = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment))
    .sort((x, y) => (x.order_value ?? 100) - (y.order_value ?? 100));
  return { name: b.name, parts: partsOf(entries.map((e) => ({ label: labelOf(e.comment ?? ""), content: e.content ?? "" }))) };
}

/**
 * Publish the draft as a new complete `warp-ruleset` book: one disabled entry per section, verified by
 * reading it back, then attached last. Older books stay attached as backups (Warp's own publishRulebook).
 * The book is stamped with the ruleset format and "warp_studio@<version>".
 */
export function publish(characterId: string, parts: Part[], userId?: string): Promise<string> {
  return publishRulebook(characterId, parts.map((p, i) => ({ label: p.label, content: p.yaml, order: (i + 1) * 10 })), userId, { ...STAMP });
}
