---
name: warp-rulebook
description: Write or improve a Warp ruleset — the YAML rules (people with bands and voices, checks, live choices, conflict kinds, meters, conditions, goals) that the Warp extension runs under a Lumiverse roleplay chat. Use when asked to make a game, ruleset or rulebook for a character card for Warp/Lumiverse.
---

# Writing a Warp ruleset

Warp is a game engine under a roleplay chat. The rules decide outcomes (checks, relationship bands, time, contests) and
the narrator model only writes them. A ruleset is one YAML file. Make it a **small game that fits the card**, not a
list of systems.

## Tools

Use whichever is available:

- **MCP** (the `warp` server; Warp Studio's `.mcp.json` declares it): `warp_guide` (`topic` for one part),
  `warp_templates`, `warp_template`, `warp_check`, `warp_simulate`, `warp_preview`.
- **Shell**: `npx -y github:japolino/warp-studio <command>`, or `node dist/warp-rulebook.js <command>` in a clone of
  Warp Studio. Commands: `guide`, `templates`, `template <id>`, `check <file>`, `simulate <file>`, `preview <file>`,
  `--version`.

## Steps

1. **Read the guide first** (`warp_guide` / `guide`). It is the format reference and the design guide. Do not write
   keys it does not describe.
2. **Read the card or brief.** Name the loop before you write YAML: what the player does most, what pushes back, what
   they want. Note the cast and the tone.
3. **Pick a template** (`templates`), get it (`template <id>`) and adapt it: rename, retune, trim. The templates are
   Warp's own: a story template without dice and an adventure template with dice.
4. **Write the file** (for example `rulebook.yaml`). Plain YAML with top-level keys is fine.
5. **Check after every change** (`check`). Fix every error. Then work through the findings system by system: fix the
   gaps, and fix or knowingly leave each thin spot. Do not chase a perfect score by adding parts the game does not need.
6. **Simulate** (`simulate`) until every gate passes. The gates are Warp's own quality bar for the whole loop.
7. **Preview** (`preview`): the status panel, the actions and the narrator's view at the start. Bands should read as
   words; odds should make sense.
8. **Hand it over**: tell the user to open Lumiverse → **Warp Studio → Import a rulebook**, check it, then
   **Install**. Say what the game is, its loop, and what you left thin on purpose.

## Rules

- Few parts that all matter: 2–3 relationship stats with words on every band, 3–4 meters with bands, a handful of
  live-choice tags with at least one safe tag (no check), goals that come from the story.
- snake_case ids; meters 0–100; quote formulas that contain commas; refer to the player as `{{user}}`; in-world text
  in the card's voice.
- Make different approaches carry different risks or payoffs. A failure should change the situation, not invite the
  same retry.
- Never anything sexual involving anyone under 18. Warp refuses a ruleset that declares minors together with sexual
  tags.
