// Warp Studio's page: a drawer tab for the open chat's character (or a picked
// one), and a tab in the character editor when the host has one. Both show the
// same view for a character. The backend does all the work; this file routes
// clicks and keeps typed-but-unsaved text.

import type { SpindleFrontendContext } from "lumiverse-spindle-types";
import { STUDIO_FORMAT } from "./shared/format.js";
import type { BackendToFrontend, FrontendToBackend, Settings, StudioView } from "./shared/protocol.js";
import { warpStatus } from "./shared/warp-state.js";
import { STYLES } from "./frontend/styles.js";
import { emptyUi, renderStudio, type RootUi, type SettingsMsg } from "./frontend/view.js";
import { connectWarp } from "./frontend/warp-bridge.js";

const CLEANUP_KEY = "__warpStudioCleanup";
const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13.5 7.5l3 3"/><path d="M4 4h6M4 8h3"/></svg>`;

interface Root {
  mode: "drawer" | "editor";
  el: HTMLElement;
  target(): string | null;
  ui: RootUi;
  /** The character this root last asked the backend to open. */
  opened: string | null;
  openSections: Map<string, boolean>;
  skipped: boolean;
}

/** A text box or text input inside the root has focus: don't redraw under the cursor. */
const typing = (root: HTMLElement) => {
  const a = document.activeElement as HTMLInputElement | null;
  return !!a && root.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && ["text", "search", ""].includes(a.type)));
};

const norm = (s: string) => s.replace(/\r\n?/g, "\n");

/** Typed text that the backend now has (or that removed its section) is no longer "unsaved". */
export function reconcile(ui: RootUi, view: StudioView) {
  if (view.error || !view.draft) return;
  for (const [label, text] of Object.entries(ui.unsaved)) {
    const part = view.draft.parts.find((p) => p.label === label);
    if ((part && norm(part.yaml) === norm(text)) || (!part && !text.trim())) delete ui.unsaved[label];
  }
}

