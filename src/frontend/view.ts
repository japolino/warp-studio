// Studio's screens as HTML strings. Pure (no DOM), so tests render them
// directly. The controller (frontend.ts) owns the typed-but-unsaved text.

import type { BackendToFrontend, BookView, CheckView, DraftBase, DraftView, IssueView, PartView, PlaytestReport, ProposalView, SectionInfo, StudioView } from "../shared/protocol.js";
import type { WarpStatus } from "../shared/warp-state.js";

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type SettingsMsg = Extract<BackendToFrontend, { type: "settings" }>;

/** Per-root screen state the backend doesn't know about. */
export type Pane = "sections" | "check" | "playtest" | "preview" | "review";

export interface RootUi {
  pane: Pane;
  /** Section text typed but not saved yet, by label. */
  unsaved: Record<string, string>;
  importText: string;
  importName: string | null;
  /** "Start over" is open while a draft exists. */
  showStart: boolean;
  /** Discard was clicked once; the second click discards. */
  confirmDiscard: boolean;
  /** The character list is shown (drawer only). */
  picking: boolean;
  /** The finding whose "Leave as is" reason is being typed, and the text so far. */
  waiving: string | null;
  waiveText: string;
}

export function emptyUi(): RootUi {
  return { pane: "sections", unsaved: {}, importText: "", importName: null, showStart: false, confirmDiscard: false, picking: false, waiving: null, waiveText: "" };
}

export interface StudioModel {
  mode: "drawer" | "editor";
  characterId: string | null;
  /** null while the first answer is on its way. */
  view: StudioView | null;
  settings: SettingsMsg | null;
  warp: WarpStatus;
  exported: { name: string; text: string } | null;
  characters: { id: string; name: string }[] | null;
  /** The drawer shows a picked character instead of the chat's. */
  picked: boolean;
  /** A running Playtest's progress (0–1), or null. */
  progress: number | null;
  ui: RootUi;
}

const btn = (action: string, label: string, o: { primary?: boolean; ghost?: boolean; disabled?: boolean; title?: string; data?: Record<string, string> } = {}) =>
  `<button class="ws-btn${o.primary ? " ws-btn-primary" : ""}${o.ghost ? " ws-btn-ghost" : ""}" data-ws="${esc(action)}"${Object.entries(o.data ?? {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("")}${o.title ? ` title="${esc(o.title)}"` : ""}${o.disabled ? " disabled" : ""}>${esc(label)}</button>`;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function baseText(b: DraftBase): string {
  switch (b.kind) {
    case "installed": return "Draft of the installed rules";
    case "backup": return `Draft from the older book "${b.name}"`;
    case "template": return `Draft from the ${b.name} template`;
    case "import": return `Draft from an imported file${b.name ? ` (${b.name})` : ""}`;
  }
}

function issueList(issues: IssueView[]): string {
  if (!issues.length) return "";
  return `<ul class="ws-issues">${issues.map((i) => `<li class="ws-${i.level}"><b>${i.level === "error" ? "Error" : "Warning"}</b> <span class="ws-where">${esc(i.where)}</span>: ${esc(i.message)}</li>`).join("")}</ul>`;
}

function statusChip(p: PartView): string {
  const e = p.issues.filter((i) => i.level === "error").length, w = p.issues.length - e;
  if (e) return `<span class="ws-chip ws-chip-error">${plural(e, "error")}</span>`;
  if (w) return `<span class="ws-chip ws-chip-warn">${plural(w, "warning")}</span>`;
  return `<span class="ws-chip ws-chip-ok">✓</span>`;
}

function partCard(p: PartView, info: SectionInfo | undefined, ui: RootUi, busy: boolean): string {
  const unsaved = ui.unsaved[p.label];
  const text = unsaved ?? p.yaml;
  const rows = Math.min(30, Math.max(5, text.split("\n").length + 1));
  return `<details class="ws-part ws-part-${p.status}" data-section="${esc(p.label)}"${p.status === "error" ? " open" : ""}>
  <summary><span class="ws-part-name">${esc(p.label)}</span><span class="ws-part-what">${esc(info?.contents ?? "")}</span>${unsaved !== undefined ? `<span class="ws-chip ws-chip-warn">not saved</span>` : ""}${statusChip(p)}</summary>
  ${issueList(p.issues)}
  <textarea class="ws-input ws-yaml" data-yaml="${esc(p.label)}" rows="${rows}" spellcheck="false">${esc(text)}</textarea>
  <div class="ws-row">${btn("save", "Save and check", { data: { label: p.label }, disabled: busy || unsaved === undefined })}${unsaved !== undefined ? btn("revert", "Undo my changes", { ghost: true, data: { label: p.label } }) : ""}<span class="ws-dim">An empty section is removed on save.</span></div>
</details>`;
}

