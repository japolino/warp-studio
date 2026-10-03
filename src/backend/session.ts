// One draft ("workspace") per character and user: where it came from, its
// sections and waivers. Kept in Studio's user storage; nothing reaches the
// lorebook until Install. Every operation on one workspace runs in turn.

import { previewOf } from "../rulebook/preview.js";
import { checkParts, cleanLabel, fromTemplate, fromText, installBlock, legacyBanner, orderParts, sameParts, setPart, toText, type Part } from "../rulebook/workspace.js";
import type { DraftBase, DraftView, StartFrom, StudioView, WarpSeen } from "../shared/protocol.js";
import { warpStatus } from "../shared/warp-state.js";
import { STUDIO_FORMAT, TEMPLATES } from "../warp.js";
import { host, logError, send, toast } from "./host.js";
import { publish, readBook, readCharacterRules, type CharacterRules } from "./store.js";

export const WORKSPACE_VERSION = 1;
const MAX_PARTS = 40;
const MAX_YAML = 200_000;

export interface Workspace {
  schemaVersion: number;
  characterId: string;
  characterName: string;
  base: DraftBase;
  parts: Part[];
  /** Findings left as they are on purpose: id → reason (Check, stage 2). */
  waived: Record<string, { reason: string; at: number }>;
  updatedAt: number;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");

function restoreBase(raw: unknown): DraftBase | null {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  switch (b.kind) {
    case "installed": return { kind: "installed", bookId: typeof b.bookId === "string" ? b.bookId : null };
    case "backup": return typeof b.bookId === "string" ? { kind: "backup", bookId: b.bookId, name: str(b.name) || "warp-ruleset" } : null;
    case "template": return typeof b.id === "string" ? { kind: "template", id: b.id, name: str(b.name) || b.id } : null;
    case "import": return { kind: "import", name: str(b.name) || null };
  }
  return null;
}

/** A stored workspace, checked field by field; anything malformed is dropped (null = start over). */
export function restoreWorkspace(raw: unknown, characterId: string): Workspace | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const w = raw as Record<string, unknown>;
  if (typeof w.schemaVersion === "number" && w.schemaVersion > WORKSPACE_VERSION) return null;
  const base = restoreBase(w.base);
  if (!base || !Array.isArray(w.parts)) return null;
  let parts: Part[] = [];
  for (const p of w.parts.slice(0, MAX_PARTS)) {
    if (!p || typeof p !== "object") continue;
    const { label, yaml } = p as Record<string, unknown>;
    if (typeof label !== "string" || typeof yaml !== "string" || yaml.length > MAX_YAML) continue;
    parts = setPart(parts, label, yaml);
  }
  const waived: Workspace["waived"] = {};
  if (w.waived && typeof w.waived === "object" && !Array.isArray(w.waived)) {
    for (const [id, v] of Object.entries(w.waived as Record<string, unknown>)) {
      const reason = str((v as { reason?: unknown })?.reason, 400).trim();
      const at = Number((v as { at?: unknown })?.at);
      if (id.length <= 200 && reason.length >= 8) waived[id] = { reason, at: Number.isFinite(at) ? at : 0 };
    }
  }
  return {
    schemaVersion: WORKSPACE_VERSION, characterId, characterName: str(w.characterName), base, parts, waived,
    updatedAt: Number.isFinite(Number(w.updatedAt)) ? Number(w.updatedAt) : 0,
  };
}

interface Live {
  draft: Workspace | null;
  rules: CharacterRules | null;
  busy: string | null;
  error: string | null;
  installed: { bookId: string; at: number } | null;
  /** The stored draft was read. */
  loaded: boolean;
}

const lives = new Map<string, Live>();
const queues = new Map<string, Promise<unknown>>();
const keyOf = (characterId: string, userId?: string) => `${userId ?? "_"}:${characterId}`;
const pathOf = (characterId: string) => `workspaces/${characterId.replace(/[^\w-]+/g, "_")}.json`;

/** Run one operation on a workspace after the ones before it. */
function serial<T>(characterId: string, userId: string | undefined, fn: () => Promise<T>): Promise<T> {
  const k = keyOf(characterId, userId);
  const run = (queues.get(k) ?? Promise.resolve()).catch(() => {}).then(fn);
  queues.set(k, run);
  void run.finally(() => { if (queues.get(k) === run) queues.delete(k); }).catch(() => {});
  return run;
}

