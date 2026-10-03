// src/shared/format.ts
var STUDIO_FORMAT = 2;

// src/shared/warp-state.ts
var WARP_STATE = "warp-state-v1";
var WARP_STATE_REQUEST = "warp-state-request-v1";
function readWarpState(detail) {
  if (!detail || typeof detail !== "object")
    return null;
  const d = detail;
  if (d.version !== 1 || d.provider !== "warp")
    return null;
  const f = d.rulesetFormat;
  return { present: true, format: typeof f === "number" && Number.isInteger(f) && f > 0 ? f : null };
}
function warpStatus(seen, studioFormat) {
  if (!seen)
    return { kind: "waiting", text: "Looking for Warp…", blocks: false };
  if (!seen.present)
    return { kind: "absent", text: "Warp is not running here. Studio still saves rules; Warp reads them when it is installed.", blocks: false };
  if (seen.format === null || seen.format < studioFormat)
    return { kind: "old", text: "This Warp is older than the ruleset format Studio writes. Update Warp before installing.", blocks: true };
  if (seen.format > studioFormat)
    return { kind: "newer", text: "Warp is newer than this Studio. Update Studio: its checks may miss new keys.", blocks: false };
  return { kind: "ok", text: `Warp ✓ (ruleset format ${seen.format})`, blocks: false };
}

