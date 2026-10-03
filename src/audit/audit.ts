// Check: the core coverage audit. Not "is this valid?" (that is Warp's lint) but
// "what is declared and can never matter, and what will feel flat?", per core
// system: scene, people, checks, choices, conflict, growth. Deterministic: it
// reads the rules (and runs a few dice odds), never a model.
//
// Ported from Warp's legacy depth audit (engine/audit.ts) and balance review
// (engine/balance.ts), rewritten for the six core systems (STUDIO-DESIGN §2.3).

import {
  actionOdds, compile, contestAddAtStart, evalBool, identifiers, initialState, makeEnv, PART_OF_KEY, simulateContest,
  type ActionDef, type Effect, type Ruleset, type StatDef,
} from "../warp.js";

export type SystemId = "scene" | "people" | "checks" | "choices" | "conflict" | "growth";
export const SYSTEMS: { id: SystemId; label: string }[] = [
  { id: "scene", label: "Scene" }, { id: "people", label: "People" }, { id: "checks", label: "Checks" },
  { id: "choices", label: "Choices" }, { id: "conflict", label: "Conflict" }, { id: "growth", label: "Growth" },
];

export type Severity = "gap" | "thin" | "balance";

export interface Finding {
  /** Stable id ("item-dead:rope"): waivers and Fix name findings by id. */
  id: string;
  system: SystemId;
  /** gap = declared and can never matter; thin = works but feels flat; balance = the numbers. */
  severity: Severity;
  /** The section a fix belongs in. */
  part: string;
  text: string;
  fix: string;
}

export interface SystemScore {
  id: SystemId;
  label: string;
  /** 0–100, or null when the ruleset's style does not use this system. */
  score: number | null;
  /** Things declared in this system (+1). */
  declared: number;
  findings: number;
}

export interface AuditReport { findings: Finding[]; systems: SystemScore[] }

/** A finding with the creator's "Leave as is" reason, when there is one. */
export interface FindingView extends Finding { waived: string | null }

/**
 * Findings with their waivers. A waived finding stops counting as open, but still lowers the score
 * (the legacy rule): the score says how thin the rules are, not how many items are left on a list.
 */
export function withWaivers(rep: AuditReport, waived: Record<string, { reason: string }>): { findings: FindingView[]; open: number } {
  const findings = rep.findings.map((f) => ({ ...f, waived: waived[f.id]?.reason ?? null }));
  return { findings, open: findings.filter((f) => !f.waived).length };
}

/** The section that holds a top-level key (Warp's PART_OF_KEY). */
const partOf = (key: string): string => PART_OF_KEY[key] ?? "core";
const PART = {
  scene: partOf("clock"), stats: partOf("stats"), checks: partOf("checks"), people: partOf("relationships"), world: partOf("items"),
  actions: partOf("actions"), secrets: partOf("secrets"), choices: partOf("live_choices"), goals: partOf("goals"), triggers: partOf("triggers"),
  conflict: partOf("conflict"),
};

/** Keys whose string values are formulas, in the normalized ruleset. */
const FORMULA_KEYS = new Set(["when", "add", "target", "maxExpr", "perHourExpr", "startExpr", "doneWhen", "failWhen", "swing"]);
const CALLS = /\b(has|count|cond|flag|rel|met|present|goal|secret|in_contest|eff|gear)\(\s*'([^']+)'/g;

interface Seen {
  changed: Set<string>;
  relChanged: Set<string>;
  reads: Set<string>;
  calls: Set<string>;
  itemsGiven: Set<string>;
  itemsTaken: Set<string>;
  condAdded: Set<string>;
  condTimed: Set<string>;
  condRemoved: Set<string>;
  flagsSet: Set<string>;
  contestStarted: boolean;
  moneyUp: boolean;
  moneyDown: boolean;
}

const isEffect = (o: unknown): o is Effect => !!o && typeof o === "object" && "stats" in o && "addConditions" in o && "removeConditions" in o;

function readFormula(v: string, seen: Seen) {
  try { compile(v); } catch { return; }
  for (const id of identifiers(v)) seen.reads.add(id);
  for (const m of v.matchAll(CALLS)) seen.calls.add(`${m[1]}:${m[2]}`);
}

