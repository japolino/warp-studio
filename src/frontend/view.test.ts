import { describe, expect, test } from "bun:test";
import { reconcile } from "../frontend.js";
import { book, character, fakeHost, type FakeHost } from "../backend/fake-host.js";
import { handle } from "../backend/router.js";
import { resetSessions } from "../backend/session.js";
import { clearSettingsCache } from "../backend/settings.js";
import { STUDIO_FORMAT } from "../shared/format.js";
import type { DraftView, StudioView } from "../shared/protocol.js";
import { warpStatus } from "../shared/warp-state.js";
import { TEMPLATES } from "../warp.js";
import { baseText, emptyUi, esc, renderStudio, type SettingsMsg, type StudioModel } from "./view.js";

const T = TEMPLATES[0];
const ok = warpStatus({ present: true, format: STUDIO_FORMAT }, STUDIO_FORMAT);
const old = warpStatus({ present: true, format: null }, STUDIO_FORMAT);

async function real(o: { rules?: boolean; start?: boolean } = {}): Promise<{ h: FakeHost; view: StudioView; settings: SettingsMsg }> {
  resetSessions();
  clearSettingsCache();
  const h = fakeHost({
    characters: [character({ id: "c1", name: "Mira <Vale>", world_book_ids: o.rules ? ["b1"] : [] })],
    books: o.rules ? [book({ id: "b1", name: "warp-ruleset", metadata: { warp: { installedRulebook: 1, format: 2, by: "warp_studio@0.1.0" } }, entries: T.parts.map((p) => [`warp-ruleset · ${p.label}`, p.yaml] as [string, string]) })] : [],
  });
  await handle({ type: "hello" });
  await handle(o.start ? { type: "start", characterId: "c1", from: { template: T.id } } : { type: "open", characterId: "c1" });
  const view = (h.of<{ type: string; view: StudioView }>("studio").at(-1)!).view;
  return { h, view, settings: h.of<SettingsMsg>("settings")[0] };
}

function model(o: Partial<StudioModel>): StudioModel {
  return { mode: "drawer", characterId: "c1", view: null, settings: null, warp: ok, exported: null, characters: null, picked: false, progress: null, ui: emptyUi(), ...o };
}

describe("who Studio is editing", () => {
  test("drawer without a chat: the character picker; editor without a character: a hint", () => {
    expect(renderStudio(model({ characterId: null }))).toContain("Which character?");
    expect(renderStudio(model({ characterId: null, characters: [{ id: "c1", name: "Mira" }] }))).toContain('<option value="c1"');
    expect(renderStudio(model({ characterId: null, characters: [] }))).toContain("You have no characters yet.");
    expect(renderStudio(model({ mode: "editor", characterId: null }))).toContain("Open a character to edit its Warp rules.");
    expect(renderStudio(model({ view: null }))).toContain("Loading…");
  });

  test("a picked character can go back to the chat's character", () => {
    expect(renderStudio(model({ characterId: null, picked: true, characters: [] }))).toContain("Use the open chat&#39;s character");
  });
});

describe("a character without a draft", () => {
  test("no rules: every template is offered, but not 'Edit the installed rules'", async () => {
    const { view, settings } = await real();
    const html = renderStudio(model({ view, settings }));
    expect(html).toContain("No Warp rules yet.");
    for (const t of TEMPLATES) expect(html).toContain(`data-template="${t.id}"`);
    expect(html).not.toContain('data-ws="start-installed"');
    expect(html).toContain("Import a rulebook");
    expect(html).toContain("Mira &lt;Vale&gt;");
    expect(html).not.toContain("Mira <Vale>");
  });

  test("installed rules: the book line, export, and editing them", async () => {
    const { view, settings } = await real({ rules: true });
    const html = renderStudio(model({ view, settings }));
    expect(html).toContain("Warp loads: warp-ruleset");
    expect(html).toContain("format 2 · by warp_studio@0.1.0");
    expect(html).toContain("Warp reads this");
    expect(html).toContain('data-ws="export-installed"');
    expect(html).toContain('data-ws="start-installed"');
  });
});