// src/frontend/styles.ts
var STYLES = `
.ws-root {
  --ws-text: var(--lumiverse-text, #e8e8ee);
  --ws-muted: var(--lumiverse-text-muted, #a4a4b4);
  --ws-dim: var(--lumiverse-text-dim, #7a7a8a);
  --ws-fill: var(--lumiverse-fill, rgba(255,255,255,0.06));
  --ws-fill-subtle: var(--lumiverse-fill-subtle, rgba(255,255,255,0.03));
  --ws-border: var(--lumiverse-border, rgba(255,255,255,0.12));
  --ws-accent: var(--lumiverse-accent, #8b7bff);
  --ws-accent-fg: var(--lumiverse-accent-fg, #fff);
  --ws-good: #5fbf8a;
  --ws-warn: #d9a441;
  --ws-bad: #e06c6c;
  --ws-radius: var(--lumiverse-radius, 8px);
  color: var(--ws-text);
  font-size: 13px;
  line-height: 1.4;
  display: flex; flex-direction: column; gap: 10px; padding: 12px; box-sizing: border-box;
}
.ws-root h3 { margin: 0; font-size: 14px; }
.ws-root h4 { margin: 8px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--ws-dim); }
.ws-root p { margin: 0; }
.ws-dim { color: var(--ws-dim); }
.ws-good { color: var(--ws-good); }
.ws-warn { color: var(--ws-warn); }
.ws-bad { color: var(--ws-bad); }
.ws-head { display: flex; flex-direction: column; gap: 2px; }
.ws-warp { font-size: 12px; color: var(--ws-muted); }
.ws-warp-ok { color: var(--ws-good); }
.ws-warp-old { color: var(--ws-bad); }
.ws-warp-newer { color: var(--ws-warn); }
.ws-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ws-spread { justify-content: space-between; }
.ws-btn { font: inherit; color: var(--ws-text); background: var(--ws-fill); border: 1px solid var(--ws-border); border-radius: var(--ws-radius); padding: 5px 11px; cursor: pointer; }
.ws-btn:hover { border-color: var(--ws-accent); }
.ws-btn:active { transform: translateY(1px); }
.ws-btn[disabled] { opacity: .5; cursor: not-allowed; }
.ws-btn-primary { background: var(--ws-accent); color: var(--ws-accent-fg); border-color: transparent; }
.ws-btn-ghost { background: transparent; border-color: transparent; color: var(--ws-muted); padding: 2px 6px; }
.ws-input { font: inherit; color: var(--ws-text); background: var(--ws-fill); border: 1px solid var(--ws-border); border-radius: 6px; padding: 5px 8px; width: 100%; box-sizing: border-box; min-width: 0; }
.ws-row > select.ws-input { flex: 1; width: auto; }
.ws-yaml { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.45; resize: vertical; tab-size: 2; white-space: pre; }
.ws-card { border: 1px solid var(--ws-border); border-radius: calc(var(--ws-radius) + 2px); padding: 12px; background: var(--ws-fill-subtle); display: flex; flex-direction: column; gap: 8px; }
.ws-card > summary { cursor: pointer; }
.ws-card p { color: var(--ws-muted); }
.ws-choice { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
.ws-choice .ws-dim { font-size: 12px; }
.ws-import { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--ws-border); padding-top: 8px; }
.ws-books { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; }
.ws-chip { display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--ws-fill); color: var(--ws-muted); white-space: nowrap; }
.ws-chip-ok { color: var(--ws-good); }
.ws-chip-warn { color: var(--ws-warn); }
.ws-chip-error { color: var(--ws-bad); }
.ws-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--ws-border); }
.ws-tab { font: inherit; background: none; border: none; color: var(--ws-muted); padding: 6px 10px; cursor: pointer; border-bottom: 2px solid transparent; }
.ws-tab[aria-selected=true] { color: var(--ws-text); border-bottom-color: var(--ws-accent); }
.ws-pane { display: flex; flex-direction: column; gap: 6px; }
.ws-part { border: 1px solid var(--ws-border); border-radius: var(--ws-radius); padding: 4px 8px; }
.ws-part[open] { padding-bottom: 8px; }
.ws-part > summary { display: flex; align-items: center; gap: 8px; cursor: pointer; list-style: none; padding: 4px 0; }
.ws-part > summary::-webkit-details-marker { display: none; }
.ws-part-name { font-weight: 600; }
.ws-part-what { flex: 1; color: var(--ws-dim); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-part-error { border-color: var(--ws-bad); }
.ws-part .ws-yaml { margin: 6px 0; }
.ws-issues { margin: 4px 0; padding-left: 18px; font-size: 12px; display: flex; flex-direction: column; gap: 2px; }
.ws-issues .ws-error b { color: var(--ws-bad); }
.ws-issues .ws-warning b { color: var(--ws-warn); }
.ws-where { color: var(--ws-dim); }
.ws-banner { border-left: 3px solid var(--ws-warn); padding: 4px 8px; background: var(--ws-fill); color: var(--ws-text) !important; }
.ws-error { border-left: 3px solid var(--ws-bad); padding: 4px 8px; background: var(--ws-fill); }
.ws-busy { display: flex; gap: 8px; align-items: center; color: var(--ws-muted); }
.ws-spin { width: 12px; height: 12px; border: 2px solid var(--ws-border); border-top-color: var(--ws-accent); border-radius: 50%; animation: ws-spin .8s linear infinite; }
@keyframes ws-spin { to { transform: rotate(360deg); } }
.ws-install { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--ws-border); padding-top: 8px; }
.ws-why { font-size: 12px; }
.ws-lines { margin: 0; padding-left: 18px; font-size: 12px; }
.ws-field { display: flex; flex-direction: column; gap: 4px; color: var(--ws-muted); }
.ws-toggle { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; align-items: center; cursor: pointer; }
.ws-toggle small { grid-column: 1; color: var(--ws-dim); }
.ws-toggle input { grid-row: 1 / span 2; grid-column: 2; accent-color: var(--ws-accent); width: 16px; height: 16px; }
.ws-field .ws-input[type=number] { width: 90px; }

/* Check: one bar per core system, then the findings. */
.ws-systems, .ws-shares { display: flex; flex-direction: column; gap: 4px; }
.ws-sys { display: grid; grid-template-columns: 90px 1fr 64px; gap: 8px; align-items: center; font-size: 12px; }
.ws-sys b { text-align: right; font-variant-numeric: tabular-nums; }
.ws-sys-off { color: var(--ws-dim); }
.ws-bar { height: 6px; border-radius: 3px; background: var(--ws-fill); overflow: hidden; }
.ws-bar i { display: block; height: 100%; border-radius: 3px; }
.ws-fill-good { background: var(--ws-good); }
.ws-fill-warn { background: var(--ws-warn); }
.ws-fill-bad { background: var(--ws-bad); }
.ws-findings { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.ws-finding { border-left: 3px solid var(--ws-border); padding: 4px 8px; display: flex; flex-direction: column; gap: 3px; }
.ws-finding p { margin: 0; }
.ws-sev-gap { border-left-color: var(--ws-bad); }
.ws-sev-thin, .ws-sev-balance { border-left-color: var(--ws-warn); }
.ws-waived { opacity: .65; }
.ws-finding .ws-input { flex: 1; width: auto; }

/* Playtest: Warp's gates and the tables. */
.ws-table { border-collapse: collapse; width: 100%; font-size: 12px; font-variant-numeric: tabular-nums; }
.ws-table th, .ws-table td { text-align: left; padding: 3px 6px; border-bottom: 1px solid var(--ws-border); }
.ws-table th { color: var(--ws-dim); font-weight: 500; }
.ws-pass td:first-child { color: var(--ws-good); }
.ws-fail td:first-child, .ws-fail td:nth-child(3) { color: var(--ws-bad); }
.ws-best { background: var(--ws-fill); font-weight: 600; }
.ws-progress { flex: 1; max-width: 220px; height: 8px; border-radius: 4px; background: var(--ws-fill); overflow: hidden; }
.ws-progress i { display: block; height: 100%; background: var(--ws-accent); transition: width .2s; }

/* Review: what a rewrite changes. */
.ws-diff { margin: 6px 0 0; padding: 6px 8px; background: var(--ws-fill); border-radius: 6px; font-size: 11.5px; line-height: 1.45; overflow-x: auto; white-space: pre; }
.ws-diff-add { color: var(--ws-good); }
.ws-diff-del { color: var(--ws-bad); text-decoration: line-through; text-decoration-color: rgba(224,108,108,.5); }
.ws-diff-ctx { color: var(--ws-dim); }
.ws-review-dropped { opacity: .7; }
.ws-part > summary input[type=checkbox] { accent-color: var(--ws-accent); }
`;