async function liveOf(characterId: string, userId?: string, fresh = false): Promise<Live> {
  const k = keyOf(characterId, userId);
  let l = lives.get(k);
  if (!l) { l = { draft: null, rules: null, busy: null, error: null, installed: null, loaded: false }; lives.set(k, l); }
  if (fresh || !l.rules) l.rules = await readCharacterRules(characterId, userId);
  if (!l.loaded) {
    l.loaded = true;
    try { l.draft = restoreWorkspace(await host().userStorage.getJson<unknown>(pathOf(characterId), { fallback: null, userId }), characterId); }
    catch (e) { logError("workspace read", e); }
  }
  return l;
}

async function save(l: Live, userId?: string) {
  if (!l.draft) return;
  l.draft.updatedAt = Date.now();
  await host().userStorage.setJson(pathOf(l.draft.characterId), l.draft, { userId });
}

function draftView(l: Live): DraftView | null {
  const d = l.draft;
  if (!d) return null;
  const c = checkParts(d.parts);
  let preview: DraftView["preview"] = null;
  if (c.ruleset && !c.errors) {
    try { preview = previewOf(c.ruleset); } catch (e) { logError("preview", e); }
  }
  return {
    base: d.base,
    parts: c.parts.map((p) => ({ label: p.label, yaml: p.yaml, status: p.status, issues: p.issues })),
    unplaced: c.unplaced,
    errors: c.errors,
    warnings: c.warnings,
    legacy: c.legacy,
    banner: legacyBanner(c.legacy),
    changed: !sameParts(d.parts, l.rules?.parts ?? []),
    installBlock: installBlock(c, d.parts),
    preview,
    updatedAt: d.updatedAt,
  };
}

export function studioView(characterId: string, l: Live): StudioView {
  return { characterId, character: l.rules?.view ?? null, draft: draftView(l), busy: l.busy, error: l.error, installed: l.installed };
}

function emit(characterId: string, l: Live, userId?: string) {
  send({ type: "studio", view: studioView(characterId, l) }, userId);
}

/** Run an operation, then send the workspace; a thrown error becomes the view's error line. */
function op(characterId: string, userId: string | undefined, fn: (l: Live) => Promise<void>, opts: { fresh?: boolean } = {}): Promise<void> {
  return serial(characterId, userId, async () => {
    let l: Live;
    try { l = await liveOf(characterId, userId, opts.fresh); }
    catch (e) {
      logError("open", e);
      send({ type: "studio", view: { characterId, character: null, draft: null, busy: null, error: `Couldn't read this character: ${e instanceof Error ? e.message : String(e)}`, installed: null } }, userId);
      return;
    }
    l.error = null;
    try { await fn(l); }
    catch (e) {
      logError("workspace", e);
      l.error = e instanceof Error ? e.message : String(e);
    }
    l.busy = null;
    emit(characterId, l, userId);
  });
}

function needCharacter(l: Live): CharacterRules {
  if (!l.rules) throw new Error("This character was not found. It may have been deleted.");
  return l.rules;
}

function newDraft(l: Live, characterId: string, base: DraftBase, parts: Part[]): Workspace {
  return {
    schemaVersion: WORKSPACE_VERSION, characterId, characterName: l.rules?.card.name ?? "", base,
    parts: orderParts(parts.map((p) => ({ label: cleanLabel(p.label), yaml: p.yaml }))), waived: l.draft?.waived ?? {}, updatedAt: Date.now(),
  };
}

// ───────────────────────── operations ─────────────────────────

/** Show a character: its rules as Warp loads them now (re-read), and the stored draft. */
export function openStudio(characterId: string, userId?: string) {
  return op(characterId, userId, async () => {}, { fresh: true });
}

