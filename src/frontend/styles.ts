// Studio's styles. Colours come from Lumiverse's theme variables, so it follows
// the user's theme. Every class starts with "ws-", so nothing clashes with Warp.

export const STYLES = `
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