export function setup(ctx: SpindleFrontendContext) {
  const prev = (globalThis as Record<string, unknown>)[CLEANUP_KEY];
  if (typeof prev === "function") prev();
  const cleanups: (() => void)[] = [];
  cleanups.push(ctx.dom.addStyle(STYLES));

  const send = (m: FrontendToBackend) => ctx.sendToBackend(m);
  let settings: SettingsMsg | null = null;
  const views = new Map<string, StudioView>();
  const exported = new Map<string, { name: string; text: string }>();
  let characters: { id: string; name: string }[] | null = null;
  let picked: string | null = null;

  const warp = connectWarp(() => renderAll());
  cleanups.push(() => warp.stop());
  const status = () => warpStatus(warp.seen(), STUDIO_FORMAT);

  const roots: Root[] = [];
  const chatCharacter = () => { try { return ctx.getActiveChat().characterId ?? null; } catch { return null; } };

  function makeRoot(mode: Root["mode"], el: HTMLElement, target: () => string | null): Root {
    el.classList.add("ws-root");
    const r: Root = { mode, el, target, ui: emptyUi(), opened: null, openSections: new Map(), skipped: false };
    roots.push(r);
    for (const type of ["click", "input", "change"]) {
      const h = (e: Event) => { void onEvent(r, e); };
      el.addEventListener(type, h);
      cleanups.push(() => el.removeEventListener(type, h));
    }
    const onBlur = () => { if (r.skipped) setTimeout(() => { if (!typing(r.el)) render(r, true); }, 0); };
    el.addEventListener("focusout", onBlur);
    cleanups.push(() => el.removeEventListener("focusout", onBlur));
    return r;
  }

  /** Ask the backend for the root's character when it changed (or always, on `force`). */
  function sync(r: Root, force = false) {
    const id = r.target();
    if (id && (force || id !== r.opened)) {
      if (id !== r.opened) { r.ui = emptyUi(); r.openSections.clear(); }
      r.opened = id;
      send({ type: "open", characterId: id });
    }
    if (!id) r.opened = null;
  }

  function render(r: Root, force = false) {
    if (!force && typing(r.el)) { r.skipped = true; return; }
    r.skipped = false;
    for (const d of r.el.querySelectorAll<HTMLDetailsElement>("details[data-section]")) r.openSections.set(d.dataset.section!, d.open);
    const scroll = r.el.scrollTop;
    const id = r.target();
    r.el.innerHTML = renderStudio({
      mode: r.mode, characterId: id, view: id ? views.get(id) ?? null : null, settings, warp: status(),
      exported: id ? exported.get(id) ?? null : null, characters, picked: r.mode === "drawer" && !!picked, ui: r.ui,
    });
    for (const d of r.el.querySelectorAll<HTMLDetailsElement>("details[data-section]")) {
      const was = r.openSections.get(d.dataset.section!);
      if (was !== undefined) d.open = was;
    }
    r.el.scrollTop = scroll;
  }

  function renderAll() { for (const r of roots) render(r); }

  /** Send every unsaved section first (Install and Export use the saved draft). */
  function flush(r: Root, id: string) {
    for (const [label, yaml] of Object.entries(r.ui.unsaved)) send({ type: "edit", characterId: id, label, yaml });
  }

  async function onEvent(r: Root, e: Event) {
    const t = e.target as HTMLElement;
    const id = r.target();
    if (e.type === "input") {
      const yamlLabel = t.dataset?.yaml;
      if (yamlLabel !== undefined && id) {
        const v = (t as HTMLTextAreaElement).value;
        const part = views.get(id)?.draft?.parts.find((p) => p.label === yamlLabel);
        if (part && norm(part.yaml) === norm(v)) delete r.ui.unsaved[yamlLabel];
        else r.ui.unsaved[yamlLabel] = v;
        const save = t.closest("details")?.querySelector<HTMLButtonElement>('button[data-ws="save"]');
        if (save) save.disabled = !(yamlLabel in r.ui.unsaved);
      } else if (t.hasAttribute?.("data-ws-import")) r.ui.importText = (t as HTMLTextAreaElement).value;
      return;
    }
    if (e.type === "change") {
      if (t.hasAttribute?.("data-ws-file")) {
        const file = (t as HTMLInputElement).files?.[0];
        if (file) { r.ui.importText = await file.text(); r.ui.importName = file.name; render(r, true); }
        return;
      }
      const key = t.dataset?.setting as keyof Settings | undefined;
      if (key) {
        const el = t as HTMLInputElement;
        send({ type: "settings", patch: { [key]: el.type === "checkbox" ? el.checked : el.value } as Partial<Settings> });
      }
      return;
    }
    const b = t.closest?.<HTMLElement>("[data-ws]");
    if (!b || b.hasAttribute("disabled")) return;
    e.preventDefault();
    const action = b.dataset.ws!;
    if (action !== "discard") r.ui.confirmDiscard = false;
    switch (action) {
      case "picking": r.ui.picking = true; if (!characters) send({ type: "characters" }); break;
      case "list-characters": send({ type: "characters" }); break;
      case "pick": {
        const v = r.el.querySelector<HTMLSelectElement>("[data-ws-pick]")?.value;
        if (v) { picked = v; r.ui.picking = false; sync(r); }
        break;
      }
      case "unpick": picked = null; r.ui.picking = false; sync(r); break;
      case "export-copy": {
        const ta = r.el.querySelector<HTMLTextAreaElement>("[data-ws-export]");
        if (ta) void navigator.clipboard?.writeText(ta.value).then(() => { b.textContent = "Copied ✓"; }, () => { ta.select(); b.textContent = "Press Ctrl+C"; });
        return;
      }
      case "export-save": {
        const ex = id ? exported.get(id) : null;
        if (!ex) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([ex.text], { type: "text/yaml" }));
        a.download = `${(ex.name || "rulebook").replace(/[^\w -]+/g, "").trim() || "rulebook"}.warp.yaml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        return;
      }
      case "export-close": if (id) exported.delete(id); break;
      case "pane": r.ui.pane = b.dataset.pane === "preview" ? "preview" : "sections"; break;
      default: {
        if (!id) return;
        switch (action) {
          case "save": {
            const label = b.dataset.label!;
            if (label in r.ui.unsaved) send({ type: "edit", characterId: id, label, yaml: r.ui.unsaved[label] });
            return;
          }
          case "revert": delete r.ui.unsaved[b.dataset.label!]; break;
          case "add-section": {
            const label = r.el.querySelector<HTMLSelectElement>("[data-ws-add]")?.value;
            const info = settings?.sections.find((s) => s.label === label);
            if (!label) return;
            r.openSections.set(label, true);
            send({ type: "edit", characterId: id, label, yaml: `# ${label}: ${info?.contents ?? ""}\n` });
            return;
          }
          case "start-installed": case "start-template": case "start-backup":
            r.ui.unsaved = {}; r.ui.showStart = false; r.ui.pane = "sections";
            send({ type: "start", characterId: id, from: action === "start-installed" ? { installed: true } : action === "start-template" ? { template: b.dataset.template! } : { backup: b.dataset.book! } });
            return;
          case "import": {
            const text = r.el.querySelector<HTMLTextAreaElement>("[data-ws-import]")?.value ?? r.ui.importText;
            if (!text.trim()) { r.el.querySelector<HTMLTextAreaElement>("[data-ws-import]")?.focus(); return; }
            send({ type: "import", characterId: id, text, ...(r.ui.importName ? { name: r.ui.importName } : {}) });
            r.ui.unsaved = {}; r.ui.importText = ""; r.ui.importName = null; r.ui.showStart = false; r.ui.pane = "sections";
            break;
          }
          case "export-draft": flush(r, id); send({ type: "export", characterId: id, from: "draft" }); return;
          case "export-installed": send({ type: "export", characterId: id, from: "installed" }); return;
          case "install": flush(r, id); send({ type: "install", characterId: id, warp: warp.seen() ?? { present: false, format: null } }); return;
          case "discard":
            if (!r.ui.confirmDiscard) { r.ui.confirmDiscard = true; break; }
            r.ui.confirmDiscard = false; r.ui.unsaved = {};
            send({ type: "discard", characterId: id });
            return;
          default: return;
        }
      }
    }
    render(r, true);
  }

  // ───────── the drawer tab (always) and the character-editor tab (when the host has it) ─────────
  const tab = ctx.ui.registerDrawerTab({
    id: "studio",
    title: "Warp Studio",
    shortName: "Studio",
    headerTitle: "Warp Studio",
    description: "Check, edit, import and install a character's Warp rules",
    keywords: ["warp", "studio", "ruleset", "rulebook", "rules", "game"],
    iconSvg: ICON,
  });
  cleanups.push(() => tab.destroy());
  const drawerEl = document.createElement("div");
  tab.root.appendChild(drawerEl);
  const drawer = makeRoot("drawer", drawerEl, () => picked ?? chatCharacter());
  cleanups.push(tab.onActivate(() => { sync(drawer, true); render(drawer); warp.request(); }));

  if (typeof ctx.ui.registerCharacterEditorTab === "function" && ctx.ui.characterEditor) {
    try {
      const etab = ctx.ui.registerCharacterEditorTab({ id: "studio", title: "Warp Studio" });
      cleanups.push(() => etab.destroy());
      const editorEl = document.createElement("div");
      etab.root.appendChild(editorEl);
      const editorId = () => { try { return ctx.ui.characterEditor.getState().characterId ?? null; } catch { return null; } };
      const editor = makeRoot("editor", editorEl, editorId);
      cleanups.push(etab.onActivate(() => { sync(editor, true); render(editor); }));
      cleanups.push(ctx.ui.characterEditor.onChange(() => { sync(editor); render(editor); }));
    } catch (e) {
      console.warn("[warp_studio] no character-editor tab", e);
    }
  }

  cleanups.push(ctx.onBackendMessage((raw) => {
    const m = raw as BackendToFrontend;
    switch (m.type) {
      case "settings": settings = m; renderAll(); break;
      case "characters": characters = m.list; renderAll(); break;
      case "chat": if (!picked) { sync(drawer); render(drawer); } break;
      case "studio": {
        views.set(m.view.characterId, m.view);
        for (const r of roots) if (r.target() === m.view.characterId) { reconcile(r.ui, m.view); render(r); }
        break;
      }
      case "exported": exported.set(m.characterId, { name: m.name, text: m.text }); renderAll(); break;
      case "toast": console.info(`[warp_studio] ${m.level}: ${m.message}`); break;
    }
  }));

  send({ type: "hello" });
  warp.request();
  for (const r of roots) sync(r);
  renderAll();

  const teardown = () => { for (const c of cleanups.splice(0)) { try { c(); } catch { /* already gone */ } } };
  (globalThis as Record<string, unknown>)[CLEANUP_KEY] = teardown;
  return teardown;
}