describe("a draft", () => {
  test("from a template: sections, the clean line, Install ready when Warp agrees", async () => {
    const { view, settings } = await real({ start: true });
    const html = renderStudio(model({ view, settings }));
    expect(html).toContain(baseText({ kind: "template", id: T.id, name: T.name }));
    expect(html).toContain("✓ Loads and lints clean.");
    for (const p of view.draft!.parts) expect(html).toContain(`data-section="${p.label}"`);
    expect(html).toMatch(/data-ws="install"(?![^>]*disabled)/);
    expect(html).toContain("Start over");
  });

  test("Install is off, with the reason: Warp too old, nothing changed, errors", async () => {
    const { view, settings } = await real({ start: true });
    expect(renderStudio(model({ view, settings, warp: old }))).toContain("Update Warp before installing.");
    expect(renderStudio(model({ view, settings, warp: old }))).toMatch(/data-ws="install"[^>]*disabled/);
    const same: StudioView = { ...view, draft: { ...view.draft!, changed: false } };
    expect(renderStudio(model({ view: same, settings }))).toContain("Nothing to install: the draft is the same as the rules Warp loads now.");
    const broken: DraftView = { ...view.draft!, errors: 1, installBlock: "Fix the error first (marked in red).", parts: [{ label: "stats", yaml: "stats: [x", status: "error", issues: [{ level: "error", where: "warp-ruleset · stats, line 1", message: "YAML couldn't be read" }] }] };
    const html = renderStudio(model({ view: { ...view, draft: broken }, settings }));
    expect(html).toContain("Fix the error first (marked in red).");
    expect(html).toContain('<details class="ws-part ws-part-error" data-section="stats" open>');
    expect(html).toContain("1 error. Errors stop Install.");
  });

  test("typed but unsaved text shows instead of the saved text, with Save on", async () => {
    const { view, settings } = await real({ start: true });
    const ui = emptyUi();
    const label = view.draft!.parts[0].label;
    ui.unsaved[label] = "name: Typed <here>\n";
    const html = renderStudio(model({ view, settings, ui }));
    expect(html).toContain("name: Typed &lt;here&gt;");
    expect(html).toContain("not saved");
    expect(html).toMatch(new RegExp(`data-ws="save" data-label="${label}"(?![^>]*disabled)`));
    expect(html).toContain("Undo my changes");
  });

  test("the old-format banner, the busy line and the error line", async () => {
    const { view, settings } = await real({ start: true });
    const v: StudioView = { ...view, busy: "Saving to the lorebook…", error: "Couldn't save: boom", draft: { ...view.draft!, banner: "This rulebook uses 1 part Warp no longer runs (perks). It is ignored." } };
    const html = renderStudio(model({ view: v, settings }));
    expect(html).toContain('class="ws-banner"');
    expect(html).toContain("Saving to the lorebook…");
    expect(html).toContain('role="alert">Couldn&#39;t save: boom');
    expect(html).toMatch(/data-ws="install"[^>]*disabled/);
  });

  test("the preview pane", async () => {
    const { view, settings } = await real({ start: true });
    const ui = { ...emptyUi(), pane: "preview" as const };
    const html = renderStudio(model({ view, settings, ui }));
    expect(html).toContain("Status panel at the start");
    expect(html).toContain("What the narrator is told");
    const none = renderStudio(model({ view: { ...view, draft: { ...view.draft!, preview: null } }, settings, ui }));
    expect(none).toContain("The preview shows once the draft loads without errors.");
  });

  test("a missing section can be added", async () => {
    const { view, settings } = await real({ start: true });
    const html = renderStudio(model({ view, settings }));
    const missing = settings.sections.filter((s) => !view.draft!.parts.some((p) => p.label === s.label));
    if (missing.length) expect(html).toContain(`<option value="${missing[0].label}">`);
  });
});