function walk(o: unknown, seen: Seen, money: string | undefined, key = "") {
  if (typeof o === "string") { if (FORMULA_KEYS.has(key)) readFormula(o, seen); return; }
  if (!o || typeof o !== "object") return;
  if (Array.isArray(o)) { for (const x of o) if (x && typeof x === "object") walk(x, seen, money); return; }
  if (isEffect(o)) {
    for (const v of [...Object.values(o.stats), ...Object.values(o.set)]) if (typeof v === "string") readFormula(v, seen);
    for (const [k, v] of [...Object.entries(o.stats), ...Object.entries(o.set)]) {
      seen.changed.add(k);
      if (k === money) {
        const n = typeof v === "number" ? v : /^\s*-/.test(String(v)) ? -1 : 1;
        if (n > 0) seen.moneyUp = true; else if (n < 0) seen.moneyDown = true;
      }
    }
    for (const m of Object.values(o.rel ?? {})) for (const [k, v] of Object.entries(m ?? {})) { seen.relChanged.add(k); if (typeof v === "string") readFormula(v, seen); }
    for (const [k, v] of Object.entries(o.items ?? {})) (v > 0 ? seen.itemsGiven : seen.itemsTaken).add(k);
    for (const [k, d] of Object.entries(o.addConditions ?? {})) { seen.condAdded.add(k); if (d !== null) seen.condTimed.add(k); }
    for (const k of o.removeConditions ?? []) seen.condRemoved.add(k);
    for (const k of Object.keys(o.flags ?? {})) seen.flagsSet.add(k);
    if (o.contest) seen.contestStarted = true;
  }
  for (const [k, v] of Object.entries(o)) walk(v, seen, money, k);
}

/** An effect that does anything besides a hint. */
export function effectDoes(e: Effect | undefined | null): boolean {
  return !!e && Object.entries(e).some(([k, v]) => k !== "hint" && v !== undefined && v !== null && (typeof v !== "object" || (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)));
}

/** A move that rolls, changes something or takes time (Sleep, Wait an hour) does something. */
const actionDoes = (a: ActionDef) => !!a.check || (a.time ?? 0) > 0 || [a.effects, a.cost, ...Object.values(a.outcomes)].some(effectDoes);

/** A turn-one rule matters when it does more than clear a condition (recovery rules are harmless at the start). */
const meaningful = (e: Effect) => effectDoes({ ...e, removeConditions: [] }) || !!e.hint;

/** round(100 × (1 − weight / declared)): gap 1, thin and balance 0.4 (the legacy formula). */
export function scoreOf(findings: Finding[], declared: number): number {
  const weight = findings.reduce((n, f) => n + (f.severity === "gap" ? 1 : 0.4), 0);
  return Math.max(0, Math.min(100, Math.round(100 * (1 - weight / Math.max(1, declared)))));
}

