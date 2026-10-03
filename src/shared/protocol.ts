// Messages and view models shared by Studio's backend and frontend. The frontend
// gets ready-made views; it never runs the engine.

import type { PreviewView } from "../rulebook/preview.js";

export interface Settings {
  /** Empty = Lumiverse's active connection. */
  helperConnectionId: string;
  /** Fix and Deepen write at temperature 0.8 instead of 0.4. */
  creative: boolean;
  playtestTurns: number;
  playtestSeeds: number;
  /** Off: only gaps and balance findings in the list (scores still count thin spots). */
  showThin: boolean;
}

export const DEFAULT_SETTINGS: Settings = { helperConnectionId: "", creative: false, playtestTurns: 30, playtestSeeds: 20, showThin: true };

export interface IssueView { level: "error" | "warning"; where: string; message: string }

export interface PartView { label: string; yaml: string; status: "ok" | "warn" | "error"; issues: IssueView[] }

/** A lorebook attached to the character that holds Warp rules. */
export interface BookView {
  id: string;
  name: string;
  /** Published as a complete snapshot (by Warp's builder or by Studio). */
  installed: boolean;
  /** Warp reads this one (the last installed snapshot, or every book of an older layout). */
  active: boolean;
  format: number | null;
  by: string | null;
  entries: number;
}

export interface CharacterView {
  id: string;
  name: string;
  books: BookView[];
  /** "warp-ruleset (7 entries)", or null with no rules. */
  source: string | null;
  /** Sections Warp loads now. */
  installedParts: number;
}

export type DraftBase =
  | { kind: "installed"; bookId: string | null }
  | { kind: "backup"; bookId: string; name: string }
  | { kind: "template"; id: string; name: string }
  | { kind: "import"; name: string | null }
  | { kind: "blank" };

export interface DraftView {
  base: DraftBase;
  parts: PartView[];
  /** Issues for sections the draft doesn't have. */
  unplaced: IssueView[];
  errors: number;
  warnings: number;
  /** Removed top-level keys, and the one banner about them. */
  legacy: string[];
  banner: string | null;
  /** Differs from what Warp loads now. */
  changed: boolean;
  /** Why Install is refused (errors), or null. The Warp version check is separate. */
  installBlock: string | null;
  preview: PreviewView | null;
  updatedAt: number;
}

export interface StudioView {
  characterId: string;
  character: CharacterView | null;
  draft: DraftView | null;
  busy: string | null;
  error: string | null;
  /** The last install from Studio in this session. */
  installed: { bookId: string; at: number } | null;
}

/** What the frontend saw of Warp (the warp-state-v1 bridge), sent with Install. */
export interface WarpSeen { present: boolean; format: number | null }

export type StartFrom = { installed: true } | { template: string } | { backup: string } | { blank: true };

export type FrontendToBackend =
  | { type: "hello" }
  | { type: "characters" }
  | { type: "open"; characterId: string }
  | { type: "start"; characterId: string; from: StartFrom }
  | { type: "import"; characterId: string; text: string; name?: string }
  | { type: "edit"; characterId: string; label: string; yaml: string }
  | { type: "export"; characterId: string; from: "draft" | "installed" }
  | { type: "install"; characterId: string; warp: WarpSeen }
  | { type: "discard"; characterId: string }
  | { type: "settings"; patch: Partial<Settings> };

export interface TemplateInfo { id: string; name: string; blurb: string }

export type BackendToFrontend =
  | { type: "settings"; settings: Settings; connections: { id: string; name: string }[]; canGenerate: boolean; templates: TemplateInfo[]; about: string }
  | { type: "characters"; list: { id: string; name: string }[] }
  | { type: "chat"; chatId: string | null }
  | { type: "studio"; view: StudioView }
  | { type: "exported"; characterId: string; name: string; text: string }
  | { type: "toast"; level: "info" | "success" | "warning" | "error"; message: string };