// src/frontend/view.ts
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function emptyUi() {
  return { pane: "sections", unsaved: {}, importText: "", importName: null, showStart: false, confirmDiscard: false, picking: false, waiving: null, waiveText: "" };
}
var btn = (action, label, o = {}) => `<button class="ws-btn${o.primary ? " ws-btn-primary" : ""}${o.ghost ? " ws-btn-ghost" : ""}" data-ws="${esc(action)}"${Object.entries(o.data ?? {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("")}${o.title ? ` title="${esc(o.title)}"` : ""}${o.disabled ? " disabled" : ""}>${esc(label)}</button>`;
var plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
function baseText(b) {
  switch (b.kind) {
    case "installed":
      return "Draft of the installed rules";
    case "backup":
      return `Draft from the older book "${b.name}"`;
    case "template":
      return `Draft from the ${b.name} template`;
    case "import":
      return `Draft from an imported file${b.name ? ` (${b.name})` : ""}`;
  }
}
function issueList(issues) {
  if (!issues.length)
    return "";
  return `<ul class="ws-issues">${issues.map((i) => `<li class="ws-${i.level}"><b>${i.level === "error" ? "Error" : "Warning"}</b> <span class="ws-where">${esc(i.where)}</span>: ${esc(i.message)}</li>`).join("")}</ul>`;
}
function statusChip(p) {
  const e = p.issues.filter((i) => i.level === "error").length, w = p.issues.length - e;
  if (e)
    return `<span class="ws-chip ws-chip-error">${plural(e, "error")}</span>`;
  if (w)
    return `<span class="ws-chip ws-chip-warn">${plural(w, "warning")}</span>`;
  return `<span class="ws-chip ws-chip-ok">✓</span>`;
}
function partCard(p, info, ui, busy) {
  const unsaved = ui.unsaved[p.label];
  const text = unsaved ?? p.yaml;
  const rows = Math.min(30, Math.max(5, text.split(`
`).length + 1));
  return `<details class="ws-part ws-part-${p.status}" data-section="${esc(p.label)}"${p.status === "error" ? " open" : ""}>
  <summary><span class="ws-part-name">${esc(p.label)}</span><span class="ws-part-what">${esc(info?.contents ?? "")}</span>${unsaved !== undefined ? `<span class="ws-chip ws-chip-warn">not saved</span>` : ""}${statusChip(p)}</summary>
  ${issueList(p.issues)}
  <textarea class="ws-input ws-yaml" data-yaml="${esc(p.label)}" rows="${rows}" spellcheck="false">${esc(text)}</textarea>
  <div class="ws-row">${btn("save", "Save and check", { data: { label: p.label }, disabled: busy || unsaved === undefined })}${unsaved !== undefined ? btn("revert", "Undo my changes", { ghost: true, data: { label: p.label } }) : ""}<span class="ws-dim">An empty section is removed on save.</span></div>
</details>`;
}
function addSection(d, sections, busy) {
  const missing = sections.filter((s) => !d.parts.some((p) => p.label === s.label));
  if (!missing.length)
    return "";
  return `<div class="ws-row ws-add">
  <select class="ws-input" data-ws-add>${missing.map((s) => `<option value="${esc(s.label)}">${esc(s.label)}: ${esc(s.contents)}</option>`).join("")}</select>
  ${btn("add-section", "Add the section", { disabled: busy })}
</div>`;
}
function problems(d) {
  const head = d.errors || d.warnings ? `<p class="${d.errors ? "ws-bad" : "ws-warn"}">${[d.errors && plural(d.errors, "error"), d.warnings && plural(d.warnings, "warning")].filter(Boolean).join(" · ")}${d.errors ? ". Errors stop Install." : "."}</p>` : `<p class="ws-good">✓ Loads and lints clean.</p>`;
  return `${head}${d.unplaced.length ? `<div class="ws-unplaced"><p class="ws-dim">Not tied to one section:</p>${issueList(d.unplaced)}</div>` : ""}`;
}
function previewPane(d) {
  const p = d.preview;
  if (!p)
    return `<p class="ws-dim">The preview shows once the draft loads without errors.</p>`;
  const list = (title, lines, empty) => `<h4>${esc(title)}</h4>${lines.length ? `<ul class="ws-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : `<p class="ws-dim">${esc(empty)}</p>`}`;
  return `<div class="ws-preview">
  <p><b>${esc(p.name)}</b>${p.description ? ` — ${esc(p.description)}` : ""}</p>
  ${list("Status panel at the start", p.panel, "Nothing to show.")}
  ${list("Actions at the start", p.choices, "None: the live choices are written with each reply.")}
  ${list("What the narrator is told", p.narrator, "Nothing yet.")}
</div>`;
}
var pct = (x) => `${Math.round(x * 100)}%`;
function systemBars(c) {
  return `<div class="ws-systems">${c.systems.map((s) => s.score === null ? `<div class="ws-sys ws-sys-off"><span>${esc(s.label)}</span><div class="ws-bar"></div><b>not used</b></div>` : `<div class="ws-sys"><span>${esc(s.label)}</span><div class="ws-bar"><i class="${s.score >= 80 ? "ws-fill-good" : s.score >= 50 ? "ws-fill-warn" : "ws-fill-bad"}" style="width:${s.score}%"></i></div><b>${s.score}</b></div>`).join("")}</div>`;
}
var SEVERITY = { gap: "gap", thin: "thin", balance: "balance" };
function checkPane(m, v, d) {
  const c = d.check;
  if (!c)
    return `<p class="ws-dim">Check runs once the draft loads without errors. Fix the sections marked in red first.</p>`;
  const busy = !!v.busy;
  const canGenerate = m.settings?.canGenerate !== false;
  const showThin = m.settings?.settings.showThin !== false;
  const shown = c.findings.filter((f) => showThin || f.severity !== "thin");
  const hidden = c.findings.length - shown.length;
  const deepenable = c.findings.some((f) => !f.waived && f.severity !== "balance") || !!d.banner;
  const rows = shown.map((f) => {
    const waiving = m.ui.waiving === f.id;
    const actions = f.waived ? `<span class="ws-dim">Left as is: ${esc(f.waived)}</span>${btn("unwaive", "Undo", { ghost: true, data: { finding: f.id } })}` : waiving ? `<input class="ws-input" data-ws-waive-text placeholder="Why it stays as it is (8 characters or more)" value="${esc(m.ui.waiveText)}">${btn("waive", "Leave as is", { data: { finding: f.id } })}${btn("waive-cancel", "Cancel", { ghost: true })}` : `${btn("fix", "Fix", { disabled: busy || !canGenerate, title: canGenerate ? "One helper call (at most 3 with repairs); you review the result" : "Studio may not use a model", data: { finding: f.id } })}${btn("waive-open", "Leave as is", { ghost: true, data: { finding: f.id } })}`;
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
function gateRows(rep) {
  return `<table class="ws-table"><tbody>${rep.gates.map((g) => `<tr class="${g.pass ? "ws-pass" : "ws-fail"}"><td>${g.pass ? "✓" : "✕"}</td><td>${esc(g.label)}</td><td>${esc(Number.isInteger(g.value) ? g.value : g.value.toFixed(2))}</td><td class="ws-dim">${esc(g.bar)}</td></tr>`).join("")}</tbody></table>`;
}
function playtestReport(rep) {
  const share = rep.tagShare.length ? `<h4>Tag share (a greedy player)</h4><div class="ws-shares">${rep.tagShare.map((t) => `<div class="ws-sys"><span>${esc(t.tag)}</span><div class="ws-bar"><i class="${t.share > 0.5 ? "ws-fill-bad" : "ws-fill-good"}" style="width:${Math.round(t.share * 100)}%"></i></div><b>${pct(t.share)}</b></div>`).join("")}</div>` : "";
  const words = ["easy", "fair", "hard", "extreme"];
  const odds = rep.odds.length ? `<h4>Odds at the start</h4><table class="ws-table"><thead><tr><th></th>${words.map((w) => `<th>${w}</th>`).join("")}</tr></thead><tbody>${rep.odds.map((o) => `<tr><td>${esc(o.tag)}</td>${o.cells.map((c) => `<td>${c.pct}%</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  const contests = rep.contests.map((c) => `<h4>${esc(c.label)}: win % · mean rounds</h4><table class="ws-table"><thead><tr><th>add</th>${words.map((w) => `<th>${w}</th>`).join("")}</tr></thead><tbody>${c.rows.map((row) => `<tr${row.add === c.best ? ` class="ws-best" title="The player's best start stat for this kind"` : ""}><td>+${row.add}</td>${row.cells.map((x) => `<td>${pct(x.won)} · ${x.meanRounds.toFixed(1)}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("");
  return `<p class="${rep.pass ? "ws-good" : "ws-bad"}">${rep.pass ? "✓ Every gate passes." : `✕ ${plural(rep.gates.filter((g) => !g.pass).length, "gate")} fail${rep.gates.filter((g) => !g.pass).length === 1 ? "s" : ""}.`} <span class="ws-dim">${rep.turns} turns × ${rep.seeds} seeds per player policy.</span></p>
  <h4>Warp's gates</h4>${gateRows(rep)}${share}${odds}${contests}`;
}
function playtestPane(m, v, d) {
  const busy = !!v.busy;
  const s = m.settings?.settings;
  const size = s ? `${s.playtestTurns} turns × ${s.playtestSeeds} seeds` : "";
  const running = m.progress !== null && !!v.busy;
  const head = `<div class="ws-row ws-spread"><p class="ws-dim">Warp's own loop simulator plays the draft with scripted players and a fake narrator. No model, no cost.</p>
  ${running ? `<div class="ws-progress"><i style="width:${Math.round((m.progress ?? 0) * 100)}%"></i></div>` : btn("playtest", `Run ${size}`.trim(), { primary: true, disabled: busy || !d.check })}</div>`;
  if (!d.check)
    return `${head}<p class="ws-dim">The playtest runs once the draft loads without errors.</p>`;
  if (!d.playtest)
    return `${head}<p class="ws-dim">No playtest yet.</p>`;
  return `${head}${d.playtest.stale ? `<p class="ws-warn">The draft changed since this run. Run it again to see the new numbers.</p>` : ""}${playtestReport(d.playtest.report)}`;
}
function reviewPane(p, busy) {
  const scoreChanges = Object.keys({ ...p.scores.before, ...p.scores.after }).filter((k) => p.scores.before[k] !== p.scores.after[k]).map((k) => `${esc(k)} ${p.scores.before[k] ?? "–"} → ${p.scores.after[k] ?? "–"}`);
  const gateChanges = p.gates.after.filter((g) => p.gates.before.find((b) => b.id === g.id)?.pass !== g.pass).map((g) => `${g.pass ? "✓" : "✕"} ${esc(g.label)}`);
  const kept = p.sections.filter((s) => s.kept);
  const sections = p.sections.map((s) => `<details class="ws-part ws-review-${s.kept ? "kept" : "dropped"}" data-section="review:${esc(s.label)}"${s.kept ? " open" : ""}>
  <summary>${s.kept ? `<input type="checkbox" data-ws-pick-section value="${esc(s.label)}" checked>` : ""}<span class="ws-part-name">${esc(s.label)}</span><span class="ws-part-what">${esc(s.kept ? s.summary ?? "" : `dropped: ${s.reason ?? ""}`)}</span><span class="ws-chip">+${s.added} −${s.removed}</span></summary>
  ${s.diff.length ? `<pre class="ws-diff">${s.diff.map((l) => `<span class="ws-diff-${l.op === "+" ? "add" : l.op === "-" ? "del" : "ctx"}">${esc(l.op)} ${esc(l.text)}</span>`).join(`
`)}</pre>` : ""}
</details>`).join("");
  return `<p><b>${p.kind === "fix" ? "Fix" : "Deepen"}</b> <span class="ws-dim">${plural(p.calls, "helper call")} · ${plural(kept.length, "section")} kept of ${p.sections.length}. Nothing is in the draft until you accept it.</span></p>
  ${scoreChanges.length ? `<p>Scores: ${scoreChanges.join(" · ")}</p>` : `<p class="ws-dim">No score changed.</p>`}
  ${gateChanges.length ? `<p>Gates: ${gateChanges.join(" · ")}</p>` : ""}
  ${sections}
  <div class="ws-row">${btn("review-some", "Accept the ticked sections", { primary: true, disabled: busy || !kept.length })}${btn("review-all", "Accept all kept", { disabled: busy || !kept.length })}${btn("review-none", "Discard", { ghost: true, disabled: busy })}</div>`;
}
function installArea(m, v, d) {
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
function draftCard(m, v, d) {
  const busy = !!v.busy;
  const sections = m.settings?.sections ?? [];
  const panes = [
    ["sections", `Sections (${d.parts.length})`],
    ["check", d.check ? `Check (${d.check.open})` : "Check"],
    ["playtest", d.playtest ? `Playtest ${d.playtest.report.pass ? "✓" : "✕"}` : "Playtest"],
    ["preview", "Preview"],
    ...d.proposal ? [["review", "Review ●"]] : []
  ];
  const pane = m.ui.pane === "review" && !d.proposal ? "sections" : m.ui.pane;
  const tabs = panes.map(([p, label]) => `<button class="ws-tab" role="tab" data-ws="pane" data-pane="${p}" aria-selected="${pane === p}">${esc(label)}</button>`).join("");
  const body = pane === "preview" ? previewPane(d) : pane === "check" ? checkPane(m, v, d) : pane === "playtest" ? playtestPane(m, v, d) : pane === "review" && d.proposal ? reviewPane(d.proposal, busy) : `${problems(d)}${d.parts.map((p) => partCard(p, sections.find((s) => s.label === p.label.replace(/ \d+$/, "")), m.ui, busy)).join("")}${addSection(d, sections, busy)}`;
  return `<div class="ws-card ws-draft">
  <div class="ws-row ws-spread"><h3>${esc(baseText(d.base))}</h3><span class="ws-dim">${d.changed ? "changed" : "same as installed"}</span></div>
  ${d.banner ? `<p class="ws-banner" role="note">${esc(d.banner)}</p>` : ""}
  <div class="ws-tabs" role="tablist">${tabs}</div>
  <div class="ws-pane">${body}</div>
  ${installArea(m, v, d)}
</div>`;
}
function bookLine(b) {
  const bits = [b.installed ? "installed snapshot" : "older layout", plural(b.entries, "section"), b.format ? `format ${b.format}` : "", b.by ? `by ${b.by}` : ""].filter(Boolean).join(" · ");
  return `<li><b>${esc(b.name)}</b> <span class="ws-dim">${esc(bits)}</span>${b.active ? ` <span class="ws-chip ws-chip-ok">Warp reads this</span>` : ` ${btn("start-backup", "Start from this one", { ghost: true, data: { book: b.id } })}`}</li>`;
}
function characterCard(v, busy) {
  const c = v.character;
  if (!c)
    return "";
  const books = c.books.length ? `<ul class="ws-books">${c.books.map(bookLine).join("")}</ul>` : "";
  return `<div class="ws-card">
  <div class="ws-row ws-spread"><h3>${esc(c.name)}</h3>${c.installedParts ? btn("export-installed", "Export the installed rules", { disabled: busy }) : ""}</div>
  <p>${c.source ? `Warp loads: ${esc(c.source)}.` : "No Warp rules yet."}</p>
  ${books}
</div>`;
}
function startCard(m, v) {
  const busy = !!v.busy;
  const hasDraft = !!v.draft;
  const templates = (m.settings?.templates ?? []).map((t) => `<div class="ws-choice">${btn("start-template", `Start from ${t.name}`, { disabled: busy, data: { template: t.id } })}<span class="ws-dim">${esc(t.blurb)}</span></div>`).join("");
  const body = `
  ${v.character?.installedParts ? `<div class="ws-choice">${btn("start-installed", "Edit the installed rules", { primary: !hasDraft, disabled: busy })}<span class="ws-dim">A draft copy; the lorebook changes only on Install.</span></div>` : ""}
  ${templates}
  <div class="ws-import">
    <p><b>Import a rulebook</b> <span class="ws-dim">Paste the YAML or choose a file (written by hand, by an agent, or exported from Studio). It is checked before anything is saved.</span></p>
    <textarea class="ws-input ws-yaml" rows="5" data-ws-import spellcheck="false" placeholder="name: My game&#10;relationships:&#10;  …">${esc(m.ui.importText)}</textarea>
    <div class="ws-row">${btn("import", "Check it", { disabled: busy })}<label class="ws-btn">Choose a file…<input type="file" accept=".yaml,.yml,.txt,.md" data-ws-file hidden></label>${m.ui.importName ? `<span class="ws-dim">${esc(m.ui.importName)}</span>` : ""}</div>
  </div>`;
  if (!hasDraft)
    return `<div class="ws-card ws-start"><h3>Start a draft</h3><p class="ws-dim">Studio edits a draft. Nothing reaches the lorebook until you install it.</p>${body}</div>`;
  return `<details class="ws-card ws-start" data-ws-start${m.ui.showStart ? " open" : ""}><summary><b>Start over</b> <span class="ws-dim">replaces the draft</span></summary>${body}</details>`;
}
function exportBox(e) {
  return `<div class="ws-card ws-export">
  <h3>Rulebook file</h3>
  <textarea class="ws-input ws-yaml" rows="10" readonly data-ws-export spellcheck="false">${esc(e.text)}</textarea>
  <div class="ws-row">${btn("export-copy", "Copy", { primary: true })}${btn("export-save", "Save as file", { data: { name: e.name } })}${btn("export-close", "Close", { ghost: true })}</div>
</div>`;
}
function settingsCard(s) {
  if (!s)
    return "";
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
function pickerCard(m) {
  const list = m.characters;
  const pick = list ? list.length ? `<div class="ws-row"><select class="ws-input" data-ws-pick>${list.map((c) => `<option value="${esc(c.id)}"${c.id === m.characterId ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>${btn("pick", "Open", { primary: true })}</div>` : `<p class="ws-dim">You have no characters yet.</p>` : btn("list-characters", "Show my characters");
  return `<div class="ws-card"><h3>Which character?</h3><p>Open a chat with one character, or pick one here. Studio also has a tab in the character editor.</p>${pick}${m.picked ? btn("unpick", "Use the open chat's character", { ghost: true }) : ""}</div>`;
}
function renderStudio(m) {
  const head = `<div class="ws-head"><div class="ws-row ws-spread"><b>Warp Studio</b>${m.mode === "drawer" && m.characterId && !m.ui.picking ? btn("picking", "Other character…", { ghost: true }) : ""}</div><p class="ws-warp ws-warp-${m.warp.kind}">${esc(m.warp.text)}</p></div>`;
  if (!m.characterId || m.mode === "drawer" && m.ui.picking) {
    if (m.mode === "editor")
      return `${head}<div class="ws-card"><p>Open a character to edit its Warp rules.</p></div>`;
    return `${head}${pickerCard(m)}${settingsCard(m.settings)}`;
  }
  const v = m.view;
  if (!v)
    return `${head}<p class="ws-dim">Loading…</p>`;
  const busy = v.busy ? `<p class="ws-busy" role="status"><span class="ws-spin"></span>${esc(v.busy)}${v.cancellable ? ` ${btn("cancel", "Cancel", { ghost: true })}` : ""}</p>` : "";
  const error = v.error ? `<p class="ws-error" role="alert">${esc(v.error)}</p>` : "";
  return [
    head,
    busy,
    error,
    characterCard(v, !!v.busy),
    m.exported ? exportBox(m.exported) : "",
    v.draft ? draftCard(m, v, v.draft) : "",
    v.character ? startCard(m, v) : "",
    settingsCard(m.settings)
  ].join("");
}

// src/frontend/warp-bridge.ts
function connectWarp(onSeen, o = {}) {
  const target = o.target ?? window;
  const timeoutMs = o.timeoutMs ?? 1500;
  let seen = null;
  let timer = null;
  const set = (s) => {
    const same = seen && seen.present === s.present && seen.format === s.format;
    seen = s;
    if (!same)
      onSeen(s);
  };
  const listener = (e) => {
    const s = readWarpState(e.detail);
    if (!s)
      return;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    set(s);
  };
  target.addEventListener(WARP_STATE, listener);
  return {
    request() {
      if (!timer && !seen?.present)
        timer = setTimeout(() => {
          timer = null;
          if (!seen?.present)
            set({ present: false, format: null });
        }, timeoutMs);
      try {
        target.dispatchEvent(new CustomEvent(WARP_STATE_REQUEST, { detail: { version: 1 } }));
      } catch {}
    },
    seen: () => seen,
    stop() {
      if (timer)
        clearTimeout(timer);
      target.removeEventListener(WARP_STATE, listener);
    }
  };
}

// src/frontend.ts
var CLEANUP_KEY = "__warpStudioCleanup";
var ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13.5 7.5l3 3"/><path d="M4 4h6M4 8h3"/></svg>`;
var typing = (root) => {
  const a = document.activeElement;
  return !!a && root.contains(a) && (a.tagName === "TEXTAREA" || a.tagName === "INPUT" && ["text", "search", ""].includes(a.type));
};
var norm = (s) => s.replace(/\r\n?/g, `
`);
function reconcile(ui, view) {
  if (view.error || !view.draft)
    return;
  for (const [label, text] of Object.entries(ui.unsaved)) {
    const part = view.draft.parts.find((p) => p.label === label);
    if (part && norm(part.yaml) === norm(text) || !part && !text.trim())
      delete ui.unsaved[label];
  }
}
function setup(ctx) {
  const prev = globalThis[CLEANUP_KEY];
  if (typeof prev === "function")
    prev();
  const cleanups = [];
  cleanups.push(ctx.dom.addStyle(STYLES));
  const send = (m) => ctx.sendToBackend(m);
  let settings = null;
  const views = new Map;
  const exported = new Map;
  let characters = null;
  let picked = null;
  const progress = new Map;
  const warp = connectWarp(() => renderAll());
  cleanups.push(() => warp.stop());
  const status = () => warpStatus(warp.seen(), STUDIO_FORMAT);
  const roots = [];
  const chatCharacter = () => {
    try {
      return ctx.getActiveChat().characterId ?? null;
    } catch {
      return null;
    }
  };
  function makeRoot(mode, el, target) {
    el.classList.add("ws-root");
    const r = { mode, el, target, ui: emptyUi(), opened: null, openSections: new Map, skipped: false };
    roots.push(r);
    for (const type of ["click", "input", "change"]) {
      const h = (e) => {
        onEvent(r, e);
      };
      el.addEventListener(type, h);
      cleanups.push(() => el.removeEventListener(type, h));
    }
    const onBlur = () => {
      if (r.skipped)
        setTimeout(() => {
          if (!typing(r.el))
            render(r, true);
        }, 0);
    };
    el.addEventListener("focusout", onBlur);
    cleanups.push(() => el.removeEventListener("focusout", onBlur));
    return r;
  }
  function sync(r, force = false) {
    const id = r.target();
    if (id && (force || id !== r.opened)) {
      if (id !== r.opened) {
        r.ui = emptyUi();
        r.openSections.clear();
      }
      r.opened = id;
      send({ type: "open", characterId: id });
    }
    if (!id)
      r.opened = null;
  }
  function render(r, force = false) {
    if (!force && typing(r.el)) {
      r.skipped = true;
      return;
    }
    r.skipped = false;
    for (const d of r.el.querySelectorAll("details[data-section]"))
      r.openSections.set(d.dataset.section, d.open);
    const scroll = r.el.scrollTop;
    const id = r.target();
    r.el.innerHTML = renderStudio({
      mode: r.mode,
      characterId: id,
      view: id ? views.get(id) ?? null : null,
      settings,
      warp: status(),
      exported: id ? exported.get(id) ?? null : null,
      characters,
      picked: r.mode === "drawer" && !!picked,
      progress: id ? progress.get(id) ?? null : null,
      ui: r.ui
    });
    for (const d of r.el.querySelectorAll("details[data-section]")) {
      const was = r.openSections.get(d.dataset.section);
      if (was !== undefined)
        d.open = was;
    }
    r.el.scrollTop = scroll;
  }
  function renderAll() {
    for (const r of roots)
      render(r);
  }
  function flush(r, id) {
    for (const [label, yaml] of Object.entries(r.ui.unsaved))
      send({ type: "edit", characterId: id, label, yaml });
  }
  async function onEvent(r, e) {
    const t = e.target;
    const id = r.target();
    if (e.type === "input") {
      const yamlLabel = t.dataset?.yaml;
      if (yamlLabel !== undefined && id) {
        const v = t.value;
        const part = views.get(id)?.draft?.parts.find((p) => p.label === yamlLabel);
        if (part && norm(part.yaml) === norm(v))
          delete r.ui.unsaved[yamlLabel];
        else
          r.ui.unsaved[yamlLabel] = v;
        const save = t.closest("details")?.querySelector('button[data-ws="save"]');
        if (save)
          save.disabled = !(yamlLabel in r.ui.unsaved);
      } else if (t.hasAttribute?.("data-ws-import"))
        r.ui.importText = t.value;
      else if (t.hasAttribute?.("data-ws-waive-text"))
        r.ui.waiveText = t.value;
      return;
    }
    if (e.type === "change") {
      if (t.hasAttribute?.("data-ws-file")) {
        const file = t.files?.[0];
        if (file) {
          r.ui.importText = await file.text();
          r.ui.importName = file.name;
          render(r, true);
        }
        return;
      }
      const key = t.dataset?.setting;
      if (key) {
        const el = t;
        send({ type: "settings", patch: { [key]: el.type === "checkbox" ? el.checked : el.value } });
      }
      return;
    }
    const b = t.closest?.("[data-ws]");
    if (!b || b.hasAttribute("disabled"))
      return;
    e.preventDefault();
    const action = b.dataset.ws;
    if (action !== "discard")
      r.ui.confirmDiscard = false;
    switch (action) {
      case "picking":
        r.ui.picking = true;
        if (!characters)
          send({ type: "characters" });
        break;
      case "list-characters":
        send({ type: "characters" });
        break;
      case "pick": {
        const v = r.el.querySelector("[data-ws-pick]")?.value;
        if (v) {
          picked = v;
          r.ui.picking = false;
          sync(r);
        }
        break;
      }
      case "unpick":
        picked = null;
        r.ui.picking = false;
        sync(r);
        break;
      case "export-copy": {
        const ta = r.el.querySelector("[data-ws-export]");
        if (ta)
          navigator.clipboard?.writeText(ta.value).then(() => {
            b.textContent = "Copied ✓";
          }, () => {
            ta.select();
            b.textContent = "Press Ctrl+C";
          });
        return;
      }
      case "export-save": {
        const ex = id ? exported.get(id) : null;
        if (!ex)
          return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([ex.text], { type: "text/yaml" }));
        a.download = `${(ex.name || "rulebook").replace(/[^\w -]+/g, "").trim() || "rulebook"}.warp.yaml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        return;
      }
      case "export-close":
        if (id)
          exported.delete(id);
        break;
      case "pane":
        r.ui.pane = ["sections", "check", "playtest", "preview", "review"].includes(b.dataset.pane ?? "") ? b.dataset.pane : "sections";
        break;
      case "waive-open":
        r.ui.waiving = b.dataset.finding ?? null;
        r.ui.waiveText = "";
        break;
      case "waive-cancel":
        r.ui.waiving = null;
        break;
      default: {
        if (!id)
          return;
        switch (action) {
          case "save": {
            const label = b.dataset.label;
            if (label in r.ui.unsaved)
              send({ type: "edit", characterId: id, label, yaml: r.ui.unsaved[label] });
            return;
          }
          case "revert":
            delete r.ui.unsaved[b.dataset.label];
            break;
          case "add-section": {
            const label = r.el.querySelector("[data-ws-add]")?.value;
            const info = settings?.sections.find((s) => s.label === label);
            if (!label)
              return;
            r.openSections.set(label, true);
            send({ type: "edit", characterId: id, label, yaml: `# ${label}: ${info?.contents ?? ""}
` });
            return;
          }
          case "start-installed":
          case "start-template":
          case "start-backup":
            r.ui.unsaved = {};
            r.ui.showStart = false;
            r.ui.pane = "sections";
            send({ type: "start", characterId: id, from: action === "start-installed" ? { installed: true } : action === "start-template" ? { template: b.dataset.template } : { backup: b.dataset.book } });
            return;
          case "import": {
            const text = r.el.querySelector("[data-ws-import]")?.value ?? r.ui.importText;
            if (!text.trim()) {
              r.el.querySelector("[data-ws-import]")?.focus();
              return;
            }
            send({ type: "import", characterId: id, text, ...r.ui.importName ? { name: r.ui.importName } : {} });
            r.ui.unsaved = {};
            r.ui.importText = "";
            r.ui.importName = null;
            r.ui.showStart = false;
            r.ui.pane = "sections";
            break;
          }
          case "export-draft":
            flush(r, id);
            send({ type: "export", characterId: id, from: "draft" });
            return;
          case "export-installed":
            send({ type: "export", characterId: id, from: "installed" });
            return;
          case "install":
            flush(r, id);
            send({ type: "install", characterId: id, warp: warp.seen() ?? { present: false, format: null } });
            return;
          case "playtest":
            flush(r, id);
            progress.set(id, 0);
            send({ type: "playtest", characterId: id });
            break;
          case "cancel":
            send({ type: "cancel", characterId: id });
            return;
          case "fix":
            flush(r, id);
            send({ type: "fix", characterId: id, findingId: b.dataset.finding });
            return;
          case "deepen":
            flush(r, id);
            send({ type: "deepen", characterId: id });
            return;
          case "waive": {
            const reason = r.el.querySelector("[data-ws-waive-text]")?.value ?? r.ui.waiveText;
            if (reason.trim().length < 8) {
              r.el.querySelector("[data-ws-waive-text]")?.focus();
              return;
            }
            send({ type: "waive", characterId: id, id: b.dataset.finding, reason });
            r.ui.waiving = null;
            r.ui.waiveText = "";
            break;
          }
          case "unwaive":
            send({ type: "unwaive", characterId: id, id: b.dataset.finding });
            return;
          case "review-all":
            send({ type: "review", characterId: id, accept: "all" });
            return;
          case "review-none":
            send({ type: "review", characterId: id, accept: "none" });
            return;
          case "review-some": {
            const picks = [...r.el.querySelectorAll("[data-ws-pick-section]")].filter((x) => x.checked).map((x) => x.value);
            send({ type: "review", characterId: id, accept: picks });
            return;
          }
          case "discard":
            if (!r.ui.confirmDiscard) {
              r.ui.confirmDiscard = true;
              break;
            }
            r.ui.confirmDiscard = false;
            r.ui.unsaved = {};
            send({ type: "discard", characterId: id });
            return;
          default:
            return;
        }
      }
    }
    render(r, true);
  }
  const tab = ctx.ui.registerDrawerTab({
    id: "studio",
    title: "Warp Studio",
    shortName: "Studio",
    headerTitle: "Warp Studio",
    description: "Check, edit, import and install a character's Warp rules",
    keywords: ["warp", "studio", "ruleset", "rulebook", "rules", "game"],
    iconSvg: ICON
  });
  cleanups.push(() => tab.destroy());
  const drawerEl = document.createElement("div");
  tab.root.appendChild(drawerEl);
  const drawer = makeRoot("drawer", drawerEl, () => picked ?? chatCharacter());
  cleanups.push(tab.onActivate(() => {
    sync(drawer, true);
    render(drawer);
    warp.request();
  }));
  if (typeof ctx.ui.registerCharacterEditorTab === "function" && ctx.ui.characterEditor) {
    try {
      const etab = ctx.ui.registerCharacterEditorTab({ id: "studio", title: "Warp Studio" });
      cleanups.push(() => etab.destroy());
      const editorEl = document.createElement("div");
      etab.root.appendChild(editorEl);
      const editorId = () => {
        try {
          return ctx.ui.characterEditor.getState().characterId ?? null;
        } catch {
          return null;
        }
      };
      const editor = makeRoot("editor", editorEl, editorId);
      cleanups.push(etab.onActivate(() => {
        sync(editor, true);
        render(editor);
      }));
      cleanups.push(ctx.ui.characterEditor.onChange(() => {
        sync(editor);
        render(editor);
      }));
    } catch (e) {
      console.warn("[warp_studio] no character-editor tab", e);
    }
  }
  cleanups.push(ctx.onBackendMessage((raw) => {
    const m = raw;
    switch (m.type) {
      case "settings":
        settings = m;
        renderAll();
        break;
      case "characters":
        characters = m.list;
        renderAll();
        break;
      case "chat":
        if (!picked) {
          sync(drawer);
          render(drawer);
        }
        break;
      case "studio": {
        const before = views.get(m.view.characterId);
        views.set(m.view.characterId, m.view);
        if (!m.view.busy)
          progress.delete(m.view.characterId);
        const proposed = !before?.draft?.proposal && !!m.view.draft?.proposal;
        for (const r of roots)
          if (r.target() === m.view.characterId) {
            reconcile(r.ui, m.view);
            if (proposed)
              r.ui.pane = "review";
            else if (r.ui.pane === "review" && !m.view.draft?.proposal)
              r.ui.pane = "check";
            render(r);
          }
        break;
      }
      case "playtest_progress": {
        progress.set(m.characterId, m.share);
        for (const r of roots)
          if (r.target() === m.characterId)
            render(r);
        break;
      }
      case "exported":
        exported.set(m.characterId, { name: m.name, text: m.text });
        renderAll();
        break;
      case "toast":
        console.info(`[warp_studio] ${m.level}: ${m.message}`);
        break;
    }
  }));
  send({ type: "hello" });
  warp.request();
  for (const r of roots)
    sync(r);
  renderAll();
  const teardown = () => {
    for (const c of cleanups.splice(0)) {
      try {
        c();
      } catch {}
    }
  };
  globalThis[CLEANUP_KEY] = teardown;
  return teardown;
}
export {
  reconcile,
  setup
};
