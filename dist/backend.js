// src/backend/host.ts
function host() {
  return spindle;
}
function send(msg, userId) {
  spindle.sendToFrontend(msg, userId);
}
function toast(level, message, userId) {
  try {
    spindle.toast[level](message, { title: "Warp Studio", ...userId ? { userId } : {} });
  } catch {
    send({ type: "toast", level, message }, userId);
  }
}
function logError(where, err) {
  const msg = err instanceof Error ? err.message : String(err);
  try {
    spindle.log.error(`[warp_studio] ${where}: ${msg}`);
  } catch {}
}
// package.json
var package_default = {
  name: "warp-studio",
  version: "0.1.0",
  private: true,
  type: "module",
  description: "Creator tools for Warp rulesets (a Lumiverse extension) and the warp-rulebook CLI/MCP server.",
  bin: {
    "warp-rulebook": "dist/warp-rulebook.js"
  },
  engines: {
    node: ">=20"
  },
  scripts: {
    test: "bun test",
    typecheck: "tsc --project tsconfig.json --noEmit",
    verify: "bun run test && bun run typecheck",
    build: "tsc --project tsconfig.build.json --noEmit && bun build ./src/backend.ts ./src/frontend.ts --outdir ./dist --target browser --format esm && bun run build:tools",
    "build:tools": "bun build ./src/tools/cli.ts --outfile ./dist/warp-rulebook.js --target node && bun run guide",
    guide: "bun ./src/tools/cli.ts guide --markdown --out docs/RULEBOOK_GUIDE.md"
  },
  devDependencies: {
    warp: "github:japolino/warp#8f61ee90ea4cdb4542db8dbe4106bfba72c43834",
    "js-yaml": "^4.1.0",
    "@types/js-yaml": "^4.0.9",
    "bun-types": "^1.3.14",
    "lumiverse-spindle-types": "0.6.36",
    typescript: "^5.9.0"
  }
};

// node_modules/warp/src/engine/expr.ts
class ExprError extends Error {
}
var OPS = ["<=", ">=", "==", "!=", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "!", "(", ")", ",", ".", "?", ":"];
function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || c === "." && /[0-9]/.test(src[i + 1] ?? "")) {
      const m = /^[0-9]*\.?[0-9]+/.exec(src.slice(i));
      out.push({ t: "num", v: m[0], at: i });
      i += m[0].length;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\" && j + 1 < src.length) {
          s += src[j + 1];
          j += 2;
          continue;
        }
        s += src[j++];
      }
      if (j >= src.length)
        throw new ExprError(`Unclosed quote starting at character ${i + 1}`);
      out.push({ t: "str", v: s, at: i });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      out.push({ t: "id", v: m[0], at: i });
      i += m[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op)
      throw new ExprError(`Unexpected "${c}" at character ${i + 1}`);
    out.push({ t: "op", v: op, at: i });
    i += op.length;
  }
  return out;
}
var BP = {
  or: 1,
  "||": 1,
  and: 2,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "<": 4,
  "<=": 4,
  ">": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6
};

