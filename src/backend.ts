// Warp Studio's backend: workspaces, checks and Install. It never imports the CLI
// (the host's scanner refuses `fs` in a backend bundle).

import type { SpindleAPI } from "lumiverse-spindle-types";
import { logError, send } from "./backend/host.js";
import { handle } from "./backend/router.js";
import { forgetCharacter } from "./backend/session.js";

declare const spindle: SpindleAPI;

spindle.onFrontendMessage((raw, userId) => { void handle(raw, userId); });

// The page reads the open chat's character itself; it only needs to know the chat changed.
spindle.on("CHAT_SWITCHED", (p, userId) => {
  try { send({ type: "chat", chatId: (p as { chatId?: string | null })?.chatId ?? null }, userId); } catch (e) { logError("chat switched", e); }
});

spindle.on("CHARACTER_EDITED", (p) => {
  const x = p as { character?: { id?: string }; characterId?: string } | null;
  forgetCharacter(x?.character?.id ?? x?.characterId ?? null);
});
