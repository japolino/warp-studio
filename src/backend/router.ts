// Messages from Studio's page. Every message is untrusted: ids must be strings,
// texts are length-checked where they are used.

import type { FrontendToBackend, Settings, WarpSeen } from "../shared/protocol.js";
import { templateInfo } from "../rulebook/workspace.js";
import { ENGINE_FORMAT, STUDIO_VERSION, WARP_PIN_SHORT } from "../warp.js";
import { host, logError, send, toast } from "./host.js";
import { discardDraft, editPart, exportRules, importDraft, installDraft, listCharacters, openStudio, startDraft } from "./session.js";
import { getSettings, patchSettings } from "./settings.js";

export const ABOUT = `Warp Studio ${STUDIO_VERSION} · ruleset format ${ENGINE_FORMAT} · engine ${WARP_PIN_SHORT}`;

export async function sendSettings(userId?: string) {
  const settings = await getSettings(userId);
  let connections: { id: string; name: string }[] = [];
  let canGenerate = true;
  try { connections = (await host().connections.list(userId)).map((c) => ({ id: c.id, name: c.name })); }
  catch { canGenerate = false; /* no generation permission */ }
  send({ type: "settings", settings, connections, canGenerate, templates: templateInfo(), about: ABOUT }, userId);
}

const id = (v: unknown): string | null => (typeof v === "string" && v.trim() && v.length <= 200 ? v : null);

function warpSeen(v: unknown): WarpSeen | null {
  if (!v || typeof v !== "object") return null;
  const w = v as Record<string, unknown>;
  return { present: w.present === true, format: typeof w.format === "number" && Number.isInteger(w.format) ? w.format : null };
}

export async function handle(raw: unknown, userId?: string): Promise<void> {
  const msg = (raw && typeof raw === "object" ? raw : {}) as FrontendToBackend & Record<string, unknown>;
  const characterId = id(msg.characterId);
  try {
    switch (msg.type) {
      case "hello": await sendSettings(userId); break;
      case "characters": send({ type: "characters", list: await listCharacters(userId) }, userId); break;
      case "settings": await patchSettings(msg.patch as Partial<Settings>, userId); await sendSettings(userId); break;
      default: {
        if (!characterId) return;
        switch (msg.type) {
          case "open": await openStudio(characterId, userId); break;
          case "start": await startDraft(characterId, msg.from, userId); break;
          case "import": await importDraft(characterId, String(msg.text ?? ""), typeof msg.name === "string" ? msg.name : undefined, userId); break;
          case "edit": await editPart(characterId, String(msg.label ?? ""), String(msg.yaml ?? ""), userId); break;
          case "export": await exportRules(characterId, msg.from === "installed" ? "installed" : "draft", userId); break;
          case "install": await installDraft(characterId, warpSeen(msg.warp), userId); break;
          case "discard": await discardDraft(characterId, userId); break;
        }
      }
    }
  } catch (e) {
    logError(`frontend ${String(msg.type)}`, e);
    toast("error", `Warp Studio: ${e instanceof Error ? e.message : String(e)}`, userId);
  }
}