class Parser {
  toks;
  src;
  i = 0;
  constructor(toks, src) {
    this.toks = toks;
    this.src = src;
  }
  parse() {
    const n = this.expr(0);
    if (this.i < this.toks.length)
      this.fail(`Unexpected "${this.toks[this.i].v}"`);
    return n;
  }
  peek() {
    return this.toks[this.i];
  }
  fail(msg) {
    const at = this.peek()?.at;
    throw new ExprError(at === undefined ? `${msg} at end of expression` : `${msg} at character ${at + 1}`);
  }
  eat(v) {
    const t = this.peek();
    if (!t || t.v !== v)
      this.fail(`Expected "${v}"`);
    this.i++;
  }
  binOp(t) {
    if (!t)
      return null;
    if (t.t === "op" && t.v in BP)
      return t.v;
    if (t.t === "id" && (t.v === "and" || t.v === "or"))
      return t.v;
    return null;
  }
  expr(minBp) {
    let left = this.unary();
    for (;; ) {
      const t = this.peek();
      if (t?.t === "op" && t.v === "?" && minBp === 0) {
        this.i++;
        const a = this.expr(0);
        this.eat(":");
        const b = this.expr(0);
        left = { k: "tern", c: left, a, b };
        continue;
      }
      const op = this.binOp(t);
      if (!op || BP[op] <= minBp)
        break;
      this.i++;
      const right = this.expr(BP[op]);
      left = { k: "bin", op: op === "&&" ? "and" : op === "||" ? "or" : op, a: left, b: right };
    }
    return left;
  }
  unary() {
    const t = this.peek();
    if (!t)
      this.fail("Expression ended too early");
    if (t.t === "op" && t.v === "-") {
      this.i++;
      return { k: "un", op: "-", a: this.unary() };
    }
    if (t.t === "op" && t.v === "+") {
      this.i++;
      return this.unary();
    }
    if (t.t === "op" && t.v === "!" || t.t === "id" && t.v === "not") {
      this.i++;
      return { k: "un", op: "not", a: this.unary() };
    }
    return this.primary();
  }
  primary() {
    const t = this.peek();
    if (!t)
      this.fail("Expression ended too early");
    this.i++;
    if (t.t === "num")
      return { k: "num", v: Number(t.v) };
    if (t.t === "str")
      return { k: "str", v: t.v };
    if (t.t === "op" && t.v === "(") {
      const n = this.expr(0);
      this.eat(")");
      return n;
    }
    if (t.t === "id") {
      if (t.v === "true")
        return { k: "lit", v: true };
      if (t.v === "false")
        return { k: "lit", v: false };
      if (t.v === "null")
        return { k: "lit", v: null };
      if (this.peek()?.v === "(") {
        this.i++;
        const args = [];
        if (this.peek()?.v !== ")") {
          for (;; ) {
            args.push(this.expr(0));
            if (this.peek()?.v === ",") {
              this.i++;
              continue;
            }
            break;
          }
        }
        this.eat(")");
        return { k: "call", name: t.v, args };
      }
      const path = [t.v];
      while (this.peek()?.v === ".") {
        this.i++;
        const next = this.peek();
        if (!next || next.t !== "id")
          this.fail('Expected a name after "."');
        path.push(next.v);
        this.i++;
      }
      return { k: "id", path };
    }
    this.i--;
    this.fail(`Unexpected "${t.v}"`);
  }
}
var cache = new Map;
function compile(src) {
  const key = src.trim();
  let n = cache.get(key);
  if (!n) {
    n = new Parser(tokenize(key), key).parse();
    if (cache.size > 2000)
      cache.clear();
    cache.set(key, n);
  }
  return n;
}
var MATH = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  clamp: ([v, lo, hi]) => Math.min(hi, Math.max(lo, v)),
  floor: ([v]) => Math.floor(v),
  ceil: ([v]) => Math.ceil(v),
  round: ([v]) => Math.round(v),
  abs: ([v]) => Math.abs(v)
};
function num(v) {
  if (typeof v === "number")
    return v;
  if (typeof v === "boolean")
    return v ? 1 : 0;
  if (v === null)
    return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function truthy(v) {
  return !(v === false || v === null || v === 0 || v === "");
}
function run(n, env, opts) {
  switch (n.k) {
    case "num":
    case "str":
    case "lit":
      return n.v;
    case "id": {
      const v = env.lookup(n.path);
      if (v === undefined) {
        opts.unknown?.add(n.path.join("."));
        return 0;
      }
      return v;
    }
    case "call": {
      const args = n.args.map((a) => run(a, env, opts));
      const math = MATH[n.name];
      if (math)
        return math(args.map(num));
      const v = env.call?.(n.name, args);
      if (v === undefined) {
        opts.unknown?.add(`${n.name}()`);
        return 0;
      }
      return v;
    }
    case "un": {
      const a = run(n.a, env, opts);
      return n.op === "-" ? -num(a) : !truthy(a);
    }
    case "tern":
      return truthy(run(n.c, env, opts)) ? run(n.a, env, opts) : run(n.b, env, opts);
    case "bin": {
      if (n.op === "and") {
        const a = run(n.a, env, opts);
        return truthy(a) ? run(n.b, env, opts) : a;
      }
      if (n.op === "or") {
        const a = run(n.a, env, opts);
        return truthy(a) ? a : run(n.b, env, opts);
      }
      const a = run(n.a, env, opts);
      const b = run(n.b, env, opts);
      switch (n.op) {
        case "+":
          return typeof a === "string" || typeof b === "string" ? `${a ?? ""}${b ?? ""}` : num(a) + num(b);
        case "-":
          return num(a) - num(b);
        case "*":
          return num(a) * num(b);
        case "/":
          return num(b) === 0 ? 0 : num(a) / num(b);
        case "%":
          return num(b) === 0 ? 0 : num(a) % num(b);
        case "<":
          return num(a) < num(b);
        case "<=":
          return num(a) <= num(b);
        case ">":
          return num(a) > num(b);
        case ">=":
          return num(a) >= num(b);
        case "==":
          return typeof a === "string" || typeof b === "string" ? String(a) === String(b) : num(a) === num(b);
        case "!=":
          return typeof a === "string" || typeof b === "string" ? String(a) !== String(b) : num(a) !== num(b);
      }
    }
  }
  return null;
}
function evaluate(src, env, opts = {}) {
  if (typeof src === "number" || typeof src === "boolean")
    return src;
  return run(compile(src), env, opts);
}
function evalNumber(src, env, fallback = 0, opts = {}) {
  if (src === undefined)
    return fallback;
  return num(evaluate(src, env, opts));
}
function evalBool(src, env, fallback = true, opts = {}) {
  if (src === undefined)
    return fallback;
  return truthy(evaluate(src, env, opts));
}
function identifiers(src) {
  if (typeof src !== "string")
    return [];
  const out = new Set;
  const walk = (n) => {
    switch (n.k) {
      case "id":
        n.path.forEach((p) => out.add(p));
        break;
      case "call":
        n.args.forEach(walk);
        break;
      case "un":
        walk(n.a);
        break;
      case "bin":
        walk(n.a);
        walk(n.b);
        break;
      case "tern":
        walk(n.c);
        walk(n.a);
        walk(n.b);
        break;
    }
  };
  try {
    walk(compile(src));
  } catch {}
  return [...out];
}

// node_modules/warp/src/engine/dice.ts
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0;i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  h = Math.imul(h ^ h >>> 16, 2246822507);
  h = Math.imul(h ^ h >>> 13, 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
function seededRng(seed) {
  let a = hashSeed(seed);
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
class DiceError extends Error {
}
var TERM = /([+-]?)\s*(?:(\d*)d(\d+|%)(?:(kh|kl)(\d+))?(!)?|(\d+))/gy;
function parseDice(src) {
  const s = src.replace(/\s+/g, "").toLowerCase();
  if (!s)
    throw new DiceError("Dice notation is empty");
  const groups = [];
  let flat = 0;
  TERM.lastIndex = 0;
  let consumed = 0;
  let m;
  while (consumed < s.length && (m = TERM.exec(s))) {
    if (m[0] === "")
      break;
    if (consumed > 0 && !m[1])
      break;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[7] !== undefined) {
      flat += sign * Number(m[7]);
    } else {
      const count = m[2] ? Number(m[2]) : 1;
      const sides = m[3] === "%" ? 100 : Number(m[3]);
      if (count < 1 || count > 100)
        throw new DiceError(`"${src}": dice count must be 1–100`);
      if (sides < 2 || sides > 1000)
        throw new DiceError(`"${src}": dice need 2–1000 sides`);
      const g = { count, sides, sign };
      if (m[4]) {
        const n = Number(m[5]);
        if (n < 1 || n > count)
          throw new DiceError(`"${src}": can't keep ${n} of ${count} dice`);
        g.keep = { mode: m[4], n };
      }
      if (m[6])
        g.explode = true;
      groups.push(g);
    }
    consumed = TERM.lastIndex;
  }
  if (consumed !== s.length)
    throw new DiceError(`"${src}" isn't valid dice notation (try d20, 2d6, d100, 4d6kh3)`);
  if (!groups.length)
    throw new DiceError(`"${src}" has no dice in it`);
  return { groups, flat, primarySides: Math.max(...groups.map((g) => g.sides)) };
}
function rollDice(notation, rng) {
  const parsed = parseDice(notation);
  const dice = [];
  let total = parsed.flat;
  let natural = null;
  parsed.groups.forEach((g, gi) => {
    const faces = [];
    for (let i = 0;i < g.count; i++) {
      let face = 1 + Math.floor(rng() * g.sides);
      faces.push(face);
      let chain = 0;
      while (g.explode && face === g.sides && chain++ < 20) {
        face = 1 + Math.floor(rng() * g.sides);
        faces.push(face);
      }
    }
    const order = faces.map((v, i) => ({ v, i }));
    let keptIdx = new Set(order.map((o) => o.i));
    if (g.keep) {
      order.sort((x, y) => g.keep.mode === "kh" ? y.v - x.v : x.v - y.v);
      keptIdx = new Set(order.slice(0, g.keep.n).map((o) => o.i));
    }
    faces.forEach((v, i) => {
      const kept = keptIdx.has(i);
      dice.push({ sides: g.sides, value: v, kept });
      if (kept)
        total += g.sign * v;
    });
    const keptFaces = faces.filter((_, i) => keptIdx.has(i));
    if (gi === 0 && keptFaces.length === 1)
      natural = keptFaces[0];
  });
  return { notation, dice, total, natural, primarySides: parsed.primarySides };
}

// node_modules/warp/src/engine/outcomes.ts
var KIND_WORDS = {
  won: "won",
  win: "won",
  victory: "won",
  success: "won",
  escaped: "escaped",
  escape: "escaped",
  fled: "escaped",
  flee: "escaped",
  conceded: "conceded",
  concede: "conceded",
  concession: "conceded",
  paid: "conceded",
  lost: "lost",
  lose: "lost",
  loss: "lost",
  defeat: "lost",
  defeated: "lost"
};
function parseOutcomeKind(v) {
  return typeof v === "string" ? KIND_WORDS[v.trim().toLowerCase()] ?? null : null;
}
var FAILURE = /^(lost|lose|loss|beaten|defeat(ed)?|overwhelmed|caught|captured|ko|knocked_out|downed|fallen|slain|killed|dead|died|wiped(_out)?|fled_in_panic|broken|failed?)$/i;
var ESCAPE = /escap|fled|flee|got_?away|get_?away|ran_?(away|off)|run_?away|slip(ped)?|evade|evaded|evasion|retreat|withdr[ae]w|bolted|hid$|hidden|lost_them|outran/i;
var CONCESSION = /paid|pay|robbed|bribe|surrender|gave_?in|submit|walked|walk_away|left|gave_up|yield|conced/i;
function encounterOutcomeIds(enc) {
  const ids = new Set;
  for (const e of enc.endWhen)
    ids.add(e.outcome);
  for (const o of Object.keys(enc.outcomes))
    ids.add(o);
  if (enc.momentum) {
    ids.add(enc.momentum.win);
    ids.add(enc.momentum.lose);
  }
  for (const a of Object.values(enc.actions))
    for (const fx of [a.effects, ...Object.values(a.outcomes)])
      if (fx?.end)
        ids.add(fx.end);
  for (const o of enc.foeMoves?.options ?? [])
    if (o.effect?.end)
      ids.add(o.effect.end);
  ids.add(enc.timeoutOutcome);
  return [...ids];
}
function atomVerdict(enc, stats, atom) {
  const t = atom.trim().replace(/^\(+/, "").replace(/\)+$/, "").trim();
  let m = /^(foe\.)?([a-z_]\w*)\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)$/i.exec(t);
  let foe, id, op;
  if (m) {
    foe = !!m[1];
    id = m[2];
    op = m[3];
  } else {
    m = /^(-?\d+(?:\.\d+)?)\s*(<=|>=|<|>|==)\s*(foe\.)?([a-z_]\w*)$/i.exec(t);
    if (!m)
      return;
    foe = !!m[3];
    id = m[4];
    op = { "<=": ">=", ">=": "<=", "<": ">", ">": "<", "==": "==" }[m[2]];
  }
  const dir = op.startsWith("<") ? "down" : op.startsWith(">") ? "up" : null;
  if (foe) {
    const fs = enc.foe.stats.find((x) => x.id === id);
    if (!fs)
      return;
    if (dir && fs.good !== "none" && dir === "down" === (fs.good === "low"))
      return "win";
    return null;
  }
  const def = stats?.[id];
  if (!def)
    return;
  if (dir && def.good !== "none" && dir === "down" === (def.good === "high"))
    return "loss";
  return null;
}
function endWhenVerdict(enc, stats, outcome) {
  const votes = new Set;
  for (const e of enc.endWhen) {
    if (e.outcome !== outcome)
      continue;
    for (const atom of e.when.split(/\s+(?:or|and)\s+|\|\||&&/i)) {
      const v = atomVerdict(enc, stats, atom);
      if (v === undefined)
        continue;
      votes.add(v ?? "unsure");
    }
  }
  if (votes.size === 1 && votes.has("win"))
    return { v: "win", basis: "foe" };
  if (votes.size === 1 && votes.has("loss"))
    return { v: "loss", basis: "player" };
  return { v: null, basis: "default" };
}
function moveVerdict(enc, outcome) {
  let good = false, bad = false;
  for (const a of Object.values(enc.actions)) {
    if (!a.check)
      continue;
    for (const [tier, fx] of Object.entries(a.outcomes)) {
      if (fx?.end !== outcome)
        continue;
      if (tier === "fail" || tier === "crit_fail")
        bad = true;
      else
        good = true;
    }
  }
  return good && !bad ? "win" : bad && !good ? "loss" : null;
}
function goodKind(outcome) {
  return ESCAPE.test(outcome) ? "escaped" : CONCESSION.test(outcome) ? "conceded" : "won";
}
function inferOutcomeKind(enc, outcome, stats, explicit) {
  const told = explicit?.[outcome];
  if (told)
    return { kind: told, basis: "author" };
  if (enc.momentum && outcome === enc.momentum.lose)
    return { kind: "lost", basis: "momentum" };
  if (enc.momentum && outcome === enc.momentum.win)
    return { kind: "won", basis: "momentum" };
  const ew = endWhenVerdict(enc, stats, outcome);
  if (ew.v === "win")
    return { kind: "won", basis: ew.basis };
  if (ew.v === "loss")
    return { kind: "lost", basis: ew.basis };
  const mv = moveVerdict(enc, outcome);
  if (mv === "loss")
    return { kind: "lost", basis: "move" };
  if (mv === "win")
    return { kind: goodKind(outcome), basis: "move" };
  if (FAILURE.test(outcome))
    return { kind: "lost", basis: "name" };
  if (ESCAPE.test(outcome))
    return { kind: "escaped", basis: "name" };
  if (CONCESSION.test(outcome))
    return { kind: "conceded", basis: "name" };
  const reached = enc.endWhen.some((e) => e.outcome === outcome) || mv !== null || Object.values(enc.actions).some((a) => a.effects?.end === outcome) || (enc.foeMoves?.options ?? []).some((o) => o.effect?.end === outcome);
  if (outcome === enc.timeoutOutcome && !reached)
    return { kind: "escaped", basis: "timeout" };
  return { kind: "won", basis: "default" };
}
function classifyOutcomes(enc, stats, explicit) {
  const out = {};
  for (const id of new Set([...encounterOutcomeIds(enc), ...Object.keys(explicit ?? {})]))
    out[id] = inferOutcomeKind(enc, id, stats, explicit).kind;
  return out;
}
function outcomeKind(enc, outcome) {
  if (!enc)
    return FAILURE.test(outcome) ? "lost" : goodKind(outcome);
  return enc.outcomeKinds?.[outcome] ?? enc.authoredKinds?.[outcome] ?? inferOutcomeKind(enc, outcome).kind;
}

// node_modules/warp/src/engine/ruleset.ts
var DIFFICULTIES = ["easy", "fair", "hard", "extreme"];
var DEFAULT_PRACTICE_REPEAT = { step: 0.5, floor: 0.1, recoverMinutes: 120, recoverTurns: 8 };
var isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
function titleCase(id) {
  return id.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function slug(s) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "x";
}
var DEFAULT_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function parseClockStart(v, weekdays) {
  if (typeof v === "number" && Number.isFinite(v))
    return Math.max(0, Math.floor(v));
  if (typeof v !== "string")
    return null;
  const s = v.trim();
  const m = /^(?:(?:day\s*(\d+))|([A-Za-z]{3,}))?\s*(\d{1,2}):(\d{2})$/i.exec(s);
  if (!m)
    return null;
  let day = 0;
  if (m[1])
    day = Math.max(0, Number(m[1]) - 1);
  else if (m[2]) {
    const idx = weekdays.findIndex((w) => w.toLowerCase().startsWith(m[2].toLowerCase().slice(0, 3)));
    if (idx < 0)
      return null;
    day = idx;
  }
  const h = Number(m[3]);
  const min = Number(m[4]);
  if (h > 23 || min > 59)
    return null;
  return day * 1440 + h * 60 + min;
}

class Ctx {
  issues = [];
  err(where, message) {
    this.issues.push({ level: "error", where, message });
  }
  warn(where, message) {
    this.issues.push({ level: "warning", where, message });
  }
  removed(where, key, what) {
    this.warn(where, `\`${key}:\` (${what}) was removed from Warp, so it's ignored. The old version is on the \`legacy\` branch.`);
  }
  num(v, where, fallback) {
    if (v === undefined || v === null || v === "")
      return fallback;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      this.warn(where, `"${v}" should be a number — using ${fallback}`);
      return fallback;
    }
    return n;
  }
  expr(v, where) {
    if (v === undefined || v === null)
      return;
    if (typeof v === "number")
      return v;
    if (typeof v === "boolean")
      return v ? 1 : 0;
    const s = String(v);
    if (percentOf(s) !== null)
      return s.trim();
    try {
      compile(s);
      return s;
    } catch (e) {
      this.err(where, e instanceof ExprError ? `Formula "${s}": ${e.message}` : `Formula "${s}" couldn't be read`);
      return;
    }
  }
}
function percentOf(v) {
  if (typeof v !== "string")
    return null;
  const m = /^\s*([+-]?)\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(v);
  return m ? (m[1] === "-" ? -1 : 1) * Number(m[2]) / 100 : null;
}
function diceExpr(v) {
  if (typeof v !== "string")
    return v;
  const m = /^\s*([+-]?)\s*(\d*d\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(v);
  if (!m)
    return v;
  return `${m[1] === "-" ? "-" : ""}(roll('${m[2].toLowerCase()}')${m[3] ? ` ${m[3]} ${m[4]}` : ""})`;
}
function minutesOf(v, where, c, fallback) {
  if (typeof v === "string") {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?|h|hrs?|hours?|d|days?)?\s*$/i.exec(v);
    if (m) {
      const n = Number(m[1]);
      const u = (m[2] ?? "m").toLowerCase();
      return Math.round(u.startsWith("d") ? n * 1440 : u.startsWith("h") ? n * 60 : n);
    }
  }
  return c.num(v, where, fallback);
}
function amount(v, where, c) {
  if (typeof v === "string" && !Number.isFinite(Number(v)) && percentOf(v) === null) {
    const x = c.expr(v, where);
    return typeof x === "string" ? x : typeof x === "number" ? x : 0;
  }
  return c.num(v, where, 0);
}
function armorMap(v, where, c) {
  if (v === undefined || v === null || v === false)
    return {};
  if (!isObj(v)) {
    const n = amount(v, where, c);
    return n ? { _: n } : {};
  }
  const out = {};
  for (const [k, n] of Object.entries(v)) {
    const x = amount(n, `${where} › ${k}`, c);
    if (x)
      out[k] = x;
  }
  return out;
}
function perHourOf(v, where, c) {
  if (typeof v === "string" && !Number.isFinite(Number(v))) {
    if (percentOf(v) !== null)
      return { perHour: 0, perHourExpr: v.trim() };
    const x = c.expr(v, where);
    return typeof x === "string" ? { perHour: 0, perHourExpr: x } : { perHour: typeof x === "number" ? x : 0 };
  }
  return { perHour: c.num(v, where, 0) };
}
function normCurrency(v, c) {
  if (v === undefined || v === null)
    return { currency: "$" };
  if (typeof v === "string" || typeof v === "number") {
    const t = String(v);
    const at = t.indexOf("{n}");
    if (at < 0)
      return { currency: t };
    const before = t.slice(0, at), after = t.slice(at + 3);
    if (before && after)
      c.warn("HUD › currency", `"${t}" — put the sign on one side of {n} only; using "${after}" after the amount`);
    return after ? { currency: after, currencyAfter: true } : { currency: before };
  }
  if (isObj(v)) {
    const known = new Set(["symbol", "sign", "after"]);
    for (const k of Object.keys(v))
      if (!known.has(k))
        c.warn(`HUD › currency › ${k}`, "currency takes `symbol:` and `after: true`");
    const sym = v.symbol ?? v.sign;
    if (typeof sym !== "string" && typeof sym !== "number") {
      c.warn("HUD › currency", "needs `symbol:` (e.g. `{ symbol: d, after: true }`) — using $");
      return { currency: "$" };
    }
    if (v.after !== undefined && typeof v.after !== "boolean")
      c.warn("HUD › currency › after", "should be true or false");
    return v.after === true ? { currency: String(sym), currencyAfter: true } : { currency: String(sym) };
  }
  c.warn("HUD › currency", `expected a sign like "$", "{n}d" or { symbol: d, after: true } — using $`);
  return { currency: "$" };
}
function normGate(r, where, c) {
  const g = {};
  if (r.narrator_when !== undefined) {
    const x = c.expr(r.narrator_when, `${where} › narrator_when`);
    if (x !== undefined)
      g.when = String(x);
  }
  const words = list(r.narrator_words ?? r.narrator_keywords).map((w) => w.toLowerCase()).filter(Boolean);
  if (words.length)
    g.words = words;
  const actions = list(r.narrator_actions).map((a) => a.toLowerCase()).filter(Boolean);
  if (actions.length)
    g.actions = actions;
  return g.when || g.words || g.actions ? g : undefined;
}
function toneFor(index, count, good) {
  if (good === "none" || count <= 1)
    return "neutral";
  const pos = index / (count - 1);
  const goodness = good === "high" ? pos : 1 - pos;
  return goodness >= 0.67 ? "good" : goodness >= 0.34 ? "warn" : "bad";
}
function normBands(raw, good, where, c) {
  if (raw === undefined || raw === null)
    return [];
  const list = [];
  if (Array.isArray(raw)) {
    raw.forEach((b, i) => {
      if (!isObj(b)) {
        c.warn(`${where} › #${i + 1}`, "each band needs `at` and `text`");
        return;
      }
      const at = c.num(b.at ?? b.from ?? b.min, `${where} › #${i + 1}`, NaN);
      if (!Number.isFinite(at) || typeof b.text !== "string") {
        c.warn(`${where} › #${i + 1}`, "each band needs a numeric `at` and a `text`");
        return;
      }
      const tone = ["good", "warn", "bad", "neutral"].includes(b.tone) ? b.tone : undefined;
      list.push({ at, text: b.text, tone });
    });
  } else if (isObj(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      const at = Number(k.replace(/%\s*$/, ""));
      if (!Number.isFinite(at)) {
        c.warn(where, `band key "${k}" should be a number (the value where this text starts), or a percentage like 75%`);
        continue;
      }
      if (typeof v === "string")
        list.push({ at, text: v });
      else if (isObj(v) && typeof v.text === "string")
        list.push({ at, text: v.text, tone: v.tone });
      else
        c.warn(`${where} › ${k}`, "band should be a line of text");
    }
  } else {
    c.warn(where, "bands should be a map like `0: You feel fine.`");
  }
  list.sort((a, b) => a.at - b.at);
  return list.map((b, i) => ({ at: b.at, text: b.text, tone: b.tone ?? toneFor(i, list.length, good) }));
}
var KIND_ALIASES = {
  meter: "meter",
  bar: "meter",
  pool: "meter",
  resource: "meter",
  attribute: "attribute",
  attr: "attribute",
  stat: "attribute",
  skill: "skill",
  money: "money",
  currency: "money",
  hidden: "hidden"
};
function normStat(id, raw, where, c, forRel = false) {
  const r = isObj(raw) ? raw : typeof raw === "number" ? { start: raw } : {};
  if (!isObj(raw) && typeof raw !== "number" && raw !== null && raw !== undefined) {
    c.warn(where, "expected a stat definition — using defaults");
  }
  const kind = KIND_ALIASES[String(r.kind ?? r.type ?? (forRel ? "meter" : "meter")).toLowerCase()];
  if (!kind)
    c.warn(where, `unknown kind "${r.kind}" — use meter, attribute, skill, money or hidden`);
  const k = kind ?? "meter";
  const defaultMax = k === "money" ? 1000000000000 : k === "skill" ? 1000 : 100;
  const min = c.num(r.min, `${where} › min`, 0);
  let max = defaultMax;
  let maxExpr;
  if (typeof r.max === "string" && !Number.isFinite(Number(r.max))) {
    const e = c.expr(r.max, `${where} › max`);
    if (typeof e === "string") {
      maxExpr = e;
      max = defaultMax;
    }
  } else
    max = c.num(r.max, `${where} › max`, defaultMax);
  if (max <= min) {
    c.warn(where, `max (${max}) must be above min (${min})`);
    max = min + 100;
  }
  const goodRaw = String(r.good ?? (k === "meter" ? "high" : k === "hidden" ? "none" : "high")).toLowerCase();
  const good = goodRaw === "low" ? "low" : goodRaw === "none" || goodRaw === "neutral" ? "none" : "high";
  const showRaw = String(r.show ?? (r.bands ? "text" : "both")).toLowerCase();
  const show = ["text", "number", "both", "hidden"].includes(showRaw) ? showRaw : "both";
  let narrator = 0;
  if (r.narrator === true)
    narrator = Math.max(1, Math.round((max - min) / 10));
  else if (r.narrator !== undefined && r.narrator !== false)
    narrator = Math.abs(c.num(r.narrator, `${where} › narrator`, 0));
  let startRaw = r.start ?? r.value;
  let startExpr;
  if (typeof startRaw === "string" && startRaw.trim() && !Number.isFinite(Number(startRaw))) {
    const word = startRaw.trim().toLowerCase();
    const pct = percentOf(startRaw);
    if (word === "full" || word === "max") {
      startExpr = maxExpr;
      startRaw = max;
    } else if (pct !== null) {
      if (pct < 0 || pct > 1)
        c.warn(`${where} › start`, `"${startRaw}" — a share of the max should be 0% to 100%`);
      const p = Math.max(0, Math.min(1, pct));
      startExpr = maxExpr ? `(${maxExpr}) * ${p}` : undefined;
      startRaw = min + (max - min) * p;
    } else {
      const e = c.expr(startRaw, `${where} › start`);
      if (typeof e === "string")
        startExpr = e;
      startRaw = undefined;
    }
  }
  const start = c.num(startRaw, `${where} › start`, good === "low" ? min : k === "meter" ? max : min);
  const gate = narrator > 0 ? normGate(r, where, c) : undefined;
  const def = {
    id,
    label: typeof r.label === "string" ? r.label : titleCase(id),
    kind: k,
    min,
    max,
    maxExpr,
    start: maxExpr ? Math.max(min, start) : Math.min(max, Math.max(min, start)),
    ...startExpr !== undefined ? { startExpr } : {},
    good,
    ...perHourOf(r.per_hour ?? r.perHour, `${where} › per_hour`, c),
    show: k === "hidden" ? "hidden" : show,
    ...r.show !== undefined ? { showSet: true } : {},
    ...groupOf(r.group, `${where} › group`, c),
    narrator,
    ...gate ? { gate } : {},
    growth: 0,
    bands: normBands(r.bands, good, `${where} › bands`, c),
    ...isObj(r.bands) && Object.keys(r.bands).some((k) => /%\s*$/.test(k)) ? { pctBands: true } : {},
    color: typeof r.color === "string" ? r.color : undefined,
    desc: typeof r.desc === "string" ? r.desc : typeof r.description === "string" ? r.description : undefined
  };
  if (Array.isArray(r.grades) && r.grades.length)
    def.grades = r.grades.map(String);
  if (r.allocate !== undefined)
    c.removed(`${where} › allocate`, "allocate", "spending points on stats");
  const grows = k === "skill" || k === "attribute";
  def.growth = r.growth === false ? 0 : r.growth === true ? 1 : r.growth !== undefined ? Math.max(0, c.num(r.growth, `${where} › growth`, grows ? 1 : 0)) : grows ? 1 : 0;
  return def;
}
function emptyEffect() {
  return {
    stats: {},
    set: {},
    flags: {},
    items: {},
    rel: {},
    addConditions: {},
    removeConditions: [],
    decide: [],
    foe: {},
    reveal: [],
    inflict: {},
    afflict: {},
    cleanse: [],
    quest: {},
    progress: {},
    remember: {}
  };
}
var INFLICT_KEYS = new Set(["rounds", "chance", "for"]);
var QUEST_OPS = {
  start: "start",
  take: "start",
  begin: "start",
  give: "start",
  offer: "start",
  done: "done",
  complete: "done",
  completed: "done",
  succeed: "done",
  success: "done",
  finish: "done",
  win: "done",
  fail: "fail",
  failed: "fail",
  lose: "fail",
  drop: "drop",
  abandon: "drop",
  cancel: "drop",
  report: "report",
  turn_in: "report",
  hand_in: "report"
};
var list = (v) => Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : [];
function normDecide(raw, where, c, known, minOptions = 2) {
  if (!isObj(raw)) {
    c.warn(where, "decide needs `ask:` and `options:`");
    return [];
  }
  const entries = typeof raw.ask === "string" ? [[slug(where), raw]] : Object.entries(raw);
  const out = [];
  for (const [id, spec] of entries) {
    const w = `${where} › ${id}`;
    if (!isObj(spec) || typeof spec.ask !== "string" || !isObj(spec.options)) {
      c.warn(w, "decide needs `ask:` (a question) and `options:`");
      continue;
    }
    const options = [];
    for (const [oid, o] of Object.entries(spec.options)) {
      const r = isObj(o) ? { ...o } : typeof o === "string" ? { desc: o } : {};
      const desc = typeof r.desc === "string" ? r.desc : typeof r.label === "string" ? r.label : titleCase(oid);
      const weight = c.num(r.weight, `${w} › ${oid} › weight`, 1);
      const when = r.when !== undefined ? c.expr(r.when, `${w} › ${oid} › when`) : undefined;
      delete r.desc;
      delete r.label;
      delete r.weight;
      delete r.when;
      options.push({ id: oid, desc, weight: Math.max(0, weight), effect: normEffect(r, `${w} › ${oid}`, c, known), ...when !== undefined ? { when: String(when) } : {} });
    }
    if (options.length < minOptions) {
      c.warn(w, minOptions > 1 ? "decide needs at least two options" : "needs at least one option");
      continue;
    }
    out.push({ id: typeof spec.id === "string" ? spec.id : id, ask: spec.ask, options });
  }
  return out;
}
var REMOVED_EFFECTS = {
  conceive: "family and pregnancy",
  pregnancy: "family and pregnancy",
  arc: "companion lives",
  bond: "feelings between people",
  bonds: "feelings between people",
  front: "hidden world clocks (fronts)",
  fronts: "hidden world clocks (fronts)",
  gauge: "random events",
  events_gauge: "random events",
  unlock: "the codex",
  codex: "the codex",
  learn: "abilities",
  wear: "the wardrobe",
  put_on: "the wardrobe",
  undress: "the wardrobe",
  take_off: "the wardrobe",
  damage: "the wardrobe",
  body: "the body and transformations",
  transform: "the body and transformations"
};
function normEffect(raw, where, c, known) {
  const e = emptyEffect();
  if (raw === undefined || raw === null)
    return e;
  if (typeof raw === "string") {
    e.hint = raw;
    return e;
  }
  if (!isObj(raw)) {
    c.warn(where, "expected a map of effects");
    return e;
  }
  for (const [k, v] of Object.entries(raw)) {
    const w = `${where} › ${k}`;
    if (REMOVED_EFFECTS[k] && !known.stats.has(k)) {
      c.removed(w, k, REMOVED_EFFECTS[k]);
      continue;
    }
    switch (k) {
      case "stats":
      case "change":
        if (isObj(v))
          for (const [s, d] of Object.entries(v)) {
            const x = c.expr(d, `${w} › ${s}`);
            if (x !== undefined)
              e.stats[s] = x;
          }
        break;
      case "set":
        if (isObj(v))
          for (const [s, d] of Object.entries(v)) {
            const x = c.expr(d, `${w} › ${s}`);
            if (x !== undefined)
              e.set[s] = x;
          }
        break;
      case "flags":
      case "flag":
        if (isObj(v))
          Object.assign(e.flags, v);
        else if (typeof v === "string")
          e.flags[v] = true;
        break;
      case "items":
      case "give":
      case "take":
        if (isObj(v))
          for (const [it, n] of Object.entries(v))
            e.items[it] = (k === "take" ? -1 : 1) * c.num(n, `${w} › ${it}`, 1);
        else if (typeof v === "string")
          e.items[v] = k === "take" ? -1 : 1;
        else if (Array.isArray(v))
          for (const it of v)
            e.items[String(it)] = k === "take" ? -1 : 1;
        break;
      case "rel":
      case "relationships":
        if (isObj(v))
          for (const [who, m] of Object.entries(v)) {
            if (!isObj(m)) {
              c.warn(`${w} › ${who}`, "expected stat changes like `trust: +5`");
              continue;
            }
            e.rel[who] = {};
            for (const [s, d] of Object.entries(m)) {
              const x = c.expr(d, `${w} › ${who} › ${s}`);
              if (x !== undefined)
                e.rel[who][s] = x;
            }
          }
        break;
      case "move":
      case "go":
      case "location":
        e.move = String(v);
        break;
      case "time":
      case "minutes":
        e.time = c.num(v, w, 0);
        break;
      case "add_condition":
      case "add_conditions":
      case "condition":
        if (typeof v === "string")
          e.addConditions[v] = null;
        else if (Array.isArray(v))
          for (const x of v)
            e.addConditions[String(x)] = null;
        else if (isObj(v))
          for (const [x, d] of Object.entries(v))
            e.addConditions[x] = d === null || d === true ? null : c.num(d, `${w} › ${x}`, 60);
        break;
      case "remove_condition":
      case "remove_conditions":
      case "cure":
        if (typeof v === "string")
          e.removeConditions.push(v);
        else if (Array.isArray(v))
          e.removeConditions.push(...v.map(String));
        break;
      case "hint":
      case "narrate":
      case "text":
        e.hint = String(v);
        break;
      case "decide":
        e.decide.push(...normDecide(v, w, c, known));
        break;
      case "foe":
        if (isObj(v))
          for (const [s, d] of Object.entries(v)) {
            const x = c.expr(d, `${w} › ${s}`);
            if (x !== undefined)
              e.foe[s] = x;
          }
        else
          c.warn(w, "expected foe stat changes like `hp: -8`");
        break;
      case "end":
      case "end_encounter":
        e.end = v === true ? "ended" : String(v);
        break;
      case "start_encounter":
      case "encounter":
        e.startEncounter = String(v);
        break;
      case "reveal":
        e.reveal.push(...list(v));
        break;
      case "momentum":
      case "swing": {
        const x = c.expr(v, w);
        if (x !== undefined)
          e.momentum = x;
        break;
      }
      case "harm": {
        const x = c.expr(diceExpr(v), w);
        if (x !== undefined)
          e.harm = x;
        break;
      }
      case "inflict":
      case "afflict":
      case "status":
        if (typeof v === "string")
          e.inflict[v] = {};
        else if (Array.isArray(v))
          for (const x of v)
            e.inflict[String(x)] = {};
        else if (isObj(v))
          for (const [key, x] of Object.entries(v)) {
            const xw = `${w} › ${key}`;
            if (Array.isArray(x)) {
              e.afflict[key] = Object.fromEntries(x.map((id) => [String(id), null]));
              continue;
            }
            if (isObj(x) && !Object.keys(x).every((kk) => INFLICT_KEYS.has(kk))) {
              e.afflict[key] = {};
              for (const [cid, d] of Object.entries(x))
                e.afflict[key][cid] = d === null || d === true ? null : minutesOf(d, `${xw} › ${cid}`, c, 60);
              continue;
            }
            const spec = {};
            if (isObj(x)) {
              const rounds = x.rounds ?? x.for;
              if (rounds !== undefined) {
                const r = c.expr(rounds, `${xw} › rounds`);
                if (r !== undefined)
                  spec.rounds = r;
              }
              if (x.chance !== undefined) {
                const ch = c.expr(x.chance, `${xw} › chance`);
                if (ch !== undefined)
                  spec.chance = ch;
              }
            } else if (x !== true && x !== null) {
              const r = c.expr(x, xw);
              if (r !== undefined)
                spec.rounds = r;
            }
            e.inflict[key] = spec;
          }
        break;
      case "cleanse":
        e.cleanse.push(...list(v));
        break;
      case "hits":
      case "pierce": {
        if (known.stats.has(k)) {
          const x = c.expr(v, w);
          if (x !== undefined)
            e.stats[k] = x;
          break;
        }
        const x = v === true || v === "all" ? 999 : c.expr(diceExpr(v), w);
        if (x !== undefined) {
          if (k === "hits")
            e.hits = x;
          else
            e.pierce = x;
        }
        break;
      }
      case "quest":
      case "quests":
        if (typeof v === "string")
          e.quest[v] = "start";
        else if (Array.isArray(v))
          for (const id of v)
            e.quest[String(id)] = "start";
        else if (isObj(v))
          for (const [id, op] of Object.entries(v)) {
            const o = QUEST_OPS[String(op).toLowerCase()];
            if (o)
              e.quest[id] = o;
            else
              c.warn(`${w} › ${id}`, `"${op}" isn't a quest step (start, done, fail, drop, report)`);
          }
        break;
      case "progress":
        if (known.stats.has(k)) {
          const x = c.expr(v, w);
          if (x !== undefined)
            e.stats[k] = x;
          break;
        }
        if (typeof v === "string")
          e.progress[v] = 1;
        else if (isObj(v))
          for (const [id, n] of Object.entries(v)) {
            const x = c.expr(n, `${w} › ${id}`);
            if (x !== undefined)
              e.progress[id] = x;
          }
        break;
      case "remember":
      case "memory":
        if (isObj(v))
          for (const [who, text] of Object.entries(v)) {
            if (typeof text === "string" && text.trim())
              e.remember[who] = text.trim();
          }
        else
          c.warn(w, 'expected who remembers what, like `mia: "{{user}} burned her breakfast"`');
        break;
      default:
        if (known.stats.has(k)) {
          const x = c.expr(v, w);
          if (x !== undefined)
            e.stats[k] = x;
        } else
          c.warn(w, `"${k}" isn't a stat or a known effect (stats, set, flags, give, take, rel, move, time, add_condition, remove_condition, hint, decide, foe, end, start_encounter, reveal, momentum, harm, hits, pierce, inflict, cleanse, quest, progress, remember)`);
    }
  }
  return e;
}
function critOf(v, where, c, off) {
  if (v === undefined || v === null)
    return {};
  if (off) {
    c.warn(where, "`crits: false` turns critical results off, so `crit:` does nothing");
    return {};
  }
  if (typeof v === "string" && percentOf(v) !== null)
    return { crit: percentOf(v) * 100 };
  const x = c.expr(v, where);
  if (typeof x === "number" && (x < 0 || x > 100)) {
    c.warn(where, `crit is a chance in percent (0–100), not ${x} — using ${Math.max(0, Math.min(100, x))}`);
    return { crit: Math.max(0, Math.min(100, x)) };
  }
  return x === undefined ? {} : { crit: x };
}
function normCheck(raw, where, c) {
  if (!isObj(raw)) {
    c.warn(where, "check should be a map, e.g. `chance: 40 + athletics / 10`");
    return;
  }
  let style;
  if (raw.chance !== undefined || raw.under !== undefined)
    style = "chance";
  else if (raw.style === "pbta" || raw.bands === "pbta" || raw.pbta !== undefined)
    style = "pbta";
  else if (raw.vs !== undefined || raw.dc !== undefined)
    style = "vs";
  else {
    c.err(where, "a check needs `chance:` (percent), `vs:` (difficulty) or `style: pbta`");
    return;
  }
  const dice = String(raw.dice ?? raw.roll ?? (style === "chance" ? "d100" : style === "pbta" ? "2d6" : "d20"));
  try {
    parseDice(dice);
  } catch (e) {
    c.err(`${where} › dice`, e instanceof DiceError ? e.message : "bad dice");
    return;
  }
  const target = c.expr(style === "chance" ? raw.chance ?? raw.under : raw.vs ?? raw.dc, `${where} › ${style === "chance" ? "chance" : "vs"}`);
  const add = c.expr(raw.add ?? raw.bonus ?? raw.mod ?? (style === "pbta" ? raw.pbta : undefined), `${where} › add`);
  for (const k of ["game", "games", "minigame"])
    if (raw[k] !== undefined)
      c.removed(`${where} › ${k}`, k, "minigames");
  return {
    style,
    dice,
    target,
    add,
    partialMargin: c.num(raw.partial ?? raw.partial_margin, `${where} › partial`, 0),
    label: typeof raw.label === "string" ? raw.label : typeof raw.skill === "string" ? raw.skill : undefined,
    crits: raw.crits !== false,
    ...critOf(raw.crit ?? raw.crit_chance, `${where} › crit`, c, raw.crits === false)
  };
}
var TIER_KEYS = {
  crit_success: "crit_success",
  critical_success: "crit_success",
  crit: "crit_success",
  success: "success",
  pass: "success",
  partial: "partial",
  mixed: "partial",
  fail: "fail",
  failure: "fail",
  miss: "fail",
  crit_fail: "crit_fail",
  critical_fail: "crit_fail",
  fumble: "crit_fail"
};
var ACTION_KEYS = new Set([
  "label",
  "say",
  "desc",
  "description",
  "group",
  "at",
  "when",
  "hidden",
  "why_not",
  "locked",
  "time",
  "cost",
  "costs",
  "check",
  "outcomes",
  "effects",
  "effect",
  "params",
  "tags",
  "order",
  "per_person",
  "with",
  "targets",
  "requires",
  "needs",
  "show_locked",
  "per_day",
  "per_encounter",
  "gamble",
  "errand"
]);
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1;i <= a.length; i++) {
    const cur = [i];
    for (let j = 1;j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function warnUnknownKeys(raw, keys, where, c) {
  for (const k of Object.keys(raw)) {
    if (keys.has(k) || TIER_KEYS[k])
      continue;
    const near = [...keys, ...Object.keys(TIER_KEYS)].find((x) => editDistance(x, k.toLowerCase()) <= (k.length > 4 ? 2 : 1));
    c.warn(`${where} › ${k}`, `"${k}" isn't something this block reads, so it does nothing${near ? ` — did you mean "${near}"?` : ""} (it reads ${[...keys].slice(0, 12).join(", ")}…)`);
  }
}
function normAction(id, raw, where, c, known, order) {
  if (typeof raw === "string")
    raw = { label: raw };
  if (!isObj(raw)) {
    c.warn(where, "expected an action definition");
    return null;
  }
  const params = [];
  if (isObj(raw.params)) {
    for (const [pid, p] of Object.entries(raw.params)) {
      const pw = `${where} › params › ${pid}`;
      const opts = isObj(p) && isObj(p.options) ? p.options : isObj(p) ? p : null;
      if (!opts) {
        c.warn(pw, "params need options, e.g. `{ easy: 8, hard: 16 }`");
        continue;
      }
      const options = {};
      for (const [o, v] of Object.entries(opts))
        if (o !== "default" && o !== "label")
          options[o] = c.num(v, `${pw} › ${o}`, 0);
      const keys = Object.keys(options);
      if (!keys.length)
        continue;
      const def = isObj(p) && typeof p.default === "string" && keys.includes(p.default) ? p.default : keys[Math.floor(keys.length / 2)];
      params.push({ id: pid, label: isObj(p) && typeof p.label === "string" ? p.label : titleCase(pid), options, default: def });
    }
  }
  const outcomes = {};
  for (const [k, v] of Object.entries(raw)) {
    const tier = TIER_KEYS[k];
    if (tier)
      outcomes[tier] = normEffect(v, `${where} › ${k}`, c, known);
  }
  if (isObj(raw.outcomes))
    for (const [k, v] of Object.entries(raw.outcomes)) {
      const tier = TIER_KEYS[k];
      if (tier)
        outcomes[tier] = normEffect(v, `${where} › outcomes › ${k}`, c, known);
      else
        c.warn(`${where} › outcomes › ${k}`, "outcomes are crit_success, success, partial, fail, crit_fail");
    }
  const check = raw.check !== undefined ? normCheck(raw.check, `${where} › check`, c) : undefined;
  if (!check && Object.keys(outcomes).length)
    c.warn(where, "has outcomes but no check — put always-on changes under `effects:`");
  if (raw.gamble !== undefined)
    c.removed(`${where} › gamble`, "gamble", "gambling tables");
  if (raw.errand !== undefined)
    c.removed(`${where} › errand`, "errand", "the errands window");
  warnUnknownKeys(raw, ACTION_KEYS, where, c);
  const at = raw.at === undefined ? [] : Array.isArray(raw.at) ? raw.at.map(String) : [String(raw.at)];
  const own = raw.when !== undefined ? c.expr(raw.when, `${where} › when`) : undefined;
  const requires = normRequires(raw.requires ?? raw.needs, `${where} › requires`, c, known);
  const parts = [...own !== undefined ? [String(own)] : [], ...requires.map((q) => q.when)];
  const when = parts.length > 1 ? parts.map((p) => `(${p})`).join(" and ") : parts[0];
  return {
    id,
    label: typeof raw.label === "string" ? raw.label : titleCase(id),
    say: typeof raw.say === "string" ? raw.say : undefined,
    desc: typeof raw.desc === "string" ? raw.desc : typeof raw.description === "string" ? raw.description : undefined,
    group: typeof raw.group === "string" ? raw.group : undefined,
    at,
    when: when === undefined ? undefined : String(when),
    hidden: raw.hidden === true,
    ...typeof raw.why_not === "string" ? { whyNot: raw.why_not } : typeof raw.locked === "string" ? { whyNot: raw.locked } : {},
    time: raw.time !== undefined ? c.num(raw.time, `${where} › time`, 0) : undefined,
    cost: normEffect(raw.cost ?? raw.costs, `${where} › cost`, c, known),
    check,
    outcomes,
    effects: normEffect(raw.effects ?? raw.effect, `${where} › effects`, c, known),
    params,
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).toLowerCase()) : [],
    order: typeof raw.order === "number" ? raw.order : order,
    perPerson: raw.per_person === true || raw.with === "person" || raw.with === "people" || raw.targets !== undefined,
    ...raw.targets !== undefined ? { targets: list(raw.targets) } : {},
    requires,
    showLocked: raw.show_locked === true || raw.show_locked !== false && requires.length > 0
  };
}
function normRequires(raw, where, c, known) {
  const out = [];
  if (raw === undefined || raw === null)
    return out;
  const formula = (f, text, w) => {
    const x = c.expr(f, w);
    if (x !== undefined)
      out.push({ when: String(x), kind: "formula", ...text ? { text } : {} });
  };
  if (typeof raw === "string") {
    formula(raw, undefined, where);
    return out;
  }
  if (Array.isArray(raw)) {
    raw.forEach((x, i) => {
      if (isObj(x) && x.when !== undefined)
        formula(x.when, typeof x.text === "string" ? x.text : undefined, `${where} #${i + 1}`);
      else if (isObj(x))
        out.push(...normRequires(x, `${where} #${i + 1}`, c, known));
      else
        formula(x, undefined, `${where} #${i + 1}`);
    });
    return out;
  }
  if (!isObj(raw)) {
    c.warn(where, "expected requirements like `{ lockpicking: 30, with: brann, has: crowbar }`");
    return out;
  }
  const q = (s) => s.replace(/'/g, "");
  for (const [k, v] of Object.entries(raw)) {
    const w = `${where} › ${k}`;
    if (known.stats.has(k)) {
      const n = c.num(v, w, 0);
      out.push({ when: `${k} >= ${n}`, kind: "stat", id: k, n });
      continue;
    }
    switch (k) {
      case "with":
      case "present":
      case "companion":
        for (const p of list(v))
          out.push({ when: `present('${q(p)}')`, kind: "with", id: p });
        break;
      case "has":
      case "item":
      case "items":
        if (isObj(v))
          for (const [it, n] of Object.entries(v)) {
            const m = c.num(n, `${w} › ${it}`, 1);
            out.push({ when: `has('${q(it)}', ${m})`, kind: "has", id: it, n: m });
          }
        else
          for (const it of list(v))
            out.push({ when: `has('${q(it)}')`, kind: "has", id: it, n: 1 });
        break;
      case "rel":
        if (isObj(v))
          for (const [who, m] of Object.entries(v)) {
            if (!isObj(m)) {
              c.warn(`${w} › ${who}`, "expected `trust: 40`");
              continue;
            }
            for (const [stat, n] of Object.entries(m)) {
              const x = c.num(n, `${w} › ${who} › ${stat}`, 0);
              out.push({ when: `rel('${q(who)}', '${q(stat)}') >= ${x}`, kind: "rel", id: who, stat, n: x });
            }
          }
        break;
      case "quest":
      case "quests":
        if (isObj(v))
          for (const [id, st] of Object.entries(v))
            out.push({ when: `quest('${q(id)}') == '${q(String(st))}'`, kind: "quest", id, state: String(st) });
        else
          for (const id of list(v))
            out.push({ when: `quest('${q(id)}') == 'active'`, kind: "quest", id, state: "active" });
        break;
      case "flag":
      case "flags":
        if (isObj(v))
          for (const [f, val] of Object.entries(v))
            out.push({ when: val === false ? `not flag('${q(f)}')` : `flag('${q(f)}')`, kind: "flag", id: f, state: val === false ? "off" : "on" });
        else
          for (const f of list(v))
            out.push({ when: `flag('${q(f)}')`, kind: "flag", id: f, state: "on" });
        break;
      case "perk":
      case "perks":
        c.removed(w, k, "perks");
        break;
      case "when":
      case "formula":
        if (isObj(v))
          for (const [f, text] of Object.entries(v))
            formula(f, typeof text === "string" ? text : undefined, w);
        else
          formula(v, undefined, w);
        break;
      default:
        c.warn(w, `"${k}" isn't a stat or a requirement (with, has, rel, quest, flag, when)`);
    }
  }
  return out;
}
var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function parseDate(v) {
  if (isObj(v)) {
    const m = Number(v.month), d = Number(v.day);
    return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { month: m, day: d } : null;
  }
  if (typeof v !== "string")
    return null;
  const s = v.trim().toLowerCase();
  const a = /^([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?$/.exec(s);
  const b = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,})\.?$/.exec(s);
  const name = a?.[1] ?? b?.[2];
  const day = Number(a?.[2] ?? b?.[1]);
  const month = name ? MONTHS.indexOf(name.slice(0, 3)) + 1 : 0;
  return month >= 1 && day >= 1 && day <= 31 ? { month, day } : null;
}
var USE_KEYS = new Set(["label", "say", "desc", "description", "when", "time", "tags", "check", "params", "why_not", "locked", "group", "cost", "effects", "effect", "outcomes", "per_person", "hidden", "at", "order", "success", "fail", "partial", "crit_success", "crit_fail", "critical_success", "critical_fail", "failure", "requires", "needs", "show_locked", "gamble"]);
function applyItemUse(it, r, w, c, known, drafted) {
  if (r.keep === true)
    it.keep = true;
  if (isObj(r.bonus)) {
    for (const [stat, v] of Object.entries(r.bonus)) {
      if (!known.stats.has(stat)) {
        c.warn(`${w} › bonus › ${stat}`, `"${stat}" isn't a declared stat`);
        continue;
      }
      it.bonus[stat] = amount(v, `${w} › bonus › ${stat}`, c);
    }
  }
  const u = r.use;
  if (u !== undefined && u !== false) {
    const raw = isObj(u) ? u : typeof u === "string" ? { hint: u } : {};
    const action = {};
    const rest = {};
    for (const [k, v] of Object.entries(raw))
      (USE_KEYS.has(k) || TIER_KEYS[k] ? action : rest)[k] = v;
    if (Object.keys(rest).length && !action.effects && !action.check)
      action.effects = rest;
    const has = `has('${it.id}')`;
    action.when = action.when !== undefined ? `(${String(action.when)}) and ${has}` : has;
    if (!action.label)
      action.label = `Use the ${it.name}`;
    const def = normAction(`item:${it.id}`, action, `${w} › use`, c, known, 0);
    if (def) {
      def.tags = [...new Set([...def.tags, "item"])];
      it.use = def;
    }
  }
  if (drafted && (it.use || Object.keys(it.bonus).length))
    it.drafted = true;
}
function condTiming(r, w, c, known) {
  const everyList = (Array.isArray(r.every) ? r.every.map(String) : String(r.every ?? "round").split(/[\s,+&]+|\band\b/)).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const every = everyList.includes("both") || everyList.includes("round") && everyList.includes("hour") ? "both" : everyList.length === 1 ? everyList[0] : "?";
  if (!["round", "turn", "hour", "both"].includes(every))
    c.warn(`${w} › every`, `"${everyList.join(", ")}" — use round, turn, hour, or [round, hour] (each round in a fight, each hour outside); using round`);
  if (every === "both" && r.rounds !== undefined)
    c.warn(`${w} › rounds`, "a status that ticks [round, hour] lasts by `lasts:` (minutes) in and out of fights; `rounds:` is ignored");
  const dotRaw = r.dot ?? r.per_round ?? r.damage;
  const dot = dotRaw !== undefined ? c.expr(diceExpr(dotRaw), `${w} › dot`) : undefined;
  const heal = r.heal !== undefined ? c.expr(diceExpr(r.heal), `${w} › heal`) : undefined;
  const skipRaw = r.skip ?? r.stun ?? r.lose_turn;
  const skip = skipRaw === true ? 100 : skipRaw !== undefined && skipRaw !== false ? c.expr(skipRaw, `${w} › skip`) : undefined;
  const lastsRaw = r.lasts ?? r.minutes ?? r.duration;
  return {
    ...r.rounds !== undefined && every !== "both" ? { rounds: Math.max(1, Math.round(c.num(r.rounds, `${w} › rounds`, 1))) } : {},
    ...lastsRaw !== undefined ? { lasts: Math.max(1, minutesOf(lastsRaw, `${w} › lasts`, c, 60)) } : {},
    ...dot !== undefined ? { dot } : heal !== undefined ? { dot: typeof heal === "number" ? -heal : `-(${heal})` } : {},
    ...typeof r.stat === "string" ? { stat: r.stat } : {},
    every: every === "turn" ? "turn" : every === "hour" ? "hour" : every === "both" ? "both" : "round",
    ...skip !== undefined ? { skip } : {},
    armor: armorMap(r.armor, `${w} › armor`, c),
    tick: normEffect(r.tick ?? r.each, `${w} › tick`, c, known)
  };
}
function statAmounts(v, where, c, known) {
  const out = {};
  if (!isObj(v))
    return out;
  for (const [stat, n] of Object.entries(v)) {
    if (!known.stats.has(stat)) {
      c.warn(`${where} › ${stat}`, `"${stat}" isn't a declared stat`);
      continue;
    }
    out[stat] = amount(n, `${where} › ${stat}`, c);
  }
  return out;
}
function groupOf(v, where, c) {
  if (v === undefined || v === null)
    return {};
  if (typeof v === "string" && v.trim())
    return { group: v.trim() };
  c.warn(where, "expected a heading, like `group: Combat`");
  return {};
}
function normEncounter(id, raw, c, known, statDefs) {
  const w = `Encounters › ${id}`;
  if (!isObj(raw)) {
    c.warn(w, "expected an encounter definition");
    return null;
  }
  const foeRaw = isObj(raw.foe) ? raw.foe : {};
  const stats = [];
  for (const [sid, s] of Object.entries(isObj(foeRaw.stats) ? foeRaw.stats : {})) {
    const r = isObj(s) ? s : { start: s };
    const startExpr = foeFormula(r.start, `${w} › foe › ${sid}`, c);
    const maxExpr = foeFormula(r.max, `${w} › foe › ${sid} › max`, c);
    const start = startExpr !== undefined || isFormulaText(r.start) ? 10 : c.num(r.start, `${w} › foe › ${sid}`, 10);
    const goodRaw = String(r.good ?? "low").toLowerCase();
    stats.push({
      id: sid,
      label: typeof r.label === "string" ? r.label : titleCase(sid),
      start,
      max: maxExpr !== undefined || isFormulaText(r.max) ? Math.max(start, 1) : c.num(r.max, `${w} › foe › ${sid} › max`, Math.max(start, 1)),
      good: goodRaw === "high" ? "high" : goodRaw === "none" ? "none" : "low",
      ...startExpr !== undefined ? { startExpr } : {},
      ...maxExpr !== undefined ? { maxExpr } : startExpr !== undefined && (r.max === undefined || r.max === null || r.max === "") ? { maxFromStart: true } : {}
    });
  }
  const actions = {};
  const actionOrder = [];
  let i = 0;
  for (const [aid, a] of Object.entries(isObj(raw.actions) ? raw.actions : {})) {
    const def = normAction(aid, a, `${w} › actions › ${aid}`, c, known, i++);
    if (def && isObj(a)) {
      for (const [key, field] of [["per_encounter", "perEncounter"], ["per_day", "perDay"]]) {
        if (a[key] === undefined)
          continue;
        const n = Number(a[key]);
        if (Number.isFinite(n) && n >= 1)
          def[field] = Math.round(n);
        else if (n !== 0)
          c.warn(`${w} › actions › ${aid} › ${key}`, `should be a whole number of uses, 1 or more (got ${JSON.stringify(a[key])}) — unlimited`);
      }
    }
    if (def) {
      actions[aid] = def;
      actionOrder.push(aid);
    }
  }
  if (!actionOrder.length)
    c.warn(w, "has no player `actions:` — the player can't do anything during it");
  let foeMoves = null;
  const movesRaw = raw.foe_moves ?? raw.moves;
  if (isObj(movesRaw)) {
    const specs = normDecide({ ask: typeof raw.foe_ask === "string" ? raw.foe_ask : `What does ${typeof foeRaw.name === "string" ? foeRaw.name : "the opponent"} do next?`, options: movesRaw }, `${w} › foe_moves`, c, known, 1);
    foeMoves = specs[0] ? { ...specs[0], id: `enc_${id}_foe` } : null;
  }
  const endWhen = [];
  for (const [outcome, when] of Object.entries(isObj(raw.end_when) ? raw.end_when : {})) {
    const x = c.expr(when, `${w} › end_when › ${outcome}`);
    if (x !== undefined)
      endWhen.push({ outcome, when: String(x) });
  }
  const outcomes = {};
  for (const [o, e] of Object.entries(isObj(raw.outcomes) ? raw.outcomes : {}))
    outcomes[o] = normEffect(e, `${w} › outcomes › ${o}`, c, known);
  const startRaw = raw.start ?? (typeof raw.start_hint === "string" ? { hint: raw.start_hint } : undefined);
  let momentum = null;
  if (raw.momentum !== undefined && raw.momentum !== false) {
    const m = isObj(raw.momentum) ? raw.momentum : {};
    const swing = { crit_success: 40, success: 25, partial: 10, fail: -20, crit_fail: -35 };
    if (isObj(m.swing))
      for (const [k, v] of Object.entries(m.swing)) {
        const tier = TIER_KEYS[k];
        if (tier)
          swing[tier] = c.num(v, `${w} › momentum › swing › ${k}`, swing[tier]);
        else
          c.warn(`${w} › momentum › swing › ${k}`, "tiers are crit_success, success, partial, fail, crit_fail");
      }
    const win = typeof m.win === "string" ? m.win : "won";
    const lose = typeof m.lose === "string" ? m.lose : "lost";
    momentum = { win, lose, start: Math.max(-99, Math.min(99, c.num(m.start, `${w} › momentum › start`, 0))), swing };
  }
  const def = {
    id,
    name: typeof raw.name === "string" ? raw.name : titleCase(id),
    desc: typeof raw.desc === "string" ? raw.desc : undefined,
    tags: list(raw.tags).map((t) => t.toLowerCase()),
    foe: { name: typeof foeRaw.name === "string" ? foeRaw.name : "Opponent", stats, armor: foeArmor(foeRaw, stats, w, c) },
    actions,
    actionOrder,
    foeMoves,
    endWhen,
    outcomes,
    roundLimit: Math.max(1, Math.min(200, Math.round(c.num(raw.round_limit ?? raw.max_rounds, `${w} › round_limit`, 20)))),
    timeoutOutcome: typeof raw.timeout_outcome === "string" && raw.timeout_outcome.trim() ? raw.timeout_outcome.trim() : momentum?.lose ?? "lost",
    start: normEffect(startRaw, `${w} › start`, c, known),
    momentum,
    fromStory: raw.from_story !== false,
    narrate: raw.narrate === true || raw.narrate === "rounds",
    ...typeof raw.goal === "string" ? { goal: raw.goal } : {},
    ...typeof raw.danger === "string" ? { danger: raw.danger } : {},
    labels: Object.fromEntries(Object.entries(isObj(raw.labels) ? raw.labels : {}).filter(([, v]) => typeof v === "string"))
  };
  const authored = normOutcomeKinds(raw, def, w, c);
  Object.defineProperty(def, "outcomeKinds", { value: classifyOutcomes(def, statDefs, authored), enumerable: false, writable: true, configurable: true });
  if (Object.keys(authored).length)
    def.authoredKinds = authored;
  if (raw.sim !== undefined)
    c.removed(`${w} › sim`, "sim", "the encounter simulator");
  return def;
}
function normOutcomeKinds(raw, enc, w, c) {
  const out = {};
  const known = new Set(encounterOutcomeIds(enc));
  const check = (id, where) => {
    if (!known.has(id))
      c.warn(where, `"${id}" isn't one of this encounter's endings (${[...known].join(", ")})`);
  };
  if (raw.losses !== undefined) {
    if (!Array.isArray(raw.losses) && typeof raw.losses !== "string")
      c.warn(`${w} › losses`, "expected a list of ending ids, like [beaten, captured]");
    else
      for (const id of list(raw.losses)) {
        check(id, `${w} › losses`);
        out[id] = "lost";
      }
  }
  const kindsRaw = raw.outcome_kinds;
  if (kindsRaw !== undefined) {
    if (!isObj(kindsRaw))
      c.warn(`${w} › outcome_kinds`, "expected a map of ending id → won, escaped, conceded or lost");
    else
      for (const [id, v] of Object.entries(kindsRaw)) {
        const kind = parseOutcomeKind(v);
        if (!kind) {
          c.warn(`${w} › outcome_kinds › ${id}`, `"${String(v)}" — use won, escaped, conceded or lost`);
          continue;
        }
        check(id, `${w} › outcome_kinds`);
        if (out[id] && out[id] !== kind)
          c.warn(`${w} › outcome_kinds › ${id}`, `also listed in losses: — using ${kind}`);
        out[id] = kind;
      }
  }
  return out;
}
function isFormulaText(v) {
  return typeof v === "string" && !!v.trim() && !Number.isFinite(Number(v));
}
function foeFormula(v, where, c) {
  if (!isFormulaText(v))
    return;
  if (percentOf(v) !== null) {
    c.warn(where, `"${v}" — a foe's start or max can't be a percentage; use a number or a formula like "100 * level"`);
    return;
  }
  const x = c.expr(v, where);
  return typeof x === "string" ? x : undefined;
}
function foeArmor(foeRaw, stats, w, c) {
  const armor = armorMap(foeRaw.armor ?? foeRaw.defense, `${w} › foe › armor`, c);
  for (const k of Object.keys(armor)) {
    if (k !== "_" && !stats.some((x) => x.id === k)) {
      c.warn(`${w} › foe › armor`, `"${k}" isn't one of the foe's stats`);
      delete armor[k];
    }
  }
  return armor;
}
var QUEST_META = new Set(["from_story", "story", "story_max", "max_story"]);
function normQuests(raw, c, known, ids) {
  const quests = {};
  const order = [];
  const r = isObj(raw) ? raw : {};
  if (raw !== undefined && !isObj(raw))
    c.warn("Quests", "should be a map of quest ids to quests");
  const storyRaw = r.from_story ?? r.story;
  const story = { enabled: storyRaw !== false, max: Math.max(0, Math.round(c.num(r.story_max ?? r.max_story, "Quests › story_max", 3))) };
  let n = 0;
  for (const [id, qRaw] of Object.entries(r)) {
    if (QUEST_META.has(id))
      continue;
    const w = `Quests › ${id}`;
    if (!isObj(qRaw)) {
      c.warn(w, "expected a quest (name, goals, reward…)");
      continue;
    }
    const q = qRaw;
    const goals = [];
    const goalList = Array.isArray(q.goals ?? q.objectives) ? (q.goals ?? q.objectives).map((g, i) => [isObj(g) && typeof g.id === "string" ? g.id : `goal_${i + 1}`, g]) : isObj(q.goals ?? q.objectives) ? Object.entries(q.goals ?? q.objectives) : [];
    for (const [gid, g] of goalList) {
      const gw = `${w} › goals › ${gid}`;
      const gr = isObj(g) ? g : { text: String(g) };
      const when = gr.when !== undefined ? c.expr(gr.when, `${gw} › when`) : undefined;
      const count = gr.count !== undefined ? Math.max(1, Math.round(c.num(gr.count, `${gw} › count`, 1))) : undefined;
      let on;
      if (gr.on !== undefined) {
        const o = isObj(gr.on) ? gr.on : { id: gr.on };
        const id = String(o.encounter ?? o.action ?? o.id ?? "");
        const kind = o.encounter !== undefined ? "encounter" : o.action !== undefined ? "action" : ids.encounters.has(id) ? "encounter" : "action";
        if (kind === "encounter" ? !ids.encounters.has(id) : !ids.actions.has(id))
          c.warn(`${gw} › on`, `"${id}" isn't ${kind === "encounter" ? "an encounter" : "an action or encounter"}`);
        else
          on = { kind, id, outcomes: list(o.outcome ?? o.outcomes ?? o.tier ?? o.tiers) };
      }
      goals.push({
        id: gid,
        text: typeof gr.text === "string" ? gr.text : typeof gr.label === "string" ? gr.label : titleCase(gid),
        ...when !== undefined ? { when: String(when) } : {},
        ...when === undefined ? { count: count ?? 1 } : count !== undefined ? { count } : {},
        optional: gr.optional === true,
        ...on ? { on } : {}
      });
    }
    const judgeRaw = q.judge ?? q.judged;
    const judge = typeof judgeRaw === "string" ? { done: judgeRaw } : isObj(judgeRaw) ? { ...typeof judgeRaw.done === "string" ? { done: judgeRaw.done } : {}, ...typeof judgeRaw.fail === "string" ? { fail: judgeRaw.fail } : {} } : {};
    const succeed = q.succeed ?? q.done_when ?? q.complete_when;
    const fail = q.fail ?? q.fail_when;
    const when = q.when !== undefined ? c.expr(q.when, `${w} › when`) : undefined;
    const succeedX = succeed !== undefined ? c.expr(succeed, `${w} › succeed`) : undefined;
    const failX = fail !== undefined ? c.expr(fail, `${w} › fail`) : undefined;
    const giver = typeof q.giver === "string" ? q.giver : typeof q.from === "string" ? q.from : undefined;
    const rem = q.remember;
    const remember = rem === false ? false : isObj(rem) ? { ...typeof rem.done === "string" ? { done: rem.done } : {}, ...typeof rem.failed === "string" ? { failed: rem.failed } : typeof rem.fail === "string" ? { failed: rem.fail } : {} } : {};
    const repeat = q.repeat === true ? 0 : q.repeat === undefined || q.repeat === false ? null : Math.max(0, c.num(q.repeat, `${w} › repeat`, 0));
    if (!goals.length && succeedX === undefined && !judge.done)
      c.warn(w, "has no goals, `succeed:` or `judge:` — only a `quest: { " + id + ": done }` effect can finish it");
    quests[id] = {
      id,
      name: typeof q.name === "string" ? q.name : titleCase(id),
      ...typeof q.desc === "string" ? { desc: q.desc } : {},
      kind: typeof q.kind === "string" ? q.kind.toLowerCase() : giver ? "favour" : "quest",
      ...giver ? { giver } : {},
      board: q.board === true,
      at: list(q.at),
      ...when !== undefined ? { when: String(when) } : {},
      auto: q.auto === true,
      goals,
      ...succeedX !== undefined ? { succeed: String(succeedX) } : {},
      ...failX !== undefined ? { fail: String(failX) } : {},
      judge,
      days: Math.max(0, c.num(q.days ?? q.deadline, `${w} › days`, 0)),
      report: q.report === undefined ? !!giver || q.board === true : q.report === true,
      start: normEffect(q.start ?? q.on_start, `${w} › start`, c, known),
      reward: normEffect(q.reward ?? q.rewards ?? q.success, `${w} › reward`, c, known),
      failure: normEffect(q.failure ?? q.on_fail ?? q.penalty, `${w} › failure`, c, known),
      remember,
      repeat,
      hidden: q.hidden === true,
      ...typeof q.stakes === "string" ? { stakes: q.stakes } : {},
      order: n++
    };
    order.push(id);
  }
  return { quests, order, story };
}
function normSecrets(raw, c) {
  const out = {};
  if (raw === undefined)
    return out;
  if (!isObj(raw)) {
    c.warn("Secrets", "should be a map of secret names to definitions");
    return out;
  }
  for (const [id, sRaw] of Object.entries(raw)) {
    const w = `Secrets › ${id}`;
    const r = isObj(sRaw) ? sRaw : typeof sRaw === "string" ? { stages: [sRaw] } : {};
    const stages = [];
    if (typeof r.cue === "string")
      stages.push({ text: r.cue, lore: [] });
    const stageList = Array.isArray(r.stages) ? r.stages : typeof r.text === "string" ? [{ text: r.text, when: r.when, lore: r.lore }] : [];
    stageList.forEach((st, i) => {
      const sw = `${w} › stage ${i + 1}`;
      const sr = isObj(st) ? st : typeof st === "string" ? { text: st } : {};
      if (typeof sr.text !== "string" || !sr.text.trim()) {
        c.warn(sw, "each stage needs `text:`");
        return;
      }
      const when = sr.when !== undefined ? c.expr(sr.when, `${sw} › when`) : undefined;
      stages.push({ text: sr.text, lore: list(sr.lore), ...when !== undefined ? { when: String(when) } : {} });
    });
    if (!stages.length) {
      c.warn(w, "has no stages — add `cue:` and/or `stages:`");
      continue;
    }
    const tell = r.tell === true || r.tell === "exists" ? "exists" : "none";
    out[id] = { id, about: typeof r.about === "string" ? r.about : titleCase(id), tell, stages };
  }
  return out;
}
function normLiveChoices(raw, c, known) {
  const def = { enabled: false, label: "Right now", count: 3, tags: {} };
  if (raw === undefined || raw === false)
    return def;
  if (!isObj(raw)) {
    c.warn("Live choices", "should be a map with `tags:`");
    return def;
  }
  def.label = typeof raw.label === "string" ? raw.label : def.label;
  def.count = Math.max(1, Math.min(6, Math.round(c.num(raw.count, "Live choices › count", def.count))));
  if (raw.when !== undefined) {
    const x = c.expr(raw.when, "Live choices › when");
    if (x !== undefined)
      def.when = String(x);
  }
  if (typeof raw.guide === "string")
    def.guide = raw.guide;
  let i = 0;
  for (const [id, t] of Object.entries(isObj(raw.tags) ? raw.tags : {})) {
    const a = normAction(id, typeof t === "string" ? { desc: t } : t, `Live choices › tags › ${id}`, c, known, i++);
    if (!a)
      continue;
    if (!a.desc)
      c.warn(`Live choices › tags › ${id}`, "add `desc:` — it tells the writer when to use this tag");
    def.tags[id] = a;
  }
  def.enabled = Object.keys(def.tags).length > 0;
  if (!def.enabled)
    c.warn("Live choices", "has no tags — add some under `tags:`");
  return def;
}
function normImprovise(raw, c, known, stats, order) {
  const usable = order.filter((id) => stats[id].kind === "skill" || stats[id].kind === "attribute");
  const def = { enabled: true, dc: { easy: 8, fair: 12, hard: 16, extreme: 20 }, bonus: 10, partial: 3, stats: usable, outcomes: {} };
  if (raw === undefined || raw === true)
    return def;
  if (raw === false)
    return { ...def, enabled: false };
  if (!isObj(raw)) {
    c.warn("Improvise", "expected `improvise: false` or a map of settings");
    return def;
  }
  if (raw.enabled === false)
    def.enabled = false;
  if (isObj(raw.dc)) {
    for (const d of DIFFICULTIES)
      if (raw.dc[d] !== undefined)
        def.dc[d] = c.num(raw.dc[d], `Improvise › dc › ${d}`, def.dc[d]);
  }
  def.bonus = c.num(raw.bonus, "Improvise › bonus", 10);
  def.partial = Math.max(0, c.num(raw.partial, "Improvise › partial", 3));
  if (raw.stats !== undefined) {
    const want = list(raw.stats);
    for (const id of want)
      if (!stats[id])
        c.warn("Improvise › stats", `"${id}" isn't a stat`);
    def.stats = want.filter((id) => stats[id]);
  }
  if (raw.time !== undefined)
    def.time = Math.max(0, c.num(raw.time, "Improvise › time", 10));
  if (isObj(raw.outcomes))
    for (const [k, v] of Object.entries(raw.outcomes)) {
      const tier = TIER_KEYS[k];
      if (tier)
        def.outcomes[tier] = normEffect(v, `Improvise › outcomes › ${k}`, c, known);
      else
        c.warn(`Improvise › outcomes › ${k}`, "tiers are crit_success, success, partial, fail, crit_fail");
    }
  return def;
}
function normGrowth(raw, c) {
  const def = { enabled: true, rate: 1, attributes: 0.5, train: true, repeat: { ...DEFAULT_PRACTICE_REPEAT } };
  if (raw === undefined || raw === true)
    return def;
  if (raw === false)
    return { ...def, enabled: false };
  if (typeof raw === "number")
    return { ...def, rate: Math.max(0, raw), enabled: raw > 0 };
  if (!isObj(raw)) {
    c.warn("Growth", "expected `growth: false`, a speed, or a map of settings");
    return def;
  }
  if (raw.enabled === false)
    def.enabled = false;
  def.rate = Math.max(0, c.num(raw.rate, "Growth › rate", 1));
  def.attributes = Math.max(0, c.num(raw.attributes, "Growth › attributes", 0.5));
  def.train = raw.train !== false;
  if (raw.repeat !== undefined)
    def.repeat = normPracticeRepeat(raw.repeat, c);
  return def;
}
function tuned(c, v, where, fallback, lo, hi, hint = "") {
  if (v === undefined)
    return fallback;
  const n = c.num(v, where, fallback);
  if (n < lo || n > hi) {
    const x = Math.max(lo, Math.min(hi, n));
    c.warn(where, `${n} is outside ${lo}–${hi}${hint ? ` (${hint})` : ""} — using ${x}`);
    return x;
  }
  return n;
}
function normPracticeRepeat(raw, c) {
  const def = { ...DEFAULT_PRACTICE_REPEAT };
  if (raw === false)
    return false;
  if (raw === true || raw === null)
    return def;
  if (!isObj(raw)) {
    c.warn("Growth › repeat", "expected `repeat: false` or a map like `{ step: 0.5, floor: 0.1, recover_minutes: 120, recover_turns: 8 }`");
    return def;
  }
  if (raw.enabled === false)
    return false;
  const known = new Set(["enabled", "step", "floor", "recover_minutes", "recover_turns"]);
  for (const k of Object.keys(raw))
    if (!known.has(k))
      c.warn(`Growth › repeat › ${k}`, "unknown setting — use step, floor, recover_minutes or recover_turns");
  def.step = tuned(c, raw.step, "Growth › repeat › step", def.step, 0, 10, "0 means repeats never taper");
  def.floor = tuned(c, raw.floor, "Growth › repeat › floor", def.floor, 0, 1, "the smallest share of learning a repeat keeps");
  def.recoverMinutes = tuned(c, raw.recover_minutes, "Growth › repeat › recover_minutes", def.recoverMinutes, 0, 525600, "in-game minutes; 0 never recovers by time");
  def.recoverTurns = Math.round(tuned(c, raw.recover_turns, "Growth › repeat › recover_turns", def.recoverTurns, 0, 1000, "turns; 0 never recovers by turns"));
  return def;
}
var REMOVED_KEYS = {
  dungeons: "dungeons",
  dating: "dating",
  look: "the stage and minigame looks",
  minigames: "minigames",
  lineage: "family and pregnancy",
  observers: "being seen",
  being_seen: "being seen",
  mind: "mind overrides and perception filters",
  obligations: "bills and debts",
  debts: "bills and debts",
  jobs: "work shifts",
  discovery: "discovering new places",
  companions: "companion lives, jealousy and feelings between people",
  fronts: "hidden world clocks (fronts)",
  random_events: "random events",
  events: "random events",
  checkpoints: "checkpoints, save slots and time loops",
  endings: "endings and new playthroughs",
  perks: "perks",
  feats: "feats",
  codex: "the codex",
  abilities: "abilities",
  weather: "weather and temperature",
  wardrobe: "the wardrobe",
  body: "the body and transformations"
};
var SEXUAL_TAGS = new Set(["sexual", "sex", "nsfw", "lewd", "explicit", "erotic", "smut"]);
function normalizeRuleset(raw) {
  const c = new Ctx;
  if (!isObj(raw)) {
    c.err("Ruleset", "is empty or isn't a YAML map");
    return { ruleset: null, issues: c.issues };
  }
  const weekdays = Array.isArray(raw.clock?.weekdays) ? raw.clock.weekdays.map(String) : DEFAULT_WEEKDAYS;
  const stats = {};
  const statOrder = [];
  if (raw.stats !== undefined && !isObj(raw.stats))
    c.err("Stats", "should be a map of stat names to definitions");
  for (const [id, def] of Object.entries(isObj(raw.stats) ? raw.stats : {})) {
    const s = normStat(id, def, `Stats › ${id}`, c);
    if (s) {
      stats[id] = s;
      statOrder.push(id);
    }
  }
  const known = { stats: new Set(statOrder) };
  const relRaw = isObj(raw.relationships) ? raw.relationships : isObj(raw.people) ? { people: raw.people } : {};
  const relStats = {};
  const relStatOrder = [];
  for (const [id, def] of Object.entries(isObj(relRaw.stats) ? relRaw.stats : {})) {
    const s = normStat(id, def, `Relationships › stats › ${id}`, c, true);
    if (s) {
      if (s.start === s.max && def?.start === undefined)
        s.start = s.min;
      relStats[id] = s;
      relStatOrder.push(id);
    }
  }
  const people = {};
  for (const [id, p] of Object.entries(isObj(relRaw.people) ? relRaw.people : {})) {
    const r = isObj(p) ? p : typeof p === "string" ? { name: p } : {};
    const start = {};
    if (isObj(r.start))
      for (const [s, v] of Object.entries(r.start))
        start[s] = c.num(v, `Relationships › people › ${id} › start › ${s}`, 0);
    for (const k of ["schedule", "routine"])
      if (r[k] !== undefined)
        c.removed(`Relationships › people › ${id} › ${k}`, k, "schedules");
    if (r.traits !== undefined)
      c.removed(`Relationships › people › ${id} › traits`, "traits", "per-person traits");
    people[id] = {
      id,
      name: typeof r.name === "string" ? r.name : titleCase(id),
      age: r.age !== undefined ? c.num(r.age, `Relationships › people › ${id} › age`, 0) : undefined,
      start,
      desc: typeof r.desc === "string" ? r.desc : undefined
    };
  }
  const invRaw = isObj(raw.inventory) ? raw.inventory : {};
  const items = {};
  for (const [id, it] of Object.entries(isObj(raw.items) ? raw.items : isObj(invRaw.items) ? invRaw.items : {})) {
    const r = isObj(it) ? it : typeof it === "string" ? { name: it } : {};
    const w = `Items › ${id}`;
    for (const k of ["slot", "warmth", "integrity", "reveal", "traits"])
      if (r[k] !== undefined)
        c.removed(`${w} › ${k}`, k, "the wardrobe");
    items[id] = {
      id,
      name: typeof r.name === "string" ? r.name : titleCase(id),
      desc: r.desc,
      tags: list(r.tags),
      uses: Math.max(0, Math.round(c.num(r.uses ?? r.charges, `${w} › uses`, list(r.tags).map((t) => t.toLowerCase()).includes("consumable") ? 1 : 0))),
      keep: r.keep === true,
      bonus: {},
      armor: armorMap(r.armor, `${w} › armor`, c)
    };
    applyItemUse(items[id], r, w, c, known, false);
  }
  for (const [id, u] of Object.entries(isObj(raw.item_uses) ? raw.item_uses : {})) {
    const it = items[id];
    if (!it) {
      c.warn(`Item uses › ${id}`, `"${id}" isn't a declared item`);
      continue;
    }
    if (!isObj(u))
      continue;
    if (it.use || Object.keys(it.bonus).length)
      continue;
    const { bonus, keep, drafted, use, ...rest } = u;
    const raw = { bonus, keep, use: use ?? (Object.keys(rest).length ? rest : undefined) };
    applyItemUse(it, raw, `Item uses › ${id}`, c, known, drafted === true);
  }
  const locations = {};
  for (const [id, l] of Object.entries(isObj(raw.locations) ? raw.locations : {})) {
    const r = isObj(l) ? l : typeof l === "string" ? { name: l } : {};
    const lw = `Locations › ${id}`;
    for (const k of ["exits", "travel", "when", "requires", "needs", "why_not", "locked", "pos"])
      if (r[k] !== undefined)
        c.removed(`${lw} › ${k}`, k, "the map and travel between places");
    const indoors = r.indoors === true || r.inside === true;
    for (const k of ["temp", "temperature"])
      if (r[k] !== undefined)
        c.removed(`${lw} › ${k}`, k, "weather and temperature");
    locations[id] = {
      id,
      name: typeof r.name === "string" ? r.name : titleCase(id),
      desc: typeof r.desc === "string" ? r.desc : undefined,
      indoors,
      board: r.board === true || r.quest_board === true
    };
  }
  const conditions = {};
  for (const [id, d] of Object.entries(isObj(raw.conditions) ? raw.conditions : {})) {
    const r = isObj(d) ? d : typeof d === "string" ? { label: d } : {};
    const gate = normGate(r, `Conditions › ${id}`, c);
    conditions[id] = {
      id,
      label: typeof r.label === "string" ? r.label : titleCase(id),
      tone: ["good", "warn", "bad", "neutral"].includes(r.tone) ? r.tone : "warn",
      desc: typeof r.desc === "string" ? r.desc : undefined,
      narrator: r.narrator === true,
      ...gate ? { gate } : {},
      bonus: statAmounts(r.bonus, `Conditions › ${id} › bonus`, c, known),
      ...condTiming(r, `Conditions › ${id}`, c, known)
    };
  }
  const flags = {};
  for (const [id, d] of Object.entries(isObj(raw.flags) ? raw.flags : {})) {
    const r = isObj(d) ? d : { start: d };
    const gate = normGate(r, `Flags › ${id}`, c);
    flags[id] = { id, label: r.label, narrator: r.narrator === true, start: r.start ?? false, ...gate ? { gate } : {} };
  }
  const startRaw = isObj(raw.start) ? raw.start : {};
  const startItems = {};
  const si = startRaw.items ?? invRaw.start;
  if (isObj(si))
    for (const [it, n] of Object.entries(si))
      startItems[it] = c.num(n, `Start › items › ${it}`, 1);
  else if (Array.isArray(si))
    for (const it of si)
      startItems[String(it)] = 1;
  if (isObj(startRaw.stats))
    for (const [s, v] of Object.entries(startRaw.stats)) {
      if (stats[s]) {
        stats[s].start = c.num(v, `Start › stats › ${s}`, stats[s].start);
        delete stats[s].startExpr;
      } else
        c.warn(`Start › stats › ${s}`, "isn't a declared stat");
    }
  let startLocation = typeof startRaw.location === "string" ? startRaw.location : null;
  if (!startLocation && Object.keys(locations).length)
    startLocation = Object.keys(locations)[0];
  if (startLocation && Object.keys(locations).length && !locations[startLocation]) {
    c.warn("Start › location", `"${startLocation}" isn't a declared location`);
  }
  const clockRaw = isObj(raw.clock) ? raw.clock : {};
  const clockStartRaw = startRaw.time ?? clockRaw.start ?? "Mon 08:00";
  const clockStart = parseClockStart(clockStartRaw, weekdays);
  if (clockStart === null)
    c.warn("Clock › start", `"${clockStartRaw}" should look like "Mon 07:30" or "Day 1 07:30"`);
  const dateRaw = clockRaw.date ?? clockRaw.start_date ?? startRaw.date;
  const startDate = dateRaw === undefined ? null : parseDate(dateRaw);
  if (dateRaw !== undefined && !startDate)
    c.warn("Clock › date", `"${dateRaw}" should look like "Sep 4"`);
  const actions = {};
  const actionOrder = [];
  let i = 0;
  for (const [id, a] of Object.entries(isObj(raw.actions) ? raw.actions : {})) {
    const def = normAction(id, a, `Actions › ${id}`, c, known, i++);
    if (def) {
      actions[id] = def;
      actionOrder.push(id);
    }
    for (const key of ["per_encounter", "per_day"])
      if (isObj(a) && a[key] !== undefined) {
        c.warn(`Actions › ${id} › ${key}`, "use limits work on encounter moves only — ignored here (gate it with `when:` and a flag)");
      }
  }
  actionOrder.sort((a, b) => actions[a].order - actions[b].order);
  for (const a of Object.values(actions))
    for (const loc of a.at) {
      if (Object.keys(locations).length && !locations[loc])
        c.warn(`Actions › ${a.id} › at`, `"${loc}" isn't a declared location`);
    }
  const triggers = [];
  const trigRaw = raw.triggers ?? raw.rules;
  const trigList = Array.isArray(trigRaw) ? trigRaw.map((t, n) => [isObj(t) && typeof t.id === "string" ? t.id : `rule_${n + 1}`, t]) : isObj(trigRaw) ? Object.entries(trigRaw) : [];
  for (const [id, t] of trigList) {
    const w = `Triggers › ${id}`;
    if (!isObj(t)) {
      c.warn(w, "expected `when:` and `do:`");
      continue;
    }
    const when = t.when ?? t.if;
    const whenExpr = when !== undefined ? c.expr(when, `${w} › when`) : undefined;
    const whenScene = typeof t.when_scene === "string" ? t.when_scene : typeof t.scene === "string" ? t.scene : undefined;
    if (whenExpr === undefined && !whenScene) {
      c.err(w, "needs `when:` (a formula) or `when_scene:` (a plain-language condition)");
      continue;
    }
    const effRaw = t.do ?? t.then ?? t.effects ?? {};
    const effects = normEffect(isObj(effRaw) ? { ...effRaw, ...t.hint ? { hint: t.hint } : {} } : effRaw, `${w} › do`, c, known);
    triggers.push({ id, when: whenExpr === undefined ? undefined : String(whenExpr), whenScene, repeat: t.repeat === true || t.every_turn === true, effects });
  }
  const hudRaw = isObj(raw.hud) ? raw.hud : {};
  const moneyStat = typeof hudRaw.money === "string" ? hudRaw.money : statOrder.find((s) => stats[s].kind === "money");
  const bars = Array.isArray(hudRaw.bars) ? hudRaw.bars.map(String).filter((b) => {
    if (!stats[b]) {
      c.warn("HUD › bars", `"${b}" isn't a declared stat`);
      return false;
    }
    return true;
  }) : statOrder.filter((s) => stats[s].kind === "meter");
  const narrRaw = isObj(raw.narration) ? raw.narration : {};
  const playerRaw = isObj(raw.player) ? raw.player : {};
  const encounters = {};
  for (const [id, e] of Object.entries(isObj(raw.encounters) ? raw.encounters : {})) {
    const def = normEncounter(id, e, c, known, stats);
    if (def)
      encounters[id] = def;
  }
  const { quests, order: questOrder, story: storyQuests } = normQuests(raw.quests, c, known, { encounters: new Set(Object.keys(encounters)), actions: new Set(Object.keys(actions)) });
  for (const q of Object.values(quests)) {
    const w = `Quests › ${q.id}`;
    if (q.giver && !people[q.giver])
      c.warn(`${w} › giver`, `"${q.giver}" isn't a person in relationships › people`);
    for (const loc of q.at)
      if (Object.keys(locations).length && !locations[loc])
        c.warn(`${w} › at`, `"${loc}" isn't a declared location`);
    if (q.board && !Object.values(locations).some((l) => l.board))
      c.warn(`${w} › board`, "is posted on a board, but no location has `board: true`");
  }
  const secrets = normSecrets(raw.secrets, c);
  const liveChoices = normLiveChoices(raw.live_choices, c, known);
  for (const [k, what] of Object.entries(REMOVED_KEYS))
    if (raw[k] !== undefined)
      c.removed(titleCase(k), k, what);
  const improvise = normImprovise(raw.improvise ?? raw.improvised, c, known, stats, statOrder);
  const growth = normGrowth(raw.growth ?? raw.practice, c);
  const ruleset = {
    name: typeof raw.name === "string" ? raw.name : "Untitled ruleset",
    description: typeof raw.description === "string" ? raw.description : undefined,
    player: {
      name: typeof playerRaw.name === "string" ? playerRaw.name : undefined,
      age: playerRaw.age !== undefined ? c.num(playerRaw.age, "Player › age", 0) : undefined
    },
    stats,
    statOrder,
    relStats,
    relStatOrder,
    people,
    peopleOpen: relRaw.open !== false && relStatOrder.length > 0,
    items,
    itemsOpen: invRaw.open !== false,
    startItems,
    locations,
    locationsOpen: raw.locations_open === true || Object.keys(locations).length === 0,
    startLocation,
    conditions,
    flags,
    actions,
    actionOrder,
    triggers,
    clock: {
      enabled: clockRaw.enabled !== false,
      start: clockStart ?? 480,
      minutesPerAction: c.num(clockRaw.minutes_per_action, "Clock › minutes_per_action", 10),
      narratorMax: c.num(clockRaw.narrator_max ?? clockRaw.narrator, "Clock › narrator_max", 480),
      weekdays,
      startDate
    },
    hud: { bars, money: moneyStat && stats[moneyStat] ? moneyStat : undefined, ...normCurrency(hudRaw.currency, c) },
    narration: { notes: typeof narrRaw.notes === "string" ? narrRaw.notes : undefined, numbers: narrRaw.numbers === true },
    encounters,
    quests,
    questOrder,
    storyQuests,
    secrets,
    liveChoices,
    improvise,
    growth
  };
  for (const a of Object.values(actions))
    for (const who of a.targets ?? []) {
      if (!people[who])
        c.warn(`Actions › ${a.id} › targets`, `"${who}" isn't a person in relationships › people`);
    }
  for (const a of Object.values(actions))
    if (a.targets && !a.targets.length)
      c.warn(`Actions › ${a.id} › targets`, "names no one — list the people it can be aimed at");
  const minors = [
    ...ruleset.player.age !== undefined && ruleset.player.age < 18 ? ["the player"] : [],
    ...Object.values(people).filter((p) => p.age !== undefined && p.age < 18).map((p) => p.name)
  ];
  const sexualActions = [
    ...Object.values(actions),
    ...Object.values(encounters).flatMap((e) => Object.values(e.actions).map((a) => ({ ...a, tags: [...a.tags, ...e.tags] }))),
    ...Object.values(liveChoices.tags)
  ].filter((a) => a.tags.some((t) => SEXUAL_TAGS.has(t)));
  if (minors.length && sexualActions.length) {
    c.err("Ruleset", `declares characters under 18 (${minors.join(", ")}) alongside sexual actions — Warp won't run this ruleset`);
    return { ruleset: null, issues: c.issues };
  }
  return { ruleset, issues: c.issues };
}

// node_modules/js-yaml/dist/js-yaml.mjs
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var jsYaml = {};
var loader = {};
var common = {};
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon)
    return common;
  hasRequiredCommon = 1;
  function isNothing(subject) {
    return typeof subject === "undefined" || subject === null;
  }
  function isObject(subject) {
    return typeof subject === "object" && subject !== null;
  }
  function toArray(sequence) {
    if (Array.isArray(sequence))
      return sequence;
    else if (isNothing(sequence))
      return [];
    return [sequence];
  }
  function extend(target, source) {
    if (source) {
      const sourceKeys = Object.keys(source);
      for (let index = 0, length = sourceKeys.length;index < length; index += 1) {
        const key = sourceKeys[index];
        target[key] = source[key];
      }
    }
    return target;
  }
  function repeat(string, count) {
    let result = "";
    for (let cycle = 0;cycle < count; cycle += 1) {
      result += string;
    }
    return result;
  }
  function isNegativeZero(number) {
    return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
  }
  common.isNothing = isNothing;
  common.isObject = isObject;
  common.toArray = toArray;
  common.repeat = repeat;
  common.isNegativeZero = isNegativeZero;
  common.extend = extend;
  return common;
}
var exception;
var hasRequiredException;
function requireException() {
  if (hasRequiredException)
    return exception;
  hasRequiredException = 1;
  function formatError(exception2, compact) {
    let where = "";
    const message = exception2.reason || "(unknown reason)";
    if (!exception2.mark)
      return message;
    if (exception2.mark.name) {
      where += 'in "' + exception2.mark.name + '" ';
    }
    where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
    if (!compact && exception2.mark.snippet) {
      where += `

` + exception2.mark.snippet;
    }
    return message + " " + where;
  }
  function YAMLException2(reason, mark) {
    Error.call(this);
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error().stack || "";
    }
  }
  YAMLException2.prototype = Object.create(Error.prototype);
  YAMLException2.prototype.constructor = YAMLException2;
  YAMLException2.prototype.toString = function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  };
  exception = YAMLException2;
  return exception;
}
var snippet;
var hasRequiredSnippet;
function requireSnippet() {
  if (hasRequiredSnippet)
    return snippet;
  hasRequiredSnippet = 1;
  const common2 = requireCommon();
  function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
    let head = "";
    let tail = "";
    const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
    if (position - lineStart > maxHalfLength) {
      head = " ... ";
      lineStart = position - maxHalfLength + head.length;
    }
    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }
    return {
      str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
      pos: position - lineStart + head.length
    };
  }
  function padStart(string, max) {
    return common2.repeat(" ", max - string.length) + string;
  }
  function makeSnippet(mark, options) {
    options = Object.create(options || null);
    if (!mark.buffer)
      return null;
    if (!options.maxLength)
      options.maxLength = 79;
    if (typeof options.indent !== "number")
      options.indent = 1;
    if (typeof options.linesBefore !== "number")
      options.linesBefore = 3;
    if (typeof options.linesAfter !== "number")
      options.linesAfter = 2;
    const re = /\r?\n|\r|\0/g;
    const lineStarts = [0];
    const lineEnds = [];
    let match;
    let foundLineNo = -1;
    while (match = re.exec(mark.buffer)) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);
      if (mark.position <= match.index && foundLineNo < 0) {
        foundLineNo = lineStarts.length - 2;
      }
    }
    if (foundLineNo < 0)
      foundLineNo = lineStarts.length - 1;
    let result = "";
    const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
    const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
    for (let i = 1;i <= options.linesBefore; i++) {
      if (foundLineNo - i < 0)
        break;
      const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
      result = common2.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line2.str + `
` + result;
    }
    const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
    result += common2.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + `
`;
    result += common2.repeat("-", options.indent + lineNoLength + 3 + line.pos) + `^
`;
    for (let i = 1;i <= options.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length)
        break;
      const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
      result += common2.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line2.str + `
`;
    }
    return result.replace(/\n$/, "");
  }
  snippet = makeSnippet;
  return snippet;
}
var type;
var hasRequiredType;
function requireType() {
  if (hasRequiredType)
    return type;
  hasRequiredType = 1;
  const YAMLException2 = requireException();
  const TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ];
  const YAML_NODE_KINDS = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function compileStyleAliases(map2) {
    const result = {};
    if (map2 !== null) {
      Object.keys(map2).forEach(function(style) {
        map2[style].forEach(function(alias) {
          result[String(alias)] = style;
        });
      });
    }
    return result;
  }
  function Type2(tag, options) {
    options = options || {};
    Object.keys(options).forEach(function(name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
        throw new YAMLException2('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
      }
    });
    this.options = options;
    this.tag = tag;
    this.kind = options["kind"] || null;
    this.resolve = options["resolve"] || function() {
      return true;
    };
    this.construct = options["construct"] || function(data) {
      return data;
    };
    this.instanceOf = options["instanceOf"] || null;
    this.predicate = options["predicate"] || null;
    this.represent = options["represent"] || null;
    this.representName = options["representName"] || null;
    this.defaultStyle = options["defaultStyle"] || null;
    this.multi = options["multi"] || false;
    this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
    if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
      throw new YAMLException2('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
    }
  }
  type = Type2;
  return type;
}
var schema;
var hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema)
    return schema;
  hasRequiredSchema = 1;
  const YAMLException2 = requireException();
  const Type2 = requireType();
  function compileList(schema2, name) {
    const result = [];
    schema2[name].forEach(function(currentType) {
      let newIndex = result.length;
      result.forEach(function(previousType, previousIndex) {
        if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
          newIndex = previousIndex;
        }
      });
      result[newIndex] = currentType;
    });
    return result;
  }
  function compileMap() {
    const result = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: []
      }
    };
    function collectType(type2) {
      if (type2.multi) {
        result.multi[type2.kind].push(type2);
        result.multi["fallback"].push(type2);
      } else {
        result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
      }
    }
    for (let index = 0, length = arguments.length;index < length; index += 1) {
      arguments[index].forEach(collectType);
    }
    return result;
  }
  function Schema2(definition) {
    return this.extend(definition);
  }
  Schema2.prototype.extend = function extend(definition) {
    let implicit = [];
    let explicit = [];
    if (definition instanceof Type2) {
      explicit.push(definition);
    } else if (Array.isArray(definition)) {
      explicit = explicit.concat(definition);
    } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
      if (definition.implicit)
        implicit = implicit.concat(definition.implicit);
      if (definition.explicit)
        explicit = explicit.concat(definition.explicit);
    } else {
      throw new YAMLException2("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
    }
    implicit.forEach(function(type2) {
      if (!(type2 instanceof Type2)) {
        throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
      if (type2.loadKind && type2.loadKind !== "scalar") {
        throw new YAMLException2("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      }
      if (type2.multi) {
        throw new YAMLException2("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
      }
    });
    explicit.forEach(function(type2) {
      if (!(type2 instanceof Type2)) {
        throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
    });
    const result = Object.create(Schema2.prototype);
    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);
    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
    return result;
  };
  schema = Schema2;
  return schema;
}
var str;
var hasRequiredStr;
function requireStr() {
  if (hasRequiredStr)
    return str;
  hasRequiredStr = 1;
  const Type2 = requireType();
  str = new Type2("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(data) {
      return data !== null ? data : "";
    }
  });
  return str;
}
var seq;
var hasRequiredSeq;
function requireSeq() {
  if (hasRequiredSeq)
    return seq;
  hasRequiredSeq = 1;
  const Type2 = requireType();
  seq = new Type2("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(data) {
      return data !== null ? data : [];
    }
  });
  return seq;
}
var map;
var hasRequiredMap;
function requireMap() {
  if (hasRequiredMap)
    return map;
  hasRequiredMap = 1;
  const Type2 = requireType();
  map = new Type2("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(data) {
      return data !== null ? data : {};
    }
  });
  return map;
}
var failsafe;
var hasRequiredFailsafe;
function requireFailsafe() {
  if (hasRequiredFailsafe)
    return failsafe;
  hasRequiredFailsafe = 1;
  const Schema2 = requireSchema();
  failsafe = new Schema2({
    explicit: [
      requireStr(),
      requireSeq(),
      requireMap()
    ]
  });
  return failsafe;
}
var _null;
var hasRequired_null;
function require_null() {
  if (hasRequired_null)
    return _null;
  hasRequired_null = 1;
  const Type2 = requireType();
  function resolveYamlNull(data) {
    if (data === null)
      return true;
    const max = data.length;
    return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
  }
  function constructYamlNull() {
    return null;
  }
  function isNull(object) {
    return object === null;
  }
  _null = new Type2("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      },
      empty: function() {
        return "";
      }
    },
    defaultStyle: "lowercase"
  });
  return _null;
}
var bool;
var hasRequiredBool;
function requireBool() {
  if (hasRequiredBool)
    return bool;
  hasRequiredBool = 1;
  const Type2 = requireType();
  function resolveYamlBoolean(data) {
    if (data === null)
      return false;
    const max = data.length;
    return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
  }
  function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
  }
  function isBoolean(object) {
    return Object.prototype.toString.call(object) === "[object Boolean]";
  }
  bool = new Type2("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function(object) {
        return object ? "true" : "false";
      },
      uppercase: function(object) {
        return object ? "TRUE" : "FALSE";
      },
      camelcase: function(object) {
        return object ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  });
  return bool;
}
var int;
var hasRequiredInt;
function requireInt() {
  if (hasRequiredInt)
    return int;
  hasRequiredInt = 1;
  const common2 = requireCommon();
  const Type2 = requireType();
  function isHexCode(c) {
    return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
  }
  function isOctCode(c) {
    return c >= 48 && c <= 55;
  }
  function isDecCode(c) {
    return c >= 48 && c <= 57;
  }
  function resolveYamlInteger(data) {
    if (data === null)
      return false;
    const max = data.length;
    let index = 0;
    let hasDigits = false;
    if (!max)
      return false;
    let ch = data[index];
    if (ch === "-" || ch === "+") {
      ch = data[++index];
    }
    if (ch === "0") {
      if (index + 1 === max)
        return true;
      ch = data[++index];
      if (ch === "b") {
        index++;
        for (;index < max; index++) {
          ch = data[index];
          if (ch !== "0" && ch !== "1")
            return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
      if (ch === "x") {
        index++;
        for (;index < max; index++) {
          if (!isHexCode(data.charCodeAt(index)))
            return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
      if (ch === "o") {
        index++;
        for (;index < max; index++) {
          if (!isOctCode(data.charCodeAt(index)))
            return false;
          hasDigits = true;
        }
        return hasDigits && isFinite(parseYamlInteger(data));
      }
    }
    for (;index < max; index++) {
      if (!isDecCode(data.charCodeAt(index))) {
        return false;
      }
      hasDigits = true;
    }
    if (!hasDigits)
      return false;
    return isFinite(parseYamlInteger(data));
  }
  function parseYamlInteger(data) {
    let value = data;
    let sign = 1;
    let ch = value[0];
    if (ch === "-" || ch === "+") {
      if (ch === "-")
        sign = -1;
      value = value.slice(1);
      ch = value[0];
    }
    if (value === "0")
      return 0;
    if (ch === "0") {
      if (value[1] === "b")
        return sign * parseInt(value.slice(2), 2);
      if (value[1] === "x")
        return sign * parseInt(value.slice(2), 16);
      if (value[1] === "o")
        return sign * parseInt(value.slice(2), 8);
    }
    return sign * parseInt(value, 10);
  }
  function constructYamlInteger(data) {
    return parseYamlInteger(data);
  }
  function isInteger(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common2.isNegativeZero(object));
  }
  int = new Type2("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: function(obj) {
        return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
      },
      octal: function(obj) {
        return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
      },
      decimal: function(obj) {
        return obj.toString(10);
      },
      hexadecimal: function(obj) {
        return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  });
  return int;
}
var float;
var hasRequiredFloat;
function requireFloat() {
  if (hasRequiredFloat)
    return float;
  hasRequiredFloat = 1;
  const common2 = requireCommon();
  const Type2 = requireType();
  const YAML_FLOAT_PATTERN = new RegExp("^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
  const YAML_FLOAT_SPECIAL_PATTERN = new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
  function resolveYamlFloat(data) {
    if (data === null)
      return false;
    if (!YAML_FLOAT_PATTERN.test(data)) {
      return false;
    }
    if (isFinite(parseFloat(data, 10))) {
      return true;
    }
    return YAML_FLOAT_SPECIAL_PATTERN.test(data);
  }
  function constructYamlFloat(data) {
    let value = data.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".indexOf(value[0]) >= 0) {
      value = value.slice(1);
    }
    if (value === ".inf") {
      return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    } else if (value === ".nan") {
      return NaN;
    }
    return sign * parseFloat(value, 10);
  }
  const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
  function representYamlFloat(object, style) {
    if (isNaN(object)) {
      switch (style) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    } else if (Number.POSITIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    } else if (Number.NEGATIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    } else if (common2.isNegativeZero(object)) {
      return "-0.0";
    }
    const res = object.toString(10);
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
  }
  function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common2.isNegativeZero(object));
  }
  float = new Type2("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase"
  });
  return float;
}
var json;
var hasRequiredJson;
function requireJson() {
  if (hasRequiredJson)
    return json;
  hasRequiredJson = 1;
  json = requireFailsafe().extend({
    implicit: [
      require_null(),
      requireBool(),
      requireInt(),
      requireFloat()
    ]
  });
  return json;
}
var core;
var hasRequiredCore;
function requireCore() {
  if (hasRequiredCore)
    return core;
  hasRequiredCore = 1;
  core = requireJson();
  return core;
}
var timestamp;
var hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp)
    return timestamp;
  hasRequiredTimestamp = 1;
  const Type2 = requireType();
  const YAML_DATE_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
  const YAML_TIMESTAMP_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
  function resolveYamlTimestamp(data) {
    if (data === null)
      return false;
    if (YAML_DATE_REGEXP.exec(data) !== null)
      return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null)
      return true;
    return false;
  }
  function constructYamlTimestamp(data) {
    let fraction = 0;
    let delta = null;
    let match = YAML_DATE_REGEXP.exec(data);
    if (match === null)
      match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null)
      throw new Error("Date resolve error");
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    if (!match[4]) {
      return new Date(Date.UTC(year, month, day));
    }
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) {
        fraction += "0";
      }
      fraction = +fraction;
    }
    if (match[9]) {
      const tzHour = +match[10];
      const tzMinute = +(match[11] || 0);
      delta = (tzHour * 60 + tzMinute) * 60000;
      if (match[9] === "-")
        delta = -delta;
    }
    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta)
      date.setTime(date.getTime() - delta);
    return date;
  }
  function representYamlTimestamp(object) {
    return object.toISOString();
  }
  timestamp = new Type2("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });
  return timestamp;
}
var merge;
var hasRequiredMerge;
function requireMerge() {
  if (hasRequiredMerge)
    return merge;
  hasRequiredMerge = 1;
  const Type2 = requireType();
  function resolveYamlMerge(data) {
    return data === "<<" || data === null;
  }
  merge = new Type2("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
  });
  return merge;
}
var binary;
var hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary)
    return binary;
  hasRequiredBinary = 1;
  const Type2 = requireType();
  const BASE64_MAP = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
  function resolveYamlBinary(data) {
    if (data === null)
      return false;
    let bitlen = 0;
    const max = data.length;
    const map2 = BASE64_MAP;
    for (let idx = 0;idx < max; idx++) {
      const code = map2.indexOf(data.charAt(idx));
      if (code > 64)
        continue;
      if (code < 0)
        return false;
      bitlen += 6;
    }
    return bitlen % 8 === 0;
  }
  function constructYamlBinary(data) {
    const input = data.replace(/[\r\n=]/g, "");
    const max = input.length;
    const map2 = BASE64_MAP;
    let bits = 0;
    const result = [];
    for (let idx = 0;idx < max; idx++) {
      if (idx % 4 === 0 && idx) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      }
      bits = bits << 6 | map2.indexOf(input.charAt(idx));
    }
    const tailbits = max % 4 * 6;
    if (tailbits === 0) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    } else if (tailbits === 18) {
      result.push(bits >> 10 & 255);
      result.push(bits >> 2 & 255);
    } else if (tailbits === 12) {
      result.push(bits >> 4 & 255);
    }
    return new Uint8Array(result);
  }
  function representYamlBinary(object) {
    let result = "";
    let bits = 0;
    const max = object.length;
    const map2 = BASE64_MAP;
    for (let idx = 0;idx < max; idx++) {
      if (idx % 3 === 0 && idx) {
        result += map2[bits >> 18 & 63];
        result += map2[bits >> 12 & 63];
        result += map2[bits >> 6 & 63];
        result += map2[bits & 63];
      }
      bits = (bits << 8) + object[idx];
    }
    const tail = max % 3;
    if (tail === 0) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    } else if (tail === 2) {
      result += map2[bits >> 10 & 63];
      result += map2[bits >> 4 & 63];
      result += map2[bits << 2 & 63];
      result += map2[64];
    } else if (tail === 1) {
      result += map2[bits >> 2 & 63];
      result += map2[bits << 4 & 63];
      result += map2[64];
      result += map2[64];
    }
    return result;
  }
  function isBinary(obj) {
    return Object.prototype.toString.call(obj) === "[object Uint8Array]";
  }
  binary = new Type2("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });
  return binary;
}
var omap;
var hasRequiredOmap;
function requireOmap() {
  if (hasRequiredOmap)
    return omap;
  hasRequiredOmap = 1;
  const Type2 = requireType();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const _toString = Object.prototype.toString;
  function resolveYamlOmap(data) {
    if (data === null)
      return true;
    const objectKeys = {};
    const object = data;
    for (let index = 0, length = object.length;index < length; index += 1) {
      const pair = object[index];
      let pairHasKey = false;
      if (_toString.call(pair) !== "[object Object]")
        return false;
      let pairKey;
      for (pairKey in pair) {
        if (_hasOwnProperty.call(pair, pairKey)) {
          if (!pairHasKey)
            pairHasKey = true;
          else
            return false;
        }
      }
      if (!pairHasKey)
        return false;
      if (_hasOwnProperty.call(objectKeys, pairKey))
        return false;
      Object.defineProperty(objectKeys, pairKey, { value: true });
    }
    return true;
  }
  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }
  omap = new Type2("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });
  return omap;
}
var pairs;
var hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs)
    return pairs;
  hasRequiredPairs = 1;
  const Type2 = requireType();
  const _toString = Object.prototype.toString;
  function resolveYamlPairs(data) {
    if (data === null)
      return true;
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length;index < length; index += 1) {
      const pair = object[index];
      if (_toString.call(pair) !== "[object Object]")
        return false;
      const keys = Object.keys(pair);
      if (keys.length !== 1)
        return false;
      result[index] = [keys[0], pair[keys[0]]];
    }
    return true;
  }
  function constructYamlPairs(data) {
    if (data === null)
      return [];
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length;index < length; index += 1) {
      const pair = object[index];
      const keys = Object.keys(pair);
      result[index] = [keys[0], pair[keys[0]]];
    }
    return result;
  }
  pairs = new Type2("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });
  return pairs;
}
var set;
var hasRequiredSet;
function requireSet() {
  if (hasRequiredSet)
    return set;
  hasRequiredSet = 1;
  const Type2 = requireType();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  function resolveYamlSet(data) {
    if (data === null)
      return true;
    const object = data;
    for (const key in object) {
      if (_hasOwnProperty.call(object, key)) {
        if (object[key] !== null)
          return false;
      }
    }
    return true;
  }
  function constructYamlSet(data) {
    return data !== null ? data : {};
  }
  set = new Type2("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });
  return set;
}
var _default;
var hasRequired_default;
function require_default() {
  if (hasRequired_default)
    return _default;
  hasRequired_default = 1;
  _default = requireCore().extend({
    implicit: [
      requireTimestamp(),
      requireMerge()
    ],
    explicit: [
      requireBinary(),
      requireOmap(),
      requirePairs(),
      requireSet()
    ]
  });
  return _default;
}
var hasRequiredLoader;
function requireLoader() {
  if (hasRequiredLoader)
    return loader;
  hasRequiredLoader = 1;
  const common2 = requireCommon();
  const YAMLException2 = requireException();
  const makeSnippet = requireSnippet();
  const DEFAULT_SCHEMA2 = require_default();
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const CONTEXT_FLOW_IN = 1;
  const CONTEXT_FLOW_OUT = 2;
  const CONTEXT_BLOCK_IN = 3;
  const CONTEXT_BLOCK_OUT = 4;
  const CHOMPING_CLIP = 1;
  const CHOMPING_STRIP = 2;
  const CHOMPING_KEEP = 3;
  const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  const PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
  const PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
  const PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }
  function isEol(c) {
    return c === 10 || c === 13;
  }
  function isWhiteSpace(c) {
    return c === 9 || c === 32;
  }
  function isWsOrEol(c) {
    return c === 9 || c === 32 || c === 10 || c === 13;
  }
  function isFlowIndicator(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
  }
  function fromHexCode(c) {
    if (c >= 48 && c <= 57) {
      return c - 48;
    }
    const lc = c | 32;
    if (lc >= 97 && lc <= 102) {
      return lc - 97 + 10;
    }
    return -1;
  }
  function escapedHexLen(c) {
    if (c === 120) {
      return 2;
    }
    if (c === 117) {
      return 4;
    }
    if (c === 85) {
      return 8;
    }
    return 0;
  }
  function fromDecimalCode(c) {
    if (c >= 48 && c <= 57) {
      return c - 48;
    }
    return -1;
  }
  function simpleEscapeSequence(c) {
    switch (c) {
      case 48:
        return "\x00";
      case 97:
        return "\x07";
      case 98:
        return "\b";
      case 116:
        return "\t";
      case 9:
        return "\t";
      case 110:
        return `
`;
      case 118:
        return "\v";
      case 102:
        return "\f";
      case 114:
        return "\r";
      case 101:
        return "\x1B";
      case 32:
        return " ";
      case 34:
        return '"';
      case 47:
        return "/";
      case 92:
        return "\\";
      case 78:
        return "";
      case 95:
        return " ";
      case 76:
        return "\u2028";
      case 80:
        return "\u2029";
      default:
        return "";
    }
  }
  function charFromCodepoint(c) {
    if (c <= 65535) {
      return String.fromCharCode(c);
    }
    return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
  }
  function setProperty(object, key, value) {
    if (key === "__proto__") {
      Object.defineProperty(object, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    } else {
      object[key] = value;
    }
  }
  const simpleEscapeCheck = new Array(256);
  const simpleEscapeMap = new Array(256);
  for (let i = 0;i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }
  function State(input, options) {
    this.input = input;
    this.filename = options["filename"] || null;
    this.schema = options["schema"] || DEFAULT_SCHEMA2;
    this.onWarning = options["onWarning"] || null;
    this.legacy = options["legacy"] || false;
    this.json = options["json"] || false;
    this.listener = options["listener"] || null;
    this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
    this.maxTotalMergeKeys = typeof options["maxTotalMergeKeys"] === "number" ? options["maxTotalMergeKeys"] : 1e4;
    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap = this.schema.compiledTypeMap;
    this.length = input.length;
    this.position = 0;
    this.line = 0;
    this.lineStart = 0;
    this.lineIndent = 0;
    this.depth = 0;
    this.totalMergeKeys = 0;
    this.firstTabInLine = -1;
    this.documents = [];
    this.anchorMapTransactions = [];
  }
  function generateError(state, message) {
    const mark = {
      name: state.filename,
      buffer: state.input.slice(0, -1),
      position: state.position,
      line: state.line,
      column: state.position - state.lineStart
    };
    mark.snippet = makeSnippet(mark);
    return new YAMLException2(message, mark);
  }
  function throwError(state, message) {
    throw generateError(state, message);
  }
  function throwWarning(state, message) {
    if (state.onWarning) {
      state.onWarning.call(null, generateError(state, message));
    }
  }
  function storeAnchor(state, name, value) {
    const transactions = state.anchorMapTransactions;
    if (transactions.length !== 0) {
      const transaction = transactions[transactions.length - 1];
      if (!_hasOwnProperty.call(transaction, name)) {
        transaction[name] = {
          existed: _hasOwnProperty.call(state.anchorMap, name),
          value: state.anchorMap[name]
        };
      }
    }
    state.anchorMap[name] = value;
  }
  function beginAnchorTransaction(state) {
    state.anchorMapTransactions.push(/* @__PURE__ */ Object.create(null));
  }
  function commitAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const transactions = state.anchorMapTransactions;
    if (transactions.length === 0)
      return;
    const parent = transactions[transactions.length - 1];
    const names = Object.keys(transaction);
    for (let index = 0, length = names.length;index < length; index += 1) {
      const name = names[index];
      if (!_hasOwnProperty.call(parent, name)) {
        parent[name] = transaction[name];
      }
    }
  }
  function rollbackAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const names = Object.keys(transaction);
    for (let index = names.length - 1;index >= 0; index -= 1) {
      const entry = transaction[names[index]];
      if (entry.existed) {
        state.anchorMap[names[index]] = entry.value;
      } else {
        delete state.anchorMap[names[index]];
      }
    }
  }
  function snapshotState(state) {
    return {
      position: state.position,
      line: state.line,
      lineStart: state.lineStart,
      lineIndent: state.lineIndent,
      firstTabInLine: state.firstTabInLine,
      tag: state.tag,
      anchor: state.anchor,
      kind: state.kind,
      result: state.result
    };
  }
  function restoreState(state, snapshot) {
    state.position = snapshot.position;
    state.line = snapshot.line;
    state.lineStart = snapshot.lineStart;
    state.lineIndent = snapshot.lineIndent;
    state.firstTabInLine = snapshot.firstTabInLine;
    state.tag = snapshot.tag;
    state.anchor = snapshot.anchor;
    state.kind = snapshot.kind;
    state.result = snapshot.result;
  }
  const directiveHandlers = {
    YAML: function handleYamlDirective(state, name, args) {
      if (state.version !== null) {
        throwError(state, "duplication of %YAML directive");
      }
      if (args.length !== 1) {
        throwError(state, "YAML directive accepts exactly one argument");
      }
      const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
      if (match === null) {
        throwError(state, "ill-formed argument of the YAML directive");
      }
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major !== 1) {
        throwError(state, "unacceptable YAML version of the document");
      }
      state.version = args[0];
      state.checkLineBreaks = minor < 2;
      if (minor !== 1 && minor !== 2) {
        throwWarning(state, "unsupported YAML version of the document");
      }
    },
    TAG: function handleTagDirective(state, name, args) {
      let prefix;
      if (args.length !== 2) {
        throwError(state, "TAG directive accepts exactly two arguments");
      }
      const handle = args[0];
      prefix = args[1];
      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
      }
      if (_hasOwnProperty.call(state.tagMap, handle)) {
        throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
      }
      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
      }
      try {
        prefix = decodeURIComponent(prefix);
      } catch (err) {
        throwError(state, "tag prefix is malformed: " + prefix);
      }
      state.tagMap[handle] = prefix;
    }
  };
  function captureSegment(state, start, end, checkJson) {
    if (start < end) {
      const _result = state.input.slice(start, end);
      if (checkJson) {
        for (let _position = 0, _length = _result.length;_position < _length; _position += 1) {
          const _character = _result.charCodeAt(_position);
          if (!(_character === 9 || _character >= 32 && _character <= 1114111)) {
            throwError(state, "expected valid JSON character");
          }
        }
      } else if (PATTERN_NON_PRINTABLE.test(_result)) {
        throwError(state, "the stream contains non-printable characters");
      }
      state.result += _result;
    }
  }
  function chargeMergeWork(state) {
    state.totalMergeKeys++;
    if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) {
      throwError(state, "merge keys exceeded maxTotalMergeKeys (" + state.maxTotalMergeKeys + ")");
    }
  }
  function mergeMappings(state, destination, source, overridableKeys) {
    if (!common2.isObject(source)) {
      throwError(state, "cannot merge mappings; the provided source object is unacceptable");
    }
    chargeMergeWork(state);
    const sourceKeys = Object.keys(source);
    for (let index = 0, quantity = sourceKeys.length;index < quantity; index += 1) {
      const key = sourceKeys[index];
      chargeMergeWork(state);
      if (!_hasOwnProperty.call(destination, key)) {
        setProperty(destination, key, source[key]);
        overridableKeys[key] = true;
      }
    }
  }
  function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);
      for (let index = 0, quantity = keyNode.length;index < quantity; index += 1) {
        if (Array.isArray(keyNode[index])) {
          throwError(state, "nested arrays are not supported inside keys");
        }
        if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
          keyNode[index] = "[object Object]";
        }
      }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
      keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (_result === null) {
      _result = {};
    }
    if (keyTag === "tag:yaml.org,2002:merge") {
      if (Array.isArray(valueNode)) {
        if (valueNode.length > 100) {
          throwError(state, "abnormal merge sequence size");
        }
        for (let index = 0, quantity = valueNode.length;index < quantity; index += 1) {
          mergeMappings(state, _result, valueNode[index], overridableKeys);
        }
      } else {
        mergeMappings(state, _result, valueNode, overridableKeys);
      }
    } else {
      if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
        state.line = startLine || state.line;
        state.lineStart = startLineStart || state.lineStart;
        state.position = startPos || state.position;
        throwError(state, "duplicated mapping key");
      }
      setProperty(_result, keyNode, valueNode);
      delete overridableKeys[keyNode];
    }
    return _result;
  }
  function readLineBreak(state) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 10) {
      state.position++;
    } else if (ch === 13) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 10) {
        state.position++;
      }
    } else {
      throwError(state, "a line break is expected");
    }
    state.line += 1;
    state.lineStart = state.position;
    state.firstTabInLine = -1;
  }
  function skipSeparationSpace(state, allowComments, checkIndent) {
    let lineBreaks = 0;
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      while (isWhiteSpace(ch)) {
        if (ch === 9 && state.firstTabInLine === -1) {
          state.firstTabInLine = state.position;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      if (allowComments && ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 10 && ch !== 13 && ch !== 0);
      }
      if (isEol(ch)) {
        readLineBreak(state);
        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;
        while (ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
      } else {
        break;
      }
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
      throwWarning(state, "deficient indentation");
    }
    return lineBreaks;
  }
  function testDocumentSeparator(state) {
    let _position = state.position;
    let ch = state.input.charCodeAt(_position);
    if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
      _position += 3;
      ch = state.input.charCodeAt(_position);
      if (ch === 0 || isWsOrEol(ch)) {
        return true;
      }
    }
    return false;
  }
  function writeFoldedLines(state, count) {
    if (count === 1) {
      state.result += " ";
    } else if (count > 1) {
      state.result += common2.repeat(`
`, count - 1);
    }
  }
  function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    let captureStart;
    let captureEnd;
    let hasPendingContent;
    let _line;
    let _lineStart;
    let _lineIndent;
    const _kind = state.kind;
    const _result = state.result;
    let ch = state.input.charCodeAt(state.position);
    if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
      return false;
    }
    if (ch === 63 || ch === 45) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
        return false;
      }
    }
    state.kind = "scalar";
    state.result = "";
    captureStart = captureEnd = state.position;
    hasPendingContent = false;
    while (ch !== 0) {
      if (ch === 58) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
          break;
        }
      } else if (ch === 35) {
        const preceding = state.input.charCodeAt(state.position - 1);
        if (isWsOrEol(preceding)) {
          break;
        }
      } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch)) {
        break;
      } else if (isEol(ch)) {
        _line = state.line;
        _lineStart = state.lineStart;
        _lineIndent = state.lineIndent;
        skipSeparationSpace(state, false, -1);
        if (state.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        } else {
          state.position = captureEnd;
          state.line = _line;
          state.lineStart = _lineStart;
          state.lineIndent = _lineIndent;
          break;
        }
      }
      if (hasPendingContent) {
        captureSegment(state, captureStart, captureEnd, false);
        writeFoldedLines(state, state.line - _line);
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
      }
      if (!isWhiteSpace(ch)) {
        captureEnd = state.position + 1;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, captureEnd, false);
    if (state.result) {
      return true;
    }
    state.kind = _kind;
    state.result = _result;
    return false;
  }
  function readSingleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 39) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 39) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (ch === 39) {
          captureStart = state.position;
          state.position++;
          captureEnd = state.position;
        } else {
          return true;
        }
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a single quoted scalar");
      } else {
        state.position++;
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position;
        }
      }
    }
    throwError(state, "unexpected end of the stream within a single quoted scalar");
  }
  function readDoubleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 34) {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 34) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;
      } else if (ch === 92) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (isEol(ch)) {
          skipSeparationSpace(state, false, nodeIndent);
        } else if (ch < 256 && simpleEscapeCheck[ch]) {
          state.result += simpleEscapeMap[ch];
          state.position++;
        } else if ((tmp = escapedHexLen(ch)) > 0) {
          let hexLength = tmp;
          let hexResult = 0;
          for (;hexLength > 0; hexLength--) {
            ch = state.input.charCodeAt(++state.position);
            if ((tmp = fromHexCode(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;
            } else {
              throwError(state, "expected hexadecimal character");
            }
          }
          state.result += charFromCodepoint(hexResult);
          state.position++;
        } else {
          throwError(state, "unknown escape sequence");
        }
        captureStart = captureEnd = state.position;
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, "unexpected end of the document within a double quoted scalar");
      } else {
        state.position++;
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position;
        }
      }
    }
    throwError(state, "unexpected end of the stream within a double quoted scalar");
  }
  function readFlowCollection(state, nodeIndent) {
    let readNext = true;
    let _line;
    let _lineStart;
    let _pos;
    const _tag = state.tag;
    let _result;
    const _anchor = state.anchor;
    let terminator;
    let isPair;
    let isExplicitPair;
    let isMapping;
    const overridableKeys = /* @__PURE__ */ Object.create(null);
    let keyNode;
    let keyTag;
    let valueNode;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 91) {
      terminator = 93;
      isMapping = false;
      _result = [];
    } else if (ch === 123) {
      terminator = 125;
      isMapping = true;
      _result = {};
    } else {
      return false;
    }
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    ch = state.input.charCodeAt(++state.position);
    while (ch !== 0) {
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === terminator) {
        state.position++;
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = isMapping ? "mapping" : "sequence";
        state.result = _result;
        return true;
      } else if (!readNext) {
        throwError(state, "missed comma between flow collection entries");
      } else if (ch === 44) {
        throwError(state, "expected the node content, but found ','");
      }
      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;
      if (ch === 63) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following)) {
          isPair = isExplicitPair = true;
          state.position++;
          skipSeparationSpace(state, true, nodeIndent);
        }
      }
      _line = state.line;
      _lineStart = state.lineStart;
      _pos = state.position;
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state.tag;
      keyNode = state.result;
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if ((isExplicitPair || state.line === _line) && ch === 58) {
        isPair = true;
        ch = state.input.charCodeAt(++state.position);
        skipSeparationSpace(state, true, nodeIndent);
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state.result;
      }
      if (isMapping) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
      } else if (isPair) {
        _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
      } else {
        _result.push(keyNode);
      }
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === 44) {
        readNext = true;
        ch = state.input.charCodeAt(++state.position);
      } else {
        readNext = false;
      }
    }
    throwError(state, "unexpected end of the stream within a flow collection");
  }
  function readBlockScalar(state, nodeIndent) {
    let folding;
    let chomping = CHOMPING_CLIP;
    let didReadContent = false;
    let detectedIndent = false;
    let textIndent = nodeIndent;
    let emptyLines = 0;
    let atMoreIndented = false;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 124) {
      folding = false;
    } else if (ch === 62) {
      folding = true;
    } else {
      return false;
    }
    state.kind = "scalar";
    state.result = "";
    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
      if (ch === 43 || ch === 45) {
        if (CHOMPING_CLIP === chomping) {
          chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throwError(state, "repeat of a chomping mode identifier");
        }
      } else if ((tmp = fromDecimalCode(ch)) >= 0) {
        if (tmp === 0) {
          throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throwError(state, "repeat of an indentation width identifier");
        }
      } else {
        break;
      }
    }
    if (isWhiteSpace(ch)) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (isWhiteSpace(ch));
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (!isEol(ch) && ch !== 0);
      }
    }
    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;
      ch = state.input.charCodeAt(state.position);
      while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
      if (!detectedIndent && state.lineIndent > textIndent) {
        textIndent = state.lineIndent;
      }
      if (isEol(ch)) {
        emptyLines++;
        continue;
      }
      if (!detectedIndent && textIndent === 0) {
        throwError(state, "missing indentation for block scalar");
      }
      if (state.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP) {
          state.result += common2.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            state.result += `
`;
          }
        }
        break;
      }
      if (folding) {
        if (isWhiteSpace(ch)) {
          atMoreIndented = true;
          state.result += common2.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common2.repeat(`
`, emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent) {
            state.result += " ";
          }
        } else {
          state.result += common2.repeat(`
`, emptyLines);
        }
      } else {
        state.result += common2.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
      }
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      const captureStart = state.position;
      while (!isEol(ch) && ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, state.position, false);
    }
    return true;
  }
  function readBlockSequence(state, nodeIndent) {
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = [];
    let detected = false;
    if (state.firstTabInLine !== -1)
      return false;
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (ch !== 45) {
        break;
      }
      const following = state.input.charCodeAt(state.position + 1);
      if (!isWsOrEol(following)) {
        break;
      }
      detected = true;
      state.position++;
      if (skipSeparationSpace(state, true, -1)) {
        if (state.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state.input.charCodeAt(state.position);
          continue;
        }
      }
      const _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state.result);
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a sequence entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "sequence";
      state.result = _result;
      return true;
    }
    return false;
  }
  function readBlockMapping(state, nodeIndent, flowIndent) {
    let allowCompact;
    let _keyLine;
    let _keyLineStart;
    let _keyPos;
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = {};
    const overridableKeys = /* @__PURE__ */ Object.create(null);
    let keyTag = null;
    let keyNode = null;
    let valueNode = null;
    let atExplicitKey = false;
    let detected = false;
    if (state.firstTabInLine !== -1)
      return false;
    if (state.anchor !== null) {
      storeAnchor(state, state.anchor, _result);
    }
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (!atExplicitKey && state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      const following = state.input.charCodeAt(state.position + 1);
      const _line = state.line;
      if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
        if (ch === 63) {
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
        }
        state.position += 1;
        ch = following;
      } else {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
        if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          break;
        }
        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);
          while (isWhiteSpace(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 58) {
            ch = state.input.charCodeAt(++state.position);
            if (!isWsOrEol(ch)) {
              throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
            }
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state.tag;
            keyNode = state.result;
          } else if (detected) {
            throwError(state, "can not read an implicit mapping pair; a colon is missed");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        } else if (detected) {
          throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      }
      if (state.line === _line || state.lineIndent > nodeIndent) {
        if (atExplicitKey) {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
        }
        if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
          if (atExplicitKey) {
            keyNode = state.result;
          } else {
            valueNode = state.result;
          }
        }
        if (!atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
      }
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a mapping entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }
    if (atExplicitKey) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "mapping";
      state.result = _result;
    }
    return detected;
  }
  function readTagProperty(state) {
    let isVerbatim = false;
    let isNamed = false;
    let tagHandle;
    let tagName;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 33)
      return false;
    if (state.tag !== null) {
      throwError(state, "duplication of a tag property");
    }
    ch = state.input.charCodeAt(++state.position);
    if (ch === 60) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 33) {
      isNamed = true;
      tagHandle = "!!";
      ch = state.input.charCodeAt(++state.position);
    } else {
      tagHandle = "!";
    }
    let _position = state.position;
    if (isVerbatim) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0 && ch !== 62);
      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else {
        throwError(state, "unexpected end of the stream within a verbatim tag");
      }
    } else {
      while (ch !== 0 && !isWsOrEol(ch)) {
        if (ch === 33) {
          if (!isNamed) {
            tagHandle = state.input.slice(_position - 1, state.position + 1);
            if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
              throwError(state, "named tag handle cannot contain such characters");
            }
            isNamed = true;
            _position = state.position + 1;
          } else {
            throwError(state, "tag suffix cannot contain exclamation marks");
          }
        }
        ch = state.input.charCodeAt(++state.position);
      }
      tagName = state.input.slice(_position, state.position);
      if (PATTERN_FLOW_INDICATORS.test(tagName)) {
        throwError(state, "tag suffix cannot contain flow indicator characters");
      }
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
      throwError(state, "tag name cannot contain such characters: " + tagName);
    }
    try {
      tagName = decodeURIComponent(tagName);
    } catch (err) {
      throwError(state, "tag name is malformed: " + tagName);
    }
    if (isVerbatim) {
      state.tag = tagName;
    } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
      state.tag = state.tagMap[tagHandle] + tagName;
    } else if (tagHandle === "!") {
      state.tag = "!" + tagName;
    } else if (tagHandle === "!!") {
      state.tag = "tag:yaml.org,2002:" + tagName;
    } else {
      throwError(state, 'undeclared tag handle "' + tagHandle + '"');
    }
    return true;
  }
  function readAnchorProperty(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 38)
      return false;
    if (state.anchor !== null) {
      throwError(state, "duplication of an anchor property");
    }
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an anchor node must contain at least one character");
    }
    state.anchor = state.input.slice(_position, state.position);
    return true;
  }
  function readAlias(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 42)
      return false;
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
      throwError(state, "name of an alias node must contain at least one character");
    }
    const alias = state.input.slice(_position, state.position);
    if (!_hasOwnProperty.call(state.anchorMap, alias)) {
      throwError(state, 'unidentified alias "' + alias + '"');
    }
    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
  }
  function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
    const fallbackState = snapshotState(state);
    beginAnchorTransaction(state);
    restoreState(state, propertyStart);
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
      commitAnchorTransaction(state);
      return true;
    }
    rollbackAnchorTransaction(state);
    restoreState(state, fallbackState);
    return false;
  }
  function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
    let allowBlockScalars;
    let allowBlockCollections;
    let indentStatus = 1;
    let atNewLine = false;
    let hasContent = false;
    let propertyStart = null;
    let type2;
    let flowIndent;
    let blockIndent;
    if (state.depth >= state.maxDepth) {
      throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
    }
    state.depth += 1;
    if (state.listener !== null) {
      state.listener("open", state);
    }
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    if (allowToSeek) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      }
    }
    if (indentStatus === 1) {
      while (true) {
        const ch = state.input.charCodeAt(state.position);
        const propertyState = snapshotState(state);
        if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null)) {
          break;
        }
        if (!readTagProperty(state) && !readAnchorProperty(state)) {
          break;
        }
        if (propertyStart === null) {
          propertyStart = propertyState;
        }
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        } else {
          allowBlockCollections = false;
        }
      }
    }
    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
        flowIndent = parentIndent;
      } else {
        flowIndent = parentIndent + 1;
      }
      blockIndent = state.position - state.lineStart;
      if (indentStatus === 1) {
        if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
          hasContent = true;
        } else {
          const ch = state.input.charCodeAt(state.position);
          if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(state, propertyStart, propertyStart.position - propertyStart.lineStart, flowIndent)) {
            hasContent = true;
          } else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
            hasContent = true;
          } else if (readAlias(state)) {
            hasContent = true;
            if (state.tag !== null || state.anchor !== null) {
              throwError(state, "alias node should not have any properties");
            }
          } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
            hasContent = true;
            if (state.tag === null) {
              state.tag = "?";
            }
          }
          if (state.anchor !== null) {
            storeAnchor(state, state.anchor, state.result);
          }
        }
      } else if (indentStatus === 0) {
        hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
      }
    }
    if (state.tag === null) {
      if (state.anchor !== null) {
        storeAnchor(state, state.anchor, state.result);
      }
    } else if (state.tag === "?") {
      if (state.result !== null && state.kind !== "scalar") {
        throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
      }
      for (let typeIndex = 0, typeQuantity = state.implicitTypes.length;typeIndex < typeQuantity; typeIndex += 1) {
        type2 = state.implicitTypes[typeIndex];
        if (type2.resolve(state.result)) {
          state.result = type2.construct(state.result);
          state.tag = type2.tag;
          if (state.anchor !== null) {
            storeAnchor(state, state.anchor, state.result);
          }
          break;
        }
      }
    } else if (state.tag !== "!") {
      if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
        type2 = state.typeMap[state.kind || "fallback"][state.tag];
      } else {
        type2 = null;
        const typeList = state.typeMap.multi[state.kind || "fallback"];
        for (let typeIndex = 0, typeQuantity = typeList.length;typeIndex < typeQuantity; typeIndex += 1) {
          if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
            type2 = typeList[typeIndex];
            break;
          }
        }
      }
      if (!type2) {
        throwError(state, "unknown tag !<" + state.tag + ">");
      }
      if (state.result !== null && type2.kind !== state.kind) {
        throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
      }
      if (!type2.resolve(state.result, state.tag)) {
        throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
      } else {
        state.result = type2.construct(state.result, state.tag);
        if (state.anchor !== null) {
          storeAnchor(state, state.anchor, state.result);
        }
      }
    }
    if (state.listener !== null) {
      state.listener("close", state);
    }
    state.depth -= 1;
    return state.tag !== null || state.anchor !== null || hasContent;
  }
  function readDocument(state) {
    const documentStart = state.position;
    let hasDirectives = false;
    let ch;
    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = /* @__PURE__ */ Object.create(null);
    state.anchorMap = /* @__PURE__ */ Object.create(null);
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if (state.lineIndent > 0 || ch !== 37) {
        break;
      }
      hasDirectives = true;
      ch = state.input.charCodeAt(++state.position);
      let _position = state.position;
      while (ch !== 0 && !isWsOrEol(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      const directiveName = state.input.slice(_position, state.position);
      const directiveArgs = [];
      if (directiveName.length < 1) {
        throwError(state, "directive name must not be less than one character in length");
      }
      while (ch !== 0) {
        while (isWhiteSpace(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0 && !isEol(ch));
          break;
        }
        if (isEol(ch))
          break;
        _position = state.position;
        while (ch !== 0 && !isWsOrEol(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveArgs.push(state.input.slice(_position, state.position));
      }
      if (ch !== 0)
        readLineBreak(state);
      if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      } else {
        throwWarning(state, 'unknown document directive "' + directiveName + '"');
      }
    }
    skipSeparationSpace(state, true, -1);
    if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    } else if (hasDirectives) {
      throwError(state, "directives end mark is expected");
    }
    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);
    if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
      throwWarning(state, "non-ASCII line breaks are interpreted as content");
    }
    state.documents.push(state.result);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      if (state.input.charCodeAt(state.position) === 46) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }
    if (state.position < state.length - 1) {
      throwError(state, "end of the stream or a document separator is expected");
    }
  }
  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
      if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
        input += `
`;
      }
      if (input.charCodeAt(0) === 65279) {
        input = input.slice(1);
      }
    }
    const state = new State(input, options);
    const nullpos = input.indexOf("\x00");
    if (nullpos !== -1) {
      state.position = nullpos;
      throwError(state, "null byte is not allowed in input");
    }
    state.input += "\x00";
    while (state.input.charCodeAt(state.position) === 32) {
      state.lineIndent += 1;
      state.position += 1;
    }
    while (state.position < state.length - 1) {
      readDocument(state);
    }
    return state.documents;
  }
  function loadAll2(input, iterator, options) {
    if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
      options = iterator;
      iterator = null;
    }
    const documents = loadDocuments(input, options);
    if (typeof iterator !== "function") {
      return documents;
    }
    for (let index = 0, length = documents.length;index < length; index += 1) {
      iterator(documents[index]);
    }
  }
  function load2(input, options) {
    const documents = loadDocuments(input, options);
    if (documents.length === 0) {
      return;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new YAMLException2("expected a single document in the stream, but found more");
  }
  loader.loadAll = loadAll2;
  loader.load = load2;
  return loader;
}
var dumper = {};
var hasRequiredDumper;
function requireDumper() {
  if (hasRequiredDumper)
    return dumper;
  hasRequiredDumper = 1;
  const common2 = requireCommon();
  const YAMLException2 = requireException();
  const DEFAULT_SCHEMA2 = require_default();
  const _toString = Object.prototype.toString;
  const _hasOwnProperty = Object.prototype.hasOwnProperty;
  const CHAR_BOM = 65279;
  const CHAR_TAB = 9;
  const CHAR_LINE_FEED = 10;
  const CHAR_CARRIAGE_RETURN = 13;
  const CHAR_SPACE = 32;
  const CHAR_EXCLAMATION = 33;
  const CHAR_DOUBLE_QUOTE = 34;
  const CHAR_SHARP = 35;
  const CHAR_PERCENT = 37;
  const CHAR_AMPERSAND = 38;
  const CHAR_SINGLE_QUOTE = 39;
  const CHAR_ASTERISK = 42;
  const CHAR_COMMA = 44;
  const CHAR_MINUS = 45;
  const CHAR_COLON = 58;
  const CHAR_EQUALS = 61;
  const CHAR_GREATER_THAN = 62;
  const CHAR_QUESTION = 63;
  const CHAR_COMMERCIAL_AT = 64;
  const CHAR_LEFT_SQUARE_BRACKET = 91;
  const CHAR_RIGHT_SQUARE_BRACKET = 93;
  const CHAR_GRAVE_ACCENT = 96;
  const CHAR_LEFT_CURLY_BRACKET = 123;
  const CHAR_VERTICAL_LINE = 124;
  const CHAR_RIGHT_CURLY_BRACKET = 125;
  const ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0] = "\\0";
  ESCAPE_SEQUENCES[7] = "\\a";
  ESCAPE_SEQUENCES[8] = "\\b";
  ESCAPE_SEQUENCES[9] = "\\t";
  ESCAPE_SEQUENCES[10] = "\\n";
  ESCAPE_SEQUENCES[11] = "\\v";
  ESCAPE_SEQUENCES[12] = "\\f";
  ESCAPE_SEQUENCES[13] = "\\r";
  ESCAPE_SEQUENCES[27] = "\\e";
  ESCAPE_SEQUENCES[34] = "\\\"";
  ESCAPE_SEQUENCES[92] = "\\\\";
  ESCAPE_SEQUENCES[133] = "\\N";
  ESCAPE_SEQUENCES[160] = "\\_";
  ESCAPE_SEQUENCES[8232] = "\\L";
  ESCAPE_SEQUENCES[8233] = "\\P";
  const DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  const DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  function compileStyleMap(schema2, map2) {
    if (map2 === null)
      return {};
    const result = {};
    const keys = Object.keys(map2);
    for (let index = 0, length = keys.length;index < length; index += 1) {
      let tag = keys[index];
      let style = String(map2[tag]);
      if (tag.slice(0, 2) === "!!") {
        tag = "tag:yaml.org,2002:" + tag.slice(2);
      }
      const type2 = schema2.compiledTypeMap["fallback"][tag];
      if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
        style = type2.styleAliases[style];
      }
      result[tag] = style;
    }
    return result;
  }
  function encodeHex(character) {
    let handle;
    let length;
    const string = character.toString(16).toUpperCase();
    if (character <= 255) {
      handle = "x";
      length = 2;
    } else if (character <= 65535) {
      handle = "u";
      length = 4;
    } else if (character <= 4294967295) {
      handle = "U";
      length = 8;
    } else {
      throw new YAMLException2("code point within a string may not be greater than 0xFFFFFFFF");
    }
    return "\\" + handle + common2.repeat("0", length - string.length) + string;
  }
  const QUOTING_TYPE_SINGLE = 1;
  const QUOTING_TYPE_DOUBLE = 2;
  function State(options) {
    this.schema = options["schema"] || DEFAULT_SCHEMA2;
    this.indent = Math.max(1, options["indent"] || 2);
    this.noArrayIndent = options["noArrayIndent"] || false;
    this.skipInvalid = options["skipInvalid"] || false;
    this.flowLevel = common2.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
    this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
    this.sortKeys = options["sortKeys"] || false;
    this.lineWidth = options["lineWidth"] || 80;
    this.noRefs = options["noRefs"] || false;
    this.noCompatMode = options["noCompatMode"] || false;
    this.condenseFlow = options["condenseFlow"] || false;
    this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
    this.forceQuotes = options["forceQuotes"] || false;
    this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;
    this.tag = null;
    this.result = "";
    this.duplicates = [];
    this.usedDuplicates = null;
  }
  function indentString(string, spaces) {
    const ind = common2.repeat(" ", spaces);
    let position = 0;
    let result = "";
    const length = string.length;
    while (position < length) {
      let line;
      const next = string.indexOf(`
`, position);
      if (next === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next + 1);
        position = next + 1;
      }
      if (line.length && line !== `
`)
        result += ind;
      result += line;
    }
    return result;
  }
  function generateNextLine(state, level) {
    return `
` + common2.repeat(" ", state.indent * level);
  }
  function testImplicitResolving(state, str2) {
    for (let index = 0, length = state.implicitTypes.length;index < length; index += 1) {
      const type2 = state.implicitTypes[index];
      if (type2.resolve(str2)) {
        return true;
      }
    }
    return false;
  }
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }
  function isPrintable(c) {
    return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
  }
  function isNsCharOrWhitespace(c) {
    return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
  }
  function isPlainSafe(c, prev, inblock) {
    const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
    const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
    return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar;
  }
  function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
  }
  function isPlainSafeLast(c) {
    return !isWhitespace(c) && c !== CHAR_COLON;
  }
  function codePointAt(string, pos) {
    const first = string.charCodeAt(pos);
    let second;
    if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
      second = string.charCodeAt(pos + 1);
      if (second >= 56320 && second <= 57343) {
        return (first - 55296) * 1024 + second - 56320 + 65536;
      }
    }
    return first;
  }
  function needIndentIndicator(string) {
    const leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }
  const STYLE_PLAIN = 1;
  const STYLE_SINGLE = 2;
  const STYLE_LITERAL = 3;
  const STYLE_FOLDED = 4;
  const STYLE_DOUBLE = 5;
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
    let i;
    let char = 0;
    let prevChar = null;
    let hasLineBreak = false;
    let hasFoldableLine = false;
    const shouldTrackWidth = lineWidth !== -1;
    let previousLineBreak = -1;
    let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
    if (singleLineOnly || forceQuotes) {
      for (i = 0;i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
    } else {
      for (i = 0;i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
      hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
    }
    if (!hasLineBreak && !hasFoldableLine) {
      if (plain && !forceQuotes && !testAmbiguousType(string)) {
        return STYLE_PLAIN;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    if (!forceQuotes) {
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  function writeScalar(state, string, level, iskey, inblock) {
    state.dump = function() {
      if (string.length === 0) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
      }
      if (!state.noCompatMode) {
        if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
        }
      }
      const indent = state.indent * Math.max(1, level);
      const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
      const singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
      function testAmbiguity(string2) {
        return testImplicitResolving(state, string2);
      }
      switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity, state.quotingType, state.forceQuotes && !iskey, inblock)) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string) + '"';
        default:
          throw new YAMLException2("impossible error: invalid scalar style");
      }
    }();
  }
  function blockHeader(string, indentPerLevel) {
    const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
    const clip = string[string.length - 1] === `
`;
    const keep = clip && (string[string.length - 2] === `
` || string === `
`);
    const chomp = keep ? "+" : clip ? "" : "-";
    return indentIndicator + chomp + `
`;
  }
  function dropEndingNewline(string) {
    return string[string.length - 1] === `
` ? string.slice(0, -1) : string;
  }
  function foldString(string, width) {
    const lineRe = /(\n+)([^\n]*)/g;
    let result = function() {
      let nextLF = string.indexOf(`
`);
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    }();
    let prevMoreIndented = string[0] === `
` || string[0] === " ";
    let moreIndented;
    let match;
    while (match = lineRe.exec(string)) {
      const prefix = match[1];
      const line = match[2];
      moreIndented = line[0] === " ";
      result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? `
` : "") + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }
    return result;
  }
  function foldLine(line, width) {
    if (line === "" || line[0] === " ")
      return line;
    const breakRe = / [^ ]/g;
    let match;
    let start = 0;
    let end;
    let curr = 0;
    let next = 0;
    let result = "";
    while (match = breakRe.exec(line)) {
      next = match.index;
      if (next - start > width) {
        end = curr > start ? curr : next;
        result += `
` + line.slice(start, end);
        start = end + 1;
      }
      curr = next;
    }
    result += `
`;
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + `
` + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }
    return result.slice(1);
  }
  function escapeString(string) {
    let result = "";
    let char = 0;
    for (let i = 0;i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      const escapeSeq = ESCAPE_SEQUENCES[char];
      if (!escapeSeq && isPrintable(char)) {
        result += string[i];
        if (char >= 65536)
          result += string[i + 1];
      } else {
        result += escapeSeq || encodeHex(char);
      }
    }
    return result;
  }
  function writeFlowSequence(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length;index < length; index += 1) {
      let value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
        if (_result !== "")
          _result += "," + (!state.condenseFlow ? " " : "");
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = "[" + _result + "]";
  }
  function writeBlockSequence(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length;index < length; index += 1) {
      let value = object[index];
      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }
      if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
        if (!compact || _result !== "") {
          _result += generateNextLine(state, level);
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          _result += "-";
        } else {
          _result += "- ";
        }
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = _result || "[]";
  }
  function writeFlowMapping(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    for (let index = 0, length = objectKeyList.length;index < length; index += 1) {
      let pairBuffer = "";
      if (_result !== "")
        pairBuffer += ", ";
      if (state.condenseFlow)
        pairBuffer += '"';
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level, objectKey, false, false)) {
        continue;
      }
      if (state.dump.length > 1024)
        pairBuffer += "? ";
      pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
      if (!writeNode(state, level, objectValue, false, false)) {
        continue;
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = "{" + _result + "}";
  }
  function writeBlockMapping(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    if (state.sortKeys === true) {
      objectKeyList.sort();
    } else if (typeof state.sortKeys === "function") {
      objectKeyList.sort(state.sortKeys);
    } else if (state.sortKeys) {
      throw new YAMLException2("sortKeys must be a boolean or a function");
    }
    for (let index = 0, length = objectKeyList.length;index < length; index += 1) {
      let pairBuffer = "";
      if (!compact || _result !== "") {
        pairBuffer += generateNextLine(state, level);
      }
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }
      if (!writeNode(state, level + 1, objectKey, true, true, true)) {
        continue;
      }
      const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
      if (explicitPair) {
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += "?";
        } else {
          pairBuffer += "? ";
        }
      }
      pairBuffer += state.dump;
      if (explicitPair) {
        pairBuffer += generateNextLine(state, level);
      }
      if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
        continue;
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += ":";
      } else {
        pairBuffer += ": ";
      }
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = _result || "{}";
  }
  function detectType(state, object, explicit) {
    const typeList = explicit ? state.explicitTypes : state.implicitTypes;
    for (let index = 0, length = typeList.length;index < length; index += 1) {
      const type2 = typeList[index];
      if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
        if (explicit) {
          if (type2.multi && type2.representName) {
            state.tag = type2.representName(object);
          } else {
            state.tag = type2.tag;
          }
        } else {
          state.tag = "?";
        }
        if (type2.represent) {
          const style = state.styleMap[type2.tag] || type2.defaultStyle;
          let _result;
          if (_toString.call(type2.represent) === "[object Function]") {
            _result = type2.represent(object, style);
          } else if (_hasOwnProperty.call(type2.represent, style)) {
            _result = type2.represent[style](object, style);
          } else {
            throw new YAMLException2("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
          }
          state.dump = _result;
        }
        return true;
      }
    }
    return false;
  }
  function writeNode(state, level, object, block, compact, iskey, isblockseq) {
    state.tag = null;
    state.dump = object;
    if (!detectType(state, object, false)) {
      detectType(state, object, true);
    }
    const type2 = _toString.call(state.dump);
    const inblock = block;
    if (block) {
      block = state.flowLevel < 0 || state.flowLevel > level;
    }
    const objectOrArray = type2 === "[object Object]" || type2 === "[object Array]";
    let duplicateIndex;
    let duplicate;
    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }
    if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
      compact = false;
    }
    if (duplicate && state.usedDuplicates[duplicateIndex]) {
      state.dump = "*ref_" + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
        state.usedDuplicates[duplicateIndex] = true;
      }
      if (type2 === "[object Object]") {
        if (block && Object.keys(state.dump).length !== 0) {
          writeBlockMapping(state, level, state.dump, compact);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowMapping(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object Array]") {
        if (block && state.dump.length !== 0) {
          if (state.noArrayIndent && !isblockseq && level > 0) {
            writeBlockSequence(state, level - 1, state.dump, compact);
          } else {
            writeBlockSequence(state, level, state.dump, compact);
          }
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowSequence(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type2 === "[object String]") {
        if (state.tag !== "?") {
          writeScalar(state, state.dump, level, iskey, inblock);
        }
      } else if (type2 === "[object Undefined]") {
        return false;
      } else {
        if (state.skipInvalid)
          return false;
        throw new YAMLException2("unacceptable kind of an object to dump " + type2);
      }
      if (state.tag !== null && state.tag !== "?") {
        let tagStr = encodeURI(state.tag[0] === "!" ? state.tag.slice(1) : state.tag).replace(/!/g, "%21");
        if (state.tag[0] === "!") {
          tagStr = "!" + tagStr;
        } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
          tagStr = "!!" + tagStr.slice(18);
        } else {
          tagStr = "!<" + tagStr + ">";
        }
        state.dump = tagStr + " " + state.dump;
      }
    }
    return true;
  }
  function getDuplicateReferences(object, state) {
    const objects = [];
    const duplicatesIndexes = [];
    inspectNode(object, objects, duplicatesIndexes);
    const length = duplicatesIndexes.length;
    for (let index = 0;index < length; index += 1) {
      state.duplicates.push(objects[duplicatesIndexes[index]]);
    }
    state.usedDuplicates = new Array(length);
  }
  function inspectNode(object, objects, duplicatesIndexes) {
    if (object !== null && typeof object === "object") {
      const index = objects.indexOf(object);
      if (index !== -1) {
        if (duplicatesIndexes.indexOf(index) === -1) {
          duplicatesIndexes.push(index);
        }
      } else {
        objects.push(object);
        if (Array.isArray(object)) {
          for (let i = 0, length = object.length;i < length; i += 1) {
            inspectNode(object[i], objects, duplicatesIndexes);
          }
        } else {
          const objectKeyList = Object.keys(object);
          for (let i = 0, length = objectKeyList.length;i < length; i += 1) {
            inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
          }
        }
      }
    }
  }
  function dump2(input, options) {
    options = options || {};
    const state = new State(options);
    if (!state.noRefs)
      getDuplicateReferences(input, state);
    let value = input;
    if (state.replacer) {
      value = state.replacer.call({ "": value }, "", value);
    }
    if (writeNode(state, 0, value, true, true))
      return state.dump + `
`;
    return "";
  }
  dumper.dump = dump2;
  return dumper;
}
var hasRequiredJsYaml;
function requireJsYaml() {
  if (hasRequiredJsYaml)
    return jsYaml;
  hasRequiredJsYaml = 1;
  const loader2 = requireLoader();
  const dumper2 = requireDumper();
  function renamed(from, to) {
    return function() {
      throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
    };
  }
  jsYaml.Type = requireType();
  jsYaml.Schema = requireSchema();
  jsYaml.FAILSAFE_SCHEMA = requireFailsafe();
  jsYaml.JSON_SCHEMA = requireJson();
  jsYaml.CORE_SCHEMA = requireCore();
  jsYaml.DEFAULT_SCHEMA = require_default();
  jsYaml.load = loader2.load;
  jsYaml.loadAll = loader2.loadAll;
  jsYaml.dump = dumper2.dump;
  jsYaml.YAMLException = requireException();
  jsYaml.types = {
    binary: requireBinary(),
    float: requireFloat(),
    map: requireMap(),
    null: require_null(),
    pairs: requirePairs(),
    set: requireSet(),
    timestamp: requireTimestamp(),
    bool: requireBool(),
    int: requireInt(),
    merge: requireMerge(),
    omap: requireOmap(),
    seq: requireSeq(),
    str: requireStr()
  };
  jsYaml.safeLoad = renamed("safeLoad", "load");
  jsYaml.safeLoadAll = renamed("safeLoadAll", "loadAll");
  jsYaml.safeDump = renamed("safeDump", "dump");
  return jsYaml;
}
var jsYamlExports = requireJsYaml();
var yaml = /* @__PURE__ */ getDefaultExportFromCjs(jsYamlExports);
var {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
} = yaml;