export function auditRuleset(r: Ruleset): AuditReport {
  const adventure = r.style !== "story";
  const money = r.statOrder.find((id) => r.stats[id].kind === "money");
  const seen: Seen = {
    changed: new Set(), relChanged: new Set(), reads: new Set(), calls: new Set(), itemsGiven: new Set(), itemsTaken: new Set(),
    condAdded: new Set(), condTimed: new Set(), condRemoved: new Set(), flagsSet: new Set(), contestStarted: false, moneyUp: false, moneyDown: false,
  };
  walk(r, seen, money);
  for (const id of Object.keys(r.startItems)) seen.itemsGiven.add(id);
  const kinds = adventure ? Object.values(r.conflict.kinds) : [];
  // Losing a contest round costs stats: those are changes too.
  for (const k of kinds) for (const e of Object.values(k.cost)) if (e) for (const s of Object.keys(e.stats)) seen.changed.add(s);

  const out: Finding[] = [];
  const add = (f: Finding) => out.push(f);
  const start = initialState(r);

  // ───────── scene ─────────
  if (r.clock.enabled && r.clock.start !== "greeting") add({ id: "scene-clock-fixed", system: "scene", severity: "thin", part: PART.scene, text: "The clock starts at a fixed time, whatever the greeting says.", fix: "Use `clock.start: greeting` with a `fallback`, so the first scene's time comes from the greeting." });
  for (const it of Object.values(r.items)) {
    const bonus = Object.keys(it.bonus).length > 0;
    const referenced = seen.calls.has(`has:${it.id}`) || seen.calls.has(`count:${it.id}`) || seen.itemsTaken.has(it.id);
    if (!it.use && !bonus && !referenced) add({ id: `item-dead:${it.id}`, system: "scene", severity: "gap", part: PART.world, text: `${it.name} does nothing: no use, no bonus, and nothing needs it.`, fix: `Give it a \`use:\`${it.desc ? ` (its description says: "${it.desc}")` : ""}, a \`bonus:\` to the checks it helps, or an action or tag that needs it.` });
    else if (!seen.itemsGiven.has(it.id) && !r.itemsOpen) add({ id: `item-unobtainable:${it.id}`, system: "scene", severity: "gap", part: PART.world, text: `${it.name} matters, but nothing gives it to the player.`, fix: "Add it to `start.items` or a `give:` effect." });
  }
  if (money && r.stats[money].narrator <= 0) {
    const label = r.stats[money].label;
    if (!seen.moneyUp) add({ id: "money-no-income", system: "scene", severity: "gap", part: PART.actions, text: `There is ${label} but no way to earn it.`, fix: "Add paid actions or rewards that raise it." });
    if (!seen.moneyDown) add({ id: "money-no-spending", system: "scene", severity: "gap", part: PART.actions, text: `${label} piles up with nothing to spend it on.`, fix: "Add costs to spend it on." });
  }

  // ───────── people ─────────
  if (!r.relStatOrder.length) add({ id: "rel-none", system: "people", severity: "gap", part: PART.people, text: "No relationship stats: nobody's feelings are tracked.", fix: "Add 2 relationship stats with bands (affection, trust)." });
  for (const id of r.relStatOrder) {
    const d = r.relStats[id];
    const bands = [...d.bands].sort((a, b) => a.at - b.at);
    if (bands.length < 2) { add({ id: `rel-no-bands:${id}`, system: "people", severity: "gap", part: PART.people, text: `${d.label} has ${bands.length ? "one band" : "no bands"}, so the player never sees it move.`, fix: "Give it bands; a band crossing is what the player sees." }); }
    else {
      if (!bands.some((b) => b.voice)) add({ id: `rel-no-voice:${id}`, system: "people", severity: "thin", part: PART.people, text: `No band of ${d.label} changes how a person speaks.`, fix: "Give each band a `voice:`: how the person speaks and acts at that level." });
      const missing = bands.some((b, i) => (i > 0 && !b.say) || (i < bands.length - 1 && !b.sayDown));
      if (missing) add({ id: `rel-no-say:${id}`, system: "people", severity: "thin", part: PART.people, text: `Some bands of ${d.label} have no story line of their own (Warp shows a plain default).`, fix: "Write the line the player reads when the band is reached (`say:` going up, `say_down:` going down)." });
    }
    if (d.narrator <= 0 && !seen.relChanged.has(id)) add({ id: `rel-frozen:${id}`, system: "people", severity: "gap", part: PART.people, text: `${d.label} never changes: the story may not move it and no effect does.`, fix: "Let the story move it a little (`narrator: 4`) or give tags effects on it." });
    else if (d.narrator > 10 || d.narrator > (d.max - d.min) / 5) add({ id: `rel-no-cap:${id}`, system: "people", severity: "thin", part: PART.people, text: `${d.label} may jump by ${d.narrator} in one reply: no slow burn.`, fix: "Lower the cap (4–5): one reply should not jump a band." });
  }
  const people = Object.values(r.people);
  if (people.length && !Object.keys(r.secrets).length) add({ id: "people-no-secret", system: "people", severity: "thin", part: PART.secrets, text: "Nobody hides anything.", fix: "Give the main person one secret with 2 stages that open by band." });
  for (const s of Object.values(r.secrets)) {
    const stuck = s.stages.some((st) => [...(st.when ?? "").matchAll(/\bflag\(\s*'([^']+)'/g)].some((m) => !seen.flagsSet.has(m[1]) && !r.flags[m[1]]?.narrator && !r.flags[m[1]]?.start));
    if (stuck) add({ id: `secret-stuck:${s.id}`, system: "people", severity: "gap", part: PART.secrets, text: `A stage of the secret "${s.id}" waits for a flag nothing sets.`, fix: "Set the flag from an action or trigger, or open the stage by `band:`." });
    if (s.tell === "exists" && (s.stages[0]?.when ?? "") !== "") add({ id: `secret-no-cue:${s.id}`, system: "people", severity: "thin", part: PART.secrets, text: `The narrator knows "${s.about}" hides something, but not how it shows.`, fix: "Add a `cue:`: what the narrator shows while it stays hidden." });
  }

  // ───────── checks (adventure) ─────────
  if (adventure) {
    const rolled = new Set<string>([...r.checks.stats, ...kinds.flatMap((k) => [...k.stats, k.escape])]);
    for (const id of r.statOrder) {
      const d = r.stats[id];
      if (d.kind !== "attribute" && d.kind !== "skill") continue;
      if (!rolled.has(id) && !seen.reads.has(id) && !seen.calls.has(`eff:${id}`) && !seen.calls.has(`gear:${id}`)) add({ id: `skill-unused:${id}`, system: "checks", severity: "gap", part: PART.stats, text: `${d.label} is ${d.kind === "skill" ? "a skill" : "an attribute"} no check uses.`, fix: "Let a tag, action or contest kind lean on it, or remove it." });
    }
    if (r.checks.typed && !Object.values(r.checks.outcomes).some(effectDoes)) add({ id: "checks-no-outcomes", system: "checks", severity: "thin", part: PART.checks, text: "A failed risky move costs nothing.", fix: "Give a failed risky move a cost (`checks.outcomes.fail`)." });
    for (const a of Object.values(r.actions)) {
      if (!a.check || a.perPerson) continue;
      const o = actionOdds(r, start, a);
      if (!o) continue;
      const p = o.success + o.partial / 2;
      if (p < 0.12 || p > 0.95) add({ id: `odds:${a.id}`, system: "checks", severity: "balance", part: PART.actions, text: `"${a.label}" succeeds ${Math.round(p * 100)}% of the time at the start.`, fix: "Aim for 30–80 % at the start." });
    }
  }

  // ───────── choices ─────────
  const lc = r.liveChoices;
  const tags = Object.entries(lc.tags);
  if (!lc.enabled) add({ id: "choices-off", system: "choices", severity: "thin", part: PART.choices, text: "No choices are written with the replies.", fix: "Turn on `live_choices` with 4–6 tags." });
  else {
    if (tags.length < 3) add({ id: "tags-few", system: "choices", severity: "gap", part: PART.choices, text: `Only ${tags.length} live-choice tag${tags.length === 1 ? "" : "s"}: three choices cannot differ in kind.`, fix: "Add tags until 3 choices can differ in kind." });
    // In a story, a tag is a direction for the writer (the reply moves feelings); in an adventure it must do something.
    if (adventure) for (const [id, t] of tags) if (!actionDoes(t)) add({ id: `tag-dead:${id}`, system: "choices", severity: "gap", part: PART.choices, text: `The tag "${id}" changes nothing.`, fix: "Give it effects (rel, stats) or a check with success/fail." });
    if (adventure && tags.length && !tags.some(([, t]) => t.check)) add({ id: "tags-no-risk", system: "choices", severity: "thin", part: PART.choices, text: "No tag rolls: every choice is safe.", fix: "Give 1–2 tags a check, so the choices differ in odds." });
    if (adventure && tags.length && tags.every(([, t]) => t.check)) add({ id: "tags-all-risk", system: "choices", severity: "thin", part: PART.choices, text: "Every tag rolls: there is no safe choice.", fix: "Keep one safe tag (no check)." });
    if (lc.taper === false) add({ id: "taper-off", system: "choices", severity: "thin", part: PART.choices, text: "Repeating the same tag never wears off.", fix: "Keep taper on, or one kind button wins every time." });
  }
  for (const a of Object.values(r.actions)) if (!actionDoes(a)) add({ id: `action-dead:${a.id}`, system: "choices", severity: "gap", part: PART.actions, text: `"${a.label}" does nothing.`, fix: "Give it effects, or remove it." });
  const visible = Object.values(r.actions).filter((a) => !a.hidden).length;
  if (visible > 4) add({ id: "actions-many", system: "choices", severity: "thin", part: PART.actions, text: `${visible} authored actions; only 4 show under the choices.`, fix: "Only 4 show under the choices; fold the rest into tags." });

  // ───────── conflict (adventure) ─────────
  if (adventure) {
    if (!r.conflict.fromStory && !seen.contestStarted) add({ id: "contest-never", system: "conflict", severity: "gap", part: PART.conflict, text: "Nothing can start a contest: the story may not, and no action or trigger does.", fix: "Allow the story to start contests, or start one from an action or trigger." });
    for (const k of kinds) {
      if (!effectDoes(k.cost.fail) && !effectDoes(k.cost.crit_fail)) add({ id: `kind-free:${k.id}`, system: "conflict", severity: "thin", part: PART.conflict, text: `Losing a round of ${k.label} costs nothing.`, fix: "Losing a round should cost something (`cost.fail: { health: -8 }`)." });
      if (!effectDoes(k.won) && !effectDoes(k.lost)) add({ id: `kind-flat:${k.id}`, system: "conflict", severity: "thin", part: PART.conflict, text: `Winning or losing ${k.label} changes nothing.`, fix: "Winning or losing should change a stat, a relationship or a flag." });
      const sim = simulateContest(r, k.id, contestAddAtStart(r, start, k), "fair", 400, "studio");
      if (sim.won < 0.2 || sim.won > 0.95) add({ id: `contest-odds:${k.id}`, system: "conflict", severity: "balance", part: PART.conflict, text: `With the start stats, the player wins ${k.label} ${Math.round(sim.won * 100)}% of the time against a fair threat.`, fix: "Change the kind's `stats` or the start stats." });
    }
  }

  // ───────── growth ─────────
  const kindCost = new Set(kinds.flatMap((k) => Object.values(k.cost).flatMap((e) => (e ? Object.keys(e.stats) : []))));
  for (const id of r.statOrder) {
    const d: StatDef = r.stats[id];
    if (d.kind === "hidden" || d.kind === "money") continue;
    const grows = (d.kind === "skill" || d.kind === "attribute") && r.growth.enabled && d.growth > 0 && adventure;
    const changes = seen.changed.has(id) || d.perHour !== 0 || d.perHourExpr !== undefined || d.narrator > 0 || grows || kindCost.has(id);
    if (!changes) add({ id: `stat-static:${id}`, system: "growth", severity: "gap", part: PART.stats, text: `${d.label} never changes.`, fix: "Let actions, contests, triggers or time move it." });
    if (d.kind === "meter") {
      if (!seen.reads.has(id) && !seen.calls.has(`eff:${id}`)) add({ id: `stat-unread:${id}`, system: "growth", severity: "thin", part: PART.stats, text: `${d.label} is shown but nothing reacts to it.`, fix: "Let something react to it (a trigger at a band, a check penalty)." });
      if (!d.bands.length) add({ id: `meter-no-bands:${id}`, system: "growth", severity: "thin", part: PART.stats, text: `${d.label} shows as a bare number.`, fix: "Give it 3–4 bands, so it shows in words." });
      if (d.perHour) {
        const toEdge = d.perHour > 0 ? d.max - d.start : d.start - d.min;
        const hours = toEdge / Math.abs(d.perHour);
        const bad = (d.perHour > 0 && d.good === "low") || (d.perHour < 0 && d.good === "high");
        if (bad && hours < 8) add({ id: `drift:${id}`, system: "growth", severity: "balance", part: PART.stats, text: `${d.label} reaches its worst in about ${Math.max(1, Math.round(hours))}h of game time on its own.`, fix: "Slow the `per_hour` drift." });
      }
    }
  }
  for (const c of Object.values(r.conditions)) {
    const added = seen.condAdded.has(c.id) || c.narrator;
    if (!added) { add({ id: `cond-never:${c.id}`, system: "growth", severity: "gap", part: PART.world, text: `Nothing ever causes ${c.label}.`, fix: "Add it from an action, a contest cost or a trigger." }); continue; }
    if (!seen.condRemoved.has(c.id) && !c.lasts && !(seen.condTimed.has(c.id) && !c.narrator)) add({ id: `cond-uncured:${c.id}`, system: "growth", severity: "thin", part: PART.world, text: `Nothing ends ${c.label}.`, fix: "Give it `lasts:` or a cure." });
    if (!Object.keys(c.bonus).length && !seen.calls.has(`cond:${c.id}`)) add({ id: `cond-unread:${c.id}`, system: "growth", severity: "thin", part: PART.world, text: `${c.label} only colours the narration.`, fix: "Give it a `bonus:` to checks, or a trigger that reads it." });
  }
  for (const f of Object.values(r.flags)) {
    const set = seen.flagsSet.has(f.id) || f.narrator;
    const read = seen.calls.has(`flag:${f.id}`) || seen.reads.has(f.id);
    if (set && !read) add({ id: `flag-unread:${f.id}`, system: "growth", severity: "thin", part: PART.world, text: `The flag ${f.id} is set but nothing reads it.`, fix: `Read it somewhere: an action's \`when\`, a trigger or a secret stage (flag('${f.id}')).` });
    if (!set && read && !f.start) add({ id: `flag-unset:${f.id}`, system: "growth", severity: "gap", part: PART.world, text: `The flag ${f.id} is read but nothing sets it.`, fix: `Set it from an action or trigger (\`flags: { ${f.id}: true }\`).` });
  }
  const env = makeEnv(r, start);
  for (const t of r.triggers) {
    if (t.when && !t.whenScene && !t.repeat && meaningful(t.effects) && evalBool(t.when, env, false)) add({ id: `trig:${t.id}`, system: "growth", severity: "balance", part: PART.triggers, text: `The rule "${t.id}" fires on turn one.`, fix: "Change its `when` or the start values." });
  }
  const goals = Object.values(r.goals.list);
  if (!r.goals.fromStory && !goals.length) add({ id: "goals-none", system: "growth", severity: "thin", part: PART.goals, text: "There is nothing to work toward.", fix: "Let the story make goals, or add 1–3." });
  for (const g of goals) {
    // A goal with no done_when and no judge: Warp's lint already says so (Studio doesn't repeat a lint message).
    if (!g.stakes && !effectDoes(g.reward) && !g.failWhen && !g.judgeFail) add({ id: `goal-no-stakes:${g.id}`, system: "growth", severity: "thin", part: PART.goals, text: `The goal "${g.text}" has nothing at stake.`, fix: "Say what is at stake, or give a reward." });
  }

  // ───────── scores ─────────
  const declared: Record<SystemId, number> = {
    scene: 1 + Object.keys(r.items).length + (money ? 1 : 0) + 1,
    people: r.relStatOrder.length + people.length + Object.keys(r.secrets).length + 1,
    checks: r.statOrder.filter((id) => ["attribute", "skill"].includes(r.stats[id].kind)).length + Object.values(r.actions).filter((a) => a.check).length + 1 + 1,
    choices: tags.length + Object.keys(r.actions).length + 1,
    conflict: kinds.length + 1 + 1,
    growth: r.statOrder.length + Object.keys(r.conditions).length + Object.keys(r.flags).length + r.triggers.length + goals.length + 1,
  };
  const systems = SYSTEMS.map((s) => {
    const used = adventure || (s.id !== "checks" && s.id !== "conflict");
    const mine = out.filter((f) => f.system === s.id);
    return { id: s.id, label: s.label, score: used ? scoreOf(mine, declared[s.id]) : null, declared: declared[s.id], findings: mine.length };
  });
  return { findings: out, systems };
}