export function startDraft(characterId: string, from: StartFrom, userId?: string) {
  return op(characterId, userId, async (l) => {
    const rules = needCharacter(l);
    if ("installed" in from) {
      if (!rules.parts.length) throw new Error("This character has no Warp rules yet. Start from a template or import a rulebook.");
      const active = rules.view.books.filter((b) => b.active);
      l.draft = newDraft(l, characterId, { kind: "installed", bookId: active.length === 1 ? active[0].id : null }, rules.parts);
    } else if ("template" in from) {
      const t = TEMPLATES.find((x) => x.id === from.template);
      const parts = fromTemplate(from.template, rules.card);
      if (!t || !parts) throw new Error(`There is no template "${from.template}".`);
      l.draft = newDraft(l, characterId, { kind: "template", id: t.id, name: t.name }, parts);
    } else {
      const b = await readBook(from.backup, userId);
      if (!b || !b.parts.length) throw new Error("That book has no Warp rules.");
      l.draft = newDraft(l, characterId, { kind: "backup", bookId: from.backup, name: b.name }, b.parts);
    }
    await save(l, userId);
  });
}

export function importDraft(characterId: string, text: string, name: string | undefined, userId?: string) {
  return op(characterId, userId, async (l) => {
    needCharacter(l);
    if (text.length > MAX_YAML * 4) throw new Error("That file is too big for a rulebook.");
    l.draft = newDraft(l, characterId, { kind: "import", name: name?.trim().slice(0, 200) || null }, fromText(text));
    await save(l, userId);
  });
}

export function editPart(characterId: string, label: string, yaml: string, userId?: string) {
  return op(characterId, userId, async (l) => {
    if (!l.draft) throw new Error("Start a draft first.");
    if (yaml.length > MAX_YAML) throw new Error("That section is too long.");
    if (!l.draft.parts.some((p) => p.label === cleanLabel(label)) && l.draft.parts.length >= MAX_PARTS) throw new Error("Too many sections.");
    l.draft.parts = setPart(l.draft.parts, label, yaml);
    await save(l, userId);
  });
}

export function discardDraft(characterId: string, userId?: string) {
  return op(characterId, userId, async (l) => {
    l.draft = null;
    try { await host().userStorage.delete(pathOf(characterId), userId); } catch { /* not saved yet */ }
  });
}

/** The draft or the installed rules as one file. */
export function exportRules(characterId: string, from: "draft" | "installed", userId?: string) {
  return op(characterId, userId, async (l) => {
    const rules = needCharacter(l);
    const parts = from === "draft" ? l.draft?.parts ?? [] : rules.parts;
    if (!parts.length) throw new Error(from === "draft" ? "There is no draft to export." : "This character has no Warp rules to export yet.");
    send({ type: "exported", characterId, name: rules.card.name || "rulebook", text: toText(parts, rules.card.name) }, userId);
  });
}

/** Publish the draft. Refused with errors, and when the running Warp reads an older ruleset format. */
export function installDraft(characterId: string, warp: WarpSeen | null, userId?: string) {
  return op(characterId, userId, async (l) => {
    if (!l.draft || !l.draft.parts.length) throw new Error("Nothing to install.");
    const block = installBlock(checkParts(l.draft.parts), l.draft.parts);
    if (block) throw new Error(block);
    // The frontend says what it saw of Warp; the rule is enforced here, where it can't be stale.
    const status = warpStatus(warp ?? { present: false, format: null }, STUDIO_FORMAT);
    if (status.blocks) throw new Error(status.text);
    l.busy = "Saving to the lorebook…";
    emit(characterId, l, userId);
    const bookId = await publish(characterId, l.draft.parts, userId);
    l.installed = { bookId, at: Date.now() };
    l.draft.base = { kind: "installed", bookId };
    await save(l, userId);
    try { l.rules = await readCharacterRules(characterId, userId); } catch (e) { logError("re-read after install", e); }
    toast("success", "Installed. Warp reads the new rules within a few seconds (or use \"Warp: Reload ruleset\").", userId);
  });
}

/** Character list for the picker (when no chat is open). */
export async function listCharacters(userId?: string): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = [];
  for (let offset = 0; offset < 2000; offset += 200) {
    const page = await host().characters.list({ limit: 200, offset, userId });
    out.push(...page.data.map((c) => ({ id: c.id, name: c.name || "(no name)" })));
    if (page.data.length < 200 || out.length >= page.total) break;
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** A character changed elsewhere: read its books again next time. */
export function forgetCharacter(characterId?: string | null) {
  for (const [k, l] of lives) if (!characterId || k.endsWith(`:${characterId}`)) l.rules = null;
}

/** Drop all in-memory state (tests). */
export function resetSessions() { lives.clear(); queues.clear(); }