// node_modules/warp/src/engine/loader.ts
var ENTRY_RE = /^\s*(?:\[[^\]]*\]\s*)?warp[-_ ]?ruleset\b/i;
var BOOK_RE = /^\s*warp[-_ ]?ruleset\b/i;
function isRulesetEntryTitle(comment) {
  return !!comment && ENTRY_RE.test(comment);
}
function isRulesetBookName(name) {
  return !!name && BOOK_RE.test(name);
}
function stripFences(s) {
  const m = /^\s*```[a-z]*\s*\n([\s\S]*?)\n?```\s*$/i.exec(s);
  return m ? m[1] : s;
}
var isObj2 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
function deepMerge(a, b) {
  if (Array.isArray(a) && Array.isArray(b))
    return [...a, ...b];
  if (isObj2(a) && isObj2(b)) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b))
      out[k] = k in out ? deepMerge(out[k], v) : v;
    return out;
  }
  if (isObj2(a) && b === true)
    return a;
  return b === undefined ? a : b;
}
function loadRuleset(parts) {
  const issues = [];
  let merged = {};
  const sorted = [...parts].sort((x, y) => x.order - y.order || x.label.localeCompare(y.label));
  for (const p of sorted) {
    const text = stripFences(p.content ?? "");
    if (!text.trim())
      continue;
    try {
      const doc = yaml.load(text, { schema: yaml.CORE_SCHEMA });
      if (doc === null || doc === undefined)
        continue;
      if (!isObj2(doc)) {
        issues.push({ level: "error", where: p.label, message: "should be YAML key/value pairs (like `stats:`), not a list or plain text" });
        continue;
      }
      merged = deepMerge(merged, doc);
    } catch (e) {
      const err = e;
      const where = err.mark ? `${p.label}, line ${err.mark.line + 1}` : p.label;
      issues.push({ level: "error", where, message: `YAML couldn't be read: ${err.reason ?? err.message ?? "syntax error"}. This entry was skipped.` });
    }
  }
  if (!parts.length)
    return { ruleset: null, issues };
  const { ruleset, issues: more } = normalizeRuleset(merged);
  return { ruleset, issues: [...issues, ...more] };
}
// node_modules/warp/src/engine/world.ts
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function ordinal(n) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}
function dateAt(r, minutes) {
  const start = r.clock.startDate;
  if (!start)
    return null;
  let month = start.month - 1;
  const elapsed = Math.floor(minutes / 1440) - Math.floor(r.clock.start / 1440);
  let day = start.day - 1 + Math.max(0, elapsed);
  while (day >= MONTH_DAYS[month]) {
    day -= MONTH_DAYS[month];
    month = (month + 1) % 12;
  }
  return { month: month + 1, day: day + 1, monthName: MONTH_NAMES[month] };
}
var SEASONS = { spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11], winter: [12, 1, 2] };
function seasonAt(r, minutes) {
  const d = dateAt(r, minutes);
  if (!d)
    return null;
  for (const [season, months] of Object.entries(SEASONS))
    if (months.includes(d.month))
      return season;
  return null;
}
function isIndoors(r, s) {
  return !!(s.location && r.locations[s.location]?.indoors);
}
var SCENE_HOLDS = 6 * 60;
function sceneWord(s, id) {
  const w = s.scene?.[id];
  return w && w.loc === s.location && s.minutes - w.at <= SCENE_HOLDS ? w.here : null;
}
function presentPeople(_r, s, _env) {
  const out = [];
  for (const id of Object.keys(s.people)) {
    if (s.forgotten[id])
      continue;
    if (sceneWord(s, id))
      out.push(id);
  }
  return out;
}