function addSection(d: DraftView, sections: SectionInfo[], busy: boolean): string {
  const missing = sections.filter((s) => !d.parts.some((p) => p.label === s.label));
  if (!missing.length) return "";
  return `<div class="ws-row ws-add">
  <select class="ws-input" data-ws-add>${missing.map((s) => `<option value="${esc(s.label)}">${esc(s.label)}: ${esc(s.contents)}</option>`).join("")}</select>
  ${btn("add-section", "Add the section", { disabled: busy })}
</div>`;
}

function problems(d: DraftView): string {
  const head = d.errors || d.warnings
    ? `<p class="${d.errors ? "ws-bad" : "ws-warn"}">${[d.errors && plural(d.errors, "error"), d.warnings && plural(d.warnings, "warning")].filter(Boolean).join(" · ")}${d.errors ? ". Errors stop Install." : "."}</p>`
    : `<p class="ws-good">✓ Loads and lints clean.</p>`;
  return `${head}${d.unplaced.length ? `<div class="ws-unplaced"><p class="ws-dim">Not tied to one section:</p>${issueList(d.unplaced)}</div>` : ""}`;
}

function previewPane(d: DraftView): string {
  const p = d.preview;
  if (!p) return `<p class="ws-dim">The preview shows once the draft loads without errors.</p>`;
  const list = (title: string, lines: string[], empty: string) => `<h4>${esc(title)}</h4>${lines.length ? `<ul class="ws-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : `<p class="ws-dim">${esc(empty)}</p>`}`;
  return `<div class="ws-preview">
  <p><b>${esc(p.name)}</b>${p.description ? ` — ${esc(p.description)}` : ""}</p>
  ${list("Status panel at the start", p.panel, "Nothing to show.")}
  ${list("Actions at the start", p.choices, "None: the live choices are written with each reply.")}
  ${list("What the narrator is told", p.narrator, "Nothing yet.")}
</div>`;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function systemBars(c: CheckView): string {
  return `<div class="ws-systems">${c.systems.map((s) => s.score === null
    ? `<div class="ws-sys ws-sys-off"><span>${esc(s.label)}</span><div class="ws-bar"></div><b>not used</b></div>`
    : `<div class="ws-sys"><span>${esc(s.label)}</span><div class="ws-bar"><i class="${s.score >= 80 ? "ws-fill-good" : s.score >= 50 ? "ws-fill-warn" : "ws-fill-bad"}" style="width:${s.score}%"></i></div><b>${s.score}</b></div>`).join("")}</div>`;
}

const SEVERITY: Record<string, string> = { gap: "gap", thin: "thin", balance: "balance" };

function checkPane(m: StudioModel, v: StudioView, d: DraftView): string {
  const c = d.check;
  if (!c) return `<p class="ws-dim">Check runs once the draft loads without errors. Fix the sections marked in red first.</p>`;
  const busy = !!v.busy;
  const canGenerate = m.settings?.canGenerate !== false;
  const showThin = m.settings?.settings.showThin !== false;
  const shown = c.findings.filter((f) => showThin || f.severity !== "thin");
  const hidden = c.findings.length - shown.length;
  // Deepen works on open gaps and thin spots, and rebuilds parts Warp no longer runs (the banner).
  const deepenable = c.findings.some((f) => !f.waived && f.severity !== "balance") || !!d.banner;
  const rows = shown.map((f) => {
    const waiving = m.ui.waiving === f.id;
    const actions = f.waived
      ? `<span class="ws-dim">Left as is: ${esc(f.waived)}</span>${btn("unwaive", "Undo", { ghost: true, data: { finding: f.id } })}`
      : waiving
        ? `<input class="ws-input" data-ws-waive-text placeholder="Why it stays as it is (8 characters or more)" value="${esc(m.ui.waiveText)}">${btn("waive", "Leave as is", { data: { finding: f.id } })}${btn("waive-cancel", "Cancel", { ghost: true })}`
        : `${btn("fix", "Fix", { disabled: busy || !canGenerate, title: canGenerate ? "One helper call (at most 3 with repairs); you review the result" : "Studio may not use a model", data: { finding: f.id } })}${btn("waive-open", "Leave as is", { ghost: true, data: { finding: f.id } })}`;
    return `<li class="ws-finding ws-sev-${SEVERITY[f.severity]}${f.waived ? " ws-waived" : ""}">
  <div class="ws-row"><span class="ws-chip ws-chip-${f.severity === "gap" ? "error" : "warn"}">${esc(f.severity)}</span><span class="ws-dim">${esc(f.system)} · ${esc(f.part)}</span></div>
  <p>${esc(f.text)}</p><p class="ws-dim">Fix: ${esc(f.fix)}</p>
  <div class="ws-row">${actions}</div>
</li>`;
  }).join("");
  return `${systemBars(c)}
  ${c.style === "story" ? `<p class="ws-dim">A story doesn't roll: Checks and Conflict are not used.</p>` : ""}
  <div class="ws-row ws-spread"><span>${c.open ? `${plural(c.open, "open finding")}` : "✓ Nothing open."}${hidden ? ` <span class="ws-dim">(${plural(hidden, "thin spot")} hidden in Settings)</span>` : ""}</span>
  ${btn("deepen", "Deepen", { primary: true, disabled: busy || !canGenerate || !deepenable, title: "Rewrite every section with open gaps or thin spots (at most 12 helper calls); you review the result" })}</div>
  ${rows ? `<ul class="ws-findings">${rows}</ul>` : ""}`;
}

function gateRows(rep: PlaytestReport): string {
  return `<table class="ws-table"><tbody>${rep.gates.map((g) => `<tr class="${g.pass ? "ws-pass" : "ws-fail"}"><td>${g.pass ? "✓" : "✕"}</td><td>${esc(g.label)}</td><td>${esc(Number.isInteger(g.value) ? g.value : g.value.toFixed(2))}</td><td class="ws-dim">${esc(g.bar)}</td></tr>`).join("")}</tbody></table>`;
}

function playtestReport(rep: PlaytestReport): string {
  const share = rep.tagShare.length ? `<h4>Tag share (a greedy player)</h4><div class="ws-shares">${rep.tagShare.map((t) => `<div class="ws-sys"><span>${esc(t.tag)}</span><div class="ws-bar"><i class="${t.share > 0.5 ? "ws-fill-bad" : "ws-fill-good"}" style="width:${Math.round(t.share * 100)}%"></i></div><b>${pct(t.share)}</b></div>`).join("")}</div>` : "";
  const words = ["easy", "fair", "hard", "extreme"];
  const odds = rep.odds.length ? `<h4>Odds at the start</h4><table class="ws-table"><thead><tr><th></th>${words.map((w) => `<th>${w}</th>`).join("")}</tr></thead><tbody>${rep.odds.map((o) => `<tr><td>${esc(o.tag)}</td>${o.cells.map((c) => `<td>${c.pct}%</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  const contests = rep.contests.map((c) => `<h4>${esc(c.label)}: win % · mean rounds</h4><table class="ws-table"><thead><tr><th>add</th>${words.map((w) => `<th>${w}</th>`).join("")}</tr></thead><tbody>${c.rows.map((row) => `<tr${row.add === c.best ? ` class="ws-best" title="The player's best start stat for this kind"` : ""}><td>+${row.add}</td>${row.cells.map((x) => `<td>${pct(x.won)} · ${x.meanRounds.toFixed(1)}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("");
  return `<p class="${rep.pass ? "ws-good" : "ws-bad"}">${rep.pass ? "✓ Every gate passes." : `✕ ${plural(rep.gates.filter((g) => !g.pass).length, "gate")} fail${rep.gates.filter((g) => !g.pass).length === 1 ? "s" : ""}.`} <span class="ws-dim">${rep.turns} turns × ${rep.seeds} seeds per player policy.</span></p>
  <h4>Warp's gates</h4>${gateRows(rep)}${share}${odds}${contests}`;
}

function playtestPane(m: StudioModel, v: StudioView, d: DraftView): string {
  const busy = !!v.busy;
  const s = m.settings?.settings;
  const size = s ? `${s.playtestTurns} turns × ${s.playtestSeeds} seeds` : "";
  const running = m.progress !== null && !!v.busy;
  const head = `<div class="ws-row ws-spread"><p class="ws-dim">Warp's own loop simulator plays the draft with scripted players and a fake narrator. No model, no cost.</p>
  ${running ? `<div class="ws-progress"><i style="width:${Math.round((m.progress ?? 0) * 100)}%"></i></div>` : btn("playtest", `Run ${size}`.trim(), { primary: true, disabled: busy || !d.check })}</div>`;
  if (!d.check) return `${head}<p class="ws-dim">The playtest runs once the draft loads without errors.</p>`;
  if (!d.playtest) return `${head}<p class="ws-dim">No playtest yet.</p>`;
  return `${head}${d.playtest.stale ? `<p class="ws-warn">The draft changed since this run. Run it again to see the new numbers.</p>` : ""}${playtestReport(d.playtest.report)}`;
}

function reviewPane(p: ProposalView, busy: boolean): string {
  const scoreChanges = Object.keys({ ...p.scores.before, ...p.scores.after })
    .filter((k) => p.scores.before[k] !== p.scores.after[k])
    .map((k) => `${esc(k)} ${p.scores.before[k] ?? "–"} → ${p.scores.after[k] ?? "–"}`);
  const gateChanges = p.gates.after.filter((g) => p.gates.before.find((b) => b.id === g.id)?.pass !== g.pass)
    .map((g) => `${g.pass ? "✓" : "✕"} ${esc(g.label)}`);
  const kept = p.sections.filter((s) => s.kept);
  const sections = p.sections.map((s) => `<details class="ws-part ws-review-${s.kept ? "kept" : "dropped"}" data-section="review:${esc(s.label)}"${s.kept ? " open" : ""}>
  <summary>${s.kept ? `<input type="checkbox" data-ws-pick-section value="${esc(s.label)}" checked>` : ""}<span class="ws-part-name">${esc(s.label)}</span><span class="ws-part-what">${esc(s.kept ? s.summary ?? "" : `dropped: ${s.reason ?? ""}`)}</span><span class="ws-chip">+${s.added} −${s.removed}</span></summary>
  ${s.diff.length ? `<pre class="ws-diff">${s.diff.map((l) => `<span class="ws-diff-${l.op === "+" ? "add" : l.op === "-" ? "del" : "ctx"}">${esc(l.op)} ${esc(l.text)}</span>`).join("\n")}</pre>` : ""}
</details>`).join("");
  return `<p><b>${p.kind === "fix" ? "Fix" : "Deepen"}</b> <span class="ws-dim">${plural(p.calls, "helper call")} · ${plural(kept.length, "section")} kept of ${p.sections.length}. Nothing is in the draft until you accept it.</span></p>
  ${scoreChanges.length ? `<p>Scores: ${scoreChanges.join(" · ")}</p>` : `<p class="ws-dim">No score changed.</p>`}
  ${gateChanges.length ? `<p>Gates: ${gateChanges.join(" · ")}</p>` : ""}
  ${sections}
  <div class="ws-row">${btn("review-some", "Accept the ticked sections", { primary: true, disabled: busy || !kept.length })}${btn("review-all", "Accept all kept", { disabled: busy || !kept.length })}${btn("review-none", "Discard", { ghost: true, disabled: busy })}</div>`;
}

function installArea(m: StudioModel, v: StudioView, d: DraftView): string {
  const busy = !!v.busy;
  const name = v.character?.name ?? "this character";
  const why = d.installBlock ?? (m.warp.blocks ? m.warp.text : null) ?? (!d.changed ? "Nothing to install: the draft is the same as the rules Warp loads now." : null);
  return `<div class="ws-install">
  <p class="ws-dim">Install publishes a new "warp-ruleset" book and attaches it to ${esc(name)}. The old book stays attached as a backup. Open chats with ${esc(name)} will ask once whether to keep their history.</p>
  <div class="ws-row">
    ${btn("install", "Install", { primary: true, disabled: busy || !!why })}
    ${btn("export-draft", "Export the draft", { disabled: busy })}
    ${btn("discard", m.ui.confirmDiscard ? "Click again to discard" : "Discard the draft", { ghost: true, disabled: busy })}
  </div>
  ${why ? `<p class="ws-dim ws-why">${esc(why)}</p>` : ""}
</div>`;
}

function draftCard(m: StudioModel, v: StudioView, d: DraftView): string {
  const busy = !!v.busy;
  const sections = m.settings?.sections ?? [];
  const panes: [Pane, string][] = [
    ["sections", `Sections (${d.parts.length})`],
    ["check", d.check ? `Check (${d.check.open})` : "Check"],
    ["playtest", d.playtest ? `Playtest ${d.playtest.report.pass ? "✓" : "✕"}` : "Playtest"],
    ["preview", "Preview"],
    ...(d.proposal ? [["review", "Review ●"] as [Pane, string]] : []),
  ];
  const pane = m.ui.pane === "review" && !d.proposal ? "sections" : m.ui.pane;
  const tabs = panes.map(([p, label]) => `<button class="ws-tab" role="tab" data-ws="pane" data-pane="${p}" aria-selected="${pane === p}">${esc(label)}</button>`).join("");
  const body = pane === "preview" ? previewPane(d)
    : pane === "check" ? checkPane(m, v, d)
    : pane === "playtest" ? playtestPane(m, v, d)
    : pane === "review" && d.proposal ? reviewPane(d.proposal, busy)
    : `${problems(d)}${d.parts.map((p) => partCard(p, sections.find((s) => s.label === p.label.replace(/ \d+$/, "")), m.ui, busy)).join("")}${addSection(d, sections, busy)}`;
  return `<div class="ws-card ws-draft">
  <div class="ws-row ws-spread"><h3>${esc(baseText(d.base))}</h3><span class="ws-dim">${d.changed ? "changed" : "same as installed"}</span></div>
  ${d.banner ? `<p class="ws-banner" role="note">${esc(d.banner)}</p>` : ""}
  <div class="ws-tabs" role="tablist">${tabs}</div>
  <div class="ws-pane">${body}</div>
  ${installArea(m, v, d)}
</div>`;
}

function bookLine(b: BookView): string {
  const bits = [b.installed ? "installed snapshot" : "older layout", plural(b.entries, "section"), b.format ? `format ${b.format}` : "", b.by ? `by ${b.by}` : ""].filter(Boolean).join(" · ");
  return `<li><b>${esc(b.name)}</b> <span class="ws-dim">${esc(bits)}</span>${b.active ? ` <span class="ws-chip ws-chip-ok">Warp reads this</span>` : ` ${btn("start-backup", "Start from this one", { ghost: true, data: { book: b.id } })}`}</li>`;
}

function characterCard(v: StudioView, busy: boolean): string {
  const c = v.character;
  if (!c) return "";
  const books = c.books.length ? `<ul class="ws-books">${c.books.map(bookLine).join("")}</ul>` : "";
  return `<div class="ws-card">
  <div class="ws-row ws-spread"><h3>${esc(c.name)}</h3>${c.installedParts ? btn("export-installed", "Export the installed rules", { disabled: busy }) : ""}</div>
  <p>${c.source ? `Warp loads: ${esc(c.source)}.` : "No Warp rules yet."}</p>
  ${books}
</div>`;
}

function startCard(m: StudioModel, v: StudioView): string {
  const busy = !!v.busy;
  const hasDraft = !!v.draft;
  const templates = (m.settings?.templates ?? []).map((t) =>
    `<div class="ws-choice">${btn("start-template", `Start from ${t.name}`, { disabled: busy, data: { template: t.id } })}<span class="ws-dim">${esc(t.blurb)}</span></div>`).join("");
  const body = `
  ${v.character?.installedParts ? `<div class="ws-choice">${btn("start-installed", "Edit the installed rules", { primary: !hasDraft, disabled: busy })}<span class="ws-dim">A draft copy; the lorebook changes only on Install.</span></div>` : ""}
  ${templates}
  <div class="ws-import">
    <p><b>Import a rulebook</b> <span class="ws-dim">Paste the YAML or choose a file (written by hand, by an agent, or exported from Studio). It is checked before anything is saved.</span></p>
    <textarea class="ws-input ws-yaml" rows="5" data-ws-import spellcheck="false" placeholder="name: My game&#10;relationships:&#10;  …">${esc(m.ui.importText)}</textarea>
    <div class="ws-row">${btn("import", "Check it", { disabled: busy })}<label class="ws-btn">Choose a file…<input type="file" accept=".yaml,.yml,.txt,.md" data-ws-file hidden></label>${m.ui.importName ? `<span class="ws-dim">${esc(m.ui.importName)}</span>` : ""}</div>
  </div>`;
  if (!hasDraft) return `<div class="ws-card ws-start"><h3>Start a draft</h3><p class="ws-dim">Studio edits a draft. Nothing reaches the lorebook until you install it.</p>${body}</div>`;
  return `<details class="ws-card ws-start" data-ws-start${m.ui.showStart ? " open" : ""}><summary><b>Start over</b> <span class="ws-dim">replaces the draft</span></summary>${body}</details>`;
}

function exportBox(e: { name: string; text: string }): string {
  return `<div class="ws-card ws-export">
  <h3>Rulebook file</h3>
  <textarea class="ws-input ws-yaml" rows="10" readonly data-ws-export spellcheck="false">${esc(e.text)}</textarea>
  <div class="ws-row">${btn("export-copy", "Copy", { primary: true })}${btn("export-save", "Save as file", { data: { name: e.name } })}${btn("export-close", "Close", { ghost: true })}</div>
</div>`;
}

function settingsCard(s: SettingsMsg | null): string {
  if (!s) return "";
  const conns = [`<option value="">Lumiverse's active connection</option>`, ...s.connections.map((c) => `<option value="${esc(c.id)}"${c.id === s.settings.helperConnectionId ? " selected" : ""}>${esc(c.name)}</option>`)].join("");
  return `<details class="ws-card ws-settings" data-section="__settings">
  <summary><b>Settings</b></summary>
  <label class="ws-field">Helper model for Fix and Deepen<select class="ws-input" data-setting="helperConnectionId">${conns}</select></label>
  <label class="ws-toggle"><span>Creative writing</span><small>Fix and Deepen write at temperature 0.8 instead of 0.4.</small><input type="checkbox" data-setting="creative"${s.settings.creative ? " checked" : ""}></label>
  <div class="ws-row"><label class="ws-field">Playtest turns<input class="ws-input" type="number" min="5" max="200" data-setting="playtestTurns" value="${s.settings.playtestTurns}"></label><label class="ws-field">Seeds<input class="ws-input" type="number" min="1" max="200" data-setting="playtestSeeds" value="${s.settings.playtestSeeds}"></label></div>
  <label class="ws-toggle"><span>Show thin spots</span><small>Off: Check lists only gaps and balance (the scores still count thin spots).</small><input type="checkbox" data-setting="showThin"${s.settings.showThin ? " checked" : ""}></label>
  ${s.canGenerate ? "" : `<p class="ws-warn">Studio may not use a model (no generation permission). Check, Playtest, import, export and Install still work.</p>`}
  <p class="ws-dim">${esc(s.about)}</p>
</details>`;
}

function pickerCard(m: StudioModel): string {
  const list = m.characters;
  const pick = list
    ? list.length
      ? `<div class="ws-row"><select class="ws-input" data-ws-pick>${list.map((c) => `<option value="${esc(c.id)}"${c.id === m.characterId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>${btn("pick", "Open", { primary: true })}</div>`
      : `<p class="ws-dim">You have no characters yet.</p>`
    : btn("list-characters", "Show my characters");
  return `<div class="ws-card"><h3>Which character?</h3><p>Open a chat with one character, or pick one here. Studio also has a tab in the character editor.</p>${pick}${m.picked ? btn("unpick", "Use the open chat's character", { ghost: true }) : ""}</div>`;
}

export function renderStudio(m: StudioModel): string {
  const head = `<div class="ws-head"><div class="ws-row ws-spread"><b>Warp Studio</b>${m.mode === "drawer" && m.characterId && !m.ui.picking ? btn("picking", "Other character…", { ghost: true }) : ""}</div><p class="ws-warp ws-warp-${m.warp.kind}">${esc(m.warp.text)}</p></div>`;
  if (!m.characterId || (m.mode === "drawer" && m.ui.picking)) {
    if (m.mode === "editor") return `${head}<div class="ws-card"><p>Open a character to edit its Warp rules.</p></div>`;
    return `${head}${pickerCard(m)}${settingsCard(m.settings)}`;
  }
  const v = m.view;
  if (!v) return `${head}<p class="ws-dim">Loading…</p>`;
  const busy = v.busy ? `<p class="ws-busy" role="status"><span class="ws-spin"></span>${esc(v.busy)}${v.cancellable ? ` ${btn("cancel", "Cancel", { ghost: true })}` : ""}</p>` : "";
  const error = v.error ? `<p class="ws-error" role="alert">${esc(v.error)}</p>` : "";
  return [
    head, busy, error,
    characterCard(v, !!v.busy),
    m.exported ? exportBox(m.exported) : "",
    v.draft ? draftCard(m, v, v.draft) : "",
    v.character ? startCard(m, v) : "",
    settingsCard(m.settings),
  ].join("");
}
