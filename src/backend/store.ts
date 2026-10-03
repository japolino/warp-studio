// The character's warp-ruleset lorebook: read exactly what Warp loads, and
// publish a new complete snapshot on Install.
//
// Which book Warp reads is Warp's own `attachedRulebooks`; publishing is Warp's
// own `publishRulebook`. TODO(Warp step 4): the entry listing and labels below
// mirror Warp's `rulesetEntries` + `labelOf` (backend/builder.ts); when they move
// to backend/rulebook-install.ts, import them through src/warp.ts instead.

import type { WorldBookEntryDTO } from "lumiverse-spindle-types";
import { cleanLabel, type Part } from "../rulebook/workspace.js";
import type { BookView, CharacterView } from "../shared/protocol.js";
import { attachedRulebooks, isInstalledRulebook, isRulesetBookName, isRulesetEntryTitle, publishRulebook, STAMP } from "../warp.js";
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

/** Entries of one book that hold rules, as sections in load order; repeated labels get " 2", " 3". */
function partsOf(entries: { comment: string; content: string; order: number }[]): Part[] {
  const sorted = [...entries].sort((a, b) => a.order - b.order || a.comment.localeCompare(b.comment));
  const out: Part[] = [];
  for (const e of sorted) {
    const base = cleanLabel(e.comment);
    let label = base;
    for (let n = 2; out.some((p) => p.label === label); n++) label = `${base} ${n}`;
    out.push({ label, yaml: e.content.endsWith("\n") ? e.content : `${e.content}\n` });
  }
  return out;
}

/** The character, its books with rules, and the sections Warp loads now (the same rules as Warp's source.ts). */
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
  const loaded: { comment: string; content: string; order: number }[] = [];
  for (const b of books) {
    const whole = isRulesetBookName(b.name);
    const entries = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment));
    if (!entries.length && !whole) continue;
    const included = !active || active.id === b.id;
    const meta = metaOf(b);
    views.push({
      id: b.id, name: b.name, installed: isInstalledRulebook(b), active: included && entries.length > 0,
      format: typeof meta.format === "number" ? meta.format : null, by: typeof meta.by === "string" ? meta.by : null,
      entries: entries.length,
    });
    if (included) loaded.push(...entries.map((e) => ({ comment: e.comment ?? "", content: e.content ?? "", order: e.order_value ?? 100 })));
  }
  const parts = partsOf(loaded);
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
  const entries = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment));
  return { name: b.name, parts: partsOf(entries.map((e) => ({ comment: e.comment ?? "", content: e.content ?? "", order: e.order_value ?? 100 }))) };
}

/**
 * Publish the draft as a new complete `warp-ruleset` book: one disabled entry per section, verified by
 * reading it back, then attached last. Older books stay attached as backups (Warp's own publishRulebook).
 * The book is stamped with the ruleset format and "warp_studio@<version>".
 */
export function publish(characterId: string, parts: Part[], userId?: string): Promise<string> {
  return publishRulebook(characterId, parts.map((p, i) => ({ label: p.label, content: p.yaml, order: (i + 1) * 10 })), userId, { ...STAMP });
}