// node_modules/warp/src/engine/state.ts
function initialState(r) {
  const s = {
    encounter: null,
    charges: {},
    calibrated: {},
    forgotten: {},
    stats: {},
    flags: {},
    items: { ...r.startItems },
    itemNames: {},
    rel: {},
    people: {},
    location: r.startLocation,
    locationName: r.startLocation ? r.locations[r.startLocation]?.name ?? r.startLocation : null,
    minutes: r.clock.start,
    conditions: {},
    triggers: {},
    turn: 0,
    secrets: {},
    notices: [],
    adults: {},
    practice: {},
    practiceUse: {},
    scene: {},
    lastLocation: null,
    uses: {},
    pconds: {},
    quests: {},
    memories: {}
  };
  for (const id of r.statOrder)
    s.stats[id] = r.stats[id].start;
  for (const id of r.statOrder) {
    const def = r.stats[id];
    if (!def.maxExpr && def.startExpr === undefined)
      continue;
    const v = def.startExpr !== undefined ? evalNumber(def.startExpr, makeEnv(r, s), def.start) : def.start;
    s.stats[id] = Math.min(statMax(r, def, s), Math.max(def.min, Number.isFinite(v) ? v : def.start));
  }
  for (const sec of Object.values(r.secrets)) {
    let open = -1;
    while (open + 1 < sec.stages.length && !sec.stages[open + 1].when)
      open++;
    s.secrets[sec.id] = open;
  }
  for (const f of Object.values(r.flags))
    s.flags[f.id] = f.start;
  for (const p of Object.values(r.people)) {
    s.people[p.id] = { name: p.name };
    s.rel[p.id] = {};
    for (const rs of r.relStatOrder)
      s.rel[p.id][rs] = p.start[rs] ?? r.relStats[rs].start;
    if (Object.keys(p.start).length)
      s.calibrated[p.id] = true;
  }
  return s;
}
function foeName(r, s) {
  if (!s.encounter)
    return "Opponent";
  return s.encounter.foeName ?? r.encounters[s.encounter.id]?.foe.name ?? "Opponent";
}
function statMax(r, def, s) {
  if (!def.maxExpr)
    return def.max;
  const m = evalNumber(def.maxExpr, makeEnv(r, s), def.max);
  return Math.max(def.min + 1, m);
}
function amountValue(v, env, max) {
  if (v === undefined)
    return 0;
  if (typeof v === "number")
    return v;
  const pm = /^\s*([+-]?)\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(v);
  if (pm)
    return max === undefined ? 0 : (pm[1] === "-" ? -1 : 1) * Number(pm[2]) / 100 * max;
  const n = evalNumber(v, env, 0);
  return Number.isFinite(n) ? n : 0;
}
var bonusDepth = 0;
function bonusSources(r, s, env) {
  if (bonusDepth > 2)
    return [];
  bonusDepth++;
  try {
    const e = env ?? makeEnv(r, s);
    const nums = (m) => {
      const out = {};
      for (const [k, v] of Object.entries(m)) {
        const n = amountValue(v, e);
        if (n)
          out[k] = n;
      }
      return out;
    };
    const out = [];
    for (const [id, n] of Object.entries(s.items)) {
      const it = r.items[id];
      if (!it || n <= 0 || !Object.keys(it.bonus).length)
        continue;
      out.push({ from: it.name, kind: "gear", id, bonus: nums(it.bonus) });
    }
    for (const id of Object.keys(s.conditions)) {
      const c = r.conditions[id];
      if (c && Object.keys(c.bonus).length)
        out.push({ from: c.label, kind: "cond", id, bonus: nums(c.bonus) });
    }
    return out;
  } finally {
    bonusDepth--;
  }
}
function effectiveStat(r, s, stat, env, gearOnly = false) {
  let n = 0;
  for (const src of bonusSources(r, s, env))
    if (!gearOnly || src.kind === "gear")
      n += src.bonus[stat] ?? 0;
  if (gearOnly)
    return n;
  const base = s.stats[stat] ?? r.stats[stat]?.start ?? 0;
  return base + n;
}
function dayOf(s) {
  return Math.floor(s.minutes / 1440);
}
function encounterKey(s) {
  return s.encounter ? `${s.encounter.id}@${s.encounter.at ?? 0}` : undefined;
}
function usesOf(s, key) {
  const c = s.charges?.[key];
  const enc = encounterKey(s);
  return { today: c && c.day === dayOf(s) ? c.n : 0, here: c && enc && c.enc === enc ? c.encN : 0 };
}
var BUILTIN_NAMES = [
  "minutes",
  "hour",
  "minute",
  "day",
  "weekday",
  "turn",
  "location",
  "month",
  "date",
  "season",
  "indoors",
  "outside",
  "in_encounter",
  "encounter",
  "encounter_round",
  "round",
  "momentum",
  "target"
];
function makeEnv(r, s, extra = {}) {
  const day = Math.floor(s.minutes / 1440);
  const date = dateAt(r, s.minutes);
  let world = null;
  const worldVars = () => {
    if (world)
      return world;
    const indoors = isIndoors(r, s);
    world = {
      month: date?.month ?? 0,
      date: date?.day ?? 0,
      season: seasonAt(r, s.minutes) ?? "",
      indoors,
      outside: !indoors,
      in_encounter: !!s.encounter,
      encounter: s.encounter?.id ?? "",
      encounter_round: s.encounter?.round ?? 0,
      momentum: s.encounter?.momentum ?? 0,
      round: s.encounter?.round ?? 0,
      target: ""
    };
    return world;
  };
  const clockVars = {
    minutes: s.minutes,
    hour: Math.floor(s.minutes % 1440 / 60),
    minute: s.minutes % 60,
    day: day + 1,
    weekday: r.clock.weekdays[day % r.clock.weekdays.length] ?? "",
    turn: s.turn,
    location: s.location ?? ""
  };
  const base = {
    lookup(path) {
      const [head, ...rest] = path;
      if (rest.length === 0) {
        if (head in extra)
          return extra[head];
        if (head in s.stats)
          return s.stats[head];
        if (r.stats[head])
          return r.stats[head].start;
        if (head in clockVars)
          return clockVars[head];
        if (head in s.flags)
          return s.flags[head];
        if (r.flags[head])
          return r.flags[head].start;
        const w = worldVars();
        if (head in w)
          return w[head];
        return;
      }
      if (head === "foe") {
        if (!s.encounter)
          return 0;
        const def = r.encounters[s.encounter.id]?.foe.stats.find((x) => x.id === rest[0]);
        return s.encounter.foe[rest[0]] ?? def?.start ?? 0;
      }
      if (head === "target" && typeof extra.target === "string" && rest.length === 1) {
        return s.rel[extra.target]?.[rest[0]] ?? r.relStats[rest[0]]?.start ?? 0;
      }
      if (head === "flags")
        return s.flags[rest[0]] ?? (r.flags[rest[0]] ? r.flags[rest[0]].start : false);
      if (head === "items")
        return s.items[rest[0]] ?? 0;
      if (head === "rel" && rest.length === 2)
        return s.rel[rest[0]]?.[rest[1]] ?? r.relStats[rest[1]]?.start ?? 0;
      if (s.rel[head] && rest.length === 1)
        return s.rel[head][rest[0]] ?? 0;
      if (r.people[head] && rest.length === 1)
        return r.relStats[rest[0]]?.start ?? 0;
      return;
    },
    call(name, args) {
      const a0 = String(args[0] ?? "");
      switch (name) {
        case "has":
          return (s.items[a0] ?? 0) >= (typeof args[1] === "number" ? args[1] : 1);
        case "count":
          return s.items[a0] ?? 0;
        case "flag":
          return s.flags[a0] ?? false;
        case "cond":
          return a0 in s.conditions;
        case "at":
          return s.location === a0;
        case "rel":
          return s.rel[a0]?.[String(args[1] ?? "")] ?? r.relStats[String(args[1] ?? "")]?.start ?? 0;
        case "met":
          return a0 in s.people;
        case "between": {
          const v = Number(args[0]);
          const lo = Number(args[1]);
          const hi = Number(args[2]);
          return lo <= hi ? v >= lo && v < hi : v >= lo || v < hi;
        }
        case "eff":
          return effectiveStat(r, s, a0, base);
        case "gear":
          return effectiveStat(r, s, a0, base, true);
        case "present":
          return presentPeople(r, s).includes(a0);
        case "secret":
          return (s.secrets[a0] ?? -1) + 1;
        case "age":
          return r.people[a0]?.age ?? 0;
        case "quest":
          return s.quests?.[a0]?.st ?? "";
        case "quest_active":
          return s.quests?.[a0]?.st === "active" || s.quests?.[a0]?.st === "ready";
        case "quest_done":
          return s.quests?.[a0]?.st === "done";
        case "quest_failed":
          return s.quests?.[a0]?.st === "failed";
        case "goal":
          return s.quests?.[a0]?.prog[String(args[1] ?? "")] ?? 0;
        case "quests_done":
          return Object.entries(s.quests ?? {}).filter(([id, q]) => q.st === "done" && (!args.length || r.quests[id]?.kind === a0)).length;
        case "memories":
          return s.memories?.[a0]?.length ?? 0;
        case "cond_of":
          return !!s.pconds?.[a0]?.[String(args[1] ?? "")];
        case "foe_cond":
          return !!s.encounter?.conds && a0 in s.encounter.conds;
        case "stat_max":
          return r.stats[a0] ? statMax(r, r.stats[a0], s) : 0;
        case "foe_max":
          return foeMaxOf(r, s, a0);
        case "in_encounter":
          return args.length ? s.encounter?.id === a0 : !!s.encounter;
      }
      return;
    }
  };
  return base;
}
function foeMaxOf(r, s, stat) {
  if (!s.encounter)
    return 0;
  return s.encounter.max?.[stat] ?? r.encounters[s.encounter.id]?.foe.stats.find((x) => x.id === stat)?.max ?? 0;
}
function bandFor(def, value, max) {
  let hit = null;
  const top = max ?? def.max;
  const v = def.pctBands ? top > def.min ? (value - def.min) / (top - def.min) * 100 : 0 : value;
  for (const b of def.bands)
    if (v >= b.at)
      hit = b;
  return hit ?? def.bands[0] ?? null;
}
function gradeFor(def, value, max) {
  if (!def.grades?.length)
    return null;
  const span = max - def.min;
  if (span <= 0)
    return def.grades[0];
  const idx = Math.min(def.grades.length - 1, Math.floor((value - def.min) / span * def.grades.length));
  return def.grades[Math.max(0, idx)];
}
function formatClock(r, minutes) {
  const day = Math.floor(minutes / 1440);
  const h = Math.floor(minutes % 1440 / 60);
  const m = minutes % 60;
  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const wd = r.clock.weekdays[day % r.clock.weekdays.length] ?? "";
  const dayLabel = `${wd} · Day ${day + 1}`;
  const phase = h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  return { label: `${dayLabel} · ${time}`, time, day: dayLabel, phase };
}
function formatNumber(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function formatMoney(r, n) {
  return r.hud.currencyAfter ? `${formatNumber(n)}${r.hud.currency}` : `${r.hud.currency}${formatNumber(n)}`;
}
function itemName(r, s, id) {
  return r.items[id]?.name ?? s.itemNames[id] ?? id.replace(/[_-]+/g, " ");
}
function personName(r, s, id) {
  return s.people[id]?.name ?? r.people[id]?.name ?? id;
}

// node_modules/warp/src/engine/encounter-view.ts
function thresholds(enc) {
  const out = [];
  for (const e of enc.endWhen) {
    for (const part of e.when.split(/\s+or\s+/i)) {
      const m = /^\(?\s*(foe\.)?([a-z_]\w*)\s*(<=|>=|<|>|==)\s*(-?\d+(?:\.\d+)?)\s*\)?$/i.exec(part.trim());
      if (m)
        out.push({ outcome: e.outcome, foe: !!m[1], stat: m[2], op: m[3], value: Number(m[4]) });
    }
  }
  return out;
}
function outcomeLabel(enc, outcome) {
  return enc?.labels[outcome] ?? titleCase(outcome);
}
function isLoss(enc, outcome) {
  return outcomeKind(enc, outcome) === "lost";
}
function endsIn(e) {
  return e?.end ?? null;
}
function directEnds(enc) {
  const out = [];
  for (const id of enc.actionOrder) {
    const a = enc.actions[id];
    for (const e of [a.effects, a.outcomes.success, a.outcomes.crit_success, a.outcomes.partial]) {
      const o = endsIn(e);
      if (o && !out.some((x) => x.outcome === o && x.action === a.label))
        out.push({ action: a.label, outcome: o });
    }
  }
  return out;
}
function encounterGuide(r, s) {
  const st = s.encounter;
  const enc = st ? r.encounters[st.id] : undefined;
  if (!st || !enc)
    return null;
  const th = thresholds(enc);
  const progress = [];
  const goals = [];
  for (const t of th.filter((x) => x.foe && !isLoss(enc, x.outcome))) {
    const fs = enc.foe.stats.find((f) => f.id === t.stat);
    if (!fs)
      continue;
    progress.push({ label: fs.label, value: st.foe[fs.id] ?? fs.start, target: t.value, max: st.max?.[fs.id] ?? fs.max });
    goals.push(`${t.op.startsWith("<") ? "bring" : "push"} their ${fs.label.toLowerCase()} to ${t.value}`);
  }
  if (enc.momentum)
    goals.push("swing the fight all the way your way");
  for (const d of directEnds(enc))
    if (!isLoss(enc, d.outcome))
      goals.push(`${d.action.toLowerCase()} (${d.outcome.replace(/_/g, " ")})`);
  const goal = enc.goal ?? (goals.length ? cap(joinOr(goals)) : null);
  const danger = [];
  for (const t of th.filter((x) => !x.foe && isLoss(enc, x.outcome))) {
    const def = r.stats[t.stat];
    if (!def)
      continue;
    const value = s.stats[t.stat] ?? def.start;
    const span = Math.max(1, def.max - def.min);
    const gap = t.op.startsWith(">") ? t.value - value : value - t.value;
    danger.push({ label: def.label, value, at: t.value, text: `${def.label} ${Math.round(value)}, out at ${t.value}`, close: gap / span <= 0.2 });
  }
  danger.sort((a, b) => Math.abs(a.at - a.value) - Math.abs(b.at - b.value));
  const loss = th.find((x) => !x.foe && isLoss(enc, x.outcome));
  const authoredDanger = enc.danger ?? (danger.length ? `${danger.slice(0, 2).map((d) => `${d.label} at ${d.at}`).join(" or ")} and you're ${outcomeLabel(enc, loss.outcome).toLowerCase()}` : null);
  const budget = `${Math.max(0, enc.roundLimit - st.round)} rounds left; then ${outcomeLabel(enc, enc.timeoutOutcome).toLowerCase()}.`;
  const dangerText = authoredDanger ? `${authoredDanger}. ${budget}` : budget;
  return { goal, progress, danger, dangerText };
}
var cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function joinOr(xs) {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} — or ${xs[xs.length - 1]}`;
}
function effectStats(a) {
  const stats = new Map;
  const adds = [], removes = [];
  let foe = false, ends = false;
  for (const e of [a.effects, ...Object.values(a.outcomes)]) {
    if (!e)
      continue;
    for (const [k, v] of Object.entries(e.stats))
      stats.set(k, (stats.get(k) ?? 0) + (typeof v === "number" ? v : 0));
    adds.push(...Object.keys(e.addConditions));
    removes.push(...e.removeConditions);
    if (Object.keys(e.foe).length)
      foe = true;
    if (e.end)
      ends = true;
  }
  return { stats, adds, removes, foe, ends };
}
function encounterReads(enc) {
  const ids = new Set;
  for (const a of Object.values(enc.actions)) {
    if (a.check)
      for (const x of [...identifiers(a.check.add), ...identifiers(a.check.target)])
        ids.add(x);
    if (a.when)
      for (const x of identifiers(a.when))
        ids.add(x);
  }
  for (const e of enc.endWhen)
    for (const x of identifiers(e.when))
      ids.add(x);
  return ids;
}
function itemRelevance(r, s, a) {
  const fx = effectStats(a);
  let score = 0;
  let best = null;
  const add = (w, why) => {
    score += w;
    if (!best || w > best.w)
      best = { w, why };
  };
  const enc = s.encounter ? r.encounters[s.encounter.id] : undefined;
  const reads = enc ? encounterReads(enc) : new Set;
  for (const [id, d] of fx.stats) {
    const def = r.stats[id];
    if (!def || !d)
      continue;
    const v = s.stats[id] ?? def.start;
    const p = (v - def.min) / Math.max(1, statMax(r, def, s) - def.min);
    const bad = def.good === "low" ? p >= 0.5 : def.good === "high" ? p <= 0.5 : false;
    const helps = def.good === "low" ? d < 0 : def.good === "high" ? d > 0 : false;
    if (bad && helps)
      add(1.5 + p, `${def.label} is ${def.good === "low" ? "high" : "low"}`);
    if (enc && reads.has(id))
      add(1.5, `Changes ${def.label}, which this encounter turns on`);
  }
  for (const c of fx.removes)
    if (s.conditions[c])
      add(3, `Clears ${r.conditions[c]?.label ?? c}`);
  if (enc && fx.foe)
    add(2, `Works on ${foeName(r, s)}`);
  if (enc && fx.ends)
    add(1, "Can end the encounter");
  return { score, why: best?.why ?? null };
}

// node_modules/warp/src/engine/freeform.ts
function practiceProgress(r, s, stat) {
  const def = r.stats[stat];
  if (!def || !r.growth.enabled || def.growth <= 0)
    return null;
  if ((s.stats[stat] ?? def.start) >= statMax(r, def, s))
    return null;
  return Math.max(0, Math.min(0.999, s.practice[stat] ?? 0));
}

// node_modules/warp/src/engine/quests.ts
var QUEST_PREFIX = "quest:";
function questDef(r, s, id) {
  const q = r.quests[id];
  if (q)
    return q;
  const st = s.quests?.[id]?.story;
  return st ? storyDef(id, st) : null;
}
function storyDef(id, st) {
  return {
    id,
    name: st.name,
    desc: st.goal,
    kind: "favour",
    ...st.giver ? { giver: st.giver } : {},
    board: false,
    at: [],
    auto: false,
    goals: [{ id: "done", text: st.goal, count: 1, optional: false }],
    judge: { done: st.goal, ...st.fail ? { fail: st.fail } : {} },
    days: 0,
    report: false,
    start: emptyEffect(),
    reward: emptyEffect(),
    failure: emptyEffect(),
    remember: {},
    repeat: null,
    hidden: false,
    ...st.stakes ? { stakes: st.stakes } : {},
    order: 1000
  };
}
function goalDone(r, s, st, g) {
  return g.when ? evalBool(g.when, makeEnv(r, s), false) : (st.prog[g.id] ?? 0) >= (g.count ?? 1);
}
function questOffers(r, s) {
  if (!r.questOrder.length || s.encounter)
    return [];
  const env = makeEnv(r, s);
  const here = new Set(presentPeople(r, s, env));
  const board = !!(s.location && r.locations[s.location]?.board);
  const out = [];
  for (const id of r.questOrder) {
    const q = r.quests[id];
    if (q.auto || q.hidden || s.quests?.[id])
      continue;
    if (q.when && !evalBool(q.when, env, false))
      continue;
    if (q.giver && here.has(q.giver))
      out.push({ id, via: "giver", from: personName(r, s, q.giver) });
    else if (q.board && board)
      out.push({ id, via: "board", from: null });
    else if (s.location && q.at.includes(s.location))
      out.push({ id, via: "place", from: null });
  }
  return out;
}
function questsToReport(r, s) {
  const out = [];
  if (s.encounter)
    return out;
  const here = new Set(presentPeople(r, s, makeEnv(r, s)));
  const board = !!(s.location && r.locations[s.location]?.board);
  for (const [id, st] of Object.entries(s.quests ?? {})) {
    if (st.st !== "ready")
      continue;
    const q = questDef(r, s, id);
    if (!q)
      continue;
    if (q.giver) {
      if (here.has(q.giver))
        out.push({ id, to: personName(r, s, q.giver) });
    } else if (q.board && board || s.location && q.at.includes(s.location))
      out.push({ id, to: null });
  }
  return out;
}
function effectWords(r, s, e) {
  const env = makeEnv(r, s);
  const num = (v) => {
    try {
      return Math.round(evalNumber(v, env, 0) * 10) / 10;
    } catch {
      return 0;
    }
  };
  const parts = [];
  for (const [id, v] of Object.entries(e.stats)) {
    const n = typeof v === "string" && /%$/.test(v.trim()) ? null : num(v);
    if (n === 0)
      continue;
    const def = r.stats[id];
    const label = def?.label ?? id;
    parts.push(n === null ? `${v} ${label}` : def?.kind === "money" ? `${n > 0 ? "" : "−"}${r.hud.currency}${Math.abs(n)}` : `${n > 0 ? "+" : "−"}${Math.abs(n)} ${label}`);
  }
  for (const [id, n] of Object.entries(e.items))
    parts.push(`${n > 0 ? "" : "loses "}${Math.abs(n) > 1 ? `${Math.abs(n)}× ` : "a "}${itemName(r, s, id)}`);
  for (const [who, m] of Object.entries(e.rel))
    for (const [stat, v] of Object.entries(m)) {
      const n = num(v);
      if (n)
        parts.push(`${n > 0 ? "+" : "−"}${Math.abs(n)} ${r.relStats[stat]?.label ?? stat} with ${who === "target" ? "them" : personName(r, s, who)}`);
    }
  for (const [id, op] of Object.entries(e.quest))
    if (op === "start" && r.quests[id])
      parts.push(`leads to "${r.quests[id].name}"`);
  return parts.join(", ");
}
function questDigest(r, s, only) {
  const out = [];
  for (const [id, st] of Object.entries(s.quests ?? {})) {
    if (st.st !== "active" && st.st !== "ready")
      continue;
    if (only && !only(id))
      continue;
    const q = questDef(r, s, id);
    if (!q)
      continue;
    const giver = q.giver ? personName(r, s, q.giver) : null;
    const goals = q.goals.filter((g) => !g.optional).map((g) => `${goalDone(r, s, st, g) ? "✓" : "☐"} ${g.text}${g.count && g.count > 1 ? ` (${Math.min(st.prog[g.id] ?? 0, g.count)}/${g.count})` : ""}`).join("; ");
    const due = st.due !== null ? dueWords(st.due - s.minutes) : null;
    out.push(`"${q.name}"${giver ? ` for ${giver}` : ""}${st.st === "ready" ? " — done, to be handed in" : ""}${goals ? ` — ${goals}` : ""}${due ? ` — ${due}` : ""}${q.stakes ? ` — at stake: ${q.stakes}` : ""}`);
  }
  return out;
}
function dueWords(minutesLeft) {
  if (minutesLeft < 0)
    return "overdue";
  if (minutesLeft < 60)
    return `${Math.max(1, Math.round(minutesLeft))} min left`;
  if (minutesLeft < 48 * 60)
    return `${Math.round(minutesLeft / 60)}h left`;
  return `${Math.round(minutesLeft / 1440)} days left`;
}

// node_modules/warp/src/engine/resolve.ts
function cleanLiveForecast(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return;
  const o = raw;
  const fields = ["goal", "risk", "payoff"];
  const out = {};
  for (const key of fields) {
    if (typeof o[key] !== "string")
      return;
    const text = o[key].replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    if (!text)
      return;
    out[key] = text;
  }
  return out;
}
var TARGET_SEP = "@";
function paramValues(a, chosen, target) {
  const out = {};
  for (const p of a.params) {
    const key = chosen?.[p.id] && p.options[chosen[p.id]] !== undefined ? chosen[p.id] : p.default;
    out[p.id] = p.options[key];
  }
  if (target)
    out.target = target;
  return out;
}
function actionPool(r, s) {
  const enc = s.encounter ? r.encounters[s.encounter.id] : undefined;
  if (enc)
    return { defs: enc.actions, order: enc.actionOrder, tags: enc.tags };
  return { defs: r.actions, order: r.actionOrder, tags: [] };
}
function whenHolds(r, s, a, target) {
  if (!s.encounter && a.at.length && !a.at.includes(s.location ?? ""))
    return false;
  if (a.when && !evalBool(a.when, makeEnv(r, s, paramValues(a, undefined, target)), true))
    return false;
  return true;
}
function isAvailable(r, s, a, target) {
  if (a.targets && target !== undefined && !a.targets.includes(target))
    return false;
  return whenHolds(r, s, a, target) && !spentLock(r, s, a, target);
}
function costValue(r, s, stat, raw, env) {
  const p = percentOf(raw);
  if (p === null)
    return evalNumber(raw, env, 0);
  const def = r.stats[stat];
  const x = p * (def ? statMax(r, def, s) : 100);
  return Math.abs(x) >= 1 ? Math.round(x) : x;
}
function costShortfall(r, s, a, target, params) {
  const costs = Object.entries(a.cost.stats);
  if (!costs.length)
    return null;
  const env = makeEnv(r, s, paramValues(a, params, target));
  for (const [stat, d] of costs) {
    const def = r.stats[stat];
    if (def?.good === "low")
      continue;
    const v = costValue(r, s, stat, d, env);
    const have = s.stats[stat] ?? def?.start ?? 0;
    if (v < 0 && have + v < (def?.min ?? 0))
      return `Needs ${formatNumber(-v)} ${def?.label ?? stat}`;
  }
  return null;
}
function moveChargeKey(s, a) {
  return s.encounter && (a.perEncounter || a.perDay) ? `move:${s.encounter.id}:${a.id}` : null;
}
function usesLock(s, a) {
  const key = moveChargeKey(s, a);
  if (!key)
    return null;
  const used = usesOf(s, key);
  if (a.perEncounter && used.here >= a.perEncounter)
    return "Used up for this encounter";
  if (a.perDay && used.today >= a.perDay)
    return "Used up for today";
  return null;
}
function costPrice(r, s, a, target, params) {
  const env = makeEnv(r, s, paramValues(a, params, target));
  let price = 0;
  for (const [stat, d] of Object.entries(a.cost.stats)) {
    if (r.stats[stat]?.good === "low")
      continue;
    const v = costValue(r, s, stat, d, env);
    if (v < 0)
      price -= v;
  }
  return price;
}
function strappedMoves(r, s) {
  const enc = s.encounter ? r.encounters[s.encounter.id] : undefined;
  const none = new Set;
  if (!enc)
    return none;
  const blocked = [];
  for (const id of enc.actionOrder) {
    const m = enc.actions[id];
    if (!m || m.hidden || !whenHolds(r, s, m) || usesLock(s, m))
      continue;
    if (!costShortfall(r, s, m))
      return none;
    blocked.push({ id, price: costPrice(r, s, m) });
  }
  if (!blocked.length)
    return none;
  const cheapest = Math.min(...blocked.map((b) => b.price));
  return new Set(blocked.filter((b) => b.price === cheapest).map((b) => b.id));
}
function paramCombos(a) {
  let out = [{}];
  for (const p of a.params) {
    out = out.flatMap((c) => Object.keys(p.options).map((k) => ({ ...c, [p.id]: k })));
    if (out.length > 64)
      return out.slice(0, 64);
  }
  return out;
}
function spentLock(r, s, a, target, params) {
  const uses = usesLock(s, a);
  if (uses)
    return uses;
  let short;
  if (params || !a.params.length)
    short = costShortfall(r, s, a, target, params);
  else {
    const combos = paramCombos(a);
    short = combos.some((c) => !costShortfall(r, s, a, target, c)) ? null : costShortfall(r, s, a, target, combos[0]);
  }
  if (short && s.encounter && r.encounters[s.encounter.id]?.actions[a.id] === a && strappedMoves(r, s).has(a.id))
    return null;
  return short;
}
function availableActions(r, s, lines = []) {
  const blocked = new Set(lines.map((l) => l.toLowerCase()));
  const pool = actionPool(r, s);
  if (pool.tags.some((t) => blocked.has(t)))
    return [];
  return pool.order.map((id) => pool.defs[id]).filter((a) => !a.tags.some((t) => blocked.has(t)) && (a.perPerson || isAvailable(r, s, a)));
}
function availableChoices(r, s, lines = []) {
  const out = [];
  const here = presentPeople(r, s, makeEnv(r, s));
  for (const a of availableActions(r, s, lines)) {
    if (!a.perPerson) {
      out.push({ id: a.id, a, label: a.label });
      continue;
    }
    for (const pid of here) {
      if (!isAvailable(r, s, a, pid))
        continue;
      const name = personName(r, s, pid);
      const label = /\btarget\b|\{\{target\}\}|\{target\}/i.test(a.label) ? a.label.replace(/\{\{target\}\}|\{target\}/gi, name) : `${a.label} (${name})`;
      out.push({ id: `${a.id}${TARGET_SEP}${pid}`, a, target: pid, label });
    }
  }
  return out;
}
var LIVE_PREFIX = "live:";
var ITEM_PREFIX = "item:";
function usableItems(r, s) {
  const out = [];
  for (const [id, n] of Object.entries(s.items)) {
    const a = r.items[id]?.use;
    if (!a || n <= 0)
      continue;
    out.push({ id: `${ITEM_PREFIX}${id}`, a, locked: isAvailable(r, s, a) ? null : lockReason(r, s, a) });
  }
  return out;
}
function requirementText(r, s, q) {
  const id = q.id ?? "";
  switch (q.kind) {
    case "stat": {
      const def = r.stats[id];
      const have = s.stats[id] ?? def?.start ?? 0;
      return `${def?.label ?? id} ${formatNumber(q.n ?? 0)} (you have ${formatNumber(Math.floor(have * 10) / 10)})`;
    }
    case "with":
      return `${personName(r, s, id)} with you`;
    case "has":
      return `${(q.n ?? 1) > 1 ? `${q.n}× ` : ""}${itemName(r, s, id)}`;
    case "rel":
      return `${personName(r, s, id)}'s ${r.relStats[q.stat ?? ""]?.label ?? q.stat} at ${formatNumber(q.n ?? 0)}`;
    case "quest": {
      const name = r.quests[id]?.name ?? id;
      return q.state === "active" ? `the quest "${name}"` : q.state === "done" ? `"${name}" done` : `"${name}" ${q.state}`;
    }
    case "flag":
      return `${q.state === "off" ? "not " : ""}${r.flags[id]?.label ?? id.replace(/_/g, " ")}`;
    default:
      return q.text ?? "the right moment";
  }
}
function lockReason(r, s, a) {
  const spent = whenHolds(r, s, a) ? spentLock(r, s, a) : null;
  if (spent)
    return spent;
  if (a.whyNot)
    return a.whyNot;
  if (a.requires.length) {
    const env = makeEnv(r, s);
    const unmet = a.requires.filter((q) => !evalBool(q.when, env, false));
    const needs = unmet.filter((q) => q.kind !== "formula").map((q) => requirementText(r, s, q));
    const other = unmet.filter((q) => q.kind === "formula").map((q) => requirementText(r, s, q));
    const words = [needs.length ? `Needs ${needs.join(", ")}` : "", ...other].filter(Boolean).join(" · ");
    if (words)
      return words;
  }
  const need = [...(a.when ?? "").matchAll(/has\(\s*'([^']+)'/g)].map((m) => m[1]).filter((id) => !(s.items[id] > 0));
  if (need.length && /\bor\b/.test(a.when ?? ""))
    return `Needs ${need.map((id) => itemName(r, s, id)).join(" or ")}`;
  if (need.length)
    return `Needs ${need.map((id) => itemName(r, s, id)).join(" and ")}`;
  return "Not possible right now";
}
function gearFor(r, s, a) {
  const stats = {};
  const notes = [];
  if (!a.check)
    return { stats, notes };
  const reads = new Set([...identifiers(a.check.add), ...identifiers(a.check.target)]);
  const add = (from, bonus) => {
    for (const [stat, b] of Object.entries(bonus)) {
      if (!b || !reads.has(stat))
        continue;
      stats[stat] = (stats[stat] ?? 0) + b;
      notes.push(`${from}: ${b > 0 ? "+" : ""}${formatNumber(b)} ${r.stats[stat]?.label ?? stat}`);
    }
  };
  for (const src of bonusSources(r, s))
    add(src.from, src.bonus);
  return { stats, notes };
}
function mainMeter(r, s) {
  const enc = s.encounter ? r.encounters[s.encounter.id] : undefined;
  if (!enc)
    return null;
  const t = thresholds(enc).find((x) => x.foe && !isLoss(enc, x.outcome));
  return t ? { stat: t.stat, down: t.op.startsWith("<") } : null;
}
function dangerStats(r, s) {
  const enc = s.encounter ? r.encounters[s.encounter.id] : undefined;
  if (!enc)
    return [];
  return [...new Set(thresholds(enc).filter((x) => !x.foe && isLoss(enc, x.outcome) && r.stats[x.stat]).map((x) => x.stat))];
}
function playerArmor(r, s, stat) {
  const main = dangerStats(r, s).includes(stat);
  const env = makeEnv(r, s);
  const pick = (m) => amountValue(m[stat], env) + (main ? amountValue(m._, env) : 0);
  let n = 0;
  for (const [id, have] of Object.entries(s.items)) {
    const it = r.items[id];
    if (!it || have <= 0)
      continue;
    n += pick(it.armor);
  }
  for (const id of Object.keys(s.conditions))
    n += pick(r.conditions[id]?.armor ?? {});
  return n;
}
function foeArmor2(r, s, stat) {
  const enc = s.encounter ? r.encounters[s.encounter.id] : undefined;
  if (!enc)
    return 0;
  const main = mainMeter(r, s)?.stat === stat;
  let env = null;
  const val = (v) => typeof v === "string" ? amountValue(v, env ??= makeEnv(r, s)) : v ?? 0;
  const pick = (m) => val(m[stat]) + (main ? val(m._) : 0);
  let n = pick(s.encounter.armor ?? enc.foe.armor);
  for (const id of Object.keys(s.encounter.conds ?? {}))
    n += pick(r.conditions[id]?.armor ?? {});
  return n;
}
function diceShare(roll) {
  let got = 0, span = 0;
  for (const f of roll.dice)
    if (f.kept) {
      got += f.value - 1;
      span += f.sides - 1;
    }
  return span > 0 ? got / span : 0;
}
function tierFor(check, roll, add, target, crit = null) {
  const total = roll.total + add;
  const sides = roll.primarySides;
  const single = roll.natural !== null;
  const critBand = Math.max(1, Math.floor(sides * 0.05));
  if (crit !== null && check.crits) {
    const pct = Math.max(0, Math.min(100, crit));
    const band = Math.round(sides * pct / 100);
    const top = pct > 0 && diceShare(roll) >= 1 - pct / 100;
    switch (check.style) {
      case "chance": {
        const ok = total <= (target ?? 50);
        const low = pct > 0 && diceShare(roll) <= pct / 100;
        if (ok && (single ? roll.natural <= band : low))
          return "crit_success";
        if (single && !ok && roll.natural > sides - critBand)
          return "crit_fail";
        return ok ? "success" : "fail";
      }
      case "vs": {
        const t = target ?? 10;
        if (single ? band > 0 && roll.natural > sides - band : total >= t && top)
          return "crit_success";
        if (single && roll.natural === 1)
          return "crit_fail";
        if (total >= t)
          return "success";
        if (check.partialMargin > 0 && total >= t - check.partialMargin)
          return "partial";
        return "fail";
      }
      case "pbta":
        if (total >= 10)
          return top ? "crit_success" : "success";
        if (total >= 7)
          return "partial";
        return "fail";
    }
  }
  switch (check.style) {
    case "chance": {
      const t = target ?? 50;
      const ok = total <= t;
      if (check.crits && single && ok && roll.natural <= critBand)
        return "crit_success";
      if (check.crits && single && !ok && roll.natural > sides - critBand)
        return "crit_fail";
      return ok ? "success" : "fail";
    }
    case "vs": {
      const t = target ?? 10;
      if (check.crits && single && roll.natural === sides)
        return "crit_success";
      if (check.crits && single && roll.natural === 1)
        return "crit_fail";
      if (total >= t)
        return "success";
      if (check.partialMargin > 0 && total >= t - check.partialMargin)
        return "partial";
      return "fail";
    }
    case "pbta":
      if (check.crits && total >= 12)
        return "crit_success";
      if (total >= 10)
        return "success";
      if (total >= 7)
        return "partial";
      return "fail";
  }
}
function checkNumbers(r, s, a, params, who) {
  const check = a.check;
  const gear = gearFor(r, s, a).stats;
  const eff = Object.keys(gear).length ? { ...s, stats: Object.fromEntries(Object.entries(s.stats).map(([k, v]) => [k, v + (gear[k] ?? 0)])) } : s;
  const adjusted = makeEnv(r, eff, paramValues(a, params, who));
  const plain = makeEnv(r, s, paramValues(a, params, who));
  const env = { lookup: adjusted.lookup, call: (n, args) => n === "eff" || n === "gear" ? plain.call?.(n, args) : adjusted.call?.(n, args) };
  const add = check.add !== undefined ? Math.round(evalNumber(check.add, env, 0)) : 0;
  let target = null;
  if (check.target !== undefined) {
    target = Math.round(evalNumber(check.target, env, check.style === "chance" ? 50 : 10));
    if (check.style === "chance")
      target = Math.max(0, Math.min(100, target));
  }
  const crit = check.crit !== undefined ? Math.max(0, Math.min(100, evalNumber(check.crit, env, 5))) : null;
  return { add, target, crit };
}
function odds(r, s, a, params, who) {
  const check = a.check;
  if (!check)
    return null;
  const { add, target, crit } = checkNumbers(r, s, a, params, who);
  if (check.style === "chance" && check.dice === "d100" && target !== null) {
    return { success: Math.max(0, Math.min(100, target - add)) / 100, partial: 0 };
  }
  const rng = seededRng(`odds:${a.id}`);
  const N = 2000;
  let ok = 0, part = 0;
  for (let i = 0;i < N; i++) {
    const t = tierFor(check, rollDice(check.dice, rng), add, target, crit);
    if (t === "success" || t === "crit_success")
      ok++;
    else if (t === "partial")
      part++;
  }
  return { success: ok / N, partial: part / N };
}

// node_modules/warp/src/engine/lint.ts
var FUNCTIONS = [
  "has",
  "count",
  "flag",
  "cond",
  "at",
  "rel",
  "met",
  "between",
  "roll",
  "present",
  "eff",
  "gear",
  "secret",
  "age",
  "quest",
  "quest_active",
  "quest_done",
  "quest_failed",
  "goal",
  "quests_done",
  "memories",
  "cond_of",
  "foe_cond",
  "stat_max",
  "foe_max",
  "in_encounter",
  "min",
  "max",
  "clamp",
  "floor",
  "ceil",
  "round",
  "abs"
];
var REMOVED_NAMES = {
  in_dungeon: "dungeons",
  dungeon_depth: "dungeons",
  "deepest()": "dungeons",
  in_date: "dating",
  on_outing: "dating",
  "partner()": "dating",
  "dates()": "dating",
  "stage()": "dating",
  pregnant: "family and pregnancy",
  pregnancy_weeks: "family and pregnancy",
  "children()": "family and pregnancy",
  "seen_by()": "being seen",
  "fame()": "being seen",
  "saved()": "checkpoints",
  loops: "checkpoints",
  runs: "endings and new playthroughs",
  "codex()": "the codex",
  "feat()": "feats",
  "perk()": "perks",
  weather: "weather and temperature",
  temperature: "weather and temperature",
  warmth: "weather and temperature",
  warmth_min: "weather and temperature",
  warmth_max: "weather and temperature",
  too_cold: "weather and temperature",
  too_hot: "weather and temperature",
  reveal: "the wardrobe",
  exposed: "the wardrobe",
  naked: "the wardrobe",
  "wearing()": "the wardrobe",
  "worn()": "the wardrobe",
  "integrity()": "the wardrobe",
  "trait()": "the wardrobe",
  "body()": "the body and transformations",
  "transformed()": "the body and transformations",
  "front()": "hidden world clocks (fronts)",
  "front_stage()": "hidden world clocks (fronts)",
  "happened()": "random events",
  "bond()": "feelings between people",
  "arc()": "companion lives",
  "where()": "schedules",
  at_work: "work shifts",
  "owed()": "bills and debts",
  "missed()": "bills and debts",
  "days_until()": "bills and debts"
};
function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1;j <= b.length; j++)
    dp[0][j] = j;
  for (let i = 1;i <= a.length; i++)
    for (let j = 1;j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function suggest(name, pool) {
  let best = "";
  let bestD = Infinity;
  for (const p of pool) {
    const d = distance(name.toLowerCase(), p.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best && bestD <= Math.max(2, Math.floor(name.length / 3)) ? ` — did you mean "${best}"?` : "";
}
function condCures(r) {
  const removed = new Set, timed = new Set;
  const visited = new Set;
  const visit = (o) => {
    if (!o || typeof o !== "object" || visited.has(o))
      return;
    visited.add(o);
    if (Array.isArray(o)) {
      for (const x of o)
        visit(x);
      return;
    }
    const e = o;
    if (Array.isArray(e.removeConditions) && e.addConditions && typeof e.addConditions === "object") {
      for (const k of e.removeConditions)
        removed.add(k);
      for (const [k, d] of Object.entries(e.addConditions))
        if (d !== null)
          timed.add(k);
    }
    for (const v of Object.values(o))
      visit(v);
  };
  visit(r);
  return { removed, timed };
}
function lintRuleset(r) {
  const issues = [];
  const s = initialState(r);
  const names = [...r.statOrder, ...Object.keys(r.flags), ...BUILTIN_NAMES];
  const check = (src, where, extra = {}) => {
    if (src === undefined || typeof src === "number")
      return;
    const base = makeEnv(r, s, extra);
    const env = { lookup: base.lookup, call: (n, a) => {
      if (n === "in_encounter" && a.length && !r.encounters[String(a[0])])
        badEncounter.add(String(a[0]));
      return n === "roll" ? 1 : base.call?.(n, a);
    } };
    const badEncounter = new Set;
    const unknown = new Set;
    try {
      evaluate(src, env, { unknown });
    } catch {
      return;
    }
    for (const m of String(src).matchAll(/\b(eff|gear)\(\s*['"]([^'"]+)['"]/g)) {
      const [, fn, id] = m;
      if (!r.stats[id])
        issues.push({ level: "warning", where, message: `${fn}('${id}'): "${id}" isn't a stat${suggest(id, r.statOrder)}` });
    }
    for (const u of unknown) {
      const isCall = u.endsWith("()");
      const gone = REMOVED_NAMES[u];
      const msg = gone ? `"${u}" (${gone}) was removed from Warp, so it always reads as 0. The old version is on the \`legacy\` branch.` : isCall ? `"${u}" isn't a known function (${FUNCTIONS.join(", ")})` : `"${u}" isn't a stat, flag or clock value${suggest(u, [...names, ...Object.keys(extra)])}`;
      issues.push({ level: "warning", where, message: msg });
    }
    for (const id of badEncounter)
      issues.push({ level: "warning", where, message: `in_encounter('${id}'): "${id}" isn't an encounter${suggest(id, Object.keys(r.encounters))}` });
  };
  const checkEffect = (e, where, extra = {}) => {
    for (const [id, v] of Object.entries(e.stats)) {
      if (!r.stats[id])
        issues.push({ level: "warning", where, message: `changes "${id}", which isn't a stat${suggest(id, r.statOrder)}` });
      check(v, `${where} › ${id}`, extra);
    }
    for (const [id, v] of Object.entries(e.set)) {
      if (!r.stats[id])
        issues.push({ level: "warning", where, message: `sets "${id}", which isn't a stat${suggest(id, r.statOrder)}` });
      check(v, `${where} › set › ${id}`, extra);
    }
    for (const [who, m] of Object.entries(e.rel))
      for (const [stat, v] of Object.entries(m)) {
        if (!r.relStats[stat])
          issues.push({ level: "warning", where, message: `"${stat}" isn't a relationship stat${suggest(stat, r.relStatOrder)}` });
        check(v, `${where} › ${who} › ${stat}`, extra);
      }
    for (const id of Object.keys(e.addConditions)) {
      if (!r.conditions[id])
        issues.push({ level: "warning", where, message: `adds condition "${id}", which isn't declared under conditions:` });
    }
    for (const d of e.decide)
      for (const o of d.options) {
        check(o.when, `${where} › decide › ${d.id} › ${o.id} › when`, extra);
        checkEffect(o.effect, `${where} › decide › ${d.id} › ${o.id}`, extra);
      }
    if (e.move && Object.keys(r.locations).length && !r.locations[e.move]) {
      issues.push({ level: "warning", where, message: `moves to "${e.move}", which isn't a declared location${suggest(e.move, Object.keys(r.locations))}` });
    }
    if (e.startEncounter && !r.encounters[e.startEncounter]) {
      issues.push({ level: "warning", where, message: `starts encounter "${e.startEncounter}", which doesn't exist${suggest(e.startEncounter, Object.keys(r.encounters))}` });
    }
    for (const [stat, v] of Object.entries(e.foe)) {
      const known = Object.values(r.encounters).some((enc) => enc.foe.stats.some((s) => s.id === stat));
      if (!known)
        issues.push({ level: "warning", where, message: `changes foe stat "${stat}", which no encounter declares` });
      check(v, `${where} › foe › ${stat}`, extra);
    }
    for (const id of e.reveal) {
      if (!r.secrets[id])
        issues.push({ level: "warning", where, message: `reveals secret "${id}", which doesn't exist${suggest(id, Object.keys(r.secrets))}` });
    }
    const conds = Object.keys(r.conditions);
    for (const [id, spec] of Object.entries(e.inflict)) {
      if (!r.conditions[id])
        issues.push({ level: "warning", where, message: `inflicts "${id}", which isn't declared under conditions:${suggest(id, conds)}` });
      check(spec.rounds, `${where} › inflict › ${id}`, extra);
      check(spec.chance, `${where} › inflict › ${id} › chance`, extra);
    }
    for (const [who, m] of Object.entries(e.afflict)) {
      if (who !== "target" && !r.people[who])
        issues.push({ level: "warning", where, message: `puts conditions on "${who}", who isn't a person${suggest(who, people)}` });
      for (const id of Object.keys(m))
        if (!r.conditions[id])
          issues.push({ level: "warning", where, message: `"${id}" isn't declared under conditions:${suggest(id, conds)}` });
    }
    for (const id of e.cleanse)
      if (!r.conditions[id])
        issues.push({ level: "warning", where, message: `cleanses "${id}", which isn't a condition${suggest(id, conds)}` });
    check(e.hits, `${where} › hits`, extra);
    check(e.pierce, `${where} › pierce`, extra);
    for (const id of Object.keys(e.quest))
      if (!r.quests[id])
        issues.push({ level: "warning", where, message: `"${id}" isn't a quest${suggest(id, r.questOrder)}` });
    for (const [key, v] of Object.entries(e.progress)) {
      const [qid, gid] = key.split(".");
      const q = r.quests[qid];
      if (!q)
        issues.push({ level: "warning", where, message: `counts toward "${qid}", which isn't a quest${suggest(qid, r.questOrder)}` });
      else if (gid && !q.goals.some((g) => g.id === gid))
        issues.push({ level: "warning", where, message: `"${gid}" isn't one of ${q.name}'s goals (${q.goals.map((g) => g.id).join(", ")})` });
      else if (!gid && !q.goals.some((g) => g.count !== undefined && !g.when))
        issues.push({ level: "warning", where, message: `"${q.name}" has no counted goal for progress to count toward (give a goal \`count:\`)` });
      check(v, `${where} › progress › ${key}`, extra);
    }
    for (const who of Object.keys(e.remember))
      if (who !== "target" && !r.people[who])
        issues.push({ level: "warning", where, message: `"${who}" isn't a person to remember it${suggest(who, people)}` });
  };
  const people = Object.keys(r.people);
  const cures = condCures(r);
  for (const id of r.statOrder)
    check(r.stats[id].maxExpr, `Stats › ${id} › max`);
  for (const id of r.statOrder)
    check(r.stats[id].startExpr, `Stats › ${id} › start`);
  const checkCost = (a, w, extra) => {
    const env = makeEnv(r, s, extra);
    for (const [id, v] of Object.entries(a.cost.stats)) {
      try {
        if (!Number.isFinite(costValue(r, s, id, v, env)))
          issues.push({ level: "warning", where: `${w} › cost › ${id}`, message: `"${v}" doesn't work out to a number` });
      } catch (e) {
        issues.push({ level: "warning", where: `${w} › cost › ${id}`, message: `"${v}" can't be worked out (${e instanceof Error ? e.message : String(e)}) — use a number, a share of the max like "-15%", or a formula` });
      }
    }
  };
  const checkAction = (a, w) => {
    const extra = Object.fromEntries(a.params.map((p) => [p.id, p.options[p.default]]));
    if (a.perPerson)
      extra.target = Object.keys(r.people)[0] ?? "someone";
    check(a.when, `${w} › when`, extra);
    if (a.check) {
      check(a.check.target, `${w} › check`, extra);
      check(a.check.add, `${w} › check › add`, extra);
      check(a.check.crit, `${w} › check › crit`, extra);
    }
    checkEffect(a.cost, `${w} › cost`, extra);
    checkCost(a, w, extra);
    checkEffect(a.effects, `${w} › effects`, extra);
    for (const [tier, e] of Object.entries(a.outcomes))
      if (e)
        checkEffect(e, `${w} › ${tier}`, extra);
  };
  for (const a of Object.values(r.actions))
    checkAction(a, `Actions › ${a.id}`);
  for (const it of Object.values(r.items))
    if (it.use)
      checkAction(it.use, `Items › ${it.id} › use`);
  const checkRequires = (a, w) => {
    for (const q of a.requires) {
      const id = q.id ?? "";
      const miss = (what, pool) => issues.push({ level: "warning", where: `${w} › requires`, message: `"${id}" isn't ${what}${suggest(id, pool)}` });
      if ((q.kind === "with" || q.kind === "rel") && !r.people[id])
        miss("a person", people);
      if (q.kind === "has" && !r.items[id] && !r.itemsOpen)
        miss("an item", Object.keys(r.items));
      if (q.kind === "quest" && !r.quests[id])
        miss("a quest", r.questOrder);
      if (q.kind === "flag" && !r.flags[id])
        miss("a flag", Object.keys(r.flags));
      if (q.kind === "rel" && !r.relStats[q.stat ?? ""])
        issues.push({ level: "warning", where: `${w} › requires`, message: `"${q.stat}" isn't a relationship stat${suggest(q.stat ?? "", r.relStatOrder)}` });
    }
  };
  for (const a of Object.values(r.actions))
    checkRequires(a, `Actions › ${a.id}`);
  for (const enc of Object.values(r.encounters))
    for (const a of Object.values(enc.actions))
      checkRequires(a, `Encounters › ${enc.id} › actions › ${a.id}`);
  for (const c of Object.values(r.conditions)) {
    const w = `Conditions › ${c.id}`;
    check(c.dot, `${w} › dot`);
    check(c.skip, `${w} › skip`);
    checkEffect(c.tick, `${w} › tick`);
    if (c.stat && !r.stats[c.stat] && !Object.values(r.encounters).some((e) => e.foe.stats.some((x) => x.id === c.stat)))
      issues.push({ level: "warning", where: `${w} › stat`, message: `"${c.stat}" isn't a stat or a foe stat${suggest(c.stat, r.statOrder)}` });
    if ((c.every === "hour" || c.every === "both") && c.dot !== undefined && !c.lasts && !cures.removed.has(c.id) && !cures.timed.has(c.id))
      issues.push({ level: "warning", where: w, message: "hurts every hour and never wears off on its own — give it `lasts:` (or a cure)" });
    for (const [k, v] of [...Object.entries(c.armor), ...Object.entries(c.bonus)]) {
      if (k !== "_" && !r.stats[k])
        issues.push({ level: "warning", where: `${w} › armor`, message: `"${k}" isn't a stat${suggest(k, r.statOrder)}` });
      check(v, `${w} › ${k in c.bonus ? "bonus" : "armor"} › ${k}`);
    }
  }
  for (const it of Object.values(r.items))
    for (const [k, v] of Object.entries(it.armor)) {
      if (k !== "_" && !r.stats[k])
        issues.push({ level: "warning", where: `Items › ${it.id} › armor`, message: `"${k}" isn't a stat${suggest(k, r.statOrder)}` });
      check(v, `Items › ${it.id} › armor › ${k}`);
    }
  for (const it of Object.values(r.items))
    for (const [k, v] of Object.entries(it.bonus))
      check(v, `Items › ${it.id} › bonus › ${k}`);
  for (const id of r.statOrder)
    if (r.stats[id].perHourExpr && !/%\s*$/.test(r.stats[id].perHourExpr))
      check(r.stats[id].perHourExpr, `Stats › ${id} › per_hour`);
  for (const q of Object.values(r.quests)) {
    const w = `Quests › ${q.id}`;
    check(q.when, `${w} › when`);
    check(q.succeed, `${w} › succeed`);
    check(q.fail, `${w} › fail`);
    for (const g of q.goals)
      check(g.when, `${w} › goals › ${g.id}`);
    checkEffect(q.start, `${w} › start`);
    checkEffect(q.reward, `${w} › reward`);
    checkEffect(q.failure, `${w} › failure`);
    if (!q.auto && !q.giver && !q.board && !q.at.length && !q.hidden)
      issues.push({ level: "warning", where: w, message: "has no giver, board or place, so nothing offers it — add `giver:`, `board: true`, `at:`, `auto: true` or `hidden: true` (started by an effect)" });
  }
  for (const t of r.triggers) {
    check(t.when, `Triggers › ${t.id} › when`);
    checkEffect(t.effects, `Triggers › ${t.id}`);
  }
  for (const enc of Object.values(r.encounters)) {
    const w = `Encounters › ${enc.id}`;
    for (const a of Object.values(enc.actions))
      checkAction(a, `${w} › actions › ${a.id}`);
    if (enc.foeMoves)
      for (const o of enc.foeMoves.options) {
        check(o.when, `${w} › foe_moves › ${o.id} › when`);
        checkEffect(o.effect, `${w} › foe_moves › ${o.id}`);
      }
    for (const fs of enc.foe.stats) {
      check(fs.startExpr, `${w} › foe › ${fs.id}`);
      check(fs.maxExpr, `${w} › foe › ${fs.id} › max`);
    }
    for (const [k, v] of Object.entries(enc.foe.armor))
      if (typeof v === "string")
        check(v, `${w} › foe › armor${k === "_" ? "" : ` › ${k}`}`);
    if (enc.foe.stats.length) {
      const ids = enc.foe.stats.map((x) => x.id);
      const foeWrites = (e, at) => {
        if (!e)
          return;
        for (const stat of Object.keys(e.foe))
          if (!ids.includes(stat))
            issues.push({ level: "warning", where: at, message: `changes foe stat "${stat}", but ${enc.foe.name} only has ${ids.join(", ")} — the change does nothing${suggest(stat, ids)}` });
        for (const d of e.decide)
          for (const o of d.options)
            foeWrites(o.effect, `${at} › decide › ${d.id} › ${o.id}`);
      };
      for (const a of Object.values(enc.actions)) {
        const aw = `${w} › actions › ${a.id}`;
        foeWrites(a.cost, `${aw} › cost`);
        foeWrites(a.effects, `${aw} › effects`);
        for (const [tier, e] of Object.entries(a.outcomes))
          foeWrites(e, `${aw} › ${tier}`);
      }
      if (enc.foeMoves)
        for (const o of enc.foeMoves.options)
          foeWrites(o.effect, `${w} › foe_moves › ${o.id}`);
      foeWrites(enc.start, `${w} › start`);
    }
    for (const e of enc.endWhen)
      check(e.when, `${w} › end_when › ${e.outcome}`);
    for (const [o, e] of Object.entries(enc.outcomes))
      checkEffect(e, `${w} › outcomes › ${o}`);
    checkEffect(enc.start, `${w} › start`);
    if (!enc.endWhen.length && !Object.values(enc.actions).some((a) => [a.effects, ...Object.values(a.outcomes)].some((e) => e?.end))) {
      issues.push({ level: "warning", where: w, message: "has no way to end — add `end_when:` or an action with `end:`" });
    }
  }
  for (const id of r.hud.bars)
    if (!r.stats[id])
      issues.push({ level: "warning", where: "HUD › bars", message: `"${id}" isn't a stat` });
  for (const sec of Object.values(r.secrets))
    sec.stages.forEach((st, i) => check(st.when, `Secrets › ${sec.id} › stage ${i + 1} › when`));
  check(r.liveChoices.when, "Live choices › when");
  for (const a of Object.values(r.liveChoices.tags))
    checkAction(a, `Live choices › tags › ${a.id}`);
  const gates = [
    ...r.statOrder.map((id) => [`Stats › ${id} › narrator_when`, r.stats[id].gate]),
    ...r.relStatOrder.map((id) => [`Relationships › stats › ${id} › narrator_when`, r.relStats[id].gate]),
    ...Object.values(r.flags).map((f) => [`Flags › ${f.id} › narrator_when`, f.gate]),
    ...Object.values(r.conditions).map((c) => [`Conditions › ${c.id} › narrator_when`, c.gate])
  ];
  for (const [where, g] of gates)
    check(g?.when, where);
  return issues;
}
// node_modules/warp/src/engine/reference.ts
var PART_LABELS = ["core", "stats", "people", "world", "actions", "encounters", "quests", "rules", "story"];
var PART_CONTENTS = {
  core: "name, description, player, clock, start, hud, narration",
  stats: "stats, growth",
  people: "relationships (stats + people)",
  world: "locations, items (incl. uses and gear bonuses), item_uses, conditions, flags, start.items",
  actions: "actions, improvise",
  encounters: "encounters",
  quests: "quests (bounties on a notice board, favours people ask, story jobs: goals, deadline, reward, failure)",
  rules: "triggers",
  story: "secrets, live_choices"
};
function partForIssue(where) {
  const w = where.replace(/^warp-ruleset\s*·\s*/i, "");
  const head = w.split(/[›,]/)[0].trim().toLowerCase();
  if (PART_LABELS.includes(head))
    return head;
  if (head.startsWith("stats") || head.startsWith("growth"))
    return "stats";
  if (["relationships", "people"].some((k) => head.startsWith(k)))
    return "people";
  if (["locations", "items", "item uses", "conditions", "flags"].some((k) => head.startsWith(k)))
    return "world";
  if (["actions", "improvise"].some((k) => head.startsWith(k)))
    return "actions";
  if (head.startsWith("encounters"))
    return "encounters";
  if (head.startsWith("quests"))
    return "quests";
  if (head.startsWith("triggers") || head.startsWith("rules"))
    return "rules";
  if (["secrets", "live choices"].some((k) => head.startsWith(k)))
    return "story";
  return "core";
}

// node_modules/warp/src/engine/rulebook.ts
var PART_OF_KEY = {
  name: "core",
  description: "core",
  player: "core",
  clock: "core",
  start: "core",
  hud: "core",
  narration: "core",
  stats: "stats",
  growth: "stats",
  practice: "stats",
  relationships: "people",
  people: "people",
  locations: "world",
  locations_open: "world",
  items: "world",
  inventory: "world",
  item_uses: "world",
  conditions: "world",
  flags: "world",
  discovery: "world",
  actions: "actions",
  improvise: "actions",
  improvised: "actions",
  encounters: "encounters",
  quests: "quests",
  triggers: "rules",
  rules: "rules",
  secrets: "story",
  live_choices: "story"
};
var DOC_HEAD = /^---[ \t]*(?:#[ \t]*(?:warp-ruleset[ \t]*·[ \t]*)?([\w -]+?))?[ \t]*$/;
function splitRulebook(text) {
  const src = text.replace(/\r\n?/g, `
`).replace(/^﻿/, "");
  const lines = src.split(`
`);
  if (lines.some((l) => DOC_HEAD.test(l) && /#/.test(l))) {
    const out = [];
    let label = null;
    let buf = [];
    const flush = () => {
      const yaml = buf.join(`
`).trim();
      if (yaml && !/^(#.*\n?)*$/.test(yaml)) {
        const l = (label ?? "core").trim().toLowerCase();
        for (const p of splitPlain(yaml, l, true))
          merge2(out, p);
      }
      buf = [];
    };
    for (const l of lines) {
      const m = DOC_HEAD.exec(l);
      if (m) {
        flush();
        label = m[1] ?? null;
        continue;
      }
      buf.push(l);
    }
    flush();
    return out.map((p) => ({ ...p, yaml: `${p.yaml.trim()}
` }));
  }
  return order(splitPlain(src.replace(/^---[ \t]*\n/, ""), null));
}
function splitPlain(src, label, keep = false) {
  const known = keep && !!label;
  const lines = src.split(`
`);
  const out = [];
  let cur = null;
  let pending = [];
  for (const l of lines) {
    const key = /^([A-Za-z_][\w]*)\s*:/.exec(l)?.[1];
    if (key) {
      const to = known ? label : PART_OF_KEY[key] ?? label ?? "core";
      if (cur)
        merge2(out, { label: cur.label, yaml: cur.lines.join(`
`) });
      cur = { label: to, lines: [...pending, l] };
      pending = [];
    } else if (!l.trim() || /^#/.test(l) || !cur) {
      pending.push(l);
    } else {
      cur.lines.push(...pending, l);
      pending = [];
    }
  }
  if (cur)
    merge2(out, { label: cur.label, yaml: [...cur.lines, ...pending].join(`
`) });
  return out;
}
function merge2(out, p) {
  const yaml = p.yaml.replace(/\s+$/, "");
  if (!yaml.trim())
    return;
  const hit = out.find((x) => x.label === p.label);
  if (hit)
    hit.yaml = `${hit.yaml}
${yaml}`;
  else
    out.push({ label: p.label, yaml });
}
function order(parts) {
  const rank = (l) => {
    const i = PART_LABELS.indexOf(l);
    return i < 0 ? 99 : i;
  };
  return parts.map((p) => ({ ...p, yaml: `${p.yaml.trim()}
` })).sort((a, b) => rank(a.label) - rank(b.label));
}
function joinRulebook(parts, title) {
  const head = [
    `# Warp rulebook — ${title}`,
    '# Each document below is one section of the ruleset (a lorebook entry named "warp-ruleset · <section>").',
    "# Edit it anywhere, then import it back: Warp → Ruleset → Import a rulebook."
  ].join(`
`);
  return `${head}
${parts.map((p) => `--- # ${p.label}
${p.yaml.trim()}
`).join(`
`)}`;
}
// node_modules/warp/src/engine/templates/universal.ts
var universal = {
  id: "universal",
  name: "Universal",
  blurb: "Light mechanics for any card: time, place, health, energy, mood, money, relationships, and d20 checks the narrator can't fudge.",
  parts: [
    {
      label: "core",
      yaml: `# Warp ruleset — core settings.
# This lorebook is never sent to the model; Warp reads it directly.
name: Universal
description: Light mechanics that fit any card.

clock:
  start: Mon 09:00
  minutes_per_action: 10   # time an action takes unless it says otherwise
  narrator_max: 480        # the narrator may skip at most 8 hours per reply

hud:
  currency: "$"

narration:
  notes: Keep narration consistent with the state block. Never invent dice results.
`
    },
    {
      label: "stats",
      yaml: `stats:
  health:
    kind: meter
    narrator: 20          # the narrator may move this by at most 20 per reply
    bands:
      0: Near collapse.
      25: Badly hurt.
      50: Bruised and sore.
      80: Healthy.
  energy:
    kind: meter
    per_hour: -4          # drains slowly while awake
    narrator: 15
    bands:
      0: Exhausted.
      30: Tired.
      60: Alert.
  mood:
    kind: meter
    start: 60
    narrator: 10
    bands:
      0: Miserable.
      25: Low.
      50: Steady.
      75: In good spirits.
  money:
    kind: money
    start: 50
    narrator: 100

  body:
    kind: attribute
    max: 10
    start: 3
    desc: Strength, speed, endurance.
  mind:
    kind: attribute
    max: 10
    start: 3
    desc: Wits, knowledge, perception.
  charm:
    kind: attribute
    max: 10
    start: 3
    desc: Persuasion, presence, deceit.
`
    },
    {
      label: "people",
      yaml: `relationships:
  open: true              # new people the story introduces are tracked automatically
  stats:
    affection:
      start: 20
      narrator: 5
      bands:
        0: Hostile
        15: Cool
        35: Friendly
        60: Close
        85: Devoted
    trust:
      start: 20
      narrator: 5
      bands:
        0: Suspicious
        25: Wary
        50: Trusting
        80: Unshakeable
`
    },
    {
      label: "actions",
      yaml: `actions:
  look_around:
    label: Look around
    group: Explore
    say: "*I take a careful look around.*"
    time: 5
    check: { vs: 12, add: mind, label: Mind }
    success: { hint: "Reveal something useful or hidden that a careless person would miss." }
    fail: { hint: "The careful search yields no useful discovery. Show what this failed approach rules out, or a new lead that requires a different approach; do not invite an identical retry or invent a successful discovery." }

  rest:
    label: Rest a while
    group: Rest
    say: "*I take some time to rest.*"
    time: 60
    effects: { energy: +25, health: +5 }

  sleep:
    label: Sleep
    group: Rest
    say: "*I turn in for the night.*"
    when: between(hour, 21, 5)
    time: 480
    effects: { energy: +100, health: +20, mood: +5 }

  wait:
    label: Wait an hour
    group: Rest
    say: "*I let some time pass.*"
    time: 60

  # Hidden actions never show as buttons. When you type something risky,
  # Warp's adjudicator picks one of these and a difficulty, and the dice decide.
  physical_feat:
    label: Physical feat
    hidden: true
    desc: Climbing, forcing, running, fighting, enduring pain — anything that tests the body.
    params:
      difficulty: { easy: 8, normal: 12, hard: 16, extreme: 20 }
    check: { vs: difficulty, add: "body - (health < 25 ? 2 : 0) - (cond('exhausted') ? 2 : 0)", label: Body, partial: 3 }   # hurt or exhausted: harder
    success: { body: +0.2, hint: "It works." }
    fail: { energy: -10, hint: "It doesn't work, and it takes something out of {{user}}." }
    crit_fail: { health: -15, energy: -10, hint: "It goes badly wrong — a real setback or injury." }

  mental_feat:
    label: Mental feat
    hidden: true
    desc: Recalling facts, solving puzzles, spotting lies or danger, working something out.
    params:
      difficulty: { easy: 8, normal: 12, hard: 16, extreme: 20 }
    check: { vs: difficulty, add: "mind - (cond('exhausted') ? 2 : 0)", label: Mind, partial: 3 }
    success: { mind: +0.2, hint: "The answer or insight comes clearly." }
    fail: { hint: "The attempt fails. Show a concrete obstacle or a lost opportunity and a different next approach; do not grant the answer or repeat the same dead end." }

  social_feat:
    label: Social feat
    hidden: true
    desc: Persuading, lying, seducing, intimidating, calming someone down, haggling.
    params:
      difficulty: { easy: 8, normal: 12, hard: 16, extreme: 20 }
    check: { vs: difficulty, add: "charm + (mood >= 75 ? 1 : 0) - (mood < 25 ? 1 : 0)", label: Charm, partial: 3 }   # good spirits help, a low mood shows
    success: { charm: +0.2, hint: "They're swayed." }
    fail: { mood: -5, hint: "It doesn't land. They're unconvinced, or put off." }
    crit_fail: { mood: -10, hint: "It backfires embarrassingly and they react badly." }
`
    },
    {
      label: "rules",
      yaml: `triggers:
  exhausted:
    when: energy <= 0
    do:
      add_condition: [exhausted]
      hint: "{{user}} is exhausted and struggling to stay upright."
  recovered:
    when: energy >= 30
    do:
      remove_condition: [exhausted]

conditions:
  exhausted:
    label: Exhausted
    tone: bad
    desc: Running on empty.
`
    },
    {
      label: "story",
      yaml: `# Choices written for each moment. A writer phrases them from the story; each must
# carry one of these tags, and the tag decides the roll — the writer can't.
# Add secrets: here for what people hide.
live_choices:
  label: Right now
  count: 3
  when: not in_encounter
  tags:
    bold:
      desc: "A daring, physical or risky move"
      check: { vs: 12, add: body, label: Body, partial: 3 }
      success: { mood: +3 }
      fail: { health: -5, mood: -3 }
    clever:
      desc: "Noticing, working something out, or a clever trick"
      check: { vs: 12, add: mind, label: Mind, partial: 3 }
      success: { mood: +2 }
      fail: { mood: -2 }
    charm:
      desc: "Persuading, charming or flirting with someone here"
      per_person: true
      check: { vs: 12, add: charm, label: Charm, partial: 3 }
      success: { rel: { target: { affection: +3, trust: +2 } } }
      fail: { mood: -3, rel: { target: { trust: -2 } } }
    kind:
      desc: "Something kind or supportive toward someone here"
      per_person: true
      effects: { mood: +2, rel: { target: { trust: +3 } } }
    careful:
      desc: "The cautious option: waiting, watching, backing off"
      effects: { energy: +2 }
`
    }
  ]
};

// node_modules/warp/src/engine/templates/romance.ts
var romance = {
  id: "romance",
  name: "Romance",
  blurb: "Just the romance: slow-burn feelings (affection, trust, attraction) that can't jump faster than the story earns, people who remember what you did, a clock and calendar, and choices written for each moment — no dice, no meters, no money. Typed messages are never rolled. Fits any card or setting.",
  parts: [
    {
      label: "core",
      yaml: `# Warp ruleset — core settings.
# This lorebook is never sent to the model; Warp reads it directly.
name: Romance
description: A love story told at its own pace.

clock:
  start: Fri 18:00
  date: Jun 6               # a calendar, so "next Saturday" and anniversaries mean something
  minutes_per_action: 15
  narrator_max: 720         # the story may skip up to half a day per reply (the next morning, after work…)

# What you type is roleplay, never a dice roll.
improvise: false

narration:
  notes: >-
    This is a romance. Let feelings grow (or cool) only as fast as the relationship lines in the state say —
    a slow burn, shown through behaviour: glances, what they remember, what they choose to say or leave unsaid.
    Never decide {{user}}'s feelings, words or actions. Each person has their own life, moods and boundaries;
    closeness is earned in the story, and intimacy is mutual and only between adults.
`
    },
    {
      label: "people",
      yaml: `relationships:
  open: true                # everyone the story introduces is tracked; their first feelings are read from the story
  stats:
    affection:
      start: 10
      narrator: 4           # a reply can move it by at most 4: no "strangers to in love" in two messages
      bands: { 0: Cold, 10: Neutral, 25: Warm, 45: Fond, 65: Smitten, 85: In love }
    trust:
      start: 15
      narrator: 4
      bands: { 0: Guarded, 20: Wary, 40: Open, 65: Trusting, 85: Devoted }
    attraction:
      start: 0
      narrator: 6
      good: none
      bands: { 0: No spark, 15: Curious, 35: Drawn, 60: Wanting, 85: Consumed }
`
    },
    {
      label: "actions",
      yaml: `# Passing time, as a story choice.
actions:
  sleep:
    label: Sleep
    say: "*I turn in for the night.*"
    time: 480
  pass_time:
    label: Let a few hours pass
    say: "*I let the afternoon drift by.*"
    time: 180
`
    },
    {
      label: "story",
      yaml: `# Choices written for each moment, in the story's own words. No dice: the tag only says
# what kind of move it is; how they react — and how their feelings move — comes from the story.
live_choices:
  label: Right now
  count: 3
  tags:
    tender:
      desc: "Something warm, gentle or affectionate toward someone here"
      per_person: true
    playful:
      desc: "Teasing, flirting or joking with someone here"
      per_person: true
    honest:
      desc: "Opening up to someone here: saying something true, or vulnerable"
      per_person: true
    bold:
      desc: "A bold romantic move with someone here (closer, a confession, a kiss) — only when the moment invites it"
      per_person: true
    space:
      desc: "Giving someone room: pulling back, changing the subject, or letting a silence sit"
    elsewhere:
      desc: "Moving the story along: leaving, suggesting somewhere else, or ending the day"
`
    }
  ]
};

// node_modules/warp/src/engine/templates/index.ts
var TEMPLATES = [universal, romance];
function looksLikeScenario(c) {
  const tags = (c.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => /scenario|\brpg\b|narrator|simulator|multiple characters|multi-?char|multi-?character|\bgroup\b|text adventure|\bworld\b|setting|dungeon|sandbox/.test(t)))
    return true;
  const text = `${c.description ?? ""}
${c.personality ?? ""}
${c.scenario ?? ""}`.toLowerCase();
  const narratorPhrases = [
    /\b(?:the )?narrator\b/,
    /\bgame ?master\b/,
    /\bdungeon master\b/,
    /\bstoryteller\b/,
    /\{\{char\}\} (?:is|will be) (?:not a (?:single |specific )?character|the (?:narrator|world|setting|game))/,
    /\{\{char\}\} (?:will )?(?:play|voice|control)s? (?:all |every |each )?(?:of )?(?:the )?(?:other )?(?:characters|npcs|side characters|cast)/,
    /\bmultiple characters\b/,
    /\bvarious characters\b/,
    /\ball (?:the )?npcs\b/
  ];
  if (narratorPhrases.some((re) => re.test(text)))
    return true;
  const settingName = /\b(simulator|scenario|rpg|academy|world|kingdom|empire|city|town|village|school|university|dungeon|adventure|quest|game|isekai|apocalypse|station)\b/i;
  return settingName.test(c.name) && !(c.personality ?? "").trim();
}
function withCharacter(yaml, name) {
  if (!/^relationships:/m.test(yaml))
    return yaml;
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "companion";
  if (new RegExp(`^    ${id}:`, "m").test(yaml))
    return yaml;
  const entry = `    ${id}:
      name: ${JSON.stringify(name)}
`;
  const m = /^  people:[^\n]*\n/m.exec(yaml);
  if (m)
    return yaml.slice(0, m.index + m[0].length) + entry + yaml.slice(m.index + m[0].length);
  return `${yaml.replace(/\n*$/, `
`)}  people:
${entry}`;
}
// node_modules/warp/src/engine/mention.ts
var STOP = new Set(["the", "and", "with", "for", "of", "a", "an", "to", "in", "on", "at", "from", "into", "across", "your", "my", "his", "her", "their"]);
var sig = (name) => name.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 3 && !STOP.has(w));
var hasWord = (t, w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?([^\\p{L}]|$)`, "u").test(t);
function namesIt(text, name, others = []) {
  const t = text.toLowerCase();
  const n = name.toLowerCase().trim();
  if (!n)
    return false;
  if (t.includes(n))
    return true;
  const words = sig(n);
  if (!words.length)
    return false;
  const hits = words.filter((w) => hasWord(t, w)).length;
  if (words.length === 1)
    return hits === 1;
  const head = words[words.length - 1];
  const shared = others.some((o) => o.toLowerCase() !== n && sig(o).slice(-1)[0] === head);
  if (hasWord(t, head) && (!shared || hits >= 2))
    return true;
  return hits >= Math.max(2, words.length - 1);
}
function namesTitle(text, title) {
  const t = text.toLowerCase();
  if (t.includes(title.toLowerCase().trim()))
    return true;
  const words = sig(title);
  if (!words.length)
    return false;
  const hits = words.filter((w) => hasWord(t, w)).length;
  return hits >= (words.length <= 2 ? words.length : words.length - 1);
}

// node_modules/warp/src/engine/view.ts
function pct(v, min, max) {
  return max > min ? Math.max(0, Math.min(1, (v - min) / (max - min))) : 0;
}
function toneFromPct(p, good) {
  if (good === "none")
    return "neutral";
  const g = good === "high" ? p : 1 - p;
  return g >= 0.67 ? "good" : g >= 0.34 ? "warn" : "bad";
}
function shownText(def, band, num) {
  if (!band || def.show === "number")
    return null;
  return def.show === "both" ? `${band.text} (${num})` : band.text;
}
function statDisplay(r, def, v, max) {
  if (def.kind === "money")
    return formatMoney(r, v);
  if (def.kind === "meter" && max !== 100)
    return `${formatNumber(v)} / ${formatNumber(max)}`;
  return formatNumber(v);
}
function buildHud(r, s) {
  const bars = r.hud.bars.map((id) => {
    const def = r.stats[id];
    const v = s.stats[id] ?? def.start;
    const max = statMax(r, def, s);
    const band = bandFor(def, v, max);
    const p = pct(v, def.min, max);
    return {
      id,
      label: def.label,
      value: v,
      min: def.min,
      max,
      display: statDisplay(r, def, v, max),
      pct: p,
      text: shownText(def, band, statDisplay(r, def, v, max)),
      tone: band?.tone ?? toneFromPct(p, def.good),
      good: def.good,
      color: def.color,
      desc: def.desc
    };
  });
  const skills = r.statOrder.filter((id) => (r.stats[id].kind === "attribute" || r.stats[id].kind === "skill") && !r.hud.bars.includes(id) && r.stats[id].show !== "hidden").map((id) => {
    const def = r.stats[id];
    const v = s.stats[id] ?? def.start;
    const max = statMax(r, def, s);
    const band = bandFor(def, v, max);
    return {
      id,
      label: def.label,
      display: formatNumber(v),
      grade: gradeFor(def, v, max),
      pct: pct(v, def.min, max),
      kind: def.kind,
      text: shownText(def.showSet ? def : { ...def, show: "both" }, band, formatNumber(v)),
      tone: band?.tone ?? "neutral",
      practice: practiceProgress(r, s, id),
      group: def.group ?? (def.kind === "skill" ? "Skills" : "Attributes")
    };
  });
  const env = makeEnv(r, s);
  const here = new Set(presentPeople(r, s, env));
  const people = Object.entries(s.people).map(([id, p]) => {
    return {
      id,
      name: p.name,
      stats: r.relStatOrder.map((rs) => {
        const def = r.relStats[rs];
        const v = s.rel[id]?.[rs] ?? def.start;
        const band = bandFor(def, v);
        const pp = pct(v, def.min, def.max);
        return { id: rs, label: def.label, value: v, min: def.min, max: def.max, display: formatNumber(v), pct: pp, text: shownText(def, band, formatNumber(v)), tone: band?.tone ?? toneFromPct(pp, def.good) };
      }),
      present: here.has(id),
      conditions: Object.entries(s.pconds?.[id] ?? {}).map(([cid, c]) => ({
        label: r.conditions[cid]?.label ?? cid,
        tone: r.conditions[cid]?.tone ?? "warn",
        remaining: c.until !== null ? minutesLeft(c.until - s.minutes) : null
      })),
      memories: (s.memories?.[id] ?? []).slice().reverse().slice(0, 5).map((m) => ({ text: m.text, when: r.clock.enabled ? formatClock(r, m.at).day : null }))
    };
  }).sort((a, b) => Number(b.present) - Number(a.present));
  const usable_ = usableItems(r, s);
  let gearEnv_ = null;
  const gearEnv = () => gearEnv_ ??= makeEnv(r, s);
  const items = Object.entries(s.items).map(([id, count]) => {
    const def = r.items[id];
    const per = def?.uses ?? 0;
    const usable = usable_.find((u) => u.id === `item:${id}`);
    const bonus = def ? Object.entries(def.bonus).map(([st, b]) => [st, amountValue(b, gearEnv())]).filter(([, b]) => b).map(([st, b]) => `${b > 0 ? "+" : ""}${formatNumber(b)} ${r.stats[st]?.label ?? st}`).join(", ") : "";
    return {
      id,
      name: itemName(r, s, id),
      count,
      uses: per > 1 ? `${s.uses[id] ?? per}/${per}` : null,
      use: usable ? { id: usable.id, label: usable.a.label, locked: usable.locked, drafted: !!def?.drafted } : null,
      bonus: bonus || null
    };
  });
  const date = dateAt(r, s.minutes);
  let encounter = null;
  if (s.encounter) {
    const enc = r.encounters[s.encounter.id];
    const guide = encounterGuide(r, s);
    encounter = {
      goal: guide?.goal ?? null,
      progress: guide?.progress ?? [],
      danger: guide?.danger ?? [],
      dangerText: guide?.dangerText ?? null,
      quiet: !enc?.narrate,
      name: enc?.name ?? s.encounter.id,
      foe: foeName(r, s),
      round: s.encounter.round,
      momentum: s.encounter.momentum ?? null,
      stats: (enc?.foe.stats ?? []).map((fs) => {
        const v = s.encounter.foe[fs.id] ?? fs.start;
        const top = s.encounter.max?.[fs.id] ?? fs.max;
        const p = pct(v, 0, top);
        return { id: fs.id, label: fs.label, value: v, max: top, pct: p, tone: toneFromPct(p, fs.good === "none" ? "none" : fs.good === "high" ? "high" : "low") };
      }),
      foeConds: Object.entries(s.encounter.conds ?? {}).map(([id, n]) => ({
        id,
        label: r.conditions[id]?.label ?? id,
        tone: r.conditions[id]?.tone ?? "warn",
        rounds: n,
        ...r.conditions[id]?.desc ? { desc: r.conditions[id].desc } : {}
      })),
      foeArmor: (() => {
        const m = mainMeter(r, s);
        const n = m ? foeArmor2(r, s, m.stat) : 0;
        return n ? n : null;
      })(),
      yourArmor: (() => {
        const d = dangerStats(r, s)[0];
        const n = d ? playerArmor(r, s, d) : 0;
        return n ? n : null;
      })()
    };
  }
  const conditions = Object.entries(s.conditions).map(([id, c]) => {
    const def = r.conditions[id];
    const left = c.until !== null ? c.until - s.minutes : null;
    return {
      id,
      label: def?.label ?? id,
      tone: def?.tone ?? "warn",
      desc: def?.desc,
      remaining: c.rounds !== undefined ? `${c.rounds} round${c.rounds === 1 ? "" : "s"}` : left !== null && left > 0 ? minutesLeft(left) : undefined
    };
  });
  const moneyDef = r.hud.money ? r.stats[r.hud.money] : undefined;
  const moneyV = r.hud.money ? s.stats[r.hud.money] ?? moneyDef?.start ?? 0 : 0;
  const money = moneyDef ? moneyDef.show === "hidden" ? null : shownText(moneyDef.showSet ? moneyDef : { ...moneyDef, show: "both" }, bandFor(moneyDef, moneyV, statMax(r, moneyDef, s)), formatMoney(r, moneyV)) ?? formatMoney(r, moneyV) : null;
  const loc = s.location ? r.locations[s.location] : undefined;
  return {
    rulesetName: r.name,
    clock: r.clock.enabled ? formatClock(r, s.minutes) : null,
    date: date ? `${r.clock.weekdays[Math.floor(s.minutes / 1440) % r.clock.weekdays.length] ?? ""} ${ordinal(date.day)} ${date.monthName}`.trim() : null,
    location: s.locationName ? { name: s.locationName, desc: loc?.desc } : null,
    money,
    bars: bars.filter((b) => r.stats[b.id].kind !== "money"),
    skills,
    people,
    items,
    conditions,
    quests: questViews(r, s),
    encounter,
    turn: s.turn
  };
}
function agoWords(min) {
  if (min < 60)
    return "just now";
  if (min < 1440)
    return `${Math.round(min / 60)}h ago`;
  const d = Math.round(min / 1440);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
function minutesLeft(left) {
  return left >= 1440 ? `${Math.round(left / 1440)}d` : left >= 60 ? `${Math.round(left / 60)}h` : `${Math.max(1, Math.round(left))}m`;
}
function questViews(r, s) {
  const reportable = new Set(questsToReport(r, s).map((x) => x.id));
  const view = (id, status, from) => {
    const q = questDef(r, s, id);
    if (!q)
      return null;
    const st = s.quests?.[id];
    const left = st?.due !== null && st?.due !== undefined && (status === "active" || status === "ready") ? st.due - s.minutes : null;
    const giver = q.giver ? personName(r, s, q.giver) : null;
    const reward = effectWords(r, s, q.reward) || (st?.story && giver ? `${giver} will think better of you` : "");
    const price = effectWords(r, s, q.failure);
    return {
      id,
      name: q.name,
      kind: q.kind,
      status,
      giver,
      desc: q.desc ?? null,
      goals: q.goals.map((g) => ({
        text: g.text,
        done: status === "done" || !!st && status !== "offered" && goalDone(r, s, st, g),
        progress: g.count && g.count > 1 ? `${Math.min(st?.prog[g.id] ?? 0, g.count)}/${g.count}` : null,
        optional: g.optional
      })),
      due: left !== null ? dueWords(left) : status === "offered" && q.days ? `${q.days} day${q.days === 1 ? "" : "s"} to do it` : null,
      dueTone: left === null ? "neutral" : left < 1440 ? "bad" : left < 2880 ? "warn" : "neutral",
      reward: reward || null,
      stakes: q.stakes ?? (price ? `If it fails: ${price}` : st?.story && giver ? `${giver} will remember if you don't` : null),
      story: !!st?.story,
      take: status === "offered" ? `${QUEST_PREFIX}take:${id}` : null,
      report: status === "ready" && reportable.has(id) ? `${QUEST_PREFIX}report:${id}` : null,
      drop: status === "active" || status === "ready" ? `${QUEST_PREFIX}drop:${id}` : null,
      from
    };
  };
  const out = questOffers(r, s).map((o) => view(o.id, "offered", o.via === "giver" ? o.from : o.via === "board" ? "Notice board" : s.locationName));
  const taken = Object.entries(s.quests ?? {});
  for (const [id, st] of taken)
    if (st.st === "active" || st.st === "ready")
      out.push(view(id, st.st, null));
  taken.filter(([, st]) => st.st === "done" || st.st === "failed").sort((a, b) => (b[1].ended ?? 0) - (a[1].ended ?? 0)).slice(0, 6).forEach(([id, st]) => out.push(view(id, st.st, null)));
  return out.filter((x) => !!x);
}
function hasMet(s, id) {
  return !!s.scene[id] || (s.memories?.[id]?.length ?? 0) > 0;
}
function buildChoices(r, s, opts) {
  return choiceList(r, s, opts);
}
function choiceList(r, s, opts) {
  const veils = new Set(opts.veils.map((v) => v.toLowerCase()));
  const lines = new Set(opts.lines.map((v) => v.toLowerCase()));
  const live = [];
  const plain = (id, label, group, desc = null) => ({ id, label, group, desc, odds: null, partialOdds: null, checkLabel: null, veiled: false, params: [] });
  if (opts.showChoices === false && !s.encounter)
    return [];
  if (!s.encounter)
    (opts.live ?? []).forEach((c, i) => {
      const a = r.liveChoices.tags[c.tag];
      if (!a || a.tags.some((t) => lines.has(t)) || !isAvailable(r, s, a, c.target) || a.perPerson && !c.target || c.target && !presentPeople(r, s, makeEnv(r, s)).includes(c.target))
        return;
      const o = odds(r, s, a, undefined, c.target);
      const forecast = cleanLiveForecast(c.forecast);
      live.push({
        id: `${LIVE_PREFIX}${i}`,
        label: c.label,
        group: r.liveChoices.label,
        ...forecast ? { forecast } : {},
        desc: a.desc ?? null,
        odds: o ? o.success : null,
        partialOdds: o && o.partial > 0 ? o.partial : null,
        checkLabel: a.check?.label ?? null,
        veiled: a.tags.some((t) => veils.has(t)),
        params: []
      });
    });
  const encName = s.encounter ? r.encounters[s.encounter.id]?.name ?? "Encounter" : null;
  const actions = availableChoices(r, s, opts.lines).filter(({ a }) => !a.hidden).map(({ id, a, target, label }) => {
    const o = odds(r, s, a, undefined, target);
    return {
      id,
      label,
      group: encName ?? a.group ?? null,
      desc: a.desc ?? null,
      odds: o ? o.success : null,
      partialOdds: o && o.partial > 0 ? o.partial : null,
      checkLabel: a.check?.label ?? null,
      veiled: a.tags.some((t) => veils.has(t)),
      params: a.params.map((p) => ({ id: p.id, label: p.label, options: Object.keys(p.options), default: p.default }))
    };
  });
  const locked = [];
  const pool = actionPool(r, s);
  for (const id of pool.order) {
    const a = pool.defs[id];
    if (a.hidden || a.perPerson || a.tags.some((t) => lines.has(t)))
      continue;
    const spent = whenHolds(r, s, a) ? spentLock(r, s, a) : null;
    if (!spent && !s.encounter && (!a.showLocked || a.at.length && !a.at.includes(s.location ?? "")))
      continue;
    if (!spent && s.encounter && !a.showLocked && !a.whyNot && !/has\(/.test(a.when ?? ""))
      continue;
    if (isAvailable(r, s, a))
      continue;
    locked.push({ ...plain(id, a.label, encName ?? a.group ?? null, a.desc ?? null), locked: spent ?? lockReason(r, s, a) });
  }
  return [...live, ...actions, ...itemChoices(r, s, lines), ...locked, ...questChoices(r, s)];
}
function questChoices(r, s) {
  if (s.encounter)
    return [];
  const plain = (id, label, desc, why) => ({ id, label, group: "Quests", desc, odds: null, partialOdds: null, checkLabel: null, veiled: false, params: [], ...why ? { why } : {} });
  const out = [];
  for (const { id, to } of questsToReport(r, s)) {
    const q = questDef(r, s, id);
    if (!q)
      continue;
    const reward = effectWords(r, s, q.reward);
    out.push(plain(`${QUEST_PREFIX}report:${id}`, to ? `Tell ${to}: "${q.name}" is done` : `Hand in "${q.name}"`, q.desc ?? null, reward ? `Reward: ${reward}` : undefined));
  }
  const offers = questOffers(r, s).sort((a, b) => Number(b.via === "giver") - Number(a.via === "giver")).slice(0, 3);
  for (const o of offers) {
    const q = r.quests[o.id];
    const reward = effectWords(r, s, q.reward);
    const label = o.via === "giver" ? `${o.from} asks: "${q.name}"` : o.via === "board" ? `Notice: "${q.name}"` : `"${q.name}"`;
    out.push(plain(`${QUEST_PREFIX}take:${o.id}`, label, q.desc ?? null, [reward ? `Reward: ${reward}` : "", q.days ? `${q.days}d` : ""].filter(Boolean).join(" · ") || undefined));
  }
  return out;
}
function itemChoices(r, s, lines) {
  const veils = new Set;
  const ranked = usableItems(r, s).filter((u) => !u.locked && !u.a.tags.some((t) => lines.has(t))).map((u) => ({ u, ...itemRelevance(r, s, u.a) })).filter((x) => x.score >= (s.encounter ? 1 : 2)).sort((a, b) => b.score - a.score).slice(0, s.encounter ? 3 : 2);
  return ranked.map(({ u, why }) => {
    const o = odds(r, s, u.a);
    return {
      id: u.id,
      label: u.a.label,
      group: "Items",
      desc: u.a.desc ?? r.items[u.id.slice(5)]?.desc ?? null,
      odds: o ? o.success : null,
      partialOdds: o && o.partial > 0 ? o.partial : null,
      checkLabel: u.a.check?.label ?? null,
      veiled: u.a.tags.some((t) => veils.has(t)),
      params: [],
      ...why ? { why } : {}
    };
  });
}
function statLine(r, def, s, forceNumbers) {
  if (def.show === "hidden")
    return null;
  const v = s.stats[def.id] ?? def.start;
  const max = statMax(r, def, s);
  const band = bandFor(def, v, max);
  const grade = gradeFor(def, v, max);
  const num = def.kind === "money" ? formatMoney(r, v) : grade ? `${grade}` : def.kind === "meter" || def.kind === "hidden" ? `${formatNumber(v)}/${formatNumber(max)}` : formatNumber(v);
  const showNum = forceNumbers || def.show === "number" || def.show === "both" || !band;
  const showText = (def.show === "text" || def.show === "both") && band;
  if (showText && showNum)
    return `${def.label}: ${band.text} (${num})`;
  if (showText)
    return `${def.label}: ${band.text}`;
  return `${def.label}: ${num}`;
}
var MONEY_WORDS = /\b(buy|buys|bought|pay|pays|paid|price|prices|cost|costs|afford|money|cash|coins?|tip|rent|shop|shopping|sell|sold|wallet|purse|spend|bill|debt|loan|bribe|wage|salary|change)\b/i;
var WORK_WORDS = /\b(board|notices?|postings?|jobs?|work|quests?|bount(?:y|ies)|errands?|tasks?|favou?rs?|hire|hiring|contracts?|assignments?|gigs?|requests?|help (?:you|me|with))\b/i;
function stateDigest(r, s, focus) {
  const nar = focus !== undefined;
  const ft = focus?.text ?? "";
  const named = (name, others = []) => !nar || namesIt(ft, name, others);
  const titled = (title) => !nar || namesTitle(ft, title);
  const moneyTalk = !nar || MONEY_WORDS.test(ft);
  const workTalk = !nar || WORK_WORDS.test(ft);
  const lines = [];
  const head = [];
  const hud = buildHud(r, s);
  if (r.clock.enabled) {
    const c = formatClock(r, s.minutes);
    head.push(`${hud.date ?? c.day}, ${c.time} (${c.phase})`);
  }
  if (s.locationName)
    head.push(`Location: ${s.locationName}`);
  if (head.length)
    lines.push(head.join(" · "));
  if (hud.encounter) {
    const e = hud.encounter;
    lines.push(`ENCOUNTER in progress: ${e.name} vs ${e.foe}, round ${e.round}${e.stats.length ? ` — ${e.stats.map((x) => `${x.label} ${formatNumber(x.value)}/${formatNumber(x.max)}`).join(", ")}` : ""}${e.momentum !== null ? ` — momentum ${e.momentum > 0 ? "+" : ""}${Math.round(e.momentum)} (−100 = ${e.foe} wins, +100 = {{user}} wins)` : ""}`);
    const on = [
      ...e.foeConds.map((c) => `${c.label.toLowerCase()}${c.rounds ? ` (${c.rounds} round${c.rounds === 1 ? "" : "s"})` : ""}`),
      ...e.foeArmor ? [`armored (${e.foeArmor})`] : []
    ];
    if (on.length)
      lines.push(`${e.foe} is ${on.join(", ")}.`);
  }
  const here = hud.people.filter((p) => p.present).map((p) => p.name);
  if (here.length || Object.keys(s.people).length)
    lines.push(`Present here: ${here.length ? here.join(", ") : "none of the people {{user}} knows"}`);
  const was = Object.entries(s.scene).filter(([id, v]) => v.here && s.people[id] && v.loc !== s.location && v.loc === s.lastLocation && !here.includes(s.people[id].name)).map(([id]) => personName(r, s, id));
  if (was.length)
    lines.push(`Were with {{user}} before arriving here (include them only if they came along): ${was.join(", ")}`);
  const meters = r.statOrder.map((id) => r.stats[id]).filter((d) => d.kind === "meter" || d.kind === "money");
  const other = r.statOrder.map((id) => r.stats[id]).filter((d) => d.kind === "attribute" || d.kind === "skill");
  const unusual = (d) => {
    if (named(d.label))
      return true;
    if (d.kind === "money")
      return moneyTalk;
    if (!d.bands.length)
      return false;
    const max = statMax(r, d, s);
    return bandFor(d, s.stats[d.id] ?? d.start, max)?.text !== bandFor(d, d.start, max)?.text;
  };
  const ml = meters.filter((d) => !nar || unusual(d)).map((d) => statLine(r, d, s, r.narration.numbers)).filter(Boolean);
  if (ml.length)
    lines.push(ml.join(" · "));
  const ol = other.filter((d) => named(d.label)).map((d) => statLine(r, d, s, r.narration.numbers)).filter(Boolean);
  if (ol.length)
    lines.push(`Skills: ${ol.join(" · ")}`);
  const conds = Object.entries(s.conditions).map(([id, c]) => `${r.conditions[id]?.label ?? id}${c.rounds !== undefined ? ` (${c.rounds} round${c.rounds === 1 ? "" : "s"})` : ""}`);
  if (conds.length)
    lines.push(`Conditions: ${conds.join(", ")}`);
  const hereIds = new Set(hud.people.filter((p) => p.present).map((p) => p.id));
  const inPlay = (id) => {
    if (!nar)
      return true;
    const q = questDef(r, s, id);
    const st = s.quests?.[id];
    if (!q || !st)
      return false;
    if (st.st === "ready" || titled(q.name) || q.giver && (hereIds.has(q.giver) || named(personName(r, s, q.giver))))
      return true;
    return st.due !== null && st.due - s.minutes <= 1440;
  };
  const quests = questDigest(r, s, inPlay);
  if (quests.length)
    lines.push(`Quests under way (only the rules decide when one is done or failed): ${quests.join(" | ")}`);
  const offers = questOffers(r, s);
  const asks = offers.filter((o) => o.via === "giver" && (workTalk || titled(r.quests[o.id].name))).map((o) => `${o.from} ("${r.quests[o.id].name}"${r.quests[o.id].desc ? ` — ${r.quests[o.id].desc}` : ""})`);
  if (asks.length)
    lines.push(`Has something to ask of {{user}} (may bring it up when it fits; {{user}} decides whether to take it on): ${asks.join("; ")}`);
  const posted = offers.filter((o) => o.via === "board" && (workTalk || titled(r.quests[o.id].name))).map((o) => `"${r.quests[o.id].name}"`);
  if (posted.length)
    lines.push(`Posted on the notice board here: ${posted.join(", ")}`);
  const bag = Object.entries(s.items);
  const uses = (id) => {
    const per = r.items[id]?.uses ?? 0;
    return per > 1 ? `, ${s.uses[id] ?? per} of ${per} uses left` : "";
  };
  const bagNames = bag.map(([id]) => itemName(r, s, id));
  const inv = bag.filter(([id]) => named(itemName(r, s, id), bagNames)).map(([id, n]) => `${itemName(r, s, id)}${n > 1 ? ` ×${n}` : ""}${uses(id) ? ` (${uses(id).slice(2)})` : ""}`);
  const rest = bag.length - inv.length;
  if (inv.length)
    lines.push(`Carrying: ${inv.join(", ")}${rest ? ` (and ${rest} other thing${rest === 1 ? "" : "s"} — not in play; don't bring them up unless {{user}} does)` : ""}`);
  else if (rest)
    lines.push(`Carrying ${rest} thing${rest === 1 ? "" : "s"}, none in play right now (don't bring them up unless {{user}} does).`);
  const feel = (id, name) => {
    const parts = r.relStatOrder.map((rs) => {
      const def = r.relStats[rs];
      if (def.show === "hidden")
        return null;
      const v = s.rel[id]?.[rs] ?? def.start;
      const band = bandFor(def, v);
      const words = shownText(def, band, formatNumber(v));
      return words ? `${def.label} ${words}` : `${def.label} ${formatNumber(v)}`;
    }).filter(Boolean);
    return parts.length ? `${name} (${parts.join(", ")})` : name;
  };
  const inScene = hud.people.filter((p) => p.present);
  if (inScene.length)
    lines.push(`Relationships (here): ${inScene.map((p) => feel(p.id, p.name)).join("; ")}`);
  for (const p of inScene) {
    if (p.conditions.length)
      lines.push(`${p.name} is ${p.conditions.map((c) => c.label.toLowerCase()).join(", ")}.`);
    const mem = (s.memories?.[p.id] ?? []).slice(-3).map((m) => `${m.text}${r.clock.enabled ? ` (${agoWords(s.minutes - m.at)})` : ""}`);
    if (mem.length)
      lines.push(`${p.name} remembers: ${mem.join("; ")}`);
  }
  const away = hud.people.filter((p) => !p.present && hasMet(s, p.id) && s.scene[p.id] && s.minutes - s.scene[p.id].at <= 1440).sort((a, b) => (s.scene[b.id]?.at ?? -1) - (s.scene[a.id]?.at ?? -1)).slice(0, 4);
  if (away.length)
    lines.push(`Not in this scene (seen lately; bring them in only if the story calls for it): ${away.map((p) => p.name).join(", ")}`);
  return lines.join(`
`);
}
// node_modules/warp/src/backend/host.ts
function host2() {
  return spindle;
}
function logError2(where, err) {
  const msg = err instanceof Error ? err.message : String(err);
  try {
    spindle.log.error(`[warp] ${where}: ${msg}`);
  } catch {}
}

// node_modules/warp/src/backend/rulebook-install.ts
function isInstalledRulebook(book) {
  const meta = book.metadata;
  return meta?.warp?.installedRulebook === 1;
}
var installs = new Map;
function publishRulebook(characterId, parts, userId, metadata = {}) {
  const key = JSON.stringify([userId, characterId]);
  const result = (installs.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const checked = loadRuleset(parts);
    if (!checked.ruleset || checked.issues.some((i) => i.level === "error"))
      throw new Error("Fix the rulebook errors before installing it.");
    const character = await host2().characters.get(characterId, userId);
    if (!character)
      throw new Error("Character not found");
    const book = await host2().world_books.create({
      name: "warp-ruleset",
      description: `Warp game rules for ${character.name}. A complete installed snapshot; older attached rulebooks are retained as backups.`,
      metadata: { warp: { ...metadata, installedRulebook: 1 } }
    }, userId);
    let verified = false;
    try {
      for (const part of parts)
        await host2().world_books.entries.create(book.id, {
          comment: `warp-ruleset · ${part.label}`,
          content: part.content,
          key: [],
          disabled: true,
          constant: false,
          order_value: part.order
        }, userId);
      const persisted = [];
      for (let offset = 0;; offset += 200) {
        const page = await host2().world_books.entries.list(book.id, { offset, limit: 200, userId });
        persisted.push(...page.data.map((e) => ({ label: e.comment ?? "", content: e.content, order: e.order_value ?? 0 })));
        if (page.data.length === 0 || persisted.length >= page.total)
          break;
      }
      const readBack = loadRuleset(persisted);
      if (persisted.length !== parts.length || !readBack.ruleset || readBack.issues.some((i) => i.level === "error") || JSON.stringify(readBack.ruleset) !== JSON.stringify(checked.ruleset))
        throw new Error("The saved rulebook did not match the reviewed draft. Nothing was published.");
      verified = true;
      const latest = await host2().characters.get(characterId, userId);
      if (!latest)
        throw new Error("Character not found");
      await host2().characters.update(characterId, { world_book_ids: [...latest.world_book_ids ?? [], book.id] }, userId);
      return book.id;
    } catch (error) {
      const latest = await host2().characters.get(characterId, userId).catch(() => null);
      if (verified && latest?.world_book_ids?.includes(book.id))
        return book.id;
      if (latest && !latest.world_book_ids?.includes(book.id) && typeof host2().world_books.delete === "function") {
        await host2().world_books.delete(book.id, userId).catch((e) => logError2("discard staged rulebook", e));
      }
      throw error;
    }
  });
  installs.set(key, result);
  result.finally(() => {
    if (installs.get(key) === result)
      installs.delete(key);
  }).catch(() => {});
  return result;
}
// src/shared/format.ts
var STUDIO_FORMAT = 2;

// src/warp.ts
var ENGINE_FORMAT = (() => {
  const v = undefined;
  return typeof v === "number" ? v : 1;
})();
var STUDIO_VERSION = package_default.version;
var WARP_PIN = package_default.devDependencies.warp;
var WARP_PIN_SHORT = (() => {
  const m = /#([0-9a-f]{7,40})$/i.exec(WARP_PIN);
  return m ? `warp#${m[1].slice(0, 7)}` : WARP_PIN;
})();
var STAMP = { format: ENGINE_FORMAT, by: `warp_studio@${package_default.version}` };

// src/rulebook/workspace.ts
function cleanLabel(label) {
  return label.replace(/^\s*(?:\[[^\]]*\]\s*)?warp[-_ ]?ruleset\s*[·:\-–—|]?\s*/i, "").replace(/[^\w -]+/g, "").trim().toLowerCase() || "core";
}
function orderParts(parts) {
  const rank = (l) => {
    const i = PART_LABELS.indexOf(l);
    return i < 0 ? 99 : i;
  };
  return parts.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p.label) - rank(b.p.label) || a.i - b.i).map((x) => x.p);
}
function asRulesetParts(parts) {
  return parts.map((p, i) => ({ label: `warp-ruleset · ${p.label}`, content: p.yaml, order: i }));
}
var toIssue = (i) => ({ level: i.level === "error" ? "error" : "warning", where: i.where, message: i.message });
function checkParts(parts) {
  const { ruleset, issues } = loadRuleset(asRulesetParts(parts));
  const all = ruleset ? [...issues, ...lintRuleset(ruleset)] : issues;
  const labels = new Set(parts.map((p) => p.label));
  const placeOf = (where) => {
    const head = where.replace(/^warp-ruleset\s*·\s*/i, "").split(/[›,]/)[0].trim().toLowerCase();
    return labels.has(head) ? head : partForIssue(where);
  };
  const checked = parts.map((p) => {
    const mine = all.filter((i) => placeOf(i.where) === p.label).map(toIssue);
    return { label: p.label, yaml: p.yaml, issues: mine, status: mine.some((i) => i.level === "error") ? "error" : mine.length ? "warn" : "ok" };
  });
  const unplaced = all.filter((i) => !labels.has(placeOf(i.where))).map(toIssue);
  return {
    ruleset,
    issues: all,
    parts: checked,
    unplaced,
    errors: all.filter((i) => i.level === "error").length,
    warnings: all.filter((i) => i.level !== "error").length,
    legacy: legacyKeys(parts)
  };
}
function installBlock(check, parts) {
  if (!parts.some((p) => p.yaml.trim()))
    return "The draft is empty.";
  if (check.errors === 1)
    return "Fix the error first (marked in red).";
  if (check.errors)
    return `Fix the ${check.errors} errors first (marked in red).`;
  if (!check.ruleset)
    return "The draft doesn't load.";
  return null;
}
var TOP_KEY = /^([A-Za-z_]\w*)\s*:/gm;
function legacyKeys(parts) {
  const out = [];
  for (const p of parts)
    for (const m of p.yaml.matchAll(TOP_KEY)) {
      const k = m[1];
      if (Object.prototype.hasOwnProperty.call(REMOVED_KEYS, k) && !out.includes(k))
        out.push(k);
    }
  return out;
}
function legacyBanner(keys, opts = {}) {
  if (!keys.length)
    return null;
  const list = keys.length > 3 ? `${keys.slice(0, 3).join(", ")}…` : keys.join(", ");
  return `This rulebook uses ${keys.length} part${keys.length === 1 ? "" : "s"} Warp no longer runs (${list}). ${keys.length === 1 ? "It is" : "They are"} ignored.` + (opts.deepen ? " Deepen can rebuild them as conflict kinds and goals." : "");
}
function setPart(parts, label, yaml) {
  const l = cleanLabel(label);
  const text = yaml.replace(/\r\n?/g, `
`);
  const has = parts.some((p) => p.label === l);
  if (!text.trim())
    return parts.filter((p) => p.label !== l);
  const next = has ? parts.map((p) => p.label === l ? { label: l, yaml: text } : p) : [...parts, { label: l, yaml: text }];
  return orderParts(next);
}
function sameParts(a, b) {
  if (a.length !== b.length)
    return false;
  const key = (ps) => orderParts(ps).map((p) => `${p.label}\x00${p.yaml.trim()}`).join("\x01");
  return key(a) === key(b);
}
function fromTemplate(id, card) {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t)
    return null;
  const add = card && card.name && !looksLikeScenario(card);
  return orderParts(t.parts.map((p) => ({ label: cleanLabel(p.label), yaml: add ? withCharacter(p.yaml, card.name) : p.yaml })));
}
function fromText(text) {
  const parts = splitRulebook(text).map((p) => ({ label: cleanLabel(p.label), yaml: p.yaml }));
  if (!parts.length)
    throw new Error("That doesn't look like a rulebook: it should be YAML with top-level keys like `stats:` or `relationships:`.");
  const merged = [];
  for (const p of parts) {
    const hit = merged.find((x) => x.label === p.label);
    if (hit)
      hit.yaml = `${hit.yaml.trimEnd()}
${p.yaml}`;
    else
      merged.push({ ...p });
  }
  return merged;
}
var IMPORT_LINE = /^# Edit it anywhere.*$/m;
function toText(parts, title) {
  return joinRulebook(parts, title || "Untitled").replace(IMPORT_LINE, "# Edit it anywhere, then import it back: Warp Studio → Import a rulebook, then Install.");
}
function templateInfo() {
  return TEMPLATES.map((t) => ({ id: t.id, name: t.name, blurb: t.blurb }));
}

// src/rulebook/preview.ts
function previewOf(r) {
  const s = initialState(r);
  const hud = buildHud(r, s);
  const panel = [];
  if (hud.clock)
    panel.push(`${hud.date ?? hud.clock.day}, ${hud.clock.time}`);
  if (hud.location)
    panel.push(`Place: ${hud.location.name}${hud.money ? ` · ${hud.money}` : ""}`);
  else if (hud.money)
    panel.push(`Money: ${hud.money}`);
  for (const b of hud.bars)
    panel.push(`${b.label}: ${b.text ? `${b.text} (${b.display})` : b.display}`);
  if (hud.skills.length)
    panel.push(`Skills: ${hud.skills.map((x) => `${x.label} ${x.grade ?? x.text ?? x.display}`).join(", ")}`);
  for (const p of hud.people) {
    const bands = p.stats.map((x) => `${x.label} ${x.text ?? x.display}`).join(", ");
    panel.push(`${p.name}${p.present ? " (here)" : ""}${bands ? `: ${bands}` : ""}`);
  }
  if (hud.items.length)
    panel.push(`Carrying: ${hud.items.map((i) => `${i.name}${i.count > 1 ? ` ×${i.count}` : ""}${i.use ? ` [${i.use.label}]` : ""}${i.bonus ? ` (${i.bonus})` : ""}`).join(", ")}`);
  if (hud.conditions.length)
    panel.push(`Conditions: ${hud.conditions.map((c) => c.label).join(", ")}`);
  const choices = buildChoices(r, s, { lines: [], veils: [] }).map((c) => `${c.label}${c.odds !== null ? ` — ${Math.round(c.odds * 100)}%${c.checkLabel ? ` ${c.checkLabel}` : ""}` : ""}${c.locked ? ` — locked: ${c.locked}` : ""}`);
  const narrator = stateDigest(r, s, { text: "" }).split(`
`).filter((l) => l.trim());
  return { name: r.name, description: r.description ?? null, panel, choices, narrator };
}

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

// src/backend/store.ts
async function listAll(bookId, userId) {
  const out = [];
  for (let offset = 0;offset < 5000; offset += 200) {
    const page = await host().world_books.entries.list(bookId, { limit: 200, offset, userId });
    out.push(...page.data);
    if (page.data.length === 0 || out.length >= page.total)
      break;
  }
  return out;
}
var metaOf = (b) => b.metadata?.warp ?? {};
function partsOf(entries) {
  const sorted = [...entries].sort((a, b) => a.order - b.order || a.comment.localeCompare(b.comment));
  const out = [];
  for (const e of sorted) {
    const base = cleanLabel(e.comment);
    let label = base;
    for (let n = 2;out.some((p) => p.label === label); n++)
      label = `${base} ${n}`;
    out.push({ label, yaml: e.content.endsWith(`
`) ? e.content : `${e.content}
` });
  }
  return out;
}
async function readCharacterRules(characterId, userId) {
  const c = await host().characters.get(characterId, userId);
  if (!c)
    return null;
  const card = {
    id: c.id,
    name: c.name ?? "",
    description: c.description ?? "",
    personality: c.personality ?? "",
    scenario: c.scenario ?? "",
    first_mes: c.first_mes ?? "",
    creator_notes: c.creator_notes ?? "",
    tags: c.tags ?? []
  };
  const books = (await Promise.all((c.world_book_ids ?? []).map((id) => host().world_books.get(id, userId).catch(() => null)))).filter((b) => !!b);
  const active = [...books].reverse().find((b) => isRulesetBookName(b.name) && isInstalledRulebook(b)) ?? null;
  const views = [];
  const loaded = [];
  for (const b of books) {
    const whole = isRulesetBookName(b.name);
    const entries = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment));
    if (!entries.length && !whole)
      continue;
    const included = !active || active.id === b.id;
    const meta = metaOf(b);
    views.push({
      id: b.id,
      name: b.name,
      installed: isInstalledRulebook(b),
      active: included && entries.length > 0,
      format: typeof meta.format === "number" ? meta.format : null,
      by: typeof meta.by === "string" ? meta.by : null,
      entries: entries.length
    });
    if (included)
      loaded.push(...entries.map((e) => ({ comment: e.comment ?? "", content: e.content ?? "", order: e.order_value ?? 100 })));
  }
  const parts = partsOf(loaded);
  const shown = views.filter((v) => v.active);
  return {
    card,
    view: {
      id: c.id,
      name: card.name,
      books: views,
      source: shown.length ? shown.map((v) => `${v.name} (${v.entries} ${v.entries === 1 ? "entry" : "entries"})`).join(", ") : null,
      installedParts: parts.length
    },
    parts
  };
}
async function readBook(bookId, userId) {
  const b = await host().world_books.get(bookId, userId);
  if (!b)
    return null;
  const whole = isRulesetBookName(b.name);
  const entries = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment));
  return { name: b.name, parts: partsOf(entries.map((e) => ({ comment: e.comment ?? "", content: e.content ?? "", order: e.order_value ?? 100 }))) };
}
function publish(characterId, parts, userId) {
  return publishRulebook(characterId, parts.map((p, i) => ({ label: p.label, content: p.yaml, order: (i + 1) * 10 })), userId, { ...STAMP });
}