describe("Check, Playtest and Review", () => {
  test("the Check pane: six bars, findings with Fix and Leave as is, Deepen", async () => {
    const { view, settings } = await real({ start: true });
    const ui = { ...emptyUi(), pane: "check" as const };
    const html = renderStudio(model({ view, settings, ui }));
    for (const s of ["Scene", "People", "Checks", "Choices", "Conflict", "Growth"]) expect(html).toContain(`<span>${s}</span>`);
    const f = view.draft!.check!.findings[0];
    expect(html).toContain(`data-ws="fix" data-finding="${f.id}"`);
    expect(html).toContain(`data-ws="waive-open" data-finding="${f.id}"`);
    expect(html).toMatch(/data-ws="deepen"(?![^>]*disabled)/);
    // Without generation, Fix and Deepen are off.
    expect(renderStudio(model({ view, settings: { ...settings, canGenerate: false }, ui }))).toMatch(/data-ws="deepen"[^>]*disabled/);
    // Typing a reason.
    const waiving = renderStudio(model({ view, settings, ui: { ...ui, waiving: f.id, waiveText: "on <purpose>" } }));
    expect(waiving).toContain('value="on &lt;purpose&gt;"');
    expect(waiving).toContain(`data-ws="waive" data-finding="${f.id}"`);
  });

  test("thin spots can be hidden; a waived finding shows its reason and Undo", async () => {
    const { view, settings } = await real({ start: true });
    const ui = { ...emptyUi(), pane: "check" as const };
    const thin = view.draft!.check!.findings.filter((f) => f.severity === "thin").length;
    expect(thin).toBeGreaterThan(0);
    const hidden = renderStudio(model({ view, settings: { ...settings, settings: { ...settings.settings, showThin: false } }, ui }));
    expect(hidden).toContain(`${thin} thin spot`);
    const f = view.draft!.check!.findings[0];
    const waived: StudioView = { ...view, draft: { ...view.draft!, check: { ...view.draft!.check!, findings: view.draft!.check!.findings.map((x) => (x.id === f.id ? { ...x, waived: "kept on purpose" } : x)) } } };
    const html = renderStudio(model({ view: waived, settings, ui }));
    expect(html).toContain("Left as is: kept on purpose");
    expect(html).toContain(`data-ws="unwaive" data-finding="${f.id}"`);
  });

  test("a story shows Checks and Conflict as not used", async () => {
    const { view, settings } = await real({ start: true });
    const check = { ...view.draft!.check!, style: "story" as const, systems: view.draft!.check!.systems.map((s) => (s.id === "checks" || s.id === "conflict" ? { ...s, score: null } : s)) };
    const html = renderStudio(model({ view: { ...view, draft: { ...view.draft!, check } }, settings, ui: { ...emptyUi(), pane: "check" } }));
    expect(html.match(/not used/g)!.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("A story doesn't roll");
  });

  test("the Playtest pane: Run, progress with Cancel, then Warp's gates and the tables", async () => {
    const { h, view, settings } = await real({ start: true });
    const ui = { ...emptyUi(), pane: "playtest" as const };
    expect(renderStudio(model({ view, settings, ui }))).toContain("No playtest yet.");
    expect(renderStudio(model({ view, settings, ui }))).toContain(`Run ${settings.settings.playtestTurns} turns × ${settings.settings.playtestSeeds} seeds`);
    const running = renderStudio(model({ view: { ...view, busy: "Playtest…", cancellable: true }, settings, ui, progress: 0.4 }));
    expect(running).toContain('class="ws-progress"><i style="width:40%">');
    expect(running).toContain('data-ws="cancel"');
    await handle({ type: "settings", patch: { playtestTurns: 5, playtestSeeds: 1 } });
    await handle({ type: "playtest", characterId: "c1" });
    const done = (h.of<{ type: string; view: StudioView }>("studio").at(-1)!).view;
    const html = renderStudio(model({ view: done, settings, ui }));
    expect(html).toContain("<h4>Warp's gates</h4>");
    for (const g of done.draft!.playtest!.report.gates) expect(html).toContain(esc(g.label));
    if (done.draft!.playtest!.report.contests.length) expect(html).toContain('class="ws-best"');
    const stale = renderStudio(model({ view: { ...done, draft: { ...done.draft!, playtest: { ...done.draft!.playtest!, stale: true } } }, settings, ui }));
    expect(stale).toContain("The draft changed since this run.");
  });

  test("the Review pane: kept sections ticked with their diff, dropped ones with the reason", async () => {
    const { view, settings } = await real({ start: true });
    const proposal = {
      kind: "deepen" as const, calls: 4, at: 1,
      scores: { before: { People: 50 }, after: { People: 90 } },
      gates: { before: [{ id: "g", label: "Tag share", pass: false }], after: [{ id: "g", label: "Tag share", pass: true }] },
      sections: [
        { label: "people", kept: true, reason: null, summary: "voices on every band", diff: [{ op: " " as const, text: "relationships:" }, { op: "+" as const, text: "  <voice>" }], added: 1, removed: 0 },
        { label: "story", kept: false, reason: 'the rewrite of "story" lowers Choices 90 → 80', summary: null, diff: [], added: 0, removed: 0 },
      ],
    };
    const v: StudioView = { ...view, draft: { ...view.draft!, proposal } };
    const html = renderStudio(model({ view: v, settings, ui: { ...emptyUi(), pane: "review" } }));
    expect(html).toContain("Review ●");
    expect(html).toContain('data-ws-pick-section value="people" checked');
    expect(html).toContain('<span class="ws-diff-add">+   &lt;voice&gt;</span>');
    expect(html).toContain("dropped: the rewrite of &quot;story&quot; lowers Choices 90 → 80");
    expect(html).toContain("People 50 → 90");
    expect(html).toContain("✓ Tag share");
    expect(html).toContain('data-ws="review-some"');
    // Without a proposal the review tab is gone and the sections show.
    expect(renderStudio(model({ view, settings, ui: { ...emptyUi(), pane: "review" } }))).toContain("✓ Loads and lints clean.");
  });
});

describe("export and settings", () => {
  test("the export box", async () => {
    const { view, settings } = await real({ rules: true });
    const html = renderStudio(model({ view, settings, exported: { name: "Mira", text: "--- # core\nname: <x>\n" } }));
    expect(html).toContain("Rulebook file");
    expect(html).toContain("name: &lt;x&gt;");
    expect(html).toContain('data-ws="export-save" data-name="Mira"');
  });

  test("settings: connections, the creative toggle, the permission warning, the About line", async () => {
    const { view, settings } = await real();
    let html = renderStudio(model({ view, settings }));
    expect(html).toContain('<option value="fast">Fast helper</option>');
    expect(html).toContain('data-setting="creative"');
    expect(html).toContain('data-setting="playtestTurns"');
    expect(html).toContain('data-setting="showThin" checked');
    expect(html).toContain(settings.about);
    html = renderStudio(model({ view, settings: { ...settings, canGenerate: false } }));
    expect(html).toContain("no generation permission");
  });
});

test("reconcile: saved text stops being 'unsaved'; an error keeps it", async () => {
  const { view } = await real({ start: true });
  const p = view.draft!.parts[0];
  const ui = emptyUi();
  ui.unsaved = { [p.label]: p.yaml.replace(/\n/g, "\r\n"), other: "  ", kept: "x: 1\n" };
  reconcile(ui, { ...view, error: "boom" });
  expect(Object.keys(ui.unsaved)).toHaveLength(3);
  reconcile(ui, view);
  expect(ui.unsaved).toEqual({ kept: "x: 1\n" });
});