// src/backend/session.ts
var WORKSPACE_VERSION = 1;
var MAX_PARTS = 40;
var MAX_YAML = 200000;
var str2 = (v, max = 200) => typeof v === "string" ? v.slice(0, max) : "";
function restoreBase(raw) {
  const b = raw && typeof raw === "object" ? raw : {};
  switch (b.kind) {
    case "installed":
      return { kind: "installed", bookId: typeof b.bookId === "string" ? b.bookId : null };
    case "backup":
      return typeof b.bookId === "string" ? { kind: "backup", bookId: b.bookId, name: str2(b.name) || "warp-ruleset" } : null;
    case "template":
      return typeof b.id === "string" ? { kind: "template", id: b.id, name: str2(b.name) || b.id } : null;
    case "import":
      return { kind: "import", name: str2(b.name) || null };
  }
  return null;
}
function restoreWorkspace(raw, characterId) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return null;
  const w = raw;
  if (typeof w.schemaVersion === "number" && w.schemaVersion > WORKSPACE_VERSION)
    return null;
  const base = restoreBase(w.base);
  if (!base || !Array.isArray(w.parts))
    return null;
  let parts = [];
  for (const p of w.parts.slice(0, MAX_PARTS)) {
    if (!p || typeof p !== "object")
      continue;
    const { label, yaml } = p;
    if (typeof label !== "string" || typeof yaml !== "string" || yaml.length > MAX_YAML)
      continue;
    parts = setPart(parts, label, yaml);
  }
  const waived = {};
  if (w.waived && typeof w.waived === "object" && !Array.isArray(w.waived)) {
    for (const [id, v] of Object.entries(w.waived)) {
      const reason = str2(v?.reason, 400).trim();
      const at = Number(v?.at);
      if (id.length <= 200 && reason.length >= 8)
        waived[id] = { reason, at: Number.isFinite(at) ? at : 0 };
    }
  }
  return {
    schemaVersion: WORKSPACE_VERSION,
    characterId,
    characterName: str2(w.characterName),
    base,
    parts,
    waived,
    updatedAt: Number.isFinite(Number(w.updatedAt)) ? Number(w.updatedAt) : 0
  };
}
var lives = new Map;
var queues = new Map;
var keyOf = (characterId, userId) => `${userId ?? "_"}:${characterId}`;
var pathOf = (characterId) => `workspaces/${characterId.replace(/[^\w-]+/g, "_")}.json`;
function serial(characterId, userId, fn) {
  const k = keyOf(characterId, userId);
  const run = (queues.get(k) ?? Promise.resolve()).catch(() => {}).then(fn);
  queues.set(k, run);
  run.finally(() => {
    if (queues.get(k) === run)
      queues.delete(k);
  }).catch(() => {});
  return run;
}
async function liveOf(characterId, userId, fresh = false) {
  const k = keyOf(characterId, userId);
  let l = lives.get(k);
  if (!l) {
    l = { draft: null, rules: null, busy: null, error: null, installed: null, loaded: false };
    lives.set(k, l);
  }
  if (fresh || !l.rules)
    l.rules = await readCharacterRules(characterId, userId);
  if (!l.loaded) {
    l.loaded = true;
    try {
      l.draft = restoreWorkspace(await host().userStorage.getJson(pathOf(characterId), { fallback: null, userId }), characterId);
    } catch (e) {
      logError("workspace read", e);
    }
  }
  return l;
}
async function save(l, userId) {
  if (!l.draft)
    return;
  l.draft.updatedAt = Date.now();
  await host().userStorage.setJson(pathOf(l.draft.characterId), l.draft, { userId });
}
function draftView(l) {
  const d = l.draft;
  if (!d)
    return null;
  const c = checkParts(d.parts);
  let preview = null;
  if (c.ruleset && !c.errors) {
    try {
      preview = previewOf(c.ruleset);
    } catch (e) {
      logError("preview", e);
    }
  }
  return {
    base: d.base,
    parts: c.parts.map((p) => ({ label: p.label, yaml: p.yaml, status: p.status, issues: p.issues })),
    unplaced: c.unplaced,
    errors: c.errors,
    warnings: c.warnings,
    legacy: c.legacy,
    banner: legacyBanner(c.legacy),
    changed: !sameParts(d.parts, l.rules?.parts ?? []),
    installBlock: installBlock(c, d.parts),
    preview,
    updatedAt: d.updatedAt
  };
}
function studioView(characterId, l) {
  return { characterId, character: l.rules?.view ?? null, draft: draftView(l), busy: l.busy, error: l.error, installed: l.installed };
}
function emit(characterId, l, userId) {
  send({ type: "studio", view: studioView(characterId, l) }, userId);
}
function op(characterId, userId, fn, opts = {}) {
  return serial(characterId, userId, async () => {
    let l;
    try {
      l = await liveOf(characterId, userId, opts.fresh);
    } catch (e) {
      logError("open", e);
      send({ type: "studio", view: { characterId, character: null, draft: null, busy: null, error: `Couldn't read this character: ${e instanceof Error ? e.message : String(e)}`, installed: null } }, userId);
      return;
    }
    l.error = null;
    try {
      await fn(l);
    } catch (e) {
      logError("workspace", e);
      l.error = e instanceof Error ? e.message : String(e);
    }
    l.busy = null;
    emit(characterId, l, userId);
  });
}
function needCharacter(l) {
  if (!l.rules)
    throw new Error("This character was not found. It may have been deleted.");
  return l.rules;
}
function newDraft(l, characterId, base, parts) {
  return {
    schemaVersion: WORKSPACE_VERSION,
    characterId,
    characterName: l.rules?.card.name ?? "",
    base,
    parts: orderParts(parts.map((p) => ({ label: cleanLabel(p.label), yaml: p.yaml }))),
    waived: l.draft?.waived ?? {},
    updatedAt: Date.now()
  };
}
function openStudio(characterId, userId) {
  return op(characterId, userId, async () => {}, { fresh: true });
}
function startDraft(characterId, from, userId) {
  return op(characterId, userId, async (l) => {
    const rules = needCharacter(l);
    if ("installed" in from) {
      if (!rules.parts.length)
        throw new Error("This character has no Warp rules yet. Start from a template or import a rulebook.");
      const active = rules.view.books.filter((b) => b.active);
      l.draft = newDraft(l, characterId, { kind: "installed", bookId: active.length === 1 ? active[0].id : null }, rules.parts);
    } else if ("template" in from) {
      const t = TEMPLATES.find((x) => x.id === from.template);
      const parts = fromTemplate(from.template, rules.card);
      if (!t || !parts)
        throw new Error(`There is no template "${from.template}".`);
      l.draft = newDraft(l, characterId, { kind: "template", id: t.id, name: t.name }, parts);
    } else {
      const b = await readBook(from.backup, userId);
      if (!b || !b.parts.length)
        throw new Error("That book has no Warp rules.");
      l.draft = newDraft(l, characterId, { kind: "backup", bookId: from.backup, name: b.name }, b.parts);
    }
    await save(l, userId);
  });
}
function importDraft(characterId, text, name, userId) {
  return op(characterId, userId, async (l) => {
    needCharacter(l);
    if (text.length > MAX_YAML * 4)
      throw new Error("That file is too big for a rulebook.");
    l.draft = newDraft(l, characterId, { kind: "import", name: name?.trim().slice(0, 200) || null }, fromText(text));
    await save(l, userId);
  });
}
function editPart(characterId, label, yaml, userId) {
  return op(characterId, userId, async (l) => {
    if (!l.draft)
      throw new Error("Start a draft first.");
    if (yaml.length > MAX_YAML)
      throw new Error("That section is too long.");
    if (!l.draft.parts.some((p) => p.label === cleanLabel(label)) && l.draft.parts.length >= MAX_PARTS)
      throw new Error("Too many sections.");
    l.draft.parts = setPart(l.draft.parts, label, yaml);
    await save(l, userId);
  });
}
function discardDraft(characterId, userId) {
  return op(characterId, userId, async (l) => {
    l.draft = null;
    try {
      await host().userStorage.delete(pathOf(characterId), userId);
    } catch {}
  });
}
function exportRules(characterId, from, userId) {
  return op(characterId, userId, async (l) => {
    const rules = needCharacter(l);
    const parts = from === "draft" ? l.draft?.parts ?? [] : rules.parts;
    if (!parts.length)
      throw new Error(from === "draft" ? "There is no draft to export." : "This character has no Warp rules to export yet.");
    send({ type: "exported", characterId, name: rules.card.name || "rulebook", text: toText(parts, rules.card.name) }, userId);
  });
}
function installDraft(characterId, warp, userId) {
  return op(characterId, userId, async (l) => {
    if (!l.draft || !l.draft.parts.length)
      throw new Error("Nothing to install.");
    const block = installBlock(checkParts(l.draft.parts), l.draft.parts);
    if (block)
      throw new Error(block);
    const status = warpStatus(warp ?? { present: false, format: null }, STUDIO_FORMAT);
    if (status.blocks)
      throw new Error(status.text);
    l.busy = "Saving to the lorebook…";
    emit(characterId, l, userId);
    const bookId = await publish(characterId, l.draft.parts, userId);
    l.installed = { bookId, at: Date.now() };
    l.draft.base = { kind: "installed", bookId };
    await save(l, userId);
    try {
      l.rules = await readCharacterRules(characterId, userId);
    } catch (e) {
      logError("re-read after install", e);
    }
    toast("success", 'Installed. Warp reads the new rules within a few seconds (or use "Warp: Reload ruleset").', userId);
  });
}
async function listCharacters(userId) {
  const out = [];
  for (let offset = 0;offset < 2000; offset += 200) {
    const page = await host().characters.list({ limit: 200, offset, userId });
    out.push(...page.data.map((c) => ({ id: c.id, name: c.name || "(no name)" })));
    if (page.data.length < 200 || out.length >= page.total)
      break;
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
function forgetCharacter(characterId) {
  for (const [k, l] of lives)
    if (!characterId || k.endsWith(`:${characterId}`))
      l.rules = null;
}

// src/shared/protocol.ts
var DEFAULT_SETTINGS = { helperConnectionId: "", creative: false, playtestTurns: 30, playtestSeeds: 20, showThin: true };

// src/backend/settings.ts
var cache2 = new Map;
var writes = new Map;
var key = (userId) => userId ?? "_";
var int2 = (v, min, max, def) => {
  const n = typeof v === "string" && v.trim() ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
var bool2 = (v, def) => v === true || v === "true" ? true : v === false || v === "false" ? false : def;
function normalizeSettings(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    helperConnectionId: typeof raw.helperConnectionId === "string" ? raw.helperConnectionId.trim().slice(0, 200) : DEFAULT_SETTINGS.helperConnectionId,
    creative: bool2(raw.creative, DEFAULT_SETTINGS.creative),
    playtestTurns: int2(raw.playtestTurns, 5, 200, DEFAULT_SETTINGS.playtestTurns),
    playtestSeeds: int2(raw.playtestSeeds, 1, 200, DEFAULT_SETTINGS.playtestSeeds),
    showThin: bool2(raw.showThin, DEFAULT_SETTINGS.showThin)
  };
}
async function getSettings(userId) {
  const hit = cache2.get(key(userId));
  if (hit)
    return hit;
  let stored = {};
  try {
    stored = await host().userStorage.getJson("settings.json", { fallback: {}, userId });
  } catch {}
  const s = normalizeSettings(stored);
  cache2.set(key(userId), s);
  return s;
}
async function patchSettings(patch, userId) {
  let result;
  const k = key(userId);
  const op = (writes.get(k) ?? Promise.resolve()).then(async () => {
    const next = normalizeSettings({ ...await getSettings(userId), ...patch && typeof patch === "object" ? patch : {} });
    await host().userStorage.setJson("settings.json", next, { indent: 2, userId });
    cache2.set(k, next);
    result = next;
  });
  const tail = op.catch(() => {});
  writes.set(k, tail);
  tail.then(() => {
    if (writes.get(k) === tail)
      writes.delete(k);
  });
  await op;
  return result;
}

// src/backend/router.ts
var ABOUT = `Warp Studio ${STUDIO_VERSION} · ruleset format ${ENGINE_FORMAT} · engine ${WARP_PIN_SHORT}`;
async function sendSettings(userId) {
  const settings = await getSettings(userId);
  let connections = [];
  let canGenerate = true;
  try {
    connections = (await host().connections.list(userId)).map((c) => ({ id: c.id, name: c.name }));
  } catch {
    canGenerate = false;
  }
  const sections = PART_LABELS.map((label) => ({ label, contents: PART_CONTENTS[label] }));
  send({ type: "settings", settings, connections, canGenerate, templates: templateInfo(), sections, about: ABOUT }, userId);
}
var id = (v) => typeof v === "string" && v.trim() && v.length <= 200 ? v : null;
function warpSeen(v) {
  if (!v || typeof v !== "object")
    return null;
  const w = v;
  return { present: w.present === true, format: typeof w.format === "number" && Number.isInteger(w.format) ? w.format : null };
}
async function handle(raw, userId) {
  const msg = raw && typeof raw === "object" ? raw : {};
  const characterId = id(msg.characterId);
  try {
    switch (msg.type) {
      case "hello":
        await sendSettings(userId);
        break;
      case "characters":
        send({ type: "characters", list: await listCharacters(userId) }, userId);
        break;
      case "settings":
        await patchSettings(msg.patch, userId);
        await sendSettings(userId);
        break;
      default: {
        if (!characterId)
          return;
        switch (msg.type) {
          case "open":
            await openStudio(characterId, userId);
            break;
          case "start":
            await startDraft(characterId, msg.from, userId);
            break;
          case "import":
            await importDraft(characterId, String(msg.text ?? ""), typeof msg.name === "string" ? msg.name : undefined, userId);
            break;
          case "edit":
            await editPart(characterId, String(msg.label ?? ""), String(msg.yaml ?? ""), userId);
            break;
          case "export":
            await exportRules(characterId, msg.from === "installed" ? "installed" : "draft", userId);
            break;
          case "install":
            await installDraft(characterId, warpSeen(msg.warp), userId);
            break;
          case "discard":
            await discardDraft(characterId, userId);
            break;
        }
      }
    }
  } catch (e) {
    logError(`frontend ${String(msg.type)}`, e);
    toast("error", `Warp Studio: ${e instanceof Error ? e.message : String(e)}`, userId);
  }
}

// src/backend.ts
spindle.onFrontendMessage((raw, userId) => {
  handle(raw, userId);
});
spindle.on("CHAT_SWITCHED", (p, userId) => {
  try {
    send({ type: "chat", chatId: p?.chatId ?? null }, userId);
  } catch (e) {
    logError("chat switched", e);
  }
});
spindle.on("CHARACTER_EDITED", (p) => {
  const x = p;
  forgetCharacter(x?.character?.id ?? x?.characterId ?? null);
});
