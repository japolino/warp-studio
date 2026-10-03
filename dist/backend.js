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
    "@types/js-yaml": "^4.0.9",
    "bun-types": "^1.3.14",
    "js-yaml": "^4.1.0",
    "lumiverse-spindle-types": "0.6.36",
    typescript: "^5.9.0",
    warp: "github:japolino/warp#be73bc17af6cd80a40a38cfe4a2a53747251789b"
  }
};

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

// node_modules/warp/src/engine/format-version.ts
var RULESET_FORMAT = 2;
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
  repeats = new Map;
  warn(where, message) {
    const seen = this.repeats.get(message);
    if (seen) {
      seen.more++;
      seen.issue.message = `${seen.base} (Also in ${seen.more} more place${seen.more === 1 ? "" : "s"}.)`;
      return;
    }
    const issue = { level: "warning", where, message };
    this.repeats.set(message, { issue, base: message, more: 0 });
    this.issues.push(issue);
  }
  removed(where, key, what, hint) {
    this.warn(where, `\`${key}:\` (${what}) was removed from Warp, so it's ignored. The old version is on the \`legacy\` branch.${hint ? ` ${hint}` : ""}`);
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
  const lines = (b) => ({
    ...typeof b.say === "string" && b.say.trim() ? { say: b.say.trim() } : {},
    ...typeof b.say_down === "string" && b.say_down.trim() ? { sayDown: b.say_down.trim() } : {},
    ...typeof b.voice === "string" && b.voice.trim() ? { voice: b.voice.trim() } : {}
  });
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
      list.push({ at, text: b.text, tone, ...lines(b) });
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
        list.push({ at, text: v.text, tone: v.tone, ...lines(v) });
      else
        c.warn(`${where} › ${k}`, "band should be a line of text");
    }
  } else {
    c.warn(where, "bands should be a map like `0: You feel fine.`");
  }
  list.sort((a, b) => a.at - b.at);
  return list.map((b, i) => ({ ...b, tone: b.tone ?? toneFor(i, list.length, good) }));
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
  return { stats: {}, set: {}, flags: {}, items: {}, rel: {}, addConditions: {}, removeConditions: [], decide: [], reveal: [], look: {}, goal: {}, remember: {} };
}
var GOAL_OPS = {
  start: "start",
  begin: "start",
  open: "start",
  done: "done",
  complete: "done",
  completed: "done",
  succeed: "done",
  success: "done",
  finish: "done",
  fail: "fail",
  failed: "fail",
  lose: "fail"
};
function difficultyOf(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "normal" || s === "medium")
    return "fair";
  return DIFFICULTIES.includes(s) ? s : null;
}
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
  foe: { what: "foe stats", hint: "Contests have no foe stats: use `swing:` or a contest kind's `cost:`." },
  end: { what: "ending an encounter", hint: "Only a full swing (or Break off / Give in) ends a contest." },
  end_encounter: { what: "ending an encounter", hint: "Only a full swing (or Break off / Give in) ends a contest." },
  start_encounter: { what: "encounters", hint: 'Use `contest: { kind: fight, with: "…" }`.' },
  encounter: { what: "encounters", hint: 'Use `contest: { kind: fight, with: "…" }`.' },
  harm: { what: "encounter damage", hint: "Use `swing:`." },
  hits: { what: "multi-hit blows" },
  pierce: { what: "armor" },
  inflict: { what: "statuses on others" },
  afflict: { what: "statuses on others" },
  status: { what: "statuses on others" },
  cleanse: { what: "statuses on others" },
  quest: { what: "quests", hint: "Use `goal: { id: done }`." },
  quests: { what: "quests", hint: "Use `goal: { id: done }`." },
  progress: { what: "quest goal counts", hint: "Use `goal:` or a flag." },
  unlock: { what: "the codex" },
  codex: { what: "the codex" },
  learn: { what: "abilities" },
  wear: { what: "the wardrobe", hint: 'Use `look: { you: { outfit: "…" } }`.' },
  put_on: { what: "the wardrobe", hint: "Use `look:`." },
  undress: { what: "the wardrobe", hint: "Use `look:`." },
  take_off: { what: "the wardrobe", hint: "Use `look:`." },
  damage: { what: "the wardrobe" },
  body: { what: "the body and transformations", hint: 'Use `look: { you: { appearance: "…" } }`.' },
  transform: { what: "the body and transformations", hint: "Use `look:`." },
  front: { what: "hidden world clocks (fronts)" },
  fronts: { what: "hidden world clocks (fronts)" },
  gauge: { what: "random events" },
  events_gauge: { what: "random events" },
  arc: { what: "companion lives" },
  bond: { what: "feelings between people" },
  bonds: { what: "feelings between people" },
  conceive: { what: "family and pregnancy" },
  pregnancy: { what: "family and pregnancy" }
};
var REMOVED_EFFECT_NAMES = Object.keys(REMOVED_EFFECTS);
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
    const gone = REMOVED_EFFECTS[k];
    if (gone && !known.stats.has(k)) {
      c.removed(w, k, gone.what, gone.hint);
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
      case "place":
      case "move":
      case "go":
      case "location":
        if (typeof v === "string" && v.trim())
          e.place = v.trim().slice(0, 120);
        else
          c.warn(w, "expected where {{user}} is now, in words (`place: The docks`)");
        break;
      case "time":
      case "minutes":
        e.time = minutesOf(v, w, c, 0);
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
            e.addConditions[x] = d === null || d === true ? null : minutesOf(d, `${w} › ${x}`, c, 60);
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
      case "reveal":
        e.reveal.push(...list(v));
        break;
      case "swing":
      case "momentum": {
        const x = c.expr(v, w);
        if (x !== undefined)
          e.swing = x;
        break;
      }
      case "look":
      case "looks":
        if (!isObj(v)) {
          c.warn(w, 'expected `look: { you: { outfit: "..." }, mira: { appearance: "..." } }`');
          break;
        }
        for (const [who, m] of Object.entries(v)) {
          if (!isObj(m)) {
            c.warn(`${w} › ${who}`, "expected `appearance:` and/or `outfit:`");
            continue;
          }
          const out = {};
          for (const f of ["appearance", "outfit"])
            if (f in m)
              out[f] = typeof m[f] === "string" && m[f].trim() ? m[f].trim().slice(0, 160) : null;
          for (const k2 of Object.keys(m))
            if (k2 !== "appearance" && k2 !== "outfit")
              c.warn(`${w} › ${who} › ${k2}`, "a look has `appearance:` and `outfit:`");
          if (Object.keys(out).length)
            e.look[who] = out;
        }
        break;
      case "goal":
      case "goals":
        if (typeof v === "string")
          e.goal[v] = "start";
        else if (Array.isArray(v))
          for (const id of v)
            e.goal[String(id)] = "start";
        else if (isObj(v))
          for (const [id, op] of Object.entries(v)) {
            const o = GOAL_OPS[String(op).toLowerCase()];
            if (o)
              e.goal[id] = o;
            else
              c.warn(`${w} › ${id}`, `"${op}" isn't a goal step (start, done, fail)`);
          }
        break;
      case "contest": {
        if (!isObj(v)) {
          c.warn(w, 'expected `contest: { kind: fight, with: "the bouncer", threat: hard }`');
          break;
        }
        const kind = typeof v.kind === "string" ? v.kind : "";
        const who = typeof v.with === "string" ? v.with : typeof v.opponent === "string" ? v.opponent : "";
        const threat = v.threat === undefined ? undefined : difficultyOf(v.threat);
        if (!kind || !who.trim()) {
          c.warn(w, "a contest needs `kind:` and `with:` (the opponent's name)");
          break;
        }
        if (v.threat !== undefined && !threat)
          c.warn(`${w} › threat`, `"${v.threat}" — use easy, fair, hard or extreme`);
        e.contest = { kind, with: who.trim().slice(0, 60), ...threat ? { threat } : {} };
        break;
      }
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
          c.warn(w, `"${k}" isn't a stat or a known effect (stats, set, flags, give, take, rel, place, look, time, add_condition, remove_condition, hint, decide, remember, reveal, goal, contest, swing)`);
    }
  }
  return e;
}
var OLD_CHECK_KEYS = ["chance", "under"];
function normCheck(raw, where, c, style) {
  if (!isObj(raw)) {
    c.err(where, "a check should be a map, e.g. `{ vs: fair, add: body, label: Body }`");
    return;
  }
  if (style === "story") {
    c.err(where, "Story rulesets don't roll; remove `check:` or use `style: adventure`. The action runs its `effects:` without a roll.");
    return;
  }
  if (OLD_CHECK_KEYS.some((k) => raw[k] !== undefined) || raw.style === "pbta" || raw.bands === "pbta" || raw.pbta !== undefined) {
    c.warn(where, "d100 (`chance:`) and PbtA checks were removed from Warp, so this check is ignored and the move runs its `effects:` without a roll. The old version is on the `legacy` branch. Use `check: { vs: fair, add: <stat> }` (d20 + the stat vs a difficulty).");
    return;
  }
  const dice = raw.dice ?? raw.roll;
  if (dice !== undefined && !/^\s*1?d20\s*$/i.test(String(dice))) {
    c.err(`${where} › dice`, `"${dice}": other dice were removed from Warp — every check is a d20 (+ a modifier vs a difficulty). This check is dropped; the action runs its \`effects:\` without a roll.`);
    return;
  }
  for (const k of ["crit", "crit_chance", "crits"])
    if (raw[k] !== undefined)
      c.removed(`${where} › ${k}`, k, "crit chances", "A natural 20 is a critical success, a natural 1 a critical failure.");
  for (const k of ["game", "games", "minigame"])
    if (raw[k] !== undefined)
      c.removed(`${where} › ${k}`, k, "minigames");
  const vs = raw.vs ?? raw.dc;
  let target;
  if (vs !== undefined) {
    const word = typeof vs === "string" ? difficultyOf(vs) : null;
    target = word ?? c.expr(vs, `${where} › vs`);
  }
  const add = c.expr(raw.add ?? raw.bonus ?? raw.mod, `${where} › add`);
  const known = new Set(["vs", "dc", "add", "bonus", "mod", "partial", "partial_margin", "label", "skill", "dice", "roll", "crit", "crit_chance", "crits", "game", "games", "minigame"]);
  for (const k of Object.keys(raw))
    if (!known.has(k))
      c.warn(`${where} › ${k}`, `"${k}" isn't something a check reads (vs, add, partial, label)`);
  return {
    ...target !== undefined ? { target } : {},
    ...add !== undefined ? { add } : {},
    ...raw.partial !== undefined || raw.partial_margin !== undefined ? { partialMargin: Math.max(0, c.num(raw.partial ?? raw.partial_margin, `${where} › partial`, 3)) } : {},
    ...typeof raw.label === "string" ? { label: raw.label } : typeof raw.skill === "string" ? { label: raw.skill } : {}
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
  "per_person",
  "with",
  "targets",
  "requires",
  "needs",
  "show_locked",
  "at",
  "group",
  "order",
  "per_day",
  "per_encounter",
  "gamble",
  "errand"
]);
var REMOVED_ACTION_KEYS = {
  at: { what: "places on a map", hint: "Use `when:` (e.g. a flag the story sets)." },
  order: { what: "choice order", hint: "Actions show in the order they are written." },
  per_day: { what: "use limits", hint: "Gate it with `when:` and a flag." },
  per_encounter: { what: "use limits", hint: "Gate it with `when:` and a flag." },
  gamble: { what: "gambling tables" },
  errand: { what: "the errands window" }
};
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
function normAction(id, raw, where, c, known, style) {
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
  const check = raw.check !== undefined ? normCheck(raw.check, `${where} › check`, c, style) : undefined;
  if (raw.check === undefined && Object.keys(outcomes).length)
    c.warn(where, "has outcomes but no check — put always-on changes under `effects:`");
  for (const [k, gone] of Object.entries(REMOVED_ACTION_KEYS))
    if (raw[k] !== undefined)
      c.removed(`${where} › ${k}`, k, gone.what, gone.hint);
  warnUnknownKeys(raw, ACTION_KEYS, where, c);
  const own = raw.when !== undefined ? c.expr(raw.when, `${where} › when`) : undefined;
  const requires = normRequires(raw.requires ?? raw.needs, `${where} › requires`, c, known);
  const parts = [...own !== undefined ? [String(own)] : [], ...requires.map((q) => q.when)];
  const when = parts.length > 1 ? parts.map((p) => `(${p})`).join(" and ") : parts[0];
  return {
    id,
    label: typeof raw.label === "string" ? raw.label : titleCase(id),
    say: typeof raw.say === "string" ? raw.say : undefined,
    desc: typeof raw.desc === "string" ? raw.desc : typeof raw.description === "string" ? raw.description : undefined,
    when: when === undefined ? undefined : String(when),
    hidden: raw.hidden === true,
    ...typeof raw.why_not === "string" ? { whyNot: raw.why_not } : typeof raw.locked === "string" ? { whyNot: raw.locked } : {},
    time: raw.time !== undefined ? minutesOf(raw.time, `${where} › time`, c, 0) : undefined,
    cost: normEffect(raw.cost ?? raw.costs, `${where} › cost`, c, known),
    check,
    outcomes,
    effects: normEffect(raw.effects ?? raw.effect, `${where} › effects`, c, known),
    params,
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).toLowerCase()) : [],
    perPerson: raw.per_person === true || raw.with === "person" || raw.with === "people" || raw.targets !== undefined,
    ...raw.targets !== undefined ? { targets: list(raw.targets) } : {},
    requires,
    showLocked: raw.show_locked === true || raw.show_locked !== false && (requires.length > 0 || typeof raw.why_not === "string" || typeof raw.locked === "string")
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
      case "goal":
      case "goals":
        if (isObj(v))
          for (const [id, st] of Object.entries(v))
            out.push({ when: `goal('${q(id)}') == '${q(String(st))}'`, kind: "goal", id, state: String(st) });
        else
          for (const id of list(v))
            out.push({ when: `goal('${q(id)}') == 'open'`, kind: "goal", id, state: "open" });
        break;
      case "quest":
      case "quests":
        c.removed(w, k, "quests", "Use `goal:` (a goal id, or `{ id: done }`).");
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
        c.warn(w, `"${k}" isn't a stat or a requirement (with, has, rel, goal, flag, when)`);
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
var USE_KEYS = new Set(["label", "say", "desc", "description", "when", "time", "tags", "check", "params", "why_not", "locked", "cost", "effects", "effect", "outcomes", "per_person", "hidden", "success", "fail", "partial", "crit_success", "crit_fail", "critical_success", "critical_fail", "failure", "requires", "needs", "show_locked", "at", "group", "gamble"]);
function applyItemUse(it, r, w, c, known, style) {
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
    const def = normAction(`item:${it.id}`, action, `${w} › use`, c, known, style);
    if (def) {
      def.tags = [...new Set([...def.tags, "item"])];
      it.use = def;
    }
  }
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
function normSecrets(raw, c, rel) {
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
    const person = typeof r.person === "string" && r.person.trim() ? r.person.trim() : undefined;
    if (person && !rel.people[person])
      c.warn(`${w} › person`, `"${person}" isn't a person in relationships › people${near(person, Object.keys(rel.people))}`);
    const stages = [];
    if (typeof r.cue === "string")
      stages.push({ text: r.cue, lore: [] });
    const stageList = Array.isArray(r.stages) ? r.stages : typeof r.text === "string" ? [{ text: r.text, when: r.when, lore: r.lore, band: r.band }] : [];
    stageList.forEach((st, i) => {
      const sw = `${w} › stage ${i + 1}`;
      const sr = isObj(st) ? st : typeof st === "string" ? { text: st } : {};
      if (typeof sr.text !== "string" || !sr.text.trim()) {
        c.warn(sw, "each stage needs `text:`");
        return;
      }
      const conds = [];
      if (sr.when !== undefined) {
        const x = c.expr(sr.when, `${sw} › when`);
        if (x !== undefined)
          conds.push(String(x));
      }
      if (sr.band !== undefined)
        conds.push(...bandConditions(sr.band, person, `${sw} › band`, c, rel));
      const when = conds.length > 1 ? conds.map((x) => `(${x})`).join(" and ") : conds[0];
      stages.push({ text: sr.text, lore: list(sr.lore), ...when !== undefined ? { when } : {} });
    });
    if (!stages.length) {
      c.warn(w, "has no stages — add `cue:` and/or `stages:`");
      continue;
    }
    const tell = r.tell === true || r.tell === "exists" ? "exists" : "none";
    const about = typeof r.about === "string" ? r.about : person && rel.people[person] ? rel.people[person].name : titleCase(id);
    out[id] = { id, about, ...person ? { person } : {}, tell, stages };
  }
  return out;
}
function bandConditions(raw, person, where, c, rel) {
  if (!isObj(raw)) {
    c.warn(where, "expected `band: { trust: Open }` (a relationship stat and one of its band names)");
    return ["0 > 1"];
  }
  if (!person) {
    c.warn(where, "a stage opened by `band:` needs the secret's `person:` (whose feelings it reads)");
    return ["0 > 1"];
  }
  const out = [];
  for (const [stat, name] of Object.entries(raw)) {
    const def = rel.stats[stat];
    if (!def) {
      c.warn(`${where} › ${stat}`, `"${stat}" isn't a relationship stat${near(stat, Object.keys(rel.stats))}`);
      out.push("0 > 1");
      continue;
    }
    const band = def.bands.find((b) => b.text.toLowerCase() === String(name).trim().toLowerCase());
    if (!band) {
      c.warn(`${where} › ${stat}`, `"${name}" isn't one of ${def.label}'s bands${near(String(name), def.bands.map((b) => b.text))} — this stage never opens`);
      out.push("0 > 1");
      continue;
    }
    out.push(`rel('${person.replace(/'/g, "")}', '${stat}') >= ${band.at}`);
  }
  return out;
}
function near(name, pool) {
  const n = name.toLowerCase();
  let best = "", bestD = Infinity;
  for (const p of pool) {
    const d = editDistance(n, p.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best && bestD <= Math.max(2, Math.floor(name.length / 3)) ? ` — did you mean "${best}"?` : "";
}
function normLiveChoices(raw, c, known, style) {
  const def = { enabled: false, label: "Right now", count: 3, tags: {}, taper: { ...DEFAULT_TAPER } };
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
  def.taper = normTaper(raw.taper, c);
  for (const [id, t] of Object.entries(isObj(raw.tags) ? raw.tags : {})) {
    const a = normAction(id, typeof t === "string" ? { desc: t } : t, `Live choices › tags › ${id}`, c, known, style);
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
var DEFAULT_TAPER = { step: 0.75, floor: 0.1 };
function normTaper(raw, c) {
  if (raw === undefined || raw === true || raw === null)
    return { ...DEFAULT_TAPER };
  if (raw === false)
    return false;
  if (!isObj(raw)) {
    c.warn("Live choices › taper", "expected `taper: false` or `{ step: 0.75, floor: 0.1 }`");
    return { ...DEFAULT_TAPER };
  }
  return {
    step: tuned(c, raw.step, "Live choices › taper › step", DEFAULT_TAPER.step, 0, 10, "0 means repeats never taper"),
    floor: tuned(c, raw.floor, "Live choices › taper › floor", DEFAULT_TAPER.floor, 0, 1, "the smallest share a repeat keeps")
  };
}
function lookText(r, where, c) {
  const out = {};
  for (const f of ["appearance", "outfit"]) {
    const v = r[f];
    if (v === undefined || v === null || v === "")
      continue;
    if (typeof v !== "string") {
      c.warn(`${where} › ${f}`, "should be a line of text");
      continue;
    }
    if (v.length > 160)
      c.warn(`${where} › ${f}`, "is longer than 160 characters; it is cut there");
    out[f] = v.trim().slice(0, 160);
  }
  return out;
}
var DEFAULT_DIRECTIONS = {
  crit_success: "It goes better than {{user}} hoped: a clean success with something extra.",
  success: "It works.",
  partial: "It works, but not cleanly: add a cost, a complication or a price.",
  fail: "It doesn't work. Show a concrete consequence, a lost chance or a changed situation that makes the next choice different. No identical retry. Do not grant the intended success.",
  crit_fail: "It goes badly wrong: a failure that costs {{user}} something real."
};
var DEFAULT_DC = { easy: 8, fair: 12, hard: 16, extreme: 20 };
var NOT_A_SKILL = /^(level|lvl|xp|exp|experience|perk_?points|skill_?points|stat_?points|points)$/i;
function normChecks(raw, c, known, stats, order, where) {
  const usable = order.filter((id) => (stats[id].kind === "skill" || stats[id].kind === "attribute") && !NOT_A_SKILL.test(id));
  const def = { typed: true, dc: { ...DEFAULT_DC }, partial: 3, stats: usable, bonus: 10, directions: {}, outcomes: {} };
  if (raw === undefined || raw === true)
    return def;
  if (raw === false)
    return { ...def, typed: false };
  if (!isObj(raw)) {
    c.warn(where, "expected `checks: false` or a map of settings");
    return def;
  }
  if (raw.enabled === false || raw.typed === false)
    def.typed = false;
  if (isObj(raw.dc))
    for (const [k, v] of Object.entries(raw.dc)) {
      const d = difficultyOf(k);
      if (d)
        def.dc[d] = c.num(v, `${where} › dc › ${k}`, def.dc[d]);
      else
        c.warn(`${where} › dc › ${k}`, "difficulty words are easy, fair, hard and extreme");
    }
  def.bonus = c.num(raw.bonus, `${where} › bonus`, 10);
  def.partial = Math.max(0, c.num(raw.partial, `${where} › partial`, 3));
  if (raw.stats !== undefined) {
    const want = list(raw.stats);
    for (const id of want)
      if (!stats[id])
        c.warn(`${where} › stats`, `"${id}" isn't a stat`);
    def.stats = want.filter((id) => stats[id]);
  }
  if (raw.time !== undefined)
    def.time = Math.max(0, c.num(raw.time, `${where} › time`, 10));
  if (isObj(raw.directions))
    for (const [k, v] of Object.entries(raw.directions)) {
      const tier = TIER_KEYS[k];
      if (tier && typeof v === "string" && v.trim())
        def.directions[tier] = v.trim();
      else
        c.warn(`${where} › directions › ${k}`, "directions are lines of text per tier: crit_success, success, partial, fail, crit_fail");
    }
  if (isObj(raw.outcomes))
    for (const [k, v] of Object.entries(raw.outcomes)) {
      const tier = TIER_KEYS[k];
      if (tier)
        def.outcomes[tier] = normEffect(v, `${where} › outcomes › ${k}`, c, known);
      else
        c.warn(`${where} › outcomes › ${k}`, "tiers are crit_success, success, partial, fail, crit_fail");
    }
  return def;
}
var DEFAULT_SWING = { crit_success: 50, success: 35, partial: 15, fail: -35, crit_fail: -50 };
var DEFAULT_ROUNDS = { min: 3, max: 8 };
var DEFAULT_ESCALATE = 0.4;
var DEFAULT_KINDS = {
  fight: {
    label: "Fight",
    stats: ["body", "mind"],
    escape: "body",
    cost: { partial: { health: -3 }, fail: { health: -8 }, crit_fail: { health: -15 } },
    won: { mood: 5, hint: "{opponent} is beaten or yields." },
    lost: { health: -10, mood: -5, hint: "{{user}} is beaten. {opponent} gets what they wanted; {{user}} is hurt but alive." },
    escaped: { energy: -10, hint: "{{user}} gets away." }
  },
  chase: {
    label: "Chase",
    stats: ["body", "mind"],
    escape: "body",
    cost: { fail: { energy: -8 }, crit_fail: { energy: -12, health: -5 } },
    won: { hint: "{{user}} wins the chase: catches {opponent} or loses them for good." },
    lost: { energy: -10, hint: "{opponent} wins the chase." },
    escaped: { hint: "The chase breaks off." }
  },
  argument: {
    label: "Argument",
    stats: ["charm", "mind"],
    escape: "charm",
    cost: { fail: { mood: -4 }, crit_fail: { mood: -8 } },
    won: { mood: 4, hint: "{opponent} gives in, or is won over." },
    lost: { mood: -6, hint: "{opponent} wins the argument; {{user}} has to give ground." },
    escaped: { hint: "{{user}} walks away from it." }
  }
};
function onlyKnown(e, known) {
  if (!isObj(e))
    return e;
  return Object.fromEntries(Object.entries(e).filter(([k]) => k === "hint" || known.stats.has(k)));
}
function normConflict(raw, c, known, stats, checkStats, style) {
  const def = { fromStory: true, rounds: { ...DEFAULT_ROUNDS }, escalate: DEFAULT_ESCALATE, swing: { ...DEFAULT_SWING }, kinds: {} };
  if (style === "story") {
    if (raw !== undefined && raw !== false)
      c.warn("Conflict", "story rulesets don't roll, so `conflict:` is ignored (use `style: adventure`)");
    return { ...def, fromStory: false };
  }
  if (raw === false)
    return { ...def, fromStory: false };
  const r = isObj(raw) ? raw : {};
  if (raw !== undefined && !isObj(raw) && raw !== true)
    c.warn("Conflict", "expected a map with `kinds:`");
  def.fromStory = r.from_story !== false;
  if (isObj(r.rounds)) {
    def.rounds.min = Math.round(tuned(c, r.rounds.min, "Conflict › rounds › min", DEFAULT_ROUNDS.min, 1, 20));
    def.rounds.max = Math.round(tuned(c, r.rounds.max, "Conflict › rounds › max", DEFAULT_ROUNDS.max, 1, 30));
    if (def.rounds.max < def.rounds.min) {
      c.warn("Conflict › rounds", "max is below min — using max = min");
      def.rounds.max = def.rounds.min;
    }
  } else if (r.rounds !== undefined)
    c.warn("Conflict › rounds", "expected `{ min: 3, max: 8 }`");
  def.escalate = tuned(c, r.escalate, "Conflict › escalate", DEFAULT_ESCALATE, 0, 3, "how much the stakes rise per round");
  if (isObj(r.swing))
    for (const [k, v] of Object.entries(r.swing)) {
      const tier = TIER_KEYS[k];
      if (tier)
        def.swing[tier] = c.num(v, `Conflict › swing › ${k}`, def.swing[tier]);
      else
        c.warn(`Conflict › swing › ${k}`, "tiers are crit_success, success, partial, fail, crit_fail");
    }
  const authored = isObj(r.kinds);
  const kinds = authored ? r.kinds : DEFAULT_KINDS;
  for (const [id, kRaw] of Object.entries(kinds)) {
    const w = `Conflict › kinds › ${id}`;
    if (!isObj(kRaw)) {
      c.warn(w, "expected a kind (label, stats, cost, won, lost, escaped)");
      continue;
    }
    const fix = (e) => authored ? e : onlyKnown(e, known);
    let kStats = list(kRaw.stats).filter((s) => {
      if (stats[s]) {
        if (stats[s].kind !== "attribute" && stats[s].kind !== "skill" && authored)
          c.warn(`${w} › stats`, `"${s}" isn't an attribute or skill — moves lean on it anyway`);
        return true;
      }
      if (authored)
        c.warn(`${w} › stats`, `"${s}" isn't a stat`);
      return false;
    });
    if (!kStats.length) {
      if (authored) {
        c.err(w, "a contest kind needs `stats:` (the attributes or skills its moves lean on)");
        continue;
      }
      kStats = checkStats.slice(0, 2);
    }
    const escRaw = typeof kRaw.escape === "string" ? kRaw.escape : undefined;
    if (escRaw && !stats[escRaw] && authored)
      c.warn(`${w} › escape`, `"${escRaw}" isn't a stat — using ${kStats[0] ?? "luck"}`);
    const cost = {};
    if (isObj(kRaw.cost))
      for (const [k, v] of Object.entries(kRaw.cost)) {
        const tier = TIER_KEYS[k];
        if (tier)
          cost[tier] = normEffect(fix(v), `${w} › cost › ${k}`, c, known);
        else
          c.warn(`${w} › cost › ${k}`, "tiers are crit_success, success, partial, fail, crit_fail");
      }
    if (authored)
      warnUnknownKeys(kRaw, KIND_KEYS, w, c);
    def.kinds[id] = {
      id,
      label: typeof kRaw.label === "string" ? kRaw.label : titleCase(id),
      stats: kStats,
      escape: escRaw && stats[escRaw] ? escRaw : kStats[0] ?? "",
      cost,
      won: normEffect(fix(kRaw.won), `${w} › won`, c, known),
      lost: normEffect(fix(kRaw.lost), `${w} › lost`, c, known),
      escaped: normEffect(fix(kRaw.escaped), `${w} › escaped`, c, known)
    };
  }
  return def;
}
var KIND_KEYS = new Set(["label", "stats", "escape", "cost", "won", "lost", "escaped", "desc"]);
function normGoals(raw, c, known) {
  const def = { fromStory: true, max: 3, list: {} };
  if (raw === undefined || raw === true)
    return def;
  if (raw === false)
    return { ...def, fromStory: false };
  if (!isObj(raw)) {
    c.warn("Goals", "expected `goals: { from_story: true, max: 3, list: … }`");
    return def;
  }
  def.fromStory = raw.from_story !== false;
  def.max = Math.round(tuned(c, raw.max, "Goals › max", 3, 0, 10, "goals open at once"));
  if (raw.list !== undefined && !isObj(raw.list))
    c.warn("Goals › list", "should be a map of goal ids to goals");
  for (const [id, g] of Object.entries(isObj(raw.list) ? raw.list : {})) {
    const w = `Goals › ${id}`;
    const r = isObj(g) ? g : typeof g === "string" ? { text: g } : {};
    if (typeof r.text !== "string" || !r.text.trim()) {
      c.warn(w, "a goal needs `text:`");
      continue;
    }
    const doneWhen = r.done_when !== undefined ? c.expr(r.done_when, `${w} › done_when`) : undefined;
    const failWhen = r.fail_when !== undefined ? c.expr(r.fail_when, `${w} › fail_when`) : undefined;
    for (const k of Object.keys(r))
      if (!GOAL_KEYS.has(k))
        c.warn(`${w} › ${k}`, `"${k}" isn't something a goal reads (text, done_when, fail_when, judge, judge_fail, stakes, reward)`);
    def.list[id] = {
      id,
      text: r.text.trim(),
      ...doneWhen !== undefined ? { doneWhen: String(doneWhen) } : {},
      ...failWhen !== undefined ? { failWhen: String(failWhen) } : {},
      ...typeof r.judge === "string" && r.judge.trim() ? { judge: r.judge.trim() } : {},
      ...typeof r.judge_fail === "string" && r.judge_fail.trim() ? { judgeFail: r.judge_fail.trim() } : {},
      ...typeof r.stakes === "string" && r.stakes.trim() ? { stakes: r.stakes.trim() } : {},
      reward: normEffect(r.reward, `${w} › reward`, c, known)
    };
  }
  return def;
}
var GOAL_KEYS = new Set(["text", "done_when", "fail_when", "judge", "judge_fail", "stakes", "reward"]);
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
  encounters: { what: "encounters", hint: "Use `conflict:` (fights, chases, arguments run on one momentum gauge)." },
  quests: { what: "quests", hint: "Use `goals:`." },
  locations: { what: "places and the travel graph", hint: "Places come from the story now; set `start.place`." },
  locations_open: { what: "places and the travel graph", hint: "Places come from the story now; set `start.place`." },
  weather: { what: "weather and temperature", hint: "Describe looks and clothes as text in `you:` / people (`appearance`, `outfit`)." },
  wardrobe: { what: "the wardrobe", hint: "Describe looks and clothes as text in `you:` / people (`appearance`, `outfit`)." },
  body: { what: "the body and transformations", hint: "Describe looks and clothes as text in `you:` / people (`appearance`, `outfit`)." },
  item_uses: { what: "drafted item uses", hint: "Give the item its own `use:`." },
  discovery: { what: "discovering places" },
  observers: { what: "being seen" },
  being_seen: { what: "being seen" },
  lineage: { what: "family and pregnancy" },
  companions: { what: "companion lives and jealousy" },
  bonds: { what: "feelings between people" },
  obligations: { what: "bills and debts" },
  debts: { what: "bills and debts" },
  jobs: { what: "work shifts" },
  fronts: { what: "hidden world clocks (fronts)", hint: "Use `triggers:` with `when_scene:` for story beats." },
  random_events: { what: "random events", hint: "Use `triggers:` with `when_scene:` for story beats." },
  events: { what: "random events", hint: "Use `triggers:` with `when_scene:` for story beats." },
  mind: { what: "mind overrides and perception filters" },
  checkpoints: { what: "checkpoints and time loops" },
  endings: { what: "endings and new playthroughs" },
  codex: { what: "the codex" },
  feats: { what: "feats" },
  perks: { what: "perks" },
  abilities: { what: "abilities" },
  dungeons: { what: "dungeons" },
  dating: { what: "dating" },
  minigames: { what: "minigames" },
  look: { what: "the stage and minigame looks" }
};
var TOP_LEVEL_KEYS = [
  "name",
  "description",
  "style",
  "you",
  "clock",
  "start",
  "hud",
  "narration",
  "stats",
  "growth",
  "checks",
  "relationships",
  "items",
  "inventory",
  "conditions",
  "flags",
  "triggers",
  "actions",
  "secrets",
  "live_choices",
  "goals",
  "conflict"
];
var KEY_ALIASES = { player: "you", improvise: "checks", improvised: "checks", practice: "growth", rules: "triggers", people: "relationships" };
var SEXUAL_TAGS = new Set(["sexual", "sex", "nsfw", "lewd", "explicit", "erotic", "smut"]);
function normalizeRuleset(raw) {
  const c = new Ctx;
  if (!isObj(raw)) {
    c.err("Ruleset", "is empty or isn't a YAML map");
    return { ruleset: null, issues: c.issues };
  }
  for (const k of Object.keys(raw)) {
    const gone = REMOVED_KEYS[k];
    if (gone) {
      c.removed(titleCase(k), k, gone.what, gone.hint);
      continue;
    }
    if (TOP_LEVEL_KEYS.includes(k))
      continue;
    if (k === "player") {
      c.warn("You", "`player:` was renamed to `you:` — it is read as `you:`.");
      continue;
    }
    if (k === "improvise" || k === "improvised") {
      c.warn("Checks", `\`${k}:\` was renamed to \`checks:\` — it is read as \`checks:\`.`);
      continue;
    }
    if (KEY_ALIASES[k])
      continue;
    c.warn(titleCase(k), `"${k}" isn't a part of a Warp ruleset, so it's ignored${near(k, TOP_LEVEL_KEYS)} (the parts are ${TOP_LEVEL_KEYS.join(", ")})`);
  }
  const styleRaw = raw.style === undefined ? "adventure" : String(raw.style).trim().toLowerCase();
  if (styleRaw !== "story" && styleRaw !== "adventure")
    c.warn("Style", `"${raw.style}" — use story (no dice) or adventure (dice); using adventure`);
  const style = styleRaw === "story" ? "story" : "adventure";
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
        c.removed(`Relationships › people › ${id} › ${k}`, k, "schedules", "Who is here comes from the story.");
    if (r.traits !== undefined)
      c.removed(`Relationships › people › ${id} › traits`, "traits", "per-person traits", "Put it in `desc:`.");
    people[id] = {
      id,
      name: typeof r.name === "string" ? r.name : titleCase(id),
      age: r.age !== undefined ? c.num(r.age, `Relationships › people › ${id} › age`, 0) : undefined,
      start,
      desc: typeof r.desc === "string" ? r.desc : undefined,
      ...lookText(r, `Relationships › people › ${id}`, c)
    };
  }
  const bigRaw = relRaw.big_moment;
  const relBigMoment = bigRaw === false || bigRaw === null ? null : {
    factor: isObj(bigRaw) ? tuned(c, bigRaw.factor, "Relationships › big_moment › factor", 3, 1, 10) : 3,
    cooldown: isObj(bigRaw) ? Math.round(tuned(c, bigRaw.cooldown, "Relationships › big_moment › cooldown", 10, 0, 1000, "turns")) : 10
  };
  if (bigRaw !== undefined && bigRaw !== false && bigRaw !== null && bigRaw !== true && !isObj(bigRaw))
    c.warn("Relationships › big_moment", "expected `{ factor: 3, cooldown: 10 }` or false");
  const invRaw = isObj(raw.inventory) ? raw.inventory : {};
  const items = {};
  for (const [id, it] of Object.entries(isObj(raw.items) ? raw.items : isObj(invRaw.items) ? invRaw.items : {})) {
    const r = isObj(it) ? it : typeof it === "string" ? { name: it } : {};
    const w = `Items › ${id}`;
    for (const k of ["slot", "warmth", "integrity", "reveal", "traits"])
      if (r[k] !== undefined)
        c.removed(`${w} › ${k}`, k, "the wardrobe", "Describe clothes as text (`look:` / `outfit:`).");
    if (r.armor !== undefined)
      c.removed(`${w} › armor`, "armor", "armor", "Contests have no armor; use `bonus:` on the stats it helps.");
    items[id] = {
      id,
      name: typeof r.name === "string" ? r.name : titleCase(id),
      desc: r.desc,
      tags: list(r.tags),
      uses: Math.max(0, Math.round(c.num(r.uses ?? r.charges, `${w} › uses`, list(r.tags).map((t) => t.toLowerCase()).includes("consumable") ? 1 : 0))),
      keep: r.keep === true,
      bonus: {}
    };
    applyItemUse(items[id], r, w, c, known, style);
  }
  const conditions = {};
  for (const [id, d] of Object.entries(isObj(raw.conditions) ? raw.conditions : {})) {
    const r = isObj(d) ? d : typeof d === "string" ? { label: d } : {};
    const w = `Conditions › ${id}`;
    const gate = normGate(r, w, c);
    for (const k of ["rounds", "dot", "heal", "per_round", "damage", "stat", "every", "skip", "stun", "lose_turn", "armor", "tick", "each"]) {
      if (r[k] !== undefined)
        c.removed(`${w} › ${k}`, k, "statuses that tick in fights", "A condition has `label`, `tone`, `desc`, `narrator`, `bonus` and `lasts`.");
    }
    const lastsRaw = r.lasts ?? r.minutes ?? r.duration;
    conditions[id] = {
      id,
      label: typeof r.label === "string" ? r.label : titleCase(id),
      tone: ["good", "warn", "bad", "neutral"].includes(r.tone) ? r.tone : "warn",
      desc: typeof r.desc === "string" ? r.desc : undefined,
      narrator: r.narrator === true,
      ...gate ? { gate } : {},
      bonus: statAmounts(r.bonus, `${w} › bonus`, c, known),
      ...lastsRaw !== undefined ? { lasts: Math.max(1, minutesOf(lastsRaw, `${w} › lasts`, c, 60)) } : {}
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
  const moneyStat = isObj(raw.hud) && typeof raw.hud.money === "string" ? raw.hud.money : statOrder.find((s) => stats[s].kind === "money");
  if (startRaw.money !== undefined) {
    if (moneyStat && stats[moneyStat])
      stats[moneyStat].start = c.num(startRaw.money, "Start › money", stats[moneyStat].start);
    else
      c.warn("Start › money", "there is no `kind: money` stat to start");
  }
  if (startRaw.location !== undefined)
    c.removed("Start › location", "location", "places and the travel graph", "Use `start.place:` (words, or greeting).");
  for (const k of Object.keys(startRaw))
    if (!["place", "items", "money", "stats", "time", "date", "location"].includes(k))
      c.warn(`Start › ${k}`, `"${k}" isn't something start: reads (place, items, money, stats)`);
  const placeRaw = startRaw.place ?? "greeting";
  const startPlace = typeof placeRaw === "string" && placeRaw.trim() ? placeRaw.trim().toLowerCase() === "greeting" ? "greeting" : placeRaw.trim().slice(0, 120) : null;
  const clockRaw = isObj(raw.clock) ? raw.clock : {};
  const clockStartRaw = startRaw.time ?? clockRaw.start ?? "greeting";
  const fromGreeting = typeof clockStartRaw === "string" && clockStartRaw.trim().toLowerCase() === "greeting";
  const clockStart = fromGreeting ? null : parseClockStart(clockStartRaw, weekdays);
  if (clockStart === null && !fromGreeting)
    c.warn("Clock › start", `"${clockStartRaw}" should look like greeting, "Day 1 07:30" or "Mon 07:30"`);
  const fallbackRaw = clockRaw.fallback ?? "Day 1 09:00";
  const clockFallback = parseClockStart(fallbackRaw, weekdays);
  if (clockFallback === null)
    c.warn("Clock › fallback", `"${fallbackRaw}" should look like "Day 1 09:00"`);
  const dateRaw = clockRaw.date ?? clockRaw.start_date ?? startRaw.date;
  const dateFromGreeting = typeof dateRaw === "string" && dateRaw.trim().toLowerCase() === "greeting";
  const startDate = dateRaw === undefined || dateFromGreeting ? null : parseDate(dateRaw);
  if (dateRaw !== undefined && !dateFromGreeting && !startDate)
    c.warn("Clock › date", `"${dateRaw}" should look like "Sep 4" or greeting`);
  const actions = {};
  const actionOrder = [];
  for (const [id, a] of Object.entries(isObj(raw.actions) ? raw.actions : {})) {
    const def = normAction(id, a, `Actions › ${id}`, c, known, style);
    if (def) {
      actions[id] = def;
      actionOrder.push(id);
    }
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
  const bars = Array.isArray(hudRaw.bars) ? hudRaw.bars.map(String).filter((b) => {
    if (!stats[b]) {
      c.warn("HUD › bars", `"${b}" isn't a declared stat`);
      return false;
    }
    return true;
  }) : statOrder.filter((s) => stats[s].kind === "meter");
  const narrRaw = isObj(raw.narration) ? raw.narration : {};
  const youRaw = isObj(raw.you) ? raw.you : isObj(raw.player) ? raw.player : {};
  const secrets = normSecrets(raw.secrets, c, { stats: relStats, people });
  const liveChoices = normLiveChoices(raw.live_choices, c, known, style);
  const checksRaw = raw.checks ?? raw.improvise ?? raw.improvised;
  const checks = normChecks(checksRaw, c, known, stats, statOrder, "Checks");
  if (style === "story") {
    if (checksRaw !== undefined && checksRaw !== false && isObj(checksRaw) && checksRaw.typed === true)
      c.warn("Checks › typed", "story rulesets never roll typed messages (use `style: adventure`)");
    checks.typed = false;
  }
  const conflict = normConflict(raw.conflict, c, known, stats, checks.stats, style);
  const goals = normGoals(raw.goals, c, known);
  const growth = normGrowth(raw.growth ?? raw.practice, c);
  const ruleset = {
    name: typeof raw.name === "string" ? raw.name : "Untitled ruleset",
    description: typeof raw.description === "string" ? raw.description : undefined,
    style,
    you: {
      name: typeof youRaw.name === "string" ? youRaw.name : undefined,
      age: youRaw.age !== undefined ? c.num(youRaw.age, "You › age", 0) : undefined,
      ...lookText(youRaw, "You", c)
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
    startPlace,
    conditions,
    flags,
    actions,
    actionOrder,
    triggers,
    clock: {
      enabled: clockRaw.enabled !== false,
      start: fromGreeting ? "greeting" : clockStart ?? clockFallback ?? 540,
      fallback: clockFallback ?? 540,
      minutesPerAction: c.num(clockRaw.minutes_per_action, "Clock › minutes_per_action", 10),
      narratorMax: c.num(clockRaw.narrator_max ?? clockRaw.narrator, "Clock › narrator_max", 480),
      weekdays,
      weekdayKnown: !fromGreeting && typeof clockStartRaw === "string" && /^\s*[a-z]{3,}/i.test(clockStartRaw) && !/^\s*day\b/i.test(clockStartRaw),
      startDate
    },
    hud: { bars, money: moneyStat && stats[moneyStat] ? moneyStat : undefined, ...normCurrency(hudRaw.currency, c) },
    narration: { notes: typeof narrRaw.notes === "string" ? narrRaw.notes : undefined, numbers: narrRaw.numbers === true },
    secrets,
    liveChoices,
    checks,
    conflict,
    goals,
    relBigMoment,
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
    ...ruleset.you.age !== undefined && ruleset.you.age < 18 ? ["the player"] : [],
    ...Object.values(people).filter((p) => p.age !== undefined && p.age < 18).map((p) => p.name)
  ];
  const sexualActions = [...Object.values(actions), ...Object.values(liveChoices.tags)].filter((a) => a.tags.some((t) => SEXUAL_TAGS.has(t)));
  if (minors.length && sexualActions.length) {
    c.err("Ruleset", `declares characters under 18 (${minors.join(", ")}) alongside sexual actions — Warp won't run this ruleset`);
    return { ruleset: null, issues: c.issues };
  }
  return { ruleset, issues: c.issues };
}

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
  const first = typeof r.clock.start === "number" ? r.clock.start : r.clock.fallback;
  const elapsed = Math.floor(minutes / 1440) - Math.floor(first / 1440);
  let day = start.day - 1 + Math.max(0, elapsed);
  while (day >= MONTH_DAYS[month]) {
    day -= MONTH_DAYS[month];
    month = (month + 1) % 12;
  }
  return { month: month + 1, day: day + 1, monthName: MONTH_NAMES[month] };
}
function sceneWord(s, id) {
  const w = s.scene?.[id];
  return w && w.loc === s.location ? w.here : null;
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
var MEMORIES_KEPT = 12;
function initialState(r) {
  const s = {
    contest: null,
    lastContest: null,
    look: {},
    big: {},
    goals: {},
    weekday: !!r.clock.weekdayKnown,
    calibrated: {},
    forgotten: {},
    stats: {},
    flags: {},
    items: { ...r.startItems },
    itemNames: {},
    rel: {},
    people: {},
    location: r.startPlace && r.startPlace !== "greeting" ? placeId(r.startPlace) : null,
    locationName: r.startPlace && r.startPlace !== "greeting" ? r.startPlace : null,
    minutes: startMinutes(r),
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
  for (const g of Object.values(r.goals.list))
    s.goals[g.id] = { st: "open", text: g.text, at: s.minutes, turn: 0, ...g.stakes ? { stakes: g.stakes } : {}, ...g.judge ? { judge: g.judge } : {} };
  const firstLook = (appearance, outfit) => appearance || outfit ? { ...appearance ? { appearance } : {}, ...outfit ? { outfit } : {}, at: s.minutes } : null;
  const mine = firstLook(r.you.appearance, r.you.outfit);
  if (mine)
    s.look.you = mine;
  for (const p of Object.values(r.people)) {
    const theirs = firstLook(p.appearance, p.outfit);
    if (theirs)
      s.look[p.id] = theirs;
  }
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
function startMinutes(r) {
  return typeof r.clock.start === "number" ? r.clock.start : r.clock.fallback;
}
function placeId(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "x";
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
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
function applyEvent(s, e, r) {
  const old = e;
  if (old.t === "dt_pref" && old.key === "__adult" && typeof old.who === "string") {
    s.adults = { ...s.adults, [old.who]: Number(old.v) > 0 };
    return;
  }
  switch (e.t) {
    case "stat": {
      const def = r.stats[e.id];
      const cur = s.stats[e.id] ?? def?.start ?? 0;
      const next = e.set !== undefined ? e.set : cur + (e.d ?? 0);
      s.stats[e.id] = def ? clamp(next, def.min, statMax(r, def, s)) : next;
      break;
    }
    case "flag":
      s.flags[e.key] = e.v;
      break;
    case "item": {
      const n = (s.items[e.id] ?? 0) + e.d;
      if (n <= 0) {
        delete s.items[e.id];
        if (s.uses[e.id] !== undefined) {
          const u = { ...s.uses };
          delete u[e.id];
          s.uses = u;
        }
      } else
        s.items[e.id] = n;
      if (e.name && !r.items[e.id])
        s.itemNames[e.id] = e.name;
      break;
    }
    case "swing":
      if (s.contest)
        s.contest = { ...s.contest, momentum: clamp(s.contest.momentum + e.d, -100, 100) };
      break;
    case "round":
      if (s.contest)
        s.contest = { ...s.contest, round: s.contest.round + 1 };
      break;
    case "set_time":
      if (Number.isFinite(e.minutes))
        s.minutes = Math.max(0, Math.floor(e.minutes));
      if (e.weekday !== undefined)
        s.weekday = e.weekday;
      break;
    case "look": {
      const cur = { ...s.look?.[e.who] ?? { at: s.minutes } };
      if (e.text)
        cur[e.field] = e.text;
      else
        delete cur[e.field];
      cur.at = s.minutes;
      cur.turn = s.turn;
      const look = { ...s.look ?? {} };
      if (cur.appearance || cur.outfit)
        look[e.who] = cur;
      else
        delete look[e.who];
      s.look = look;
      break;
    }
    case "contest":
      s.contest = { kind: e.kind, opponent: e.opponent, ...e.who ? { who: e.who } : {}, threat: e.threat, dc: e.dc, round: 0, momentum: 0, at: s.minutes };
      break;
    case "contest_end":
      if (s.contest)
        s.lastContest = { kind: s.contest.kind, opponent: s.contest.opponent, ...s.contest.who ? { who: s.contest.who } : {}, outcome: e.outcome, at: s.minutes };
      s.contest = null;
      break;
    case "big":
      s.big = { ...s.big ?? {}, [e.who]: s.turn };
      break;
    case "goal": {
      const all = { ...s.goals ?? {} };
      const cur = all[e.id];
      if (e.st === null)
        delete all[e.id];
      else if (e.st === "open") {
        const from = e.from ?? cur?.from, stakes = e.stakes ?? cur?.stakes, judge = e.judge ?? cur?.judge;
        all[e.id] = { st: "open", text: e.text ?? cur?.text ?? e.id, at: s.minutes, turn: s.turn, ...from ? { from } : {}, ...stakes ? { stakes } : {}, ...judge ? { judge } : {} };
      } else if (cur)
        all[e.id] = { ...cur, st: e.st, ended: s.minutes };
      s.goals = all;
      break;
    }
    case "calib":
      s.calibrated[e.who] = true;
      break;
    case "forget":
      if (s.scene[e.who]) {
        const sc = { ...s.scene };
        delete sc[e.who];
        s.scene = sc;
      }
      delete s.people[e.who];
      delete s.rel[e.who];
      delete s.calibrated[e.who];
      s.forgotten[e.who] = true;
      break;
    case "person":
      s.people[e.id] = { name: e.name };
      delete s.forgotten[e.id];
      if (!s.rel[e.id]) {
        s.rel[e.id] = {};
        for (const rs of r.relStatOrder)
          s.rel[e.id][rs] = r.relStats[rs].start;
      }
      break;
    case "rel": {
      if (!s.rel[e.who]) {
        s.rel[e.who] = {};
        for (const rs of r.relStatOrder)
          s.rel[e.who][rs] = r.relStats[rs].start;
      }
      const def = r.relStats[e.stat];
      const cur = s.rel[e.who][e.stat] ?? def?.start ?? 0;
      const next = e.set !== undefined ? e.set : cur + (e.d ?? 0);
      s.rel[e.who][e.stat] = def ? clamp(next, def.min, def.max) : next;
      break;
    }
    case "move":
      if (e.to !== s.location)
        s.lastLocation = s.location;
      s.location = e.to;
      s.locationName = e.name ?? e.to.replace(/_/g, " ");
      break;
    case "practice":
      s.practice = { ...s.practice, [e.id]: Math.max(0, (s.practice[e.id] ?? 0) + e.d) };
      break;
    case "practice_use": {
      if (!Number.isFinite(e.n) || !Number.isFinite(e.turn) || !Number.isFinite(e.minutes))
        break;
      const uses = { ...s.practiceUse ?? {} };
      delete uses[e.key];
      uses[e.key] = { n: clamp(Math.floor(e.n), 1, 100), turn: e.turn, minutes: e.minutes };
      const keys = Object.keys(uses);
      for (const key of keys.slice(0, Math.max(0, keys.length - 64)))
        delete uses[key];
      s.practiceUse = uses;
      break;
    }
    case "scene":
      s.scene = { ...s.scene, [e.who]: { here: e.here, loc: s.location, at: s.minutes, turn: s.turn } };
      break;
    case "use": {
      const per = r.items[e.id]?.uses ?? 0;
      let have = s.items[e.id] ?? 0;
      if (per <= 0 || have <= 0 || e.n <= 0)
        break;
      let left = (s.uses[e.id] ?? per) - e.n;
      while (left <= 0 && have > 0) {
        have -= 1;
        left += per;
      }
      const uses = { ...s.uses };
      if (have <= 0) {
        delete s.items[e.id];
        delete uses[e.id];
      } else {
        s.items[e.id] = have;
        if (left >= per)
          delete uses[e.id];
        else
          uses[e.id] = left;
      }
      s.uses = uses;
      break;
    }
    case "time":
      s.minutes += Math.max(0, e.min);
      break;
    case "cond":
      if (e.on)
        s.conditions[e.id] = { until: e.until ?? null, ...e.rounds !== undefined ? { rounds: e.rounds } : {} };
      else
        delete s.conditions[e.id];
      break;
    case "memory": {
      const list = [...s.memories?.[e.who] ?? [], { text: e.text, at: s.minutes }].slice(-MEMORIES_KEPT);
      s.memories = { ...s.memories ?? {}, [e.who]: list };
      break;
    }
    case "trig":
      s.triggers[e.id] = e.v;
      break;
    case "turn":
      s.turn += 1;
      break;
    case "secret":
      s.secrets[e.id] = Math.max(s.secrets[e.id] ?? -1, e.stage);
      break;
    case "notice":
      s.notices = [...s.notices, e.text];
      break;
    case "noticed":
      s.notices = [];
      break;
    case "adult":
      s.adults = { ...s.adults, [e.who]: e.adult };
      break;
    default:
      break;
  }
}
function cloneState(s) {
  return structuredClone(s);
}
function foldEvents(r, batches, from) {
  const s = from ? cloneState(from) : initialState(r);
  for (const batch of batches)
    for (const e of batch)
      applyEvent(s, e, r);
  return s;
}
var BUILTIN_NAMES = [
  "minutes",
  "hour",
  "minute",
  "day",
  "weekday",
  "turn",
  "place",
  "round",
  "momentum",
  "in_contest",
  "target"
];
function makeEnv(r, s, extra = {}) {
  const day = Math.floor(s.minutes / 1440);
  const names = {
    minutes: s.minutes,
    hour: Math.floor(s.minutes % 1440 / 60),
    minute: s.minutes % 60,
    day: day + 1,
    weekday: r.clock.weekdays[day % r.clock.weekdays.length] ?? "",
    turn: s.turn,
    place: s.locationName ?? "",
    round: s.contest?.round ?? 0,
    momentum: s.contest?.momentum ?? 0,
    in_contest: !!s.contest,
    in_encounter: !!s.contest,
    target: ""
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
        if (head in names)
          return names[head];
        if (head in s.flags)
          return s.flags[head];
        if (r.flags[head])
          return r.flags[head].start;
        return;
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
        case "goal":
          return s.goals?.[a0]?.st ?? "";
        case "in_contest":
        case "in_encounter":
          return args.length ? s.contest?.kind === a0 : !!s.contest;
      }
      return;
    }
  };
  return base;
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
function formatClock(r, minutes, weekday = true) {
  const day = Math.floor(minutes / 1440);
  const h = Math.floor(minutes % 1440 / 60);
  const m = minutes % 60;
  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const wd = weekday ? r.clock.weekdays[day % r.clock.weekdays.length] ?? "" : "";
  const dayLabel = wd ? `${wd} · Day ${day + 1}` : `Day ${day + 1}`;
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
function d20Tier(natural, add, target, partial) {
  if (natural >= 20)
    return "crit_success";
  if (natural <= 1)
    return "crit_fail";
  const total = natural + add;
  if (total >= target)
    return "success";
  if (partial > 0 && total >= target - partial)
    return "partial";
  return "fail";
}
function d20Odds(add, target, partial) {
  let ok = 1, part = 0;
  for (let f = 2;f <= 19; f++) {
    const t = f + add;
    if (t >= target)
      ok++;
    else if (partial > 0 && t >= target - partial)
      part++;
  }
  return { success: ok / 20, partial: part / 20 };
}
function rollD20(rng) {
  return 1 + Math.floor(rng() * 20);
}

// node_modules/warp/src/engine/decide.ts
function normalize(p, keys) {
  const out = {};
  let sum = 0;
  for (const k of keys) {
    const v = Number(p[k]);
    out[k] = Number.isFinite(v) && v > 0 ? v : 0;
    sum += out[k];
  }
  if (sum <= 0)
    for (const k of keys)
      out[k] = 1 / keys.length;
  else
    for (const k of keys)
      out[k] /= sum;
  return out;
}
function sample(p, rng) {
  const keys = Object.keys(p);
  let x = rng();
  for (const k of keys) {
    x -= p[k];
    if (x <= 0)
      return k;
  }
  return keys[keys.length - 1];
}

// node_modules/warp/src/engine/freeform.ts
var IMPROV = "try:";
var HARDNESS = { easy: 0.5, fair: 1, hard: 1.5, extreme: 2 };
var LEARN = { crit_success: 1.2, success: 1, partial: 1, fail: 0.7, crit_fail: 0.5 };
function isDifficulty(v) {
  return typeof v === "string" && DIFFICULTIES.includes(v);
}
function position(r, s, stat) {
  const def = r.stats[stat];
  const max = statMax(r, def, s);
  const v = s.stats[stat] ?? def.start;
  return max > def.min ? Math.max(0, Math.min(1, (v - def.min) / (max - def.min))) : 0;
}
function statAdd(r, s, stat) {
  const def = r.stats[stat];
  if (!def)
    return 0;
  const max = statMax(r, def, s);
  const v = effectiveStat(r, s, stat, makeEnv(r, s));
  const pos = max > def.min ? Math.max(0, Math.min(1, (v - def.min) / (max - def.min))) : 0;
  return Math.round(pos * r.checks.bonus);
}
function improvAction(r, s, actionId) {
  if (r.style === "story" || !r.checks.typed || !actionId.startsWith(IMPROV))
    return null;
  const stat = actionId.slice(IMPROV.length);
  if (stat && !r.stats[stat])
    return null;
  const label = stat ? r.stats[stat].label : "Luck";
  return {
    id: actionId,
    label: `Attempt (${label})`,
    hidden: true,
    ...r.checks.time !== undefined ? { time: r.checks.time } : {},
    cost: emptyEffect(),
    check: { add: stat ? statAdd(r, s, stat) : 0, partialMargin: r.checks.partial, label },
    outcomes: r.checks.outcomes,
    effects: emptyEffect(),
    params: [],
    tags: ["improvised"],
    perPerson: false,
    requires: [],
    showLocked: false
  };
}
function checkStats(r, a) {
  if (a.id.startsWith(IMPROV)) {
    const st = a.id.slice(IMPROV.length);
    return st && r.stats[st] ? [st] : [];
  }
  if (!a.check)
    return [];
  const names = new Set([...identifiers(a.check.add), ...identifiers(a.check.target)]);
  return r.statOrder.filter((id) => names.has(id) && (r.stats[id].kind === "skill" || r.stats[id].kind === "attribute"));
}
function practiceGain(r, s, stat, hardness, learn) {
  const def = r.stats[stat];
  if (!def || !r.growth.enabled || def.growth <= 0)
    return 0;
  const max = statMax(r, def, s);
  if ((s.stats[stat] ?? def.start) >= max)
    return 0;
  const kind = def.kind === "attribute" ? r.growth.attributes : 1;
  return (max - def.min) * 0.02 * r.growth.rate * def.growth * kind * hardness * learn * (1 - 0.6 * position(r, s, stat));
}
function hardnessFrom(success, difficulty) {
  if (isDifficulty(difficulty))
    return HARDNESS[difficulty];
  return success === null ? 1 : 0.5 + 1.5 * (1 - Math.max(0, Math.min(1, success)));
}
function checkGains(r, s, stats, hardness, tier) {
  const out = {};
  for (const id of stats) {
    const g = practiceGain(r, s, id, hardness, LEARN[tier]);
    if (g > 0)
      out[id] = g;
  }
  return out;
}
function trainingGain(r, s, stat, minutes) {
  if (!r.growth.train)
    return 0;
  const hours = Math.max(0.5, Math.min(4, (minutes ?? 60) / 60));
  return practiceGain(r, s, stat, 1, 1.5 * hours);
}
function practiceKey(s, context) {
  const people = Object.entries(s.scene ?? {}).filter(([, v]) => v.here && v.loc === s.location).map(([id]) => id).sort();
  const difficulty = context.actionId.startsWith(IMPROV) ? isDifficulty(context.params?.difficulty) ? context.params.difficulty : "fair" : null;
  const contest = s.contest ? `${s.contest.kind}@${s.contest.at}` : null;
  return JSON.stringify([context.actionId, s.location, people, context.target ?? null, difficulty, contest, s.contest?.opponent ?? null]);
}
function practiceRepetition(s, key, repeat = DEFAULT_PRACTICE_REPEAT) {
  if (repeat === false)
    return { multiplier: 1, n: 1 };
  const previous = s.practiceUse?.[key];
  const recovered = !previous || repeat.recoverMinutes > 0 && s.minutes - previous.minutes >= repeat.recoverMinutes || repeat.recoverTurns > 0 && s.turn - previous.turn >= repeat.recoverTurns;
  const repeats = recovered ? 0 : Math.max(0, Math.min(100, previous.n));
  return { multiplier: Math.min(1, Math.max(repeat.floor, 1 / (1 + repeat.step * repeats))), n: Math.min(100, repeats + 1) };
}
function practise(t, gains, why, context) {
  let multiplier = 1;
  if (context && t.r.growth.repeat !== false && Object.entries(gains).some(([id, g]) => t.r.stats[id] && Number.isFinite(g) && g > 0)) {
    const key = practiceKey(t.s, context);
    const repetition = practiceRepetition(t.s, key, t.r.growth.repeat);
    multiplier = repetition.multiplier;
    t.push({ t: "practice_use", key, n: repetition.n, turn: t.s.turn, minutes: t.s.minutes, src: "check", why });
  }
  for (const [id, raw] of Object.entries(gains)) {
    const g = raw * multiplier;
    const def = t.r.stats[id];
    if (!def || !Number.isFinite(g) || !(g > 0))
      continue;
    const pool = (t.s.practice[id] ?? 0) + g;
    const room = Math.max(0, statMax(t.r, def, t.s) - (t.s.stats[id] ?? def.start));
    const up = Math.min(Math.floor(pool), Math.floor(room));
    const left = room - up < 1 ? 0 : pool - up;
    const d = left - (t.s.practice[id] ?? 0);
    if (Math.abs(d) > 0.000000001)
      t.push({ t: "practice", id, d, src: "check", why });
    if (up > 0)
      t.push({ t: "stat", id, d: up, src: "check", why: `${why} — ${def.label} improved with practice` });
  }
}
function practiceProgress(r, s, stat) {
  const def = r.stats[stat];
  if (!def || !r.growth.enabled || def.growth <= 0)
    return null;
  if ((s.stats[stat] ?? def.start) >= statMax(r, def, s))
    return null;
  return Math.max(0, Math.min(0.999, s.practice[stat] ?? 0));
}

// node_modules/warp/src/engine/people.ts
var fill = (text, name) => text.replace(/\{name\}/g, name);
function crossing(def, before, after, max, beforeMax) {
  if (!def.bands.length || before === after)
    return null;
  const from = bandFor(def, before, beforeMax);
  const to = bandFor(def, after, max);
  if (!to || from === to || from && from.at === to.at && from.text === to.text)
    return null;
  return { from, to, dir: (from?.at ?? -Infinity) < to.at ? "up" : "down" };
}
function bandCrossings(r, before, after) {
  const out = [];
  for (const who of Object.keys(after.people)) {
    if (!before.people[who])
      continue;
    const name = personName(r, after, who);
    for (const id of r.relStatOrder) {
      const def = r.relStats[id];
      if (def.show === "hidden")
        continue;
      const b = before.rel[who]?.[id] ?? def.start, a = after.rel[who]?.[id] ?? def.start;
      const c = crossing(def, b, a, def.max, def.max);
      if (!c)
        continue;
      const own = c.dir === "up" ? c.to.say : c.to.sayDown;
      const moved = Math.abs(a - b);
      out.push({ who, stat: id, ...c, moved, share: moved / Math.max(0.000000001, def.max - def.min), authored: !!own, line: fill(own ?? `${name}: ${def.label} — ${c.to.text}.`, name) });
    }
  }
  for (const id of r.statOrder) {
    const def = r.stats[id];
    if (def.kind === "hidden" || def.show === "hidden")
      continue;
    const b = before.stats[id] ?? def.start, a = after.stats[id] ?? def.start;
    const c = crossing(def, b, a, statMax(r, def, after), statMax(r, def, before));
    if (!c)
      continue;
    const own = c.dir === "up" ? c.to.say : c.to.sayDown;
    const moved = Math.abs(a - b);
    out.push({ who: null, stat: id, ...c, moved, share: moved / Math.max(0.000000001, statMax(r, def, after) - def.min), authored: !!own, line: own ?? c.to.text });
  }
  return out;
}
var better = (a, b) => Number(b.authored) - Number(a.authored) || b.share - a.share || b.moved - a.moved;
function crossingLines(crossings, max = 3) {
  const best = new Map;
  for (const c of crossings) {
    const key = c.who ?? `you:${c.stat}`;
    const cur = best.get(key);
    if (!cur || better(c, cur) < 0)
      best.set(key, c);
  }
  return [...best.values()].sort((a, b) => Number(a.who === null) - Number(b.who === null) || better(a, b)).slice(0, max).map((c) => c.line);
}
function voiceLine(r, s, who) {
  const name = personName(r, s, who);
  const parts = [];
  for (const id of r.relStatOrder) {
    const def = r.relStats[id];
    if (def.show === "hidden")
      continue;
    const band = bandFor(def, s.rel[who]?.[id] ?? def.start);
    if (!band?.voice)
      continue;
    let v = fill(band.voice, name).trim().replace(/[.;]+$/, "");
    if (v.toLowerCase().startsWith(`${name.toLowerCase()} `))
      v = v.slice(name.length + 1);
    parts.push(v);
    if (parts.length >= 2)
      break;
  }
  return parts.length ? `How ${name} acts now: ${parts.join("; ")}.` : null;
}
function tagTaper(r, s, tag, target) {
  const rule = taperRule(r);
  return rule ? practiceRepetition(s, tagKey(tag, target), rule).multiplier : 1;
}

// node_modules/warp/src/engine/contest.ts
var CONTEST_PREFIX = "contest:";
var BREAK_OFF = "contest:break_off";
var GIVE_IN = "contest:give_in";
function contestMoveId(stat) {
  return `${CONTEST_PREFIX}${stat}`;
}
function contestId(id) {
  const bare = id.startsWith("live:") ? id.slice(5) : id;
  return bare.startsWith(CONTEST_PREFIX) ? bare.split("@")[0] : null;
}
function momentumWords(m, opponent, you = "{{user}}") {
  const second = you.toLowerCase() === "you";
  if (m >= 100)
    return `${you} ${second ? "have" : "has"} won`;
  if (m <= -100)
    return `${opponent} has won`;
  if (m >= 60)
    return `${you} ${second ? "are" : "is"} close to winning`;
  if (m >= 20)
    return `${you} ${second ? "have" : "has"} the upper hand`;
  if (m > -20)
    return "evenly matched";
  if (m > -60)
    return `${opponent} has the upper hand`;
  return `${opponent} is close to winning`;
}
var cap = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
var an = (w) => /^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`;
function kindOf(r, kind) {
  return r.conflict.kinds[kind] ?? { id: kind, label: cap(kind.replace(/_/g, " ")), stats: r.checks.stats.slice(0, 2), escape: r.checks.stats[0] ?? "", cost: {}, won: emptyEffect(), lost: emptyEffect(), escaped: emptyEffect() };
}
function findKind(r, key) {
  const k = String(key ?? "").trim().toLowerCase();
  return r.conflict.kinds[k] ?? Object.values(r.conflict.kinds).find((x) => x.label.toLowerCase() === k) ?? null;
}
function bestStat(r, s, kind) {
  let best = kind.stats[0] ?? "", top = -Infinity;
  for (const st of kind.stats) {
    const a = statAdd(r, s, st);
    if (a > top) {
      top = a;
      best = st;
    }
  }
  return best;
}
function multiplier(r, n) {
  return 1 + r.conflict.escalate * (Math.max(1, n) - 1);
}
function swingFor(r, tier, n) {
  return Math.round(r.conflict.swing[tier] * multiplier(r, n));
}
function nextMomentum(r, m, d, n) {
  const lim = n < r.conflict.rounds.min ? 90 : 100;
  return Math.max(-lim, Math.min(lim, m + d));
}
function breakOffDc(s) {
  return s.contest ? s.contest.dc - Math.round(s.contest.momentum / 25) : 12;
}
function contestAction(r, s, id) {
  const c = s.contest;
  const key = contestId(id);
  if (!c || !key)
    return null;
  const kind = kindOf(r, c.kind);
  const base = { cost: emptyEffect(), outcomes: {}, effects: emptyEffect(), params: [], tags: ["contest"], perPerson: false, requires: [], showLocked: false, hidden: false };
  if (key === GIVE_IN)
    return { ...base, id: GIVE_IN, label: "Give in", say: "*I give in.*" };
  if (key === BREAK_OFF) {
    const stat = kind.escape || bestStat(r, s, kind);
    return { ...base, id: BREAK_OFF, label: "Break off", say: "*I try to break away.*", check: { target: breakOffDc(s), add: statAdd(r, s, stat), partialMargin: r.checks.partial, label: r.stats[stat]?.label ?? "Luck" } };
  }
  const stat = key.slice(CONTEST_PREFIX.length);
  if (!kind.stats.includes(stat) && !r.stats[stat])
    return null;
  return { ...base, id: key, label: `Press on (${r.stats[stat]?.label ?? stat})`, say: `*I press on (${r.stats[stat]?.label ?? stat}).*`, check: { target: c.dc, add: statAdd(r, s, stat), partialMargin: r.checks.partial, label: r.stats[stat]?.label ?? stat } };
}
function moveOdds(r, s, stat) {
  if (!s.contest)
    return 0;
  return d20Odds(statAdd(r, s, stat), s.contest.dc, r.checks.partial).success;
}
function startContest(t, req, src) {
  const { r } = t;
  if (r.style === "story" || t.s.contest)
    return false;
  const kind = findKind(r, req.kind);
  const opponent = String(req.opponent ?? "").trim().slice(0, 60);
  if (!kind || !opponent)
    return false;
  const who = findPerson(r, t.s, opponent) ?? undefined;
  const last = t.s.lastContest;
  if (last && t.s.minutes - last.at <= 15 && (last.opponent.toLowerCase() === opponent.toLowerCase() || who && last.who === who))
    return false;
  const threat = req.threat && r.checks.dc[req.threat] !== undefined ? req.threat : "fair";
  const name = who ? t.s.people[who]?.name ?? opponent : opponent;
  t.push({ t: "contest", kind: kind.id, opponent: name, ...who ? { who } : {}, threat, dc: r.checks.dc[threat], src });
  t.announce(`${cap(an(kind.label.toLowerCase()))} with ${name} starts (${threat}). It runs until the rules end it: only a full swing of momentum, a Break off or giving in ends it.`);
  return true;
}
var OPPONENT_BEAT = {
  crit_success: "{opponent} is thrown badly off balance.",
  success: "{opponent} gives ground.",
  partial: "{opponent} answers back: both land something.",
  fail: "{opponent} takes the advantage.",
  crit_fail: "{opponent} turns it hard against {{user}}."
};
var LANDS = {
  crit_success: "and it lands perfectly",
  success: "and it lands well",
  partial: "and it half lands",
  fail: "but it doesn't land",
  crit_fail: "and it goes badly wrong"
};
var ENDING = {
  won: "{{user}} wins",
  lost: "{opponent} wins",
  escaped: "{{user}} gets away",
  gave_in: "{{user}} gives in",
  broken_off: "Neither side can finish it; it breaks off"
};
var NOT_OVER = "Narrate these beats in order, in the story's voice. The contest is not over until the rules end it — do not finish it, do not knock anyone out, do not let anyone walk away.";
var fillOpp = (text, opponent) => text.replace(/^\{opponent\}/, cap(opponent)).replace(/\{opponent\}/g, opponent);
function endContest(t, outcome, src) {
  const c = t.s.contest;
  if (!c)
    return null;
  const kind = kindOf(t.r, c.kind);
  const fx = outcome === "won" ? kind.won : outcome === "lost" || outcome === "gave_in" ? kind.lost : kind.escaped;
  const hint = fx.hint ? fillOpp(fx.hint, c.opponent) : null;
  t.apply({ ...fx, hint: undefined }, src, { ...c.who ? { opponent: c.who } : {} });
  if (c.who && t.s.people[c.who]) {
    const what = kind.label.toLowerCase();
    const text = outcome === "won" ? `{{user}} beat them in ${an(what)}.` : outcome === "lost" || outcome === "gave_in" ? `{{user}} lost ${an(what)} to them.` : outcome === "escaped" ? "{{user}} got away from them." : `{{user}} and they fought ${an(what)} to a standstill.`;
    t.push({ t: "memory", who: c.who, text, src: "trigger" });
  }
  t.push({ t: "contest_end", outcome, src });
  return hint;
}
function beatsBlock(t, o) {
  const lines = [`Contest: ${o.kind.label.toLowerCase()} with ${o.opponent} — round ${o.n} of at most ${o.max}.`];
  if (o.check)
    lines.push(`Check: ${o.check.label} — d20 ${o.check.roll}${o.check.add ? ` ${o.check.add > 0 ? "+" : "−"} ${Math.abs(o.check.add)}` : ""} = ${o.check.total} vs ${o.check.target}${o.check.difficulty ? ` (${o.check.difficulty})` : ""} → ${TIER_WORD[o.check.tier]}`);
  lines.push("This round's beats, in order:");
  const beats = [`{{user}}: ${o.you}.`];
  if (o.them)
    beats.push(fillOpp(o.them, o.opponent));
  if (o.outcome)
    beats.push(`This round ends it: ${fillOpp(ENDING[o.outcome], o.opponent)}.${o.ending ? ` Write the ending: ${o.ending}` : ""}`);
  else
    beats.push(`Where it stands: ${momentumWords(o.momentum, o.opponent)}${o.shift ? ` (it swung toward ${o.shift > 0 ? "{{user}}" : o.opponent})` : ""}.`);
  beats.forEach((b, i) => lines.push(`${i + 1}. ${b}`));
  lines.push(o.outcome ? "Narrate these beats in order, in the story's voice, and end the contest here." : NOT_OVER);
  return lines.join(`
`);
}
var TIER_WORD = { crit_success: "CRITICAL SUCCESS", success: "SUCCESS", partial: "PARTIAL SUCCESS", fail: "FAILURE", crit_fail: "CRITICAL FAILURE" };
function contestCheck(t, stat, target, seed) {
  const add = statAdd(t.r, t.s, stat);
  const natural = rollD20(seededRng(seed));
  const tier = d20Tier(natural, add, target, t.r.checks.partial);
  return {
    label: t.r.stats[stat]?.label ?? (stat || "Luck"),
    style: "vs",
    dice: "d20",
    faces: [{ sides: 20, value: natural, kept: true }],
    roll: natural,
    add,
    total: natural + add,
    target,
    tier,
    seed,
    ...t.s.contest ? { difficulty: t.s.contest.threat } : {}
  };
}
function swingAndCost(t, tier, d, n, src) {
  const c = t.s.contest;
  const next = nextMomentum(t.r, c.momentum, d, n);
  const shift = next - c.momentum;
  if (shift)
    t.push({ t: "swing", d: shift, src });
  const kind = kindOf(t.r, c.kind);
  const cost = tier ? kind.cost[tier] : undefined;
  if (cost)
    t.apply(cost, src, { ...c.who ? { opponent: c.who } : {} });
  const m = t.s.contest?.momentum ?? next;
  const outcome = m >= 100 ? "won" : m <= -100 ? "lost" : n >= t.r.conflict.rounds.max ? "broken_off" : null;
  return { shift, outcome };
}
function contestRound(t, move, seed) {
  const c = t.s.contest;
  const kind = kindOf(t.r, c.kind);
  const stat = move.stat && (kind.stats.includes(move.stat) || t.r.stats[move.stat]) ? move.stat : bestStat(t.r, t.s, kind);
  t.push({ t: "round", src: "check" });
  const n = t.s.contest.round;
  const check = contestCheck(t, stat, c.dc, seed);
  const { shift, outcome } = swingAndCost(t, check.tier, swingFor(t.r, check.tier, n), n, "check");
  const gains = checkGains(t.r, t.s, [stat], HARDNESS2[c.threat], check.tier);
  if (Object.keys(gains).length)
    practise(t, gains, `Used in ${an(kind.label.toLowerCase())} (${check.tier.replace("_", " ")})`, { actionId: contestMoveId(stat), target: c.who ?? c.opponent.toLowerCase() });
  const momentum = t.s.contest?.momentum ?? c.momentum + shift;
  const ending = outcome ? endContest(t, outcome, "check") : null;
  const you = `${move.typed || !move.label ? "keep the move exactly as {{user}} wrote it" : move.label.replace(/[.!]+$/, "")}, ${LANDS[check.tier]}`;
  return { check, outcome, beats: beatsBlock(t, { n, check, you, them: OPPONENT_BEAT[check.tier], momentum, shift, outcome, ending, kind, opponent: c.opponent, max: t.r.conflict.rounds.max }) };
}
var HARDNESS2 = { easy: 0.5, fair: 1, hard: 1.5, extreme: 2 };
function breakOff(t, seed) {
  const c = t.s.contest;
  const kind = kindOf(t.r, c.kind);
  const stat = kind.escape || bestStat(t.r, t.s, kind);
  const target = breakOffDc(t.s);
  t.push({ t: "round", src: "check" });
  const n = t.s.contest.round;
  const check = contestCheck(t, stat, target, seed);
  const got = check.tier === "success" || check.tier === "crit_success" || check.tier === "partial";
  let shift = 0;
  let outcome;
  if (got) {
    if (check.tier === "partial" && kind.cost.partial)
      t.apply(kind.cost.partial, "check", { ...c.who ? { opponent: c.who } : {} });
    outcome = "escaped";
  } else {
    ({ shift, outcome } = swingAndCost(t, check.tier, swingFor(t.r, check.tier, n), n, "check"));
  }
  const momentum = t.s.contest?.momentum ?? c.momentum + shift;
  const ending = outcome ? endContest(t, outcome, "check") : null;
  const you = got ? `tries to break off, and gets clear${check.tier === "partial" ? " (at a cost)" : ""}` : `tries to break off, ${LANDS[check.tier]}`;
  return { check, outcome, beats: beatsBlock(t, { n, check, you, them: got ? null : OPPONENT_BEAT[check.tier], momentum, shift, outcome, ending, kind, opponent: c.opponent, max: t.r.conflict.rounds.max }) };
}
function giveIn(t) {
  const c = t.s.contest;
  const kind = kindOf(t.r, c.kind);
  const n = c.round + 1;
  const ending = endContest(t, "gave_in", "action");
  return { check: null, outcome: "gave_in", beats: beatsBlock(t, { n, check: null, you: "gives in", them: null, momentum: c.momentum, shift: 0, outcome: "gave_in", ending, kind, opponent: c.opponent, max: t.r.conflict.rounds.max }) };
}
function busyRound(t, label) {
  const c = t.s.contest;
  const kind = kindOf(t.r, c.kind);
  t.push({ t: "round", src: "action" });
  const n = t.s.contest.round;
  const { shift, outcome } = swingAndCost(t, null, Math.round(-20 * multiplier(t.r, n)), n, "action");
  const momentum = t.s.contest?.momentum ?? c.momentum + shift;
  const ending = outcome ? endContest(t, outcome, "action") : null;
  return { check: null, outcome, beats: beatsBlock(t, { n, check: null, you: `${label.replace(/[.!]+$/, "")} (not a move in the ${kind.label.toLowerCase()})`, them: "{opponent} presses while {{user}} is busy.", momentum, shift, outcome, ending, kind, opponent: c.opponent, max: t.r.conflict.rounds.max }) };
}
function simulateContest(r, kind, add, threat, runs = 2000, seed = "sim") {
  const dc = r.checks.dc[threat] ?? 12;
  const rng = seededRng(`${seed}:${kind}:${add}:${threat}`);
  let won = 0, lost = 0, broken = 0, rounds = 0, within = 0;
  const max = r.conflict.rounds.max;
  for (let i = 0;i < runs; i++) {
    let m = 0, n = 0;
    let end = null;
    while (!end) {
      n++;
      const tier = d20Tier(rollD20(rng), add, dc, r.checks.partial);
      m = nextMomentum(r, m, swingFor(r, tier, n), n);
      if (m >= 100)
        end = "won";
      else if (m <= -100)
        end = "lost";
      else if (n >= max)
        end = "broken";
    }
    if (end === "won")
      won++;
    else if (end === "lost")
      lost++;
    else
      broken++;
    rounds += n;
    if (n >= r.conflict.rounds.min && n <= 6)
      within++;
  }
  return { runs, won: won / runs, lost: lost / runs, brokenOff: broken / runs, meanRounds: rounds / runs, within: within / runs, odds: d20Odds(add, dc, r.checks.partial).success };
}

// node_modules/warp/src/engine/goals.ts
var STORY_GOAL = "story_";
var norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function close(t, id, st, src) {
  const g = t.s.goals?.[id];
  if (!g || g.st !== "open")
    return;
  t.push({ t: "goal", id, st, src });
  const def = t.r.goals.list[id];
  if (st === "done" && def)
    t.apply(def.reward, src);
  if (g.from && t.s.people[g.from])
    t.push({ t: "memory", who: g.from, text: st === "done" ? `{{user}} kept their promise: ${g.text}.` : `{{user}} let them down: ${g.text}.`, src });
  t.announce(st === "done" ? `Goal done: ${g.text}.` : `Goal failed: ${g.text}.${g.stakes ? ` At stake was: ${g.stakes}` : ""}`);
}
function goalOp(t, id, op, src) {
  const g = t.s.goals?.[id];
  if (op === "start") {
    const def = t.r.goals.list[id];
    if (def && (!g || g.st !== "open"))
      t.push({ t: "goal", id, st: "open", text: def.text, ...def.stakes ? { stakes: def.stakes } : {}, src });
    return;
  }
  close(t, id, op === "done" ? "done" : "failed", src);
}
function goalLife(t) {
  for (const def of Object.values(t.r.goals.list)) {
    if (t.s.goals?.[def.id]?.st !== "open")
      continue;
    if (def.doneWhen && evalBool(def.doneWhen, t.env(), false))
      close(t, def.id, "done", "trigger");
    else if (def.failWhen && evalBool(def.failWhen, t.env(), false))
      close(t, def.id, "failed", "trigger");
  }
}
function goalId(s, key) {
  if (s.goals?.[key])
    return key;
  const k = norm(key);
  return Object.entries(s.goals ?? {}).find(([, g]) => norm(g.text) === k)?.[0] ?? null;
}
function storyGoalNews(t, news, findPerson) {
  for (const key of Array.isArray(news.done) ? news.done : []) {
    const id = goalId(t.s, String(key));
    if (id)
      close(t, id, "done", "narrator");
  }
  for (const key of Array.isArray(news.failed) ? news.failed : []) {
    const id = goalId(t.s, String(key));
    if (id)
      close(t, id, "failed", "narrator");
  }
  if (!t.r.goals.fromStory)
    return;
  for (const g of Array.isArray(news.new) ? news.new : []) {
    const text = typeof g?.text === "string" ? g.text.trim().replace(/\s+/g, " ").slice(0, 160) : "";
    if (!text)
      continue;
    const open = Object.values(t.s.goals ?? {}).filter((x) => x.st === "open").length;
    if (open >= t.r.goals.max)
      break;
    if (Object.values(t.s.goals ?? {}).some((x) => norm(x.text) === norm(text)))
      continue;
    let id = `${STORY_GOAL}${slug(text).slice(0, 40)}`;
    for (let i = 2;t.s.goals?.[id]; i++)
      id = `${STORY_GOAL}${slug(text).slice(0, 37)}_${i}`;
    const from = typeof g.from === "string" && g.from.trim() ? findPerson(g.from) : null;
    const stakes = typeof g.stakes === "string" && g.stakes.trim() ? g.stakes.trim().slice(0, 160) : undefined;
    const judge = typeof g.done === "string" && g.done.trim() ? g.done.trim().slice(0, 160) : undefined;
    t.push({ t: "goal", id, st: "open", text, ...from ? { from } : {}, ...stakes ? { stakes } : {}, ...judge ? { judge } : {}, src: "narrator" });
  }
}
function goalInPlay(r, s, id, g, here, focus) {
  if (g.st !== "open")
    return false;
  if (focus === null)
    return true;
  if (g.from && here.has(g.from))
    return true;
  if (s.turn - (g.turn ?? -99) <= 3)
    return true;
  const words = norm(g.text).split(" ").filter((w) => w.length >= 4);
  const f = norm(focus);
  if (words.length && words.filter((w) => f.includes(w)).length >= Math.min(2, words.length))
    return true;
  return !!g.from && f.includes(personName(r, s, g.from).toLowerCase());
}

// node_modules/warp/src/engine/resolve.ts
function because(w, cause, fn) {
  const prev = w.cause;
  w.cause = prev ? `${prev} → ${cause}` : cause;
  try {
    return fn();
  } finally {
    w.cause = prev;
  }
}

class Working {
  r;
  s;
  rng;
  seed;
  odds;
  scene;
  events = [];
  hints = [];
  decisions = [];
  needs = [];
  defer = true;
  taper = 1;
  constructor(r, s, rng = seededRng("effects"), seed = "effects", odds = {}, scene = {}) {
    this.r = r;
    this.s = s;
    this.rng = rng;
    this.seed = seed;
    this.odds = odds;
    this.scene = scene;
  }
  cause = null;
  push(e) {
    if (this.cause && !e.why)
      e = { ...e, why: this.cause };
    applyEvent(this.s, e, this.r);
    this.events.push(e);
  }
  env(extra = {}) {
    const base = makeEnv(this.r, this.s, extra);
    return {
      lookup: base.lookup,
      call: (name, args) => {
        if (name === "roll") {
          try {
            return rollDice(String(args[0] ?? "d6"), this.rng).total;
          } catch {
            return 0;
          }
        }
        return base.call?.(name, args);
      }
    };
  }
}
var TARGET_SEP = "@";
var WORD_ALIASES = { fair: ["normal", "medium"], normal: ["fair", "medium"], medium: ["fair", "normal"] };
function paramValues(a, chosen, target) {
  const out = {};
  for (const p of a.params) {
    const want = chosen?.[p.id];
    const key = want && p.options[want] !== undefined ? want : want && WORD_ALIASES[want]?.find((k) => p.options[k] !== undefined) || p.default;
    out[p.id] = p.options[key];
  }
  if (target)
    out.target = target;
  return out;
}
function whenHolds(r, s, a, target) {
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
function hasEffect(e) {
  return Object.values(e).some((v) => v !== undefined && v !== null && v !== false && (typeof v !== "object" || (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)));
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
  if (params || !a.params.length)
    return costShortfall(r, s, a, target, params);
  const combos = paramCombos(a);
  return combos.some((c) => !costShortfall(r, s, a, target, c)) ? null : costShortfall(r, s, a, target, combos[0]);
}
function availableActions(r, s, lines = []) {
  const blocked = new Set(lines.map((l) => l.toLowerCase()));
  return r.actionOrder.map((id) => r.actions[id]).filter((a) => !a.tags.some((t) => blocked.has(t)) && (a.perPerson || isAvailable(r, s, a)));
}
function availableChoices(r, s, lines = []) {
  const out = [];
  if (s.contest) {
    const kind = kindOf(r, s.contest.kind);
    for (const id of [...kind.stats.map((st) => `${CONTEST_PREFIX}${st}`), BREAK_OFF, GIVE_IN]) {
      const a = contestAction(r, s, id);
      if (a)
        out.push({ id, a, label: a.label });
    }
  }
  const here = presentPeople(r, s);
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
    case "goal": {
      const text = s.goals?.[id]?.text ?? r.goals.list[id]?.text ?? id;
      return q.state === "open" ? `the goal "${text}"` : `"${text}" ${q.state}`;
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
  for (const src of bonusSources(r, s)) {
    for (const [stat, b] of Object.entries(src.bonus)) {
      if (!b || !reads.has(stat))
        continue;
      stats[stat] = (stats[stat] ?? 0) + b;
      notes.push(`${src.from}: ${b > 0 ? "+" : ""}${formatNumber(b)} ${r.stats[stat]?.label ?? stat}`);
    }
  }
  return { stats, notes };
}
function amountOf(w, v, extra, max) {
  const p = percentOf(v);
  const x = p !== null ? p * max : evalNumber(v, w.env(extra), 0);
  return Math.abs(x) >= 1 && p !== null ? Math.round(x) : x;
}
function findAction(r, s, actionId) {
  const contest = contestId(actionId);
  if (contest) {
    const a = contestAction(r, s, contest);
    return a ? { a } : null;
  }
  const [base, target] = actionId.split(TARGET_SEP);
  const allowed = (a) => isAvailable(r, s, a, target) && (!a.perPerson || !!target) && (!target || presentPeople(r, s).includes(target));
  if (base.startsWith(ITEM_PREFIX)) {
    const id = base.slice(ITEM_PREFIX.length);
    const item = r.items[id];
    const a = item?.use;
    return a && (s.items[id] ?? 0) > 0 && !(item.uses > 0 && (s.uses[id] ?? item.uses) <= 0) && allowed(a) ? { a, ...target ? { target } : {} } : null;
  }
  if (base.startsWith(IMPROV)) {
    const a = improvAction(r, s, base);
    return a ? { a } : null;
  }
  const a = base.startsWith(LIVE_PREFIX) ? r.liveChoices.tags[base.slice(LIVE_PREFIX.length)] : r.actions[base];
  return a && allowed(a) ? { a, ...target ? { target } : {} } : null;
}
function tierDirection(r, tier) {
  return r.checks.directions[tier] ?? DEFAULT_DIRECTIONS[tier];
}
function checkNumbers(r, s, a, params, who) {
  const check = a.check;
  const gear = gearFor(r, s, a).stats;
  const eff = Object.keys(gear).length ? { ...s, stats: Object.fromEntries(Object.entries(s.stats).map(([k, v]) => [k, v + (gear[k] ?? 0)])) } : s;
  const adjusted = makeEnv(r, eff, paramValues(a, params, who));
  const plain = makeEnv(r, s, paramValues(a, params, who));
  const env = { lookup: adjusted.lookup, call: (n, args) => n === "eff" || n === "gear" ? plain.call?.(n, args) : adjusted.call?.(n, args) };
  const add = check.add !== undefined ? Math.round(evalNumber(check.add, env, 0)) : 0;
  const word = typeof check.target === "string" ? difficultyOf(check.target) : null;
  let difficulty;
  let target;
  if (check.target === undefined) {
    difficulty = difficultyOf(params?.difficulty) ?? "fair";
    target = r.checks.dc[difficulty];
  } else if (word) {
    difficulty = word;
    target = r.checks.dc[word];
  } else
    target = Math.round(evalNumber(check.target, env, r.checks.dc.fair));
  return { add, target, partial: check.partialMargin ?? r.checks.partial, ...difficulty ? { difficulty } : {} };
}
function odds(r, s, a, params, who) {
  if (!a.check || params?.difficulty === "none")
    return null;
  const { add, target, partial } = checkNumbers(r, s, a, params, who);
  return d20Odds(add, target, partial);
}
function flagValue(v, env) {
  if (typeof v !== "string")
    return v;
  try {
    const unknown = new Set;
    const out = evaluate(v, env, { unknown });
    return unknown.size ? v : out;
  } catch {
    return v;
  }
}
function isGain(good, v) {
  return good === "low" ? v < 0 : v > 0;
}
function effectToEvents(w, e, src, extra) {
  const r = w.r;
  for (const [id, d] of Object.entries(e.stats)) {
    const def = r.stats[id];
    let v = amountOf(w, d, extra, def ? statMax(r, def, w.s) : 100);
    if (w.taper < 1 && isGain(def?.good, v))
      v *= w.taper;
    if (Math.abs(v) > 0.000000001)
      w.push({ t: "stat", id, d: v, src });
  }
  for (const [id, d] of Object.entries(e.set)) {
    w.push({ t: "stat", id, set: evalNumber(d, w.env(extra), 0), src });
  }
  for (const [key, v] of Object.entries(e.flags)) {
    w.push({ t: "flag", key, v: flagValue(v, w.env(extra)), src });
  }
  for (const [id, n] of Object.entries(e.items)) {
    if (n < 0 && !(w.s.items[id] > 0))
      continue;
    w.push({ t: "item", id, d: n, src });
  }
  for (const [key, m] of Object.entries(e.rel)) {
    const who = key === "target" ? typeof extra.target === "string" ? extra.target : null : key === "opponent" ? typeof extra.opponent === "string" ? extra.opponent : w.s.contest?.who ?? null : key;
    if (!who)
      continue;
    if (!w.s.people[who])
      w.push({ t: "person", id: who, name: r.people[who]?.name ?? who, src });
    for (const [stat, d] of Object.entries(m)) {
      let v = evalNumber(d, w.env(extra), 0);
      if (w.taper < 1 && isGain(r.relStats[stat]?.good, v))
        v *= w.taper;
      if (Math.abs(v) > 0.000000001)
        w.push({ t: "rel", who, stat, d: v, src });
    }
  }
  if (e.place) {
    const name = fillTarget(w, e.place, extra);
    if (name.toLowerCase() !== (w.s.locationName ?? "").toLowerCase())
      w.push({ t: "move", to: placeId(name), name, src });
  }
  for (const [key, l] of Object.entries(e.look)) {
    const who = key === "you" ? "you" : key === "target" ? typeof extra.target === "string" ? extra.target : null : key === "opponent" ? w.s.contest?.who ?? null : findPerson(r, w.s, key);
    if (!who)
      continue;
    for (const field of ["appearance", "outfit"])
      if (field in l)
        w.push({ t: "look", who, field, text: l[field] ?? null, src });
  }
  for (const [id, dur] of Object.entries(e.addConditions))
    w.push(condOn(w, id, dur, src));
  for (const id of e.removeConditions)
    if (w.s.conditions[id])
      w.push({ t: "cond", id, on: false, src });
  for (const [id, op] of Object.entries(e.goal))
    goalOp(builderOf(w), id, op, src);
  for (const [who, text] of Object.entries(e.remember)) {
    const person = who === "target" ? typeof extra.target === "string" ? extra.target : null : who === "opponent" ? w.s.contest?.who ?? null : who;
    if (person)
      w.push({ t: "memory", who: person, text: fillTarget(w, text, extra), src });
  }
  for (const id of e.reveal) {
    const sec = r.secrets[id];
    const cur = w.s.secrets[id] ?? -1;
    if (sec && cur + 1 < sec.stages.length)
      w.push({ t: "secret", id, stage: cur + 1, src });
  }
  if (e.swing !== undefined && w.s.contest) {
    const v = evalNumber(e.swing, w.env(extra), 0);
    if (v !== 0)
      w.push({ t: "swing", d: v, src });
  }
  if (e.contest && !w.s.contest)
    startContest(builderOf(w), { kind: e.contest.kind, opponent: fillTarget(w, e.contest.with, extra), threat: e.contest.threat }, src === "narrator" ? "narrator" : "trigger");
  if (e.time)
    advanceTime(w, e.time, src);
  if (e.hint)
    announce(w, fillTarget(w, e.hint, extra));
  for (const d of e.decide)
    decide(w, d, src, extra);
}
function condOn(w, id, minutes, src) {
  const def = w.r.conditions[id];
  return { t: "cond", id, on: true, until: minutes === null ? def?.lasts ? w.s.minutes + def.lasts : null : w.s.minutes + minutes, src };
}
function announce(w, text) {
  if (w.defer)
    w.push({ t: "notice", text, src: "world" });
  else
    w.hints.push(text);
}
function openSecrets(w) {
  for (const sec of Object.values(w.r.secrets)) {
    let cur = w.s.secrets[sec.id] ?? -1;
    while (cur + 1 < sec.stages.length) {
      const st = sec.stages[cur + 1];
      if (st.when && !evalBool(st.when, w.env(), false))
        break;
      cur++;
      w.push({ t: "secret", id: sec.id, stage: cur, src: "trigger" });
    }
  }
}
function decide(w, d, src, extra) {
  if (w.decisions.some((x) => x.id === d.id))
    return;
  if (d.options.some((o) => o.when !== undefined)) {
    const env = w.env(extra);
    const open = d.options.filter((o) => o.when === undefined || evalBool(o.when, env, false));
    if (open.length && open.length < d.options.length)
      d = { ...d, options: open };
  }
  const keys = d.options.map((o) => o.id);
  const model = w.odds[d.id];
  if (!model)
    w.needs.push(d);
  const p = normalize(model ?? Object.fromEntries(d.options.map((o) => [o.id, o.weight])), keys);
  const picked = sample(p, seededRng(`${w.seed}:decide:${d.id}`));
  const opt = d.options.find((o) => o.id === picked);
  w.decisions.push({ id: d.id, ask: fillTarget(w, d.ask, extra), picked, pickedDesc: fillTarget(w, opt.desc, extra), p, source: model ? "model" : "weights" });
  because(w, `${fillTarget(w, d.ask, extra)} → ${fillTarget(w, opt.desc, extra)} (${Math.round((p[picked] ?? 0) * 100)}% odds)`, () => effectToEvents(w, opt.effect, src, extra));
}
function advanceTime(w, minutes, src) {
  if (!w.r.clock.enabled || minutes <= 0)
    return;
  w.push({ t: "time", min: minutes, src });
  for (const id of w.r.statOrder) {
    const def = w.r.stats[id];
    const rate = def.perHourExpr !== undefined ? amountValue(def.perHourExpr, w.env(), statMax(w.r, def, w.s)) : def.perHour;
    if (!rate)
      continue;
    const d = rate * minutes / 60;
    if (Math.abs(d) > 0.000000001)
      w.push({ t: "stat", id, d, src: "drift", why: `${minutes >= 60 ? `${Math.round(minutes / 6) / 10}h` : `${minutes} min`} passed (${def.label} drifts ${rate > 0 ? "+" : ""}${formatNumber(rate)}/h)` });
  }
  for (const [id, c] of Object.entries(w.s.conditions)) {
    if (c.until !== null && c.until <= w.s.minutes)
      w.push({ t: "cond", id, on: false, src: "drift", note: "expired" });
  }
}
function runTriggers(w, includeRepeat) {
  const fired = new Set;
  const limit = Math.max(5, Math.min(256, w.r.triggers.length * 2 + 1));
  for (let pass = 0;pass < limit; pass++) {
    let changed = false;
    for (const t of w.r.triggers) {
      if (t.whenScene && !(t.id in w.scene))
        continue;
      const now = (t.when === undefined || evalBool(t.when, w.env(), false)) && (!t.whenScene || w.scene[t.id] === true);
      const prev = w.s.triggers[t.id] ?? false;
      const why = `Rule "${t.id.replace(/_/g, " ")}"${t.when ? ` (${t.when})` : ""}${t.whenScene ? ` — judged: ${t.whenScene}` : ""}`;
      if (now && !prev) {
        w.push({ t: "trig", id: t.id, v: true, src: "trigger" });
        because(w, why, () => effectToEvents(w, t.effects, "trigger", {}));
        fired.add(t.id);
        changed = true;
      } else if (now && t.repeat && includeRepeat && !fired.has(t.id)) {
        because(w, `${why}, every turn while true`, () => effectToEvents(w, t.effects, "trigger", {}));
        fired.add(t.id);
        changed = true;
      } else if (!now && prev) {
        w.push({ t: "trig", id: t.id, v: false, src: "trigger" });
        changed = true;
      }
    }
    if (!changed)
      break;
    if (pass === limit - 1 && w.r.triggers.some((t) => {
      if (t.whenScene && !(t.id in w.scene))
        return false;
      const now = (t.when === undefined || evalBool(t.when, w.env(), false)) && (!t.whenScene || w.scene[t.id] === true);
      return now !== (w.s.triggers[t.id] ?? false);
    })) {
      announce(w, "Rule processing reached its safety limit. Some rules still disagree with the state; check for a cycle in the ruleset.");
    }
  }
  openSecrets(w);
  goalLife(builderOf(w));
}
var TIER_FALLBACK = {
  crit_success: ["crit_success", "success"],
  success: ["success"],
  partial: ["partial", "success"],
  fail: ["fail"],
  crit_fail: ["crit_fail", "fail"]
};
var TIER_LABEL = {
  crit_success: "Critical success",
  success: "Success",
  partial: "Partial success",
  fail: "Failure",
  crit_fail: "Critical failure"
};
function resolveTurn(r, before, intent, opts) {
  return resolveInner(r, before, intent, opts, []);
}
function tagKey(tag, target) {
  return `tag:${tag}:${target ?? ""}`;
}
function taperRule(r) {
  return r.liveChoices.taper === false ? false : { step: r.liveChoices.taper.step, floor: r.liveChoices.taper.floor, recoverMinutes: 480, recoverTurns: 8 };
}
function resolveInner(r, before, intent, opts, needs) {
  const w = new Working(r, cloneState(before), seededRng(`${opts.seed}:fx`), opts.seed, opts.odds ?? {}, opts.scene ?? {});
  w.defer = false;
  const rec = { v: 1, hints: [], events: [], at: Date.now() };
  const t = builderOf(w);
  if (before.notices.length) {
    w.hints.push(...before.notices);
    w.push({ t: "noticed", src: "world" });
  }
  if (opts.contest && !w.s.contest)
    because(w, "The scene: a contest breaks out", () => startContest(t, opts.contest, "trigger"));
  if (w.s.contest) {
    contestTurn(w, rec, intent, opts);
  } else if (intent) {
    const found = findAction(r, w.s, intent.actionId);
    if (!found)
      return { ...rec, hints: ["The attempted action isn't available in the current state. It did not happen and spent no turn or resources."] };
    const short = found.a.params.length ? spentLock(r, w.s, found.a, found.target, intent.params) : null;
    if (short)
      return { ...rec, hints: [`The attempted action can't be paid for with that choice (${short}). It did not happen and spent no turn or resources.`] };
    actionTurn(w, rec, intent, found.a, found.target, opts);
  }
  runTriggers(w, true);
  const lines = crossingLines(bandCrossings(r, before, w.s));
  if (lines.length) {
    rec.lines = lines;
    w.hints.push(`Show in this reply: ${lines.join(" ")}`);
  }
  w.push({ t: "turn", src: "action" });
  rec.events = w.events;
  rec.hints = w.hints;
  if (w.decisions.length) {
    rec.decisions = w.decisions;
    for (const d of w.decisions)
      if (!d.descs)
        rec.hints.push(`${d.ask} → ${d.pickedDesc}`);
  }
  needs.push(...w.needs);
  return rec;
}
function actionTurn(w, rec, intent, a, who, opts) {
  const r = w.r;
  const before = cloneState(w.s);
  const extra = paramValues(a, intent.params, who);
  const improvised = a.id.startsWith(IMPROV);
  const live = intent.actionId.startsWith(LIVE_PREFIX) ? intent.actionId.slice(LIVE_PREFIX.length).split(TARGET_SEP)[0] : null;
  const word = intent.params?.difficulty;
  const noRoll = live !== null && word === "none";
  const difficulty = isDifficulty(word) ? word : "fair";
  const label = improvised ? `Attempt: ${a.check?.label ?? "luck"}, ${difficulty}` : intent.label ?? (who ? `${a.label} (${personName(r, before, who)})` : a.label);
  rec.action = { id: intent.actionId, label, via: intent.via, ...a.params.length ? { params: Object.fromEntries(a.params.map((p) => [p.id, intent.params?.[p.id] ?? p.default])) } : {} };
  if (live !== null) {
    const rule = taperRule(r);
    if (rule) {
      const rep = practiceRepetition(before, tagKey(live, who), rule);
      w.taper = rep.multiplier;
      w.push({ t: "practice_use", key: tagKey(live, who), n: rep.n, turn: before.turn, minutes: before.minutes, src: "action" });
    }
  }
  because(w, `Cost of "${label}"`, () => effectToEvents(w, a.cost, "cost", extra));
  if (a.id.startsWith(ITEM_PREFIX)) {
    const itemId = a.id.slice(ITEM_PREFIX.length);
    const it = r.items[itemId];
    if (it && !it.keep && (w.s.items[itemId] ?? 0) > 0)
      because(w, `Used ${it.name}`, () => w.push(it.uses > 0 ? { t: "use", id: itemId, n: 1, src: "action" } : { t: "item", id: itemId, d: -1, src: "action" }));
  }
  if (a.check && !noRoll) {
    const params = { ...intent.params ?? {}, ...improvised || live !== null ? { difficulty } : {} };
    const { add, target, partial, difficulty: dw } = checkNumbers(r, before, a, params, who);
    const natural = rollD20(seededRng(opts.seed));
    const tier = d20Tier(natural, add, target, partial);
    rec.check = {
      label: a.check.label ?? a.label,
      style: "vs",
      dice: "d20",
      faces: [{ sides: 20, value: natural, kept: true }],
      roll: natural,
      add,
      total: natural + add,
      target,
      tier,
      seed: opts.seed,
      ...dw ? { difficulty: dw } : {}
    };
    const gear = gearFor(r, before, a).notes;
    if (gear.length)
      rec.check.gear = gear;
    if (hasEffect(a.effects))
      because(w, `"${label}"`, () => effectToEvents(w, a.effects, "action", extra));
    const key = TIER_FALLBACK[tier].find((t) => a.outcomes[t]);
    const how = `rolled ${rec.check.total} vs ${target}`;
    if (key)
      because(w, `"${label}": ${rec.check.label} ${how} → ${TIER_LABEL[tier]}`, () => effectToEvents(w, a.outcomes[key], "check", extra));
    if (improvised) {
      w.hints.push(`{{user}} attempts what they wrote (${a.check.label}, ${difficulty}). ${tierDirection(r, tier)} Keep {{user}}'s own words and choices; the dice decide only how it turns out.`);
    } else if (!key || !a.outcomes[key].hint || key !== tier)
      w.hints.push(tierDirection(r, tier));
    const used = checkStats(r, a);
    if (used.length) {
      const hard = hardnessFrom(improvised ? null : odds(r, before, a, params, who)?.success ?? null, improvised ? difficulty : dw);
      const gains = checkGains(r, w.s, used, hard, tier);
      if (Object.keys(gains).length)
        practise(builderOf(w), gains, `Used in "${label}" (${TIER_LABEL[tier].toLowerCase()})`, { actionId: a.id, target: who, params: intent.params });
    }
  } else {
    because(w, `"${label}"`, () => effectToEvents(w, a.effects, "action", extra));
  }
  w.taper = 1;
  advanceTime(w, a.time ?? (improvised && r.checks.time !== undefined ? r.checks.time : r.clock.minutesPerAction), "action");
  const veils = new Set((opts.veils ?? []).map((v) => v.toLowerCase()));
  if (a.tags.some((t) => veils.has(t)))
    rec.veiled = true;
}
function contestTurn(w, rec, intent, opts) {
  const r = w.r;
  const t = builderOf(w);
  const c = w.s.contest;
  const kind = kindOf(r, c.kind);
  const cid = intent ? contestId(intent.actionId) : null;
  let res;
  if (cid === GIVE_IN) {
    rec.action = { id: GIVE_IN, label: "Give in", via: intent.via };
    res = because(w, `Gave in to ${c.opponent}`, () => giveIn(t));
  } else if (cid === BREAK_OFF) {
    rec.action = { id: BREAK_OFF, label: intent.label ?? "Break off", via: intent.via };
    res = because(w, `Tried to break off from ${c.opponent}`, () => breakOff(t, opts.seed));
  } else if (cid || !intent || intent.actionId.startsWith(IMPROV)) {
    const stat = cid ? cid.slice(CONTEST_PREFIX.length) : intent?.actionId.startsWith(IMPROV) ? intent.actionId.slice(IMPROV.length) : bestStat(r, w.s, kind);
    const a = cid ? contestAction(r, w.s, cid) : null;
    const clicked = intent && intent.via !== "adjudicator" ? intent.label ?? a?.label : undefined;
    rec.action = { id: `${CONTEST_PREFIX}${stat}`, label: clicked ?? `${kind.label}: ${r.stats[stat]?.label ?? (stat || "luck")}`, via: intent?.via ?? "adjudicator" };
    res = because(w, `${kind.label} with ${c.opponent}, round ${c.round + 1}`, () => contestRound(t, { stat, ...clicked ? { label: clicked } : {}, typed: !clicked }, opts.seed));
  } else {
    const found = findAction(r, w.s, intent.actionId);
    if (found)
      actionTurn(w, rec, intent, found.a, found.target, opts);
    const label = rec.action?.label ?? "something else";
    res = because(w, `Busy during the ${kind.label.toLowerCase()}`, () => busyRound(t, label));
  }
  if (res.check)
    rec.check = res.check;
  rec.beats = res.beats;
  advanceTime(w, 1, "action");
}
function gateOpen(g, w, ctx) {
  if (!g)
    return true;
  if (g.when && !evalBool(g.when, w.env(), false))
    return false;
  if (g.words) {
    const text = ctx?.text.toLowerCase() ?? "";
    if (!g.words.some((x) => text.includes(x)))
      return false;
  }
  if (g.actions) {
    const a = ctx?.action;
    if (!a)
      return false;
    const id = a.id.split(TARGET_SEP)[0].toLowerCase();
    if (!g.actions.some((x) => x === id || a.tags.includes(x)))
      return false;
  }
  return true;
}
function clampAbs(v, lim) {
  return Math.max(-lim, Math.min(lim, v));
}
function findPerson(r, s, key) {
  const k = String(key).trim().toLowerCase();
  if (!k)
    return null;
  const sl = slug(k);
  for (const [id, p] of Object.entries(s.people))
    if (id === k || id === sl || p.name.toLowerCase() === k)
      return id;
  for (const p of Object.values(r.people))
    if (p.id === k || p.id === sl || p.name.toLowerCase() === k)
      return p.id;
  const first = (n) => n.toLowerCase().split(/\s+/)[0];
  const hits = Object.entries(s.people).filter(([, p]) => first(p.name) === first(k));
  return hits.length === 1 ? hits[0][0] : null;
}
function bigMomentPerson(r, s, moments) {
  if (!r.relBigMoment || !Array.isArray(moments))
    return null;
  for (const name of moments) {
    if (typeof name !== "string")
      continue;
    const id = findPerson(r, s, name);
    if (!id)
      continue;
    const last = s.big?.[id];
    if (last === undefined || s.turn - last >= r.relBigMoment.cooldown)
      return id;
    return null;
  }
  return null;
}
function oneBand(def, cur, v) {
  const bands = def.bands.map((b) => b.at).sort((a, b) => a - b);
  if (!bands.length)
    return v;
  let i = 0;
  for (let k = 0;k < bands.length; k++)
    if (cur >= bands[k])
      i = k;
  if (v > 0 && i + 2 < bands.length)
    return Math.min(v, bands[i + 2] - 1 - cur);
  if (v < 0 && i - 1 >= 0)
    return Math.max(v, bands[i - 1] - cur);
  return v;
}
function applyProposal(r, before, p, ctx) {
  const w = new Working(r, cloneState(before), seededRng(`narrator:${before.turn}`));
  w.cause = "Read from the story";
  const src = "narrator";
  const t = builderOf(w);
  const scene = {};
  for (const person of p.people ?? []) {
    if (!person?.name)
      continue;
    const known = findPerson(r, w.s, person.name);
    if (known) {
      if (person.feelings)
        calibrate(w, known, person.feelings, src);
      if (typeof person.adult === "boolean" && w.s.adults[known] !== person.adult && r.people[known]?.age === undefined)
        w.push({ t: "adult", who: known, adult: person.adult, src });
      scene[known] = true;
      continue;
    }
    if (!r.peopleOpen)
      continue;
    const id = slug(person.id || person.name);
    if (!w.s.people[id])
      w.push({ t: "person", id, name: person.name, src });
    calibrate(w, id, person.feelings ?? {}, src);
    if (typeof person.adult === "boolean" && w.s.adults[id] !== person.adult)
      w.push({ t: "adult", who: id, adult: person.adult, src });
    scene[id] = true;
  }
  for (const [who, feelings] of Object.entries(p.feelings ?? {})) {
    const id = findPerson(r, w.s, who);
    if (id)
      calibrate(w, id, feelings ?? {}, src);
  }
  for (const [id, d] of Object.entries(p.stats ?? {})) {
    const def = r.stats[id];
    if (!def || def.narrator <= 0 || typeof d !== "number" || !Number.isFinite(d))
      continue;
    if (!gateOpen(def.gate, w, ctx))
      continue;
    const v = clampAbs(d, def.narrator);
    if (v !== 0)
      w.push({ t: "stat", id, d: v, src });
  }
  const big = bigMomentPerson(r, w.s, p.moments);
  let bigUsed = false;
  for (const [who, m] of Object.entries(p.rel ?? {})) {
    let id = findPerson(r, w.s, who);
    if (!id) {
      if (!r.peopleOpen)
        continue;
      id = slug(who);
      w.push({ t: "person", id, name: who, src });
    }
    for (const [stat, d] of Object.entries(m ?? {})) {
      const def = r.relStats[stat];
      if (!def || def.narrator <= 0 || typeof d !== "number" || !Number.isFinite(d))
        continue;
      if (!gateOpen(def.gate, w, ctx))
        continue;
      let v = clampAbs(d, def.narrator);
      if (id === big && r.relBigMoment && Math.abs(d) > def.narrator) {
        const cur = w.s.rel[id]?.[stat] ?? def.start;
        v = oneBand(def, cur, clampAbs(d, def.narrator * r.relBigMoment.factor));
        if (Math.abs(v) < def.narrator)
          v = clampAbs(d, def.narrator);
        else
          bigUsed = true;
      }
      if (v !== 0)
        w.push({ t: "rel", who: id, stat, d: v, src });
    }
  }
  if (big && bigUsed)
    w.push({ t: "big", who: big, src });
  for (const [key, d] of Object.entries(p.items ?? {})) {
    if (typeof d !== "number" || !Number.isFinite(d) || d === 0)
      continue;
    const k = key.toLowerCase();
    const declared = Object.values(r.items).find((i) => i.id === k || i.name.toLowerCase() === k);
    const held = Object.keys(w.s.items).find((id) => id === k || (w.s.itemNames[id] ?? "").toLowerCase() === k);
    const id = declared?.id ?? held ?? slug(key);
    if (!declared && !r.itemsOpen)
      continue;
    const n = Math.round(clampAbs(d, 10));
    if (n < 0 && !(w.s.items[id] > 0))
      continue;
    w.push({ t: "item", id, d: n, ...declared ? {} : { name: key }, src });
  }
  for (const [key, n] of Object.entries(p.used ?? {})) {
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0)
      continue;
    const k = key.toLowerCase();
    const id = Object.keys(w.s.items).find((i) => i === k || itemName(r, w.s, i).toLowerCase() === k);
    const item = id ? r.items[id] : undefined;
    const alreadyUsed = id && ctx?.action?.id.split(TARGET_SEP)[0] === `${ITEM_PREFIX}${id}` ? 1 : 0;
    const available = id && item && !item.keep && item.uses > 0 ? (w.s.uses[id] ?? item.uses) + Math.max(0, (w.s.items[id] ?? 0) - 1) * item.uses : 10;
    const count = Math.min(available, Math.max(0, Math.min(10, Math.round(n)) - alreadyUsed));
    if (id && item && !item.keep && item.uses > 0 && count > 0)
      w.push({ t: "use", id, n: count, src });
    const use = id ? r.items[id]?.use : undefined;
    if (id && use && !use.check && count > 0) {
      for (let useIndex = 0;useIndex < count; useIndex++)
        because(w, `${itemName(r, w.s, id)} used in the story`, () => effectToEvents(w, use.effects, src, {}));
    }
  }
  const placeWords = typeof p.place === "string" && p.place.trim() ? p.place.trim().slice(0, 120) : null;
  if (placeWords && placeWords.toLowerCase() !== (w.s.locationName ?? "").toLowerCase())
    w.push({ t: "move", to: placeId(placeWords), name: placeWords, src });
  for (const id of p.conditions?.add ?? []) {
    const def = r.conditions[id];
    if (def?.narrator && !w.s.conditions[id] && gateOpen(def.gate, w, ctx))
      w.push(condOn(w, id, null, src));
  }
  for (const id of p.conditions?.remove ?? []) {
    const def = r.conditions[id];
    if (def?.narrator && w.s.conditions[id] && gateOpen(def.gate, w, ctx))
      w.push({ t: "cond", id, on: false, src });
  }
  for (const [key, v] of Object.entries(p.flags ?? {})) {
    if (r.flags[key]?.narrator && gateOpen(r.flags[key].gate, w, ctx))
      w.push({ t: "flag", key, v, src });
  }
  if (typeof p.minutes === "number" && Number.isFinite(p.minutes) && p.minutes > 0) {
    advanceTime(w, Math.round(Math.min(p.minutes, r.clock.narratorMax)), src);
  }
  for (const [who, here] of Object.entries(p.scene ?? {})) {
    const id = findPerson(r, w.s, who);
    if (id && typeof here === "boolean")
      scene[id] = here;
  }
  const hereNow = new Set(presentPeople(r, w.s));
  for (const [id, here] of Object.entries(scene)) {
    if (!w.s.people[id])
      continue;
    if (hereNow.has(id) !== here)
      w.push({ t: "scene", who: id, here, src });
  }
  for (const [key, l] of Object.entries(p.looks ?? {})) {
    const who = key.trim().toLowerCase() === "you" ? "you" : findPerson(r, w.s, key);
    if (!who || !l || typeof l !== "object")
      continue;
    for (const field of ["appearance", "outfit"]) {
      if (!(field in l))
        continue;
      const v = l[field];
      const text = typeof v === "string" && v.trim() ? v.trim().slice(0, 160) : null;
      if (text !== (w.s.look?.[who]?.[field] ?? null))
        w.push({ t: "look", who, field, text, src });
    }
  }
  if (p.contest && typeof p.contest === "object" && !w.s.contest && r.conflict.fromStory) {
    because(w, "A contest broke out in the story", () => startContest(t, { kind: String(p.contest.kind ?? ""), opponent: String(p.contest.opponent ?? ""), threat: p.contest.threat }, src));
  }
  if (p.goals && typeof p.goals === "object")
    because(w, "Goals", () => storyGoalNews(t, p.goals, (name) => findPerson(r, w.s, name)));
  let remembered = 0;
  for (const [who, text] of Object.entries(p.memories ?? {})) {
    const id = findPerson(r, w.s, who);
    if (!id || typeof text !== "string" || !text.trim() || remembered >= 3)
      continue;
    w.push({ t: "memory", who: id, text: text.trim().slice(0, 200), src });
    remembered++;
  }
  if (r.growth.enabled && r.growth.train) {
    const gains = {};
    for (const key of (Array.isArray(p.train) ? p.train : []).slice(0, 2)) {
      const k = String(key).toLowerCase();
      const id = r.statOrder.find((s) => s === k || r.stats[s].label.toLowerCase() === k);
      if (id && (r.stats[id].kind === "skill" || r.stats[id].kind === "attribute"))
        gains[id] = (gains[id] ?? 0) + trainingGain(r, w.s, id, p.minutes);
    }
    if (Object.keys(gains).length)
      practise(t, gains, "Practice the story described");
  }
  w.cause = null;
  runTriggers(w, false);
  const lines = crossingLines(bandCrossings(r, before, w.s));
  if (lines.length)
    w.push({ t: "notice", text: `Since the last reply: ${lines.join(" ")}`, src: "world" });
  return w.events;
}
function builderOf(w) {
  return {
    r: w.r,
    get s() {
      return w.s;
    },
    seed: w.seed,
    push: (e) => w.push(e),
    env: (extra = {}) => w.env(extra),
    apply: (effect, src, extra = {}) => effectToEvents(w, effect, src, extra),
    time: (minutes, src) => advanceTime(w, minutes, src),
    announce: (text) => announce(w, text),
    modelOdds: (spec) => {
      const model = w.odds[spec.id];
      if (model)
        return normalize(model, spec.options.map((o) => o.id));
      if (!w.needs.some((n) => n.id === spec.id))
        w.needs.push(spec);
      return null;
    },
    roll: (id, ask, p, descs, source) => {
      const keys = Object.keys(p);
      const odds = normalize(p, keys);
      const picked = sample(odds, seededRng(`${w.seed}:roll:${id}`));
      w.decisions.push({ id, ask, picked, pickedDesc: descs[picked] ?? picked, p: odds, source, descs });
      return picked;
    }
  };
}
function buildTurn(r, before, seed, fn) {
  const w = new Working(r, cloneState(before), seededRng(`${seed}:fx`), seed);
  fn(builderOf(w));
  runTriggers(w, false);
  return w.events;
}
function fillTarget(w, text, extra) {
  let out = text;
  if (typeof extra.target === "string" && extra.target && out.includes("{target}"))
    out = out.replace(/\{target\}/g, personName(w.r, w.s, extra.target));
  const opp = w.s.contest?.opponent ?? w.s.lastContest?.opponent;
  if (opp && out.includes("{opponent}"))
    out = out.replace(/\{opponent\}/g, opp);
  return out;
}
function calibrate(w, who, feelings, src) {
  if (w.s.calibrated[who])
    return;
  let read = false;
  for (const [stat, v] of Object.entries(feelings)) {
    const def = w.r.relStats[stat];
    if (!def || def.narrator <= 0 || typeof v !== "number" || !Number.isFinite(v))
      continue;
    read = true;
    const value = Math.max(def.min, Math.min(def.max, v));
    if (value !== (w.s.rel[who]?.[stat] ?? def.start))
      w.push({ t: "rel", who, stat, set: value, src });
  }
  if (read)
    w.push({ t: "calib", who, src });
}

// node_modules/warp/src/engine/adults.ts
var ADULT_TAGS = new Set(["sexual", "sex", "nsfw", "lewd", "explicit", "erotic", "smut", "romance", "romantic"]);
function isAdult(r, s, who) {
  const age = who === "you" ? r.you.age : r.people[who]?.age;
  if (age !== undefined && Number.isFinite(age))
    return age >= 18;
  const known = s.adults?.[who];
  return known === undefined ? null : known;
}
function adultGated(tags) {
  return tags.some((t) => ADULT_TAGS.has(t.toLowerCase()));
}

// node_modules/warp/src/engine/lint.ts
var ROMANTIC_WORDS = new RegExp([
  String.raw`\b(?:confess\w*|kiss\w*|flirt\w*|seduc\w*|romanc\w*|romantic\w*|cuddl\w*|caress\w*|smooch\w*|make out|making out|ask (?:her|him|them|\{\{?target\}?\}) out|go on a date|first date|date night|sleep with|propos(?:e|al) (?:marriage|to))\b`,
  "고백|키스|입맞춤|뽀뽀|플러팅|유혹|데이트|스킨십|애무|연애|청혼|프러포즈",
  "告白|キス|口説|デート|イチャ"
].join("|"), "i");
function untaggedRomance(a) {
  if (!a.perPerson || adultGated(a.tags))
    return false;
  return ROMANTIC_WORDS.test([a.label, a.desc ?? "", a.say ?? ""].join(" "));
}
var FUNCTIONS = [
  "has",
  "count",
  "flag",
  "cond",
  "rel",
  "met",
  "present",
  "between",
  "roll",
  "goal",
  "secret",
  "in_contest",
  "eff",
  "gear",
  "min",
  "max",
  "clamp",
  "floor",
  "ceil",
  "round",
  "abs"
];
var REMOVED_FORMULAS = {
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
  season: "seasons",
  month: "the calendar in formulas",
  date: "the calendar in formulas",
  indoors: "places",
  outside: "places",
  location: "place ids (use place, the words)",
  "at()": "place ids (use place == 'The docks')",
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
  "days_until()": "bills and debts",
  "age()": "ages in formulas",
  "memories()": "memory counts",
  "cond_of()": "conditions on others",
  "foe_cond()": "encounters",
  "stat_max()": "max formulas in checks",
  "foe_max()": "encounters",
  encounter: "encounters (use in_contest)",
  encounter_round: "encounters (use round)",
  "quest()": "quests (use goal())",
  "quest_active()": "quests (use goal())",
  "quest_done()": "quests (use goal())",
  "quest_failed()": "quests (use goal())",
  "quests_done()": "quests",
  foe: "encounters"
};
var REMOVED_FORMULA_NAMES = Object.keys(REMOVED_FORMULAS).map((k) => k.replace(/\(\)$/, ""));
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
function lintRuleset(r) {
  const issues = [];
  const s = initialState(r);
  const names = [...r.statOrder, ...Object.keys(r.flags), ...BUILTIN_NAMES];
  const people = Object.keys(r.people);
  const warn = (where, message) => issues.push({ level: "warning", where, message });
  const check = (src, where, extra = {}) => {
    if (src === undefined || typeof src === "number")
      return;
    if (difficultyOf(src))
      return;
    const base = makeEnv(r, s, extra);
    const badKind = new Set;
    const env = { lookup: base.lookup, call: (n, a) => {
      if (n === "in_contest" && a.length && !r.conflict.kinds[String(a[0])])
        badKind.add(String(a[0]));
      if (n === "goal" && a.length && !r.goals.list[String(a[0])] && !String(a[0]).startsWith("story_"))
        badGoal.add(String(a[0]));
      return n === "roll" ? 1 : base.call?.(n, a);
    } };
    const badGoal = new Set;
    const unknown = new Set;
    try {
      evaluate(src, env, { unknown });
    } catch {
      return;
    }
    for (const m of String(src).matchAll(/\b(eff|gear)\(\s*['"]([^'"]+)['"]/g)) {
      const [, fn, id] = m;
      if (!r.stats[id])
        warn(where, `${fn}('${id}'): "${id}" isn't a stat${suggest(id, r.statOrder)}`);
    }
    for (const u of unknown) {
      const gone = REMOVED_FORMULAS[u];
      const msg = gone ? `"${u}" (${gone}) was removed from Warp, so it always reads as 0. The old version is on the \`legacy\` branch.` : u.endsWith("()") ? `"${u}" isn't a known function (${FUNCTIONS.join(", ")})` : `"${u}" isn't a stat, flag or clock value${suggest(u, [...names, ...Object.keys(extra)])}`;
      warn(where, msg);
    }
    for (const id of badKind)
      warn(where, `in_contest('${id}'): "${id}" isn't a contest kind${suggest(id, Object.keys(r.conflict.kinds))}`);
    for (const id of badGoal)
      warn(where, `goal('${id}'): "${id}" isn't a goal in goals.list${suggest(id, Object.keys(r.goals.list))}`);
  };
  const checkEffect = (e, where, extra = {}) => {
    for (const [id, v] of Object.entries(e.stats)) {
      if (!r.stats[id])
        warn(where, `changes "${id}", which isn't a stat${suggest(id, r.statOrder)}`);
      check(v, `${where} › ${id}`, extra);
    }
    for (const [id, v] of Object.entries(e.set)) {
      if (!r.stats[id])
        warn(where, `sets "${id}", which isn't a stat${suggest(id, r.statOrder)}`);
      check(v, `${where} › set › ${id}`, extra);
    }
    for (const [who, m] of Object.entries(e.rel))
      for (const [stat, v] of Object.entries(m)) {
        if (!r.relStats[stat])
          warn(where, `"${stat}" isn't a relationship stat${suggest(stat, r.relStatOrder)}`);
        check(v, `${where} › ${who} › ${stat}`, extra);
      }
    for (const id of Object.keys(e.addConditions)) {
      if (!r.conditions[id])
        warn(where, `adds condition "${id}", which isn't declared under conditions:${suggest(id, Object.keys(r.conditions))}`);
    }
    for (const d of e.decide)
      for (const o of d.options) {
        check(o.when, `${where} › decide › ${d.id} › ${o.id} › when`, extra);
        checkEffect(o.effect, `${where} › decide › ${d.id} › ${o.id}`, extra);
      }
    for (const id of e.reveal)
      if (!r.secrets[id])
        warn(where, `reveals secret "${id}", which doesn't exist${suggest(id, Object.keys(r.secrets))}`);
    for (const id of Object.keys(e.goal))
      if (!r.goals.list[id])
        warn(where, `"${id}" isn't a goal in goals.list${suggest(id, Object.keys(r.goals.list))}`);
    for (const who of Object.keys(e.look))
      if (who !== "you" && who !== "target" && who !== "opponent" && !r.people[who])
        warn(where, `"${who}" isn't "you" or a person in relationships › people${suggest(who, people)}`);
    if (e.contest) {
      if (r.style === "story")
        warn(where, "story rulesets don't run contests — `contest:` is ignored");
      else if (!r.conflict.kinds[e.contest.kind])
        warn(where, `starts contest kind "${e.contest.kind}", which isn't under conflict.kinds${suggest(e.contest.kind, Object.keys(r.conflict.kinds))}`);
    }
    check(e.swing, `${where} › swing`, extra);
    for (const who of Object.keys(e.remember))
      if (who !== "target" && who !== "opponent" && !r.people[who])
        warn(where, `"${who}" isn't a person to remember it${suggest(who, people)}`);
  };
  for (const id of r.statOrder)
    check(r.stats[id].maxExpr, `Stats › ${id} › max`);
  for (const id of r.statOrder)
    check(r.stats[id].startExpr, `Stats › ${id} › start`);
  const checkCost = (a, w, extra) => {
    const env = makeEnv(r, s, extra);
    for (const [id, v] of Object.entries(a.cost.stats)) {
      try {
        if (!Number.isFinite(costValue(r, s, id, v, env)))
          warn(`${w} › cost › ${id}`, `"${v}" doesn't work out to a number`);
      } catch (e) {
        warn(`${w} › cost › ${id}`, `"${v}" can't be worked out (${e instanceof Error ? e.message : String(e)}) — use a number, a share of the max like "-15%", or a formula`);
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
      const miss = (what, pool) => warn(`${w} › requires`, `"${id}" isn't ${what}${suggest(id, pool)}`);
      if ((q.kind === "with" || q.kind === "rel") && !r.people[id])
        miss("a person", people);
      if (q.kind === "has" && !r.items[id] && !r.itemsOpen)
        miss("an item", Object.keys(r.items));
      if (q.kind === "goal" && !r.goals.list[id])
        miss("a goal in goals.list", Object.keys(r.goals.list));
      if (q.kind === "flag" && !r.flags[id])
        miss("a flag", Object.keys(r.flags));
      if (q.kind === "rel" && !r.relStats[q.stat ?? ""])
        warn(`${w} › requires`, `"${q.stat}" isn't a relationship stat${suggest(q.stat ?? "", r.relStatOrder)}`);
    }
  };
  for (const a of Object.values(r.actions))
    checkRequires(a, `Actions › ${a.id}`);
  for (const c of Object.values(r.conditions)) {
    const w = `Conditions › ${c.id}`;
    for (const [k, v] of Object.entries(c.bonus)) {
      if (!r.stats[k])
        warn(`${w} › bonus`, `"${k}" isn't a stat${suggest(k, r.statOrder)}`);
      check(v, `${w} › bonus › ${k}`);
    }
  }
  for (const it of Object.values(r.items))
    for (const [k, v] of Object.entries(it.bonus))
      check(v, `Items › ${it.id} › bonus › ${k}`);
  for (const id of r.statOrder)
    if (r.stats[id].perHourExpr && !/%\s*$/.test(r.stats[id].perHourExpr))
      check(r.stats[id].perHourExpr, `Stats › ${id} › per_hour`);
  for (const t of r.triggers) {
    check(t.when, `Triggers › ${t.id} › when`);
    checkEffect(t.effects, `Triggers › ${t.id}`);
  }
  for (const id of r.hud.bars)
    if (!r.stats[id])
      warn("HUD › bars", `"${id}" isn't a stat`);
  for (const sec of Object.values(r.secrets))
    sec.stages.forEach((st, i) => check(st.when, `Secrets › ${sec.id} › stage ${i + 1} › when`));
  check(r.liveChoices.when, "Live choices › when");
  for (const a of Object.values(r.liveChoices.tags))
    checkAction(a, `Live choices › tags › ${a.id}`);
  const romanceHint = "looks romantic. If it is, add `tags: [romance]` so Warp offers it only toward someone known to be an adult.";
  for (const a of Object.values(r.actions))
    if (untaggedRomance(a))
      warn(`Actions › ${a.id}`, `"${a.label}" ${romanceHint}`);
  for (const a of Object.values(r.liveChoices.tags))
    if (untaggedRomance(a))
      warn(`Live choices › tags › ${a.id}`, `"${a.id}" (${a.desc ?? a.label}) ${romanceHint}`);
  for (const id of r.checks.stats)
    if (r.stats[id] && r.stats[id].kind !== "attribute" && r.stats[id].kind !== "skill")
      warn("Checks › stats", `"${id}" is a ${r.stats[id].kind}: typed attempts lean on attributes and skills`);
  for (const k of Object.values(r.conflict.kinds)) {
    const w = `Conflict › kinds › ${k.id}`;
    for (const [tier, e] of Object.entries(k.cost))
      if (e)
        checkEffect(e, `${w} › cost › ${tier}`);
    checkEffect(k.won, `${w} › won`);
    checkEffect(k.lost, `${w} › lost`);
    checkEffect(k.escaped, `${w} › escaped`);
  }
  for (const g of Object.values(r.goals.list)) {
    const w = `Goals › ${g.id}`;
    check(g.doneWhen, `${w} › done_when`);
    check(g.failWhen, `${w} › fail_when`);
    checkEffect(g.reward, `${w} › reward`);
    if (!g.doneWhen && !g.judge)
      warn(w, "has no `done_when:` or `judge:`, so only a `goal: { " + g.id + ": done }` effect can close it");
  }
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
var PART_LABELS = ["core", "stats", "people", "world", "actions", "story", "conflict"];
var PART_OF_KEY = {
  name: "core",
  description: "core",
  style: "core",
  clock: "core",
  start: "core",
  hud: "core",
  narration: "core",
  stats: "stats",
  growth: "stats",
  practice: "stats",
  checks: "stats",
  improvise: "stats",
  improvised: "stats",
  relationships: "people",
  people: "people",
  you: "people",
  player: "people",
  items: "world",
  inventory: "world",
  conditions: "world",
  flags: "world",
  actions: "actions",
  secrets: "story",
  live_choices: "story",
  goals: "story",
  triggers: "story",
  rules: "story",
  conflict: "conflict"
};
var PART_CONTENTS = {
  core: "name, description, style, clock, start, hud, narration",
  stats: "stats, growth, checks",
  people: "relationships (stats, big_moment, people), you",
  world: "items, inventory, conditions, flags",
  actions: "actions",
  story: "goals, secrets, live_choices, triggers",
  conflict: "conflict"
};
function partForIssue(where) {
  const w = where.replace(/^warp-ruleset\s*·\s*/i, "");
  const head = w.split(/[›,]/)[0].trim().toLowerCase();
  if (PART_LABELS.includes(head))
    return head;
  return PART_OF_KEY[head.replace(/\s+/g, "_")] ?? "core";
}
var REFERENCE = `WARP RULESET FORMAT 2 (YAML). One file, or one lorebook entry per part ("warp-ruleset · core", "· stats", …).
Ids are snake_case. Numbers may be formulas in quotes ("10 + body"). Quote any formula that contains a comma. {{user}} is the player.

--- # core
name: Harbour Nights                  # shown on the panel; description: one line about it
description: A fishing town where the tide brings secrets.
style: adventure                      # story = no dice anywhere (no check:, no typed rolls, no conflict:) | adventure = d20 checks at risky moments, contests
clock:
  start: greeting                     # read the time (and the day) from the greeting; or a fixed start: "Day 1 07:30", "Mon 07:30"
  fallback: "Day 1 09:00"             # used when the greeting gives no time
  date: "Sep 4"                       # optional calendar date of day 1 (or greeting)
  minutes_per_action: 10              # what a move takes unless it says time:
  narrator_max: 480                   # the most minutes the story may skip in one reply
  # weekdays: [Mon, Tue, …]; enabled: false turns the clock off
start: { place: greeting, items: { phone: 1 }, money: 50, stats: { mood: 70 } }   # place: greeting or words ("The Rusty Anchor"); later places come from the story
hud: { currency: "$", bars: [health, energy, mood] }   # currency: "$" (before), "{n}d" / "£{n}" (template) or { symbol: d, after: true }; bars: the meters on the panel
narration: { notes: "Guidance for the narrator, in a line or two.", numbers: false }   # numbers: true shows numbers next to band words

--- # stats
stats:                                # kinds: meter (a bar) | attribute | skill | money | hidden
  health: { kind: meter, narrator: 20, bands: { 0: Near collapse., 25: Badly hurt., 80: Healthy. } }
  energy: { kind: meter, per_hour: -4, narrator: 15 }      # per_hour: drift (a number, a formula or "+2%" of the max)
  stress: { kind: meter, good: low, start: 0, narrator: 10, narrator_words: [panic, scared] }
  mood:
    kind: meter
    start: 60                         # a number, full, "50%" of the max, or a formula
    bands:                            # short form "25: Low." or the long form:
      25: { text: Low., say_down: "Your spirits sink." }   # say: a story line when the value enters this band from below; say_down: from above
      75: { text: In good spirits., say: "Things are looking up." }
  money: { kind: money, narrator: 100 }
  body: { kind: attribute, max: 10, start: 3, desc: "Strength, speed, endurance." }
  mind: { kind: attribute, max: 10, start: 3 }
  charm: { kind: attribute, max: 10, start: 3 }
  cooking: { kind: skill, max: 100, start: 5, grades: [F, D, C, B, A, S], group: Skills }   # group: the panel heading
  # good: high | low | none (colours); min/max (max may be a formula, "20 + body * 5"); label:, desc:, color:
  # narrator: the most the story may move it per reply (0 = only the rules move it); gates on what the story may change:
  #   narrator_when: "not in_contest", narrator_words: [panic] (the exchange must mention one), narrator_actions: [fight] (action ids or tags)
  # show: text | number | both | hidden; bands: { 0%: Down., 40%: Wounded. } compare against the current max
  # skills and attributes grow with use: every check that leans on them adds progress; growth: 0 on a stat stops it, growth: 2 doubles it
growth: { rate: 1, attributes: 0.5, train: true }   # or growth: false; repeat: { step: 0.5, floor: 0.1, recover_minutes: 120, recover_turns: 8 } tapers repeated practice
checks:                               # adventure only: the one check style, d20 + a modifier vs a difficulty
  dc: { easy: 8, fair: 12, hard: 16, extreme: 20 }   # difficulty words → d20 target (normal = fair)
  partial: 3                          # missing by 3 or less is a partial success (it works, at a cost)
  typed: true                         # risky, contested things the player types are rolled (never quoted dialogue)
  stats: [body, mind, charm]          # what a typed attempt may lean on (default: every attribute and skill)
  bonus: 10                           # what a maxed stat adds (body 3/10 adds +3)
  time: 10                            # minutes a typed attempt takes (default minutes_per_action)
  directions: { fail: "It doesn't work, and the situation changes." }   # the narrator's direction per tier (defaults exist: fail forward)
  outcomes: { fail: { energy: -5 }, crit_fail: { health: -10 } }       # effects of typed attempts per tier
  # checks: false = typed messages are never rolled

--- # people
relationships:
  open: true                          # track anyone the story introduces (their first feelings are read from the story)
  big_moment: { factor: 3, cooldown: 10 }   # a rescue, betrayal or confession may move one person past the cap (× factor, one band at most), once per cooldown turns; or false
  stats:
    trust:
      start: 20
      narrator: 4                     # slow burn: at most 4 per reply
      bands:
        0: { text: Wary, say_down: "{name} is wary of you again.", voice: "{name} gives nothing personal away." }
        40: { text: Open, say: "{name} is starting to open up.", voice: "{name} shares small personal things when asked." }
        # voice: how this person speaks and acts toward {{user}} while in this band; {name} = the person
  people:
    jo:
      name: Jo
      age: 31                         # declare adult ages (an unknown age is asked once, never assumed)
      desc: Runs the café.
      appearance: "tall, grey braid"  # looks and clothes as short text (≤160 chars); empty = read from the greeting and the story
      outfit: "flour-dusted apron"
      start: { trust: 35 }            # starting feelings (absent = read from the story the first time they appear)
you: { name: Sam, age: 24, appearance: "short, freckles", outfit: "grey hoodie" }   # all optional: empty = read from the persona and the greeting

--- # world
items:
  phone: Phone
  rope: { name: Rope, desc: "Thirty feet of it.", tags: [tool], keep: true }   # keep: using it doesn't spend it
  medkit:
    name: Medkit
    uses: 3                           # uses per item; the last use spends it (tags: [consumable] = 1 use)
    use: { label: Patch yourself up, time: 15, health: +20 }   # what using it does: an action like any other (check:, success:, when:, why_not: …)
  lucky_charm: { name: Lucky Charm, bonus: { charm: 1 } }      # gear: added to every check on that stat while carried (a number or a formula)
inventory: { open: true }             # open: false = the story can't hand out items the ruleset doesn't list
conditions:
  exhausted: { label: Exhausted, tone: bad, desc: "-2 to every check.", bonus: { body: -2, mind: -2 }, lasts: 8h }   # tone: good | warn | bad | neutral; lasts: absent = until removed; narrator: true lets the story add or remove it
flags:
  met_boss: { start: false, narrator: true }   # narrator: true = the story may set it

--- # actions
actions:                              # the small authored moves, shown in one "More" row and in a person's row
  rest: { label: Rest a while, say: "*I take some time to rest.*", time: 60, effects: { energy: +25 } }
  sleep: { label: Sleep, when: "between(hour, 21, 5)", why_not: "Not tired yet", time: 480, effects: { energy: +100 } }
  pick_lock:
    label: Pick the lock
    say: "*I kneel and work the lock.*"   # the line posted as the player's message
    when: "has('lockpick')"           # shown only while it holds (why_not: "…" shows it locked instead)
    cost: { energy: -5 }              # paid first, whatever happens; a cost it can't pay locks the choice
    check: { vs: hard, add: body, label: Body }   # vs: easy | fair | hard | extreme | a number | a formula; add: the modifier (a formula); partial: 2
    success: { flags: { door_open: true } }
    fail: { hint: "The pick snaps; someone heard." }
    # tiers: crit_success, success, partial, fail, crit_fail (or outcomes: { … }); a natural 20 is a critical success, a natural 1 a critical failure
    # effects: next to a check always apply; without a check, effects: is what the action does
    tags: [crime]                     # content tags for Lines & Veils; romance / romantic / sexual also mean adults only: such a move toward someone is offered only when they are known to be an adult (tag every romantic move)
  talk:
    label: Talk with {target}
    per_person: true                  # one button per person here, in their row; {target} / target = that person
    effects: { rel: { target: { trust: +2 } } }
  # targets: [jo] (per person, only these); hidden: true (never a button); params: { difficulty: { easy: 8, hard: 16 } }
  # requires: { body: 5, with: jo, has: rope, rel: { jo: { trust: 40 } }, goal: find_sister, flag: door_open, when: { "hour >= 20": "After dark" } }
  #   shown locked with what's missing ("Needs Body 5, Jo with you"); show_locked: false hides it instead
  # Story rulesets: no check: (an action runs its effects:)

--- # story
goals:
  from_story: true                    # promises, favours and plans the story makes are tracked (judged after each reply)
  max: 3                              # open at once
  list:                               # optional authored goals; they start open
    find_sister: { text: "Find out what happened to your sister", done_when: "flag('sister_found')", judge: "{{user}} learns where their sister is", stakes: "She may not survive the winter", reward: { mood: +10 } }
    # fail_when: a formula; judge_fail: plain words judged by the story
secrets:                              # only opened stages reach the narrator: what isn't in the prompt can't leak
  past:
    person: jo                        # who it is about (an id in relationships.people); about: "The old mill" for a place or thing
    tell: exists                      # the narrator knows there is more, and deflects instead of inventing
    cue: "Jo changes the subject when her hometown comes up."   # known from the start: behaviour, never the reason
    stages:                           # a ladder: each opens in order, never closes
      - { band: { trust: Open }, text: "Jo left her hometown after a fire she blames herself for." }   # band: opens when the person reaches that band
      - { when: "rel('jo', 'trust') >= 65 and flag('saw_photo')", text: "Her brother died in that fire.", lore: [Lorebook entry title] }
live_choices:                         # 3 choices written for each reply; each carries one of these tags, and the TAG decides what happens
  count: 3
  guide: "Three moves that differ in risk: one safe, one fair, one hard."
  taper: { step: 0.75, floor: 0.1 }   # the same tag on the same person again soon gives less (× 1 / (1 + step × repeats), never below floor); or false
  # label: Right now; when: "not in_contest"
  tags:
    bold: { desc: "A daring, physical or risky move", check: { add: body, label: Body }, success: { mood: +3 }, fail: { health: -5, hint: "It goes wrong in a new way." } }
    # a tag check without vs: takes the difficulty word the writer gives the choice (none = no roll), so the odds follow the words
    charm: { desc: "Persuading someone here", per_person: true, check: { add: charm, label: Charm }, success: { rel: { target: { trust: +3 } } } }
    kind: { desc: "Something kind toward someone here (no roll)", per_person: true, effects: { rel: { target: { trust: +2 } } } }
    careful: { desc: "The cautious option (no roll)" }
triggers:
  exhausted: { when: "energy <= 0", do: { add_condition: [exhausted], hint: "{{user}} is running on empty." } }   # fires once when it becomes true
  drain: { when: "stress >= 80", repeat: true, do: { energy: -2 } }   # every turn while true
  danger: { when_scene: "{{user}} is in immediate danger", do: { stress: +5 } }   # plain words, judged after the reply; fires on the next turn

--- # conflict
conflict:                             # adventure only: fights, chases and arguments on one momentum gauge (−100 … +100)
  from_story: true                    # a fight, chase or argument in the story starts a contest (or the effect contest:)
  rounds: { min: 3, max: 8 }          # each check swings the gauge; only a full swing (or Break off / Give in) ends it
  escalate: 0.4                       # the stakes rise each round
  swing: { crit_success: 50, success: 35, partial: 15, fail: -35, crit_fail: -50 }
  kinds:
    fight:
      label: Fight
      stats: [body, mind]             # what a move may lean on
      escape: body                    # the stat Break off rolls
      cost: { partial: { health: -3 }, fail: { health: -8 }, crit_fail: { health: -15 } }   # what the opponent's pressure costs per round
      won: { mood: +5, hint: "{opponent} is beaten or yields." }
      lost: { health: -10, hint: "{{user}} is beaten, hurt but alive." }
      escaped: { energy: -10, hint: "{{user}} gets away." }
    argument: { label: Argument, stats: [charm, mind], escape: charm, cost: { fail: { mood: -4 } }, won: { hint: "{opponent} gives in." }, lost: { hint: "{{user}} has to give ground." }, escaped: { hint: "{{user}} walks away." } }

EFFECTS (any effects / success / fail / cost / do / reward / won block):
  stat shorthand: energy: -5 (or a quoted formula: money: "-min(money, 20)"); stats: { energy: -5 }; set: { stress: 50 }
  flags: { door_open: true }; give: rope / take: rope; items: { rope: 2 }
  rel: { jo: { trust: +3 } } (rel: { target: … } in a per-person move; rel: { opponent: … } in a contest)
  place: "The docks" (where {{user}} is now, in words); time: 30 (minutes pass)
  look: { you: { outfit: "a borrowed coat" }, jo: { appearance: "a bruise on her cheek" } }
  add_condition: [exhausted] or { exhausted: 120 }; remove_condition: [exhausted]
  hint: "a direction for the narrator"; remember: { jo: "{{user}} paid for her drink." } (something a person remembers)
  reveal: [past] (opens a secret's next stage); goal: { find_sister: done } (start | done | fail)
  contest: { kind: fight, with: "the bouncer", threat: hard } (starts a contest); swing: +20 (moves a running contest's gauge)
  decide: { ask: "How does Jo react?", options: { agrees: { desc: "She agrees", weight: 2, rel: { jo: { trust: +2 } } }, refuses: { desc: "She refuses", weight: 1 } } }
    (an uncertain reaction the engine rolls on the decision model's odds; options may have when:)

FORMULA NAMES: every stat id, every flag id, minutes, hour, minute, day, weekday, turn, place (the words), round, momentum, in_contest,
target (the person of a per-person move), target.<rel stat>, <person>.<rel stat>, items.<id>, flags.<id>.
FUNCTIONS: has(item[, n]), count(item), flag(x), cond(x), rel(person, stat), met(person), present(person) (in the scene now),
between(v, lo, hi) (wraps: between(hour, 21, 5)), roll('2d6') (in effects), goal(id) ('' | 'open' | 'done' | 'failed'), secret(id) (stages known),
in_contest() / in_contest('fight'), eff(stat) (with gear and conditions), gear(stat) (gear alone), min, max, clamp, floor, ceil, round, abs.
Operators: + - * / % < <= > >= == != and or not, a ? b : c. Strings in single quotes.

NOT IN WARP ANY MORE (ignored with a warning; the old version is on the legacy branch): encounters (use conflict:), quests (use goals:),
locations and travel (places come from the story), weather, wardrobe slots and body parts (use appearance / outfit text), perks, feats, codex,
abilities, fronts and random events (use triggers with when_scene:), bills and jobs, companions and schedules, checkpoints and endings,
dungeons, dating, minigames, d100 and PbtA checks (every check is d20 vs a difficulty).
`;
var DESIGN_GUIDE = `WARP DESIGN GUIDE: what makes a ruleset worth playing.
Warp keeps score under a roleplay chat: time and place, who is here and how they feel about {{user}}, risky moments the narrator can't
fudge. A good ruleset is small. Every piece changes what the player decides, how the people act, or what a roll means.

## the core loop
Two styles. Story (no dice): feelings, time, place, goals and secrets; nothing is rolled. Adventure (dice): everything in Story, plus d20
checks at risky, contested moments and contests on one momentum gauge. Pick one; never mix in systems the format doesn't have.

## stats
Few stats, each wired: a source (what raises it), a sink (what lowers it) and a consequence (a check, a trigger or a band line that reads it).
Meters in words: give bands, so the narrator and the panel speak in words ("Badly hurt."), and a say:/say_down: line on the bands that matter.
Attributes and skills grow when checks lean on them; never build "+1 Body" buttons.
Mistake: ten meters that only the narrator touches.

## people
Two or three relationship stats with bands. Slow burn: narrator: 4 or 5 per reply, and big_moment for rescues, betrayals and confessions.
Every band past the start gets a say: line (shown when it is crossed) and the bands that matter get a voice: (how the person speaks then),
so a crossing changes the next reply. Give the card's people starting feelings that match the card, and appearance/outfit if the card says.
For a romance, add a third stat (attraction, good: none). Keep everyone an adult, and say so with age:.

## checks
Roll only what is risky and contested; plain talk and ordinary actions never roll. The difficulty word sets the target (easy 8, fair 12,
hard 16, extreme 20); a stat adds its share of checks.bonus. Every failure needs a direction that changes the situation (a hint: or the
default): no identical retry, no wasted turn. Partial = it works, at a cost.

## choices
Live-choice tags differ in risk and payoff: one safe, one fair, one hard. Tag checks have no vs: so the odds follow the written words.
A no-roll tag that improves a relationship stays small (+2) and the taper makes repeating it pay less; a rolled tag pays more.
Mistake: a "kind" tag that beats every other choice, so the player clicks it forever.

## conflict
Contest kinds for what the card actually has: a fight, a chase, an argument, a duel, a debate. Each kind leans on two stats, names an
escape stat, and costs something real per round (cost:), with won/lost/escaped outcomes that change the story. No foe stats: the
opponent is whoever the story brings.

## goals
Let the story make goals (from_story: true). Author at most one or two that the card promises, with stakes: and a way to finish them
(done_when: a formula, or judge: plain words). A reward: makes finishing matter.

## secrets
For each person who hides something: a cue: (behaviour, never the reason), tell: exists, then two stages opened by band (band: { trust: Open },
then a deeper band). The narrator only learns what is opened, so the reveal is earned.

## items
Every item does something: a use: (an action), a bonus: (gear for the checks on a stat), or a move that needs it (when: "has('rope')").
Consumables get uses:, tools get keep: true. Give the player a way to get each item that matters.

## conditions
A condition changes play: a bonus: (or a penalty) on checks, a trigger that reads it, or an action it opens or closes. Each needs a cause
(add_condition) and a cure or lasts:.

## money
Money needs income (paid work, rewards, the story) and spending (actions that cost it). If either is missing it is just a number.
Set hud.currency to fit the setting (gold, credits, ¥).

## finishing
Prefer fewer pieces with stronger links. Done when every stat, item and condition does something, the choices differ in risk, a failure
always changes the next decision, and nothing names a system Warp doesn't have.
`;

// node_modules/warp/src/engine/rulebook.ts
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
    return i >= 0 ? i : 99;
  };
  return parts.map((p) => ({ ...p, yaml: `${p.yaml.trim()}
` })).sort((a, b) => rank(a.label) - rank(b.label));
}
function joinRulebook(parts, title) {
  const head = [
    `# Warp rulebook — ${title}`,
    '# Each document below is one section of the ruleset (a lorebook entry named "warp-ruleset · <section>").',
    "# Edit it anywhere, then import it back with Warp Studio (https://github.com/japolino/warp-studio)."
  ].join(`
`);
  return `${head}
${parts.map((p) => `--- # ${p.label}
${p.yaml.trim()}
`).join(`
`)}`;
}
// node_modules/warp/src/engine/templates/story.ts
var story = {
  id: "story",
  name: "Story",
  blurb: "Time, place, who is here and how they feel about you, with slow-burn relationships and goals from the story. Nothing is rolled. Fits any card.",
  parts: [
    {
      label: "core",
      yaml: `# Warp ruleset. This lorebook is never sent to the model; Warp reads it directly.
name: Story
description: A story that keeps score of feelings, time and place. No dice.
style: story                 # no rolls anywhere; typed messages are never read for actions

clock:
  start: greeting            # read the time (and day, if given) from the greeting
  fallback: "Day 1 18:00"    # used when the greeting gives no time at all
  minutes_per_action: 15
  narrator_max: 720          # the story may skip up to 12 hours per reply

start:
  place: greeting            # read the place from the greeting; later places come from the story

narration:
  notes: >-
    Let feelings grow or cool only as fast as the relationship lines say: a slow burn,
    shown through behaviour (what they notice, remember, choose to say or leave unsaid).
    Never decide {{user}}'s feelings, words or actions. Each person has their own life,
    moods and limits. Intimacy is mutual and only between adults.
`
    },
    {
      label: "people",
      yaml: `relationships:
  open: true                 # anyone the story introduces is tracked; first feelings are read from the story
  big_moment: { factor: 3, cooldown: 10 }   # a rescue, betrayal or confession may move up to 3x the cap, once per 10 turns per person
  stats:
    affection:
      start: 10
      narrator: 4            # at most 4 per reply: no "strangers to in love" in two messages
      bands:
        0:  { text: Cold,    say_down: "{name} has gone cold on you.", voice: "{name} is curt with {{user}}: short answers, no warmth." }
        10: { text: Neutral, say: "{name} has thawed a little.", say_down: "{name} has cooled toward you.", voice: "{name} is polite with {{user}}, no more." }
        25: { text: Warm,    say: "{name} is warming to you.", say_down: "{name} has pulled back a little.", voice: "{name} relaxes around {{user}}: small jokes, first names." }
        45: { text: Fond,    say: "{name} is fond of you now.", say_down: "{name} is still fond of you, but more careful.", voice: "{name} seeks {{user}} out and remembers small things they said." }
        65: { text: Smitten, say: "{name} can't hide how much they like you.", say_down: "{name}'s feelings for you have cooled a little.", voice: "{name} gets flustered near {{user}} and finds reasons to stay close." }
        85: { text: In love, say: "{name} has fallen for you.", voice: "{name} is openly tender with {{user}} and puts them first." }
    trust:
      start: 15
      narrator: 4
      bands:
        0:  { text: Guarded,  say_down: "{name} doesn't trust you any more.", voice: "{name} gives nothing personal away and watches {{user}} closely." }
        20: { text: Wary,     say: "{name} lets their guard down a little.", say_down: "{name} is wary of you again.", voice: "{name} answers {{user}} but keeps personal things back." }
        40: { text: Open,     say: "{name} is starting to open up.", say_down: "{name} is more careful with you now.", voice: "{name} shares small personal things when asked." }
        65: { text: Trusting, say: "{name} trusts you.", say_down: "{name}'s faith in you has been shaken.", voice: "{name} asks {{user}} for help and tells the truth even when it costs." }
        85: { text: Devoted,  say: "{name} would trust you with anything.", voice: "{name} confides fears and secrets without being asked." }
  # For a romance, the builder adds a third stat:
  # attraction: { start: 0, narrator: 6, good: none, bands: { 0: { text: No spark, say_down: "The spark between you and {name} has gone out." }, 15: { text: Curious, say: "{name} is curious about you.", say_down: "{name}'s interest in you has cooled.", voice: "{name} notices {{user}} more than they let on." }, 35: { text: Drawn, say: "{name} is drawn to you.", say_down: "{name} is less drawn to you now.", voice: "{name} lingers near {{user}} and finds small reasons to touch." }, 60: { text: Wanting, say: "{name} wants you, and it shows.", say_down: "{name} has reined in what they feel for you.", voice: "{name} flirts openly with {{user}} when the moment allows." }, 85: { text: Consumed, say: "{name} can't stop thinking about you.", voice: "{name} can barely hide their desire for {{user}}." } } }
  people: {}                 # the card's character is added here on install (name, appearance, outfit)

you: {}                      # name, appearance and outfit are read from the persona and the greeting
`
    },
    {
      label: "story",
      yaml: `goals:
  from_story: true           # promises, favours and plans the story makes are tracked
  max: 3

# secrets:                   # the builder fills these from the card; example:
#   past:
#     person: mira
#     tell: exists           # the narrator knows there is more, and deflects instead of inventing
#     cue: "Mira changes the subject whenever her hometown comes up."
#     stages:
#       - { band: { trust: Open },     text: "Mira left her hometown after a fire she blames herself for." }
#       - { band: { trust: Trusting }, text: "Her brother died in that fire; she has never told anyone." }

live_choices:
  count: 3
  guide: "Three different moves in the story's own words: one warm, one honest or bold, one that gives space or moves on."
  tags:
    tender:   { desc: "Something warm, gentle or caring toward someone here", per_person: true }
    playful:  { desc: "Teasing or joking with someone here", per_person: true }
    honest:   { desc: "Saying something true or vulnerable to someone here", per_person: true }
    bold:     { desc: "A bold romantic move with someone here (flirting, getting closer, a confession) only when the moment invites it", per_person: true, tags: [romance] }
    space:    { desc: "Giving room: pulling back, changing the subject, letting a silence sit" }
    onward:   { desc: "Moving the story along: leaving, suggesting somewhere else, ending the day" }
`
    },
    {
      label: "actions",
      yaml: `actions:                     # small authored moves, shown in the "More" row
  sleep:     { label: Sleep, say: "*I turn in for the night.*", when: "between(hour, 21, 5)", time: 480 }
  pass_time: { label: Let a few hours pass, say: "*I let a few hours drift by.*", time: 180 }
`
    }
  ]
};

// node_modules/warp/src/engine/templates/adventure.ts
var adventure = {
  id: "adventure",
  name: "Adventure",
  blurb: "Everything in Story, plus d20 checks at risky moments, health, energy and mood, attributes that grow with use, and contests (fights, chases, arguments) on one momentum gauge. Fits any card.",
  parts: [
    {
      label: "core",
      yaml: `# Warp ruleset. This lorebook is never sent to the model; Warp reads it directly.
name: Adventure
description: Risky moments are rolled, fights and arguments swing, people remember. Fits any card.
style: adventure             # d20 checks on risky, contested moves; contests (fights, chases, arguments)

clock:
  start: greeting            # read the time (and day, if given) from the greeting
  fallback: "Day 1 09:00"
  minutes_per_action: 10
  narrator_max: 480          # the story may skip up to 8 hours per reply

start:
  place: greeting
  money: 50

hud:
  currency: "$"              # the builder changes this to fit the setting (gold, credits, ¥…)
  bars: [health, energy, mood]

narration:
  notes: Keep narration consistent with the state block. Never invent dice results.
`
    },
    {
      label: "stats",
      yaml: `stats:
  health:
    kind: meter
    narrator: 20             # the story may move it by at most 20 per reply
    bands:
      0:  { text: Near collapse., say_down: "You can barely stand." }
      25: { text: Badly hurt.,    say_down: "You're badly hurt." }
      50: { text: Bruised and sore. }
      80: { text: Healthy.,       say: "You feel like yourself again." }
  energy:
    kind: meter
    per_hour: -4             # drains slowly while awake
    narrator: 15
    bands:
      0:  { text: Exhausted., say_down: "You're running on empty." }
      30: { text: Tired. }
      60: { text: Alert. }
  mood:
    kind: meter
    start: 60
    narrator: 10
    bands:
      0:  { text: Miserable. }
      25: { text: Low.,             say_down: "Your spirits sink." }
      50: { text: Steady. }
      75: { text: In good spirits., say: "Things are looking up." }
  money:
    kind: money
    narrator: 100
  body:  { kind: attribute, max: 10, start: 3, desc: "Strength, speed, endurance." }
  mind:  { kind: attribute, max: 10, start: 3, desc: "Wits, knowledge, perception." }
  charm: { kind: attribute, max: 10, start: 3, desc: "Persuasion, presence, nerve." }

growth: { rate: 1 }          # attributes grow a little each time a check leans on them

checks:
  dc: { easy: 8, fair: 12, hard: 16, extreme: 20 }   # difficulty words -> d20 target
  partial: 3                 # missing by 3 or less is a success with a cost
  typed: true                # risky things you type are rolled (never quoted dialogue)
  stats: [body, mind, charm] # what a typed attempt can lean on
  bonus: 10                  # a maxed stat adds +10 (body 3/10 adds +3)
  outcomes:
    fail:      { energy: -5 }
    crit_fail: { health: -10, energy: -5 }
`
    },
    {
      label: "world",
      yaml: `conditions:
  exhausted: { label: Exhausted,   tone: bad, desc: "Running on empty: -2 to every check.", bonus: { body: -2, mind: -2, charm: -2 } }
  hurt:      { label: Badly hurt,  tone: bad, desc: "Wounds slow you down: -2 to Body.", bonus: { body: -2 } }
  low:       { label: Low spirits, tone: bad, desc: "Hard to put on a brave face: -1 to Charm.", bonus: { charm: -1 } }
`
    },
    {
      label: "people",
      yaml: `relationships:
  open: true
  big_moment: { factor: 3, cooldown: 10 }
  stats:
    affection:
      start: 20
      narrator: 5
      bands:
        0:  { text: Hostile,  say_down: "{name} has turned against you.", voice: "{name} is openly hostile to {{user}}." }
        15: { text: Cool,     say: "{name} isn't hostile any more.", say_down: "{name} has cooled on you.", voice: "{name} is polite but distant with {{user}}." }
        35: { text: Friendly, say: "{name} likes you.", say_down: "{name} has cooled a little, but still likes you.", voice: "{name} is easy and friendly with {{user}}." }
        60: { text: Close,    say: "{name} counts you as a friend now.", say_down: "{name} is less sure of you than before.", voice: "{name} jokes with {{user}}, takes their side, shares plans." }
        85: { text: Devoted,  say: "{name} would do anything for you.", voice: "{name} puts {{user}} first, even at a cost." }
    trust:
      start: 20
      narrator: 5
      bands:
        0:  { text: Suspicious,  say_down: "{name} doesn't believe a word you say.", voice: "{name} doubts what {{user}} says and checks it." }
        25: { text: Wary,        say: "{name} is starting to give you the benefit of the doubt.", say_down: "{name} is wary of you again.", voice: "{name} listens to {{user}} but checks what matters." }
        50: { text: Trusting,    say: "{name} trusts you.", say_down: "{name} trusts you, but not blindly any more.", voice: "{name} tells {{user}} the truth and asks for help." }
        80: { text: Unshakeable, say: "{name}'s trust in you is unshakeable.", voice: "{name} backs {{user}} without asking why." }
  people: {}                 # the card's character is added here on install

you: {}
`
    },
    {
      label: "story",
      yaml: `goals:
  from_story: true
  max: 3

triggers:
  exhausted: { when: "energy <= 0", do: { add_condition: [exhausted], hint: "{{user}} is exhausted and struggling to stay upright." } }
  recovered: { when: "energy >= 30", do: { remove_condition: [exhausted] } }
  hurt:      { when: "health < 25",  do: { add_condition: [hurt], hint: "{{user}} is badly hurt: every physical move costs." } }
  mended:    { when: "health >= 50", do: { remove_condition: [hurt] } }
  low:       { when: "mood < 25",    do: { add_condition: [low], hint: "{{user}} is in low spirits and it shows." } }
  lifted:    { when: "mood >= 50",   do: { remove_condition: [low] } }

live_choices:
  count: 3
  guide: "Three moves that differ in risk: one safe, one fair, one hard or extreme. Give each an honest difficulty word."
  taper: { step: 0.75, floor: 0.1 }   # the same tag again soon gives less: 57% the second time, 40% the third, never below 10%
  tags:
    bold:
      desc: "A daring, physical or risky move"
      check: { add: body, label: Body }          # the difficulty word of the written choice sets the target
      success: { mood: +3 }
      fail:    { health: -5, mood: -3, hint: "It goes wrong in a way that changes the situation; no identical retry." }
    clever:
      desc: "Noticing, working something out, or a clever trick"
      check: { add: mind, label: Mind }
      success: { mood: +2 }
      fail:    { mood: -2, hint: "Show what this approach rules out, or a new lead that needs a different approach." }
    charm:
      desc: "Persuading, charming or pressing someone here"
      per_person: true
      check: { add: charm, label: Charm }
      success: { rel: { target: { affection: +3, trust: +2 } } }   # pays more than kind, but has to be rolled
      fail:    { mood: -3, rel: { target: { trust: -2 } }, hint: "It doesn't land; they are put off or unconvinced." }
    kind:
      desc: "Something kind or supportive toward someone here (no roll)"
      per_person: true
      effects: { rel: { target: { trust: +2 } } }
    careful:
      desc: "The cautious option: waiting, watching, backing off (no roll)"
      effects: { energy: +2 }
`
    },
    {
      label: "actions",
      yaml: `actions:
  rest:  { label: Rest a while, say: "*I take some time to rest.*", time: 60, effects: { energy: +25, health: +5 } }
  sleep: { label: Sleep, say: "*I turn in for the night.*", when: "between(hour, 21, 5)", time: 480, effects: { energy: +100, health: +20, mood: +5 } }
  wait:  { label: Wait an hour, say: "*I let some time pass.*", time: 60 }
`
    },
    {
      label: "conflict",
      yaml: `conflict:
  from_story: true           # a fight, chase or argument in the story starts a contest
  kinds:
    fight:
      label: Fight
      stats: [body, mind]    # approaches a move may lean on: force, or reading the opponent
      escape: body           # stat for Break off
      cost:                  # what the opponent's pressure costs you this round
        partial:   { health: -3 }
        fail:      { health: -8 }
        crit_fail: { health: -15 }
      won:     { mood: +5, hint: "{opponent} is beaten or yields." }
      lost:    { health: -10, mood: -5, hint: "{{user}} is beaten. {opponent} gets what they wanted; {{user}} is hurt but alive." }
      escaped: { energy: -10, hint: "{{user}} gets away." }
    chase:
      label: Chase
      stats: [body, mind]
      escape: body
      cost:
        fail:      { energy: -8 }
        crit_fail: { energy: -12, health: -5 }
      won:     { hint: "{{user}} wins the chase: catches {opponent} or loses them for good." }
      lost:    { energy: -10, hint: "{opponent} wins the chase." }
      escaped: { hint: "The chase breaks off." }
    argument:
      label: Argument
      stats: [charm, mind]
      escape: charm
      cost:
        fail:      { mood: -4 }
        crit_fail: { mood: -8 }
      won:     { mood: +4, hint: "{opponent} gives in, or is won over." }
      lost:    { mood: -6, hint: "{opponent} wins the argument; {{user}} has to give ground." }
      escaped: { hint: "{{user}} walks away from it." }
`
    }
  ]
};

// node_modules/warp/src/engine/templates/index.ts
var TEMPLATES = [story, adventure];
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
    return yaml.slice(0, m.index) + m[0].replace(/^(  people:)\s*\{\s*\}/, "$1") + entry + yaml.slice(m.index + m[0].length);
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
function clockOf(r, s) {
  return formatClock(r, s.minutes, !!s.weekday);
}
function lookLine(s, who) {
  const l = s.look?.[who];
  return { appearance: l?.appearance ?? null, outfit: l?.outfit ?? null };
}
function personActions(r, s, pid, lines, veils) {
  const out = [];
  for (const id of r.actionOrder) {
    const a = r.actions[id];
    if (!a.perPerson || a.hidden || a.tags.some((t) => lines.has(t)))
      continue;
    if (adultGated(a.tags) && (isAdult(r, s, pid) !== true || isAdult(r, s, "you") === false))
      continue;
    if (a.targets && !a.targets.includes(pid))
      continue;
    const name = personName(r, s, pid);
    const label = /\{\{target\}\}|\{target\}/i.test(a.label) ? a.label.replace(/\{\{target\}\}|\{target\}/gi, name) : a.label;
    if (!isAvailable(r, s, a, pid)) {
      const spent = whenHolds(r, s, a, pid) ? spentLock(r, s, a, pid) : null;
      if (!spent && !a.showLocked)
        continue;
      out.push({ id: `${a.id}${TARGET_SEP}${pid}`, label, group: null, desc: a.desc ?? null, odds: null, partialOdds: null, checkLabel: null, veiled: false, params: [], difficulty: null, locked: spent ?? lockReason(r, s, a) });
      continue;
    }
    const o = odds(r, s, a, undefined, pid);
    out.push({
      id: `${a.id}${TARGET_SEP}${pid}`,
      label,
      group: null,
      desc: a.desc ?? null,
      odds: o ? o.success : null,
      partialOdds: o && o.partial > 0 ? o.partial : null,
      checkLabel: a.check?.label ?? null,
      veiled: a.tags.some((t) => veils.has(t)),
      params: a.params.map((p) => ({ id: p.id, label: p.label, options: Object.keys(p.options), default: p.default })),
      difficulty: null
    });
  }
  return out;
}
function buildHud(r, s, opts = {}) {
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
      value: v,
      min: def.min,
      max,
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
  const lines = new Set((opts.lines ?? []).map((x) => x.toLowerCase()));
  const veils = new Set((opts.veils ?? []).map((x) => x.toLowerCase()));
  const here = new Set(presentPeople(r, s));
  const people = Object.entries(s.people).filter(([id]) => !s.forgotten[id]).map(([id, p]) => {
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
      conditions: [],
      memories: (s.memories?.[id] ?? []).slice().reverse().slice(0, 5).map((m) => ({ text: m.text, when: r.clock.enabled ? formatClock(r, m.at, !!s.weekday).day : null })),
      ...lookLine(s, id),
      actions: here.has(id) && !s.contest ? personActions(r, s, id, lines, veils) : []
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
      use: usable ? { id: usable.id, label: usable.a.label, locked: usable.locked, drafted: false } : null,
      bonus: bonus || null
    };
  });
  const date = dateAt(r, s.minutes);
  const conditions = Object.entries(s.conditions).map(([id, c]) => {
    const def = r.conditions[id];
    const left = c.until !== null ? c.until - s.minutes : null;
    return {
      id,
      label: def?.label ?? id,
      tone: def?.tone ?? "warn",
      desc: def?.desc,
      remaining: left !== null && left > 0 ? minutesLeft(left) : undefined
    };
  });
  const moneyDef = r.hud.money ? r.stats[r.hud.money] : undefined;
  const moneyV = r.hud.money ? s.stats[r.hud.money] ?? moneyDef?.start ?? 0 : 0;
  const money = moneyDef ? moneyDef.show === "hidden" ? null : shownText(moneyDef.showSet ? moneyDef : { ...moneyDef, show: "both" }, bandFor(moneyDef, moneyV, statMax(r, moneyDef, s)), formatMoney(r, moneyV)) ?? formatMoney(r, moneyV) : null;
  const wd = s.weekday ? r.clock.weekdays[Math.floor(s.minutes / 1440) % r.clock.weekdays.length] ?? "" : "";
  return {
    rulesetName: r.name,
    clock: r.clock.enabled ? { ...clockOf(r, s), minutes: s.minutes } : null,
    date: date ? `${wd} ${ordinal(date.day)} ${date.monthName}`.trim() : null,
    location: s.locationName ? { name: s.locationName } : null,
    money,
    bars: bars.filter((b) => r.stats[b.id].kind !== "money"),
    skills,
    you: lookLine(s, "you"),
    wereWithYou: Object.entries(s.scene).filter(([id, v]) => v.here && s.people[id] && !s.forgotten[id] && v.loc !== s.location && v.loc === s.lastLocation && !here.has(id)).map(([id]) => ({ id, name: personName(r, s, id) })),
    people,
    items,
    conditions,
    goals: goalViews(r, s),
    conflict: conflictView(r, s),
    turn: s.turn
  };
}
function goalViews(r, s) {
  const all = Object.entries(s.goals ?? {});
  const view = ([id, g]) => ({
    id,
    text: g.text,
    status: g.st,
    from: g.from ? personName(r, s, g.from) : null,
    stakes: g.stakes ?? r.goals.list[id]?.stakes ?? null
  });
  const open = all.filter(([, g]) => g.st === "open").map(view);
  const ended = all.filter(([, g]) => g.st !== "open").sort((a, b) => (b[1].ended ?? 0) - (a[1].ended ?? 0)).slice(0, 6).map(view);
  return [...open, ...ended];
}
function conflictView(r, s) {
  const c = s.contest;
  if (!c)
    return null;
  const kind = kindOf(r, c.kind);
  const stat = bestStat(r, s, kind);
  const words = momentumWords(c.momentum, c.opponent, "You");
  return {
    kind: c.kind,
    label: kind.label,
    opponent: c.opponent,
    round: c.round,
    maxRounds: r.conflict.rounds.max,
    momentum: c.momentum,
    words: words.charAt(0).toUpperCase() + words.slice(1),
    next: stat ? { odds: moveOdds(r, s, stat), stat: r.stats[stat]?.label ?? stat } : null
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
function hasMet(s, id) {
  return !!s.scene[id] || (s.memories?.[id]?.length ?? 0) > 0;
}
function anyAdultGated(r) {
  return [...Object.values(r.actions), ...Object.values(r.liveChoices.tags)].some((a) => adultGated(a.tags));
}
function buildChoices(r, s, opts) {
  if (opts.showChoices === false)
    return [];
  const veils = new Set(opts.veils.map((v) => v.toLowerCase()));
  const lines = new Set(opts.lines.map((v) => v.toLowerCase()));
  const plain = (id, label, group, desc = null) => ({ id, label, group, desc, odds: null, partialOdds: null, checkLabel: null, veiled: false, params: [], difficulty: null });
  if (s.contest)
    return contestChoices(r, s, opts.live ?? []);
  const here = new Set(presentPeople(r, s));
  const live = [];
  (opts.live ?? []).forEach((c, i) => {
    if (contestId(c.tag))
      return;
    const a = r.liveChoices.tags[c.tag];
    if (!a || a.tags.some((t) => lines.has(t)) || !isAvailable(r, s, a, c.target) || a.perPerson && !c.target || c.target && !here.has(c.target))
      return;
    if (adultGated(a.tags) && (isAdult(r, s, "you") === false || c.target && isAdult(r, s, c.target) !== true))
      return;
    const word = c.difficulty ?? null;
    const o = odds(r, s, a, word ? { difficulty: word } : undefined, c.target);
    live.push({
      id: `${LIVE_PREFIX}${i}`,
      label: c.label,
      group: r.liveChoices.label,
      desc: a.desc ?? null,
      odds: o ? o.success : null,
      partialOdds: o && o.partial > 0 ? o.partial : null,
      checkLabel: o ? a.check?.label ?? null : null,
      veiled: a.tags.some((t) => veils.has(t)),
      params: [],
      difficulty: a.check ? word ?? (a.check.target === undefined ? "fair" : null) : "none"
    });
  });
  const actions = availableChoices(r, s, opts.lines).filter(({ a, target }) => !a.hidden && !target).map(({ id, a, label }) => {
    const o = odds(r, s, a);
    return {
      id,
      label,
      group: null,
      desc: a.desc ?? null,
      odds: o ? o.success : null,
      partialOdds: o && o.partial > 0 ? o.partial : null,
      checkLabel: a.check?.label ?? null,
      veiled: a.tags.some((t) => veils.has(t)),
      params: a.params.map((p) => ({ id: p.id, label: p.label, options: Object.keys(p.options), default: p.default })),
      difficulty: null
    };
  });
  const locked = [];
  for (const id of r.actionOrder) {
    const a = r.actions[id];
    if (a.hidden || a.perPerson || a.tags.some((t) => lines.has(t)))
      continue;
    const spent = whenHolds(r, s, a) ? spentLock(r, s, a) : null;
    if (!spent && !a.showLocked)
      continue;
    if (isAvailable(r, s, a))
      continue;
    locked.push({ ...plain(id, a.label, null, a.desc ?? null), locked: spent ?? lockReason(r, s, a) });
  }
  return [...live, ...actions, ...itemChoices(r, s, lines), ...locked];
}
function contestChoices(r, s, written) {
  const c = s.contest;
  const kind = kindOf(r, c.kind);
  const out = [];
  const move = (id, label, stat) => {
    const o = d20Odds(statAdd(r, s, stat), c.dc, r.checks.partial);
    return { id, label, group: kind.label, desc: null, odds: o.success, partialOdds: o.partial > 0 ? o.partial : null, checkLabel: r.stats[stat]?.label ?? stat, veiled: false, params: [], difficulty: c.threat };
  };
  written.forEach((w, i) => {
    const key = contestId(w.tag);
    if (!key || key === BREAK_OFF || out.length >= 2)
      return;
    const stat = key.slice(CONTEST_PREFIX.length);
    if (!kind.stats.includes(stat) && !r.stats[stat])
      return;
    out.push(move(`${LIVE_PREFIX}${i}`, w.label, stat));
  });
  if (!out.length)
    for (const stat of kind.stats.slice(0, 2))
      out.push(move(`${CONTEST_PREFIX}${stat}`, `Press on (${r.stats[stat]?.label ?? stat})`, stat));
  const esc = kind.escape || bestStat(r, s, kind);
  const o = d20Odds(statAdd(r, s, esc), breakOffDc(s), r.checks.partial);
  out.push({ id: BREAK_OFF, label: "Break off", group: kind.label, desc: `Try to get away from ${c.opponent}.`, odds: o.success + o.partial, partialOdds: null, checkLabel: r.stats[esc]?.label ?? esc, veiled: false, params: [], difficulty: c.threat });
  return out;
}
function itemChoices(r, s, lines) {
  const ranked = usableItems(r, s).filter((u) => !u.locked && !u.a.tags.some((t) => lines.has(t))).map((u) => ({ u, ...itemRelevance(r, s, u.a) })).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score).slice(0, 2);
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
      veiled: false,
      params: [],
      difficulty: null,
      ...why ? { why } : {}
    };
  });
}
function itemRelevance(r, s, a) {
  let score = 0;
  let best = null;
  const add = (w, why) => {
    score += w;
    if (!best || w > best.w)
      best = { w, why };
  };
  const stats = new Map;
  const removes = [];
  for (const e of [a.effects, ...Object.values(a.outcomes)]) {
    if (!e)
      continue;
    for (const [k, v] of Object.entries(e.stats))
      stats.set(k, (stats.get(k) ?? 0) + (typeof v === "number" ? v : 0));
    removes.push(...e.removeConditions);
  }
  for (const [id, d] of stats) {
    const def = r.stats[id];
    if (!def || !d)
      continue;
    const v = s.stats[id] ?? def.start;
    const p = (v - def.min) / Math.max(1, statMax(r, def, s) - def.min);
    const bad = def.good === "low" ? p >= 0.5 : def.good === "high" ? p <= 0.5 : false;
    const helps = def.good === "low" ? d < 0 : def.good === "high" ? d > 0 : false;
    if (bad && helps)
      add(1.5 + p, `${def.label} is ${def.good === "low" ? "high" : "low"}`);
  }
  for (const c of removes)
    if (s.conditions[c])
      add(3, `Clears ${r.conditions[c]?.label ?? c}`);
  return { score, why: best?.why ?? null };
}
function signed(n) {
  const f = formatNumber(n);
  return n > 0 ? `+${f}` : f;
}
function summarizeEvents(r, before, after, events, lined = new Set) {
  const contest = [];
  const scene = [];
  const rest = [];
  const statAgg = new Map;
  const relAgg = new Map;
  const itemAgg = new Map;
  const timeAgg = { min: 0, idx: [], narrIdx: [], set: null, setIdx: [] };
  const swing = { d: 0, idx: [], src: "check" };
  events.forEach((e, i) => {
    if (e.src === "drift")
      return;
    switch (e.t) {
      case "stat": {
        const key = `${e.id}|${e.src === "narrator" ? "n" : "e"}`;
        const a = statAgg.get(key) ?? { d: 0, idx: [], src: e.src, set: false };
        a.d += e.d ?? 0;
        if (e.set !== undefined)
          a.set = true;
        a.idx.push(i);
        statAgg.set(key, a);
        break;
      }
      case "rel": {
        const key = `${e.who}|${e.stat}|${e.src === "narrator" ? "n" : "e"}`;
        const a = relAgg.get(key) ?? { d: 0, idx: [], src: e.src, set: false };
        if (e.set !== undefined)
          a.set = true;
        a.d += e.d ?? 0;
        a.idx.push(i);
        relAgg.set(key, a);
        break;
      }
      case "item": {
        const key = `${e.id}|${e.src === "narrator" ? "n" : "e"}`;
        const a = itemAgg.get(key) ?? { d: 0, idx: [], src: e.src };
        a.d += e.d;
        a.idx.push(i);
        itemAgg.set(key, a);
        break;
      }
      case "move":
        scene.push({ text: `→ ${e.name ?? e.to.replace(/_/g, " ")}`, tone: "neutral", src: e.src, undo: [i] });
        break;
      case "time":
        timeAgg.min += e.min;
        timeAgg.idx.push(i);
        if (e.src === "narrator")
          timeAgg.narrIdx.push(i);
        break;
      case "set_time":
        timeAgg.set = e.minutes;
        timeAgg.setIdx.push(i);
        break;
      case "cond": {
        const label = r.conditions[e.id]?.label ?? e.id;
        if (e.note === "expired")
          break;
        rest.push({ text: e.on ? label : `${label} ended`, tone: e.on ? r.conditions[e.id]?.tone ?? "warn" : "good", src: e.src, undo: [i] });
        break;
      }
      case "memory":
        rest.push({ text: `\uD83D\uDCAD ${personName(r, after, e.who)} will remember that`, tone: "neutral", src: e.src, undo: [i], why: [e.text] });
        break;
      case "person":
        scene.push({ text: `Met ${e.name}`, tone: "neutral", src: e.src, undo: [i] });
        break;
      case "scene":
        if (events.some((x, j) => j < i && x.t === "person" && x.id === e.who))
          break;
        scene.push({ text: e.here ? `${personName(r, after, e.who)} joins` : `${personName(r, after, e.who)} leaves`, tone: "neutral", src: e.src, undo: [i] });
        break;
      case "look":
        rest.push({ text: `${e.who === "you" ? "You" : personName(r, after, e.who)}: ${e.field === "outfit" ? "outfit" : "looks"} ${e.text ? "changed" : "cleared"}`, tone: "neutral", src: e.src, undo: [i], ...e.text ? { why: [e.text] } : {} });
        break;
      case "goal": {
        const g = after.goals?.[e.id] ?? before.goals?.[e.id];
        const text = e.text ?? g?.text ?? e.id;
        if (e.st === null)
          rest.push({ text: `Goal dropped: ${text}`, tone: "neutral", src: e.src, undo: [i] });
        else
          rest.push({ text: e.st === "open" ? `New goal: ${text}` : e.st === "done" ? `Goal done: ${text}` : `Goal failed: ${text}`, tone: e.st === "failed" ? "bad" : e.st === "done" ? "good" : "neutral", src: e.src, undo: [i] });
        break;
      }
      case "use": {
        const per = r.items[e.id]?.uses ?? 0;
        const left = after.items[e.id] > 0 ? after.uses[e.id] ?? per : 0;
        rest.push({ text: `Used ${itemName(r, before, e.id)}${e.n > 1 ? ` ×${e.n}` : ""}${per > 1 && left ? ` · ${left}/${per} left` : ""}`, tone: "neutral", src: e.src, undo: [i] });
        break;
      }
      case "practice": {
        const rose = events.some((x) => x.t === "stat" && x.id === e.id && (x.d ?? 0) > 0 && x.src === "check");
        const def = r.stats[e.id];
        if (rose || !def || e.d <= 0)
          break;
        rest.push({ text: `\uD83D\uDCC8 ${def.label} ${Math.round((after.practice[e.id] ?? 0) * 100)}%`, tone: "good", src: e.src });
        break;
      }
      case "contest": {
        const label = (r.conflict.kinds[e.kind]?.label ?? e.kind).toLowerCase();
        contest.push({ text: `${/^[aeiou]/.test(label) ? "An" : "A"} ${label} with ${e.opponent} starts`, tone: "warn", src: e.src, undo: [i] });
        break;
      }
      case "contest_end": {
        const opp = before.contest?.opponent ?? after.lastContest?.opponent ?? "them";
        const text = e.outcome === "won" ? `You win against ${opp}` : e.outcome === "lost" ? `${opp} wins` : e.outcome === "gave_in" ? `You give in to ${opp}` : e.outcome === "escaped" ? `You get away from ${opp}` : `It breaks off with ${opp}`;
        contest.push({ text, tone: e.outcome === "won" ? "good" : e.outcome === "lost" || e.outcome === "gave_in" ? "bad" : "neutral", src: e.src });
        break;
      }
      case "swing":
        swing.d += e.d;
        swing.idx.push(i);
        swing.src = e.src;
        break;
    }
  });
  if (swing.idx.length && Math.abs(swing.d) >= 1) {
    const now = after.contest ?? before.contest;
    const words = now ? momentumWords(after.contest?.momentum ?? now.momentum + swing.d, now.opponent, "You") : "";
    contest.push({ text: `Momentum ${signed(Math.round(swing.d))}${words && after.contest ? ` · ${words.charAt(0).toUpperCase()}${words.slice(1)}` : ""}`, tone: swing.d > 0 ? "good" : "bad", src: swing.src, undo: swing.idx });
  }
  if (timeAgg.set !== null) {
    scene.unshift({ text: `⏱ ${formatClock(r, timeAgg.set, !!after.weekday).time}`, tone: "neutral", src: events[timeAgg.setIdx[0]].src, undo: timeAgg.setIdx });
  } else if (timeAgg.min >= 1) {
    const m = timeAgg.min;
    scene.unshift({ text: m >= 60 ? `⏱ +${formatNumber(m / 60)}h` : `⏱ +${Math.round(m)}m`, tone: "neutral", src: timeAgg.narrIdx.length === timeAgg.idx.length ? "narrator" : "action", ...timeAgg.narrIdx.length ? { undo: timeAgg.narrIdx } : {} });
  }
  const deltas = [];
  const banded = new Set(lined);
  for (const [key, a] of statAgg) {
    const id = key.split("|")[0];
    const def = r.stats[id];
    if (!def || def.kind === "hidden")
      continue;
    const d = a.set ? (after.stats[id] ?? 0) - (before.stats[id] ?? 0) : a.d;
    if (Math.abs(d) < 0.05)
      continue;
    const bBefore = bandFor(def, before.stats[id] ?? def.start, statMax(r, def, before));
    const bAfter = bandFor(def, after.stats[id] ?? def.start, statMax(r, def, after));
    const good = def.good === "none" ? null : d > 0 === (def.good === "high");
    const band = bAfter && bBefore !== bAfter && !banded.has(id) ? bAfter.text : undefined;
    if (band)
      banded.add(id);
    deltas.push({
      text: def.kind === "money" ? `${d > 0 ? "+" : "−"}${formatMoney(r, Math.abs(d))}` : `${def.label} ${signed(d)}`,
      tone: good === null ? "neutral" : good ? "good" : "bad",
      src: a.src,
      band,
      undo: a.idx
    });
  }
  for (const [key, a] of relAgg) {
    const [who, stat] = key.split("|");
    const def = r.relStats[stat];
    if (!def)
      continue;
    const d = a.set ? (after.rel[who]?.[stat] ?? def.start) - (before.rel[who]?.[stat] ?? def.start) : a.d;
    if (Math.abs(d) < 0.05)
      continue;
    const good = def.good === "none" ? null : d > 0 === (def.good === "high");
    const band = a.set ? bandFor(def, after.rel[who]?.[stat] ?? def.start)?.text : undefined;
    deltas.push({ text: `${personName(r, after, who)} · ${def.label} ${signed(d)}`, tone: good === null ? "neutral" : good ? "good" : "bad", src: a.src, ...band ? { band } : {}, undo: a.idx });
  }
  for (const [key, a] of itemAgg) {
    const id = key.split("|")[0];
    if (a.d === 0)
      continue;
    const name = itemName(r, after.items[id] ? after : before, id);
    deltas.push({ text: `${a.d > 0 ? "+" : "−"} ${name}${Math.abs(a.d) > 1 ? ` ×${Math.abs(a.d)}` : ""}`, tone: "neutral", src: a.src, undo: a.idx });
  }
  const out = [...contest, ...scene, ...deltas, ...rest];
  const causeOf = (ev) => ev.why ?? (ev.src === "narrator" ? "Read from the story" : ev.src === "manual" ? "You set this" : null);
  for (const c of out) {
    const why = [...new Set([...c.why ?? [], ...(c.undo ?? []).map((i) => events[i] && causeOf(events[i])).filter((x) => !!x)])];
    if (why.length)
      c.why = why;
  }
  return out;
}
function checkSummary(c) {
  const addTxt = c.add ? ` ${c.add > 0 ? "+" : "−"} ${Math.abs(c.add)}` : "";
  return `d20 ${c.roll}${addTxt} = ${c.total} vs ${c.target}${c.difficulty ? ` (${c.difficulty})` : ""}`;
}
function buildRecordView(r, messageId, swipe, rec, before, after) {
  const crossings = bandCrossings(r, before, after);
  const lines = crossingLines(crossings);
  return {
    messageId,
    swipe,
    clock: r.clock.enabled ? formatClock(r, after.minutes, !!after.weekday).label : null,
    action: rec.action?.label ?? null,
    via: rec.action?.via ?? null,
    check: rec.check ? {
      label: rec.check.label,
      dice: rec.check.dice,
      faces: rec.check.faces,
      roll: rec.check.roll,
      add: rec.check.add,
      total: rec.check.total,
      target: rec.check.target,
      style: rec.check.style,
      tier: rec.check.tier,
      tierLabel: TIER_LABEL[rec.check.tier],
      summary: checkSummary(rec.check)
    } : null,
    lines,
    contest: contestOfRecord(r, rec, before, after),
    changes: summarizeEvents(r, before, after, rec.events, new Set(crossings.filter((c) => c.who === null && lines.includes(c.line)).map((c) => c.stat))),
    hints: rec.hints,
    veiled: !!rec.veiled,
    confidence: rec.confidence ?? null,
    decisions: (rec.decisions ?? []).map((d) => {
      const spec = findDecide(r, d.id);
      return {
        ask: d.ask,
        picked: d.pickedDesc,
        p: d.p[d.picked] ?? 0,
        source: d.source,
        odds: Object.entries(d.p).map(([k, p]) => ({ desc: d.descs?.[k] ?? spec?.options.find((o) => o.id === k)?.desc ?? k, p })).sort((a, b) => b.p - a.p)
      };
    }),
    redoFrom: null
  };
}
function contestOfRecord(r, rec, before, after) {
  const started = rec.events.find((e) => e.t === "contest");
  const c = before.contest ?? (started ? { kind: started.kind, opponent: started.opponent, round: 0, momentum: 0 } : null);
  const rounds = rec.events.filter((e) => e.t === "round").length;
  if (!c || !rounds && !rec.events.some((e) => e.t === "contest_end"))
    return null;
  const end = rec.events.find((e) => e.t === "contest_end");
  const swing = rec.events.reduce((n, e) => n + (e.t === "swing" ? e.d : 0), 0);
  return {
    kind: c.kind,
    label: kindOf(r, c.kind).label,
    opponent: c.opponent,
    round: after.contest?.round ?? c.round + rounds,
    swing: Math.round(swing),
    momentum: Math.round(after.contest?.momentum ?? Math.max(-100, Math.min(100, c.momentum + swing))),
    outcome: end?.outcome ?? null
  };
}
function findDecide(r, id) {
  const effects = [
    ...Object.values(r.actions).flatMap((a) => [a.cost, a.effects, ...Object.values(a.outcomes)]),
    ...Object.values(r.liveChoices.tags).flatMap((a) => [a.cost, a.effects, ...Object.values(a.outcomes)]),
    ...r.triggers.map((t) => t.effects)
  ];
  const stack = [...effects];
  while (stack.length) {
    const e = stack.pop();
    if (!e)
      continue;
    for (const d of e.decide) {
      if (d.id === id)
        return d;
      stack.push(...d.options.map((o) => o.effect));
    }
  }
  return;
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
var LOOK_WORDS = /\b(wear|wears|wearing|wore|dress|dressed|dresses|shirt|coat|jacket|hoodie|hair|eyes|naked|nude|change|changes|changed|clothes|clothing|outfit|skirt|jeans|shoes|boots|hat|look|looks|face|scar|tattoo|makeup|undress|strip)\b/i;
function lookSentence(name, l) {
  if (!l.appearance && !l.outfit)
    return null;
  const parts = [l.appearance, l.outfit ? `wears ${l.outfit}` : null].filter(Boolean);
  return `${name}: ${parts.join("; ")}.`;
}
function stateDigest(r, s, focus) {
  const nar = focus !== undefined;
  const ft = focus?.text ?? "";
  const named = (name, others = []) => !nar || namesIt(ft, name, others);
  const moneyTalk = !nar || MONEY_WORDS.test(ft);
  const lookTalk = !nar || LOOK_WORDS.test(ft);
  const lines = [];
  const hereIds = presentPeople(r, s);
  const here = new Set(hereIds);
  const head = [];
  if (r.clock.enabled) {
    const c = clockOf(r, s);
    const date = dateAt(r, s.minutes);
    head.push(`${date ? `${c.day} (${ordinal(date.day)} ${date.monthName})` : c.day}, ${c.time} (${c.phase})`);
  }
  if (s.locationName)
    head.push(s.locationName);
  if (head.length)
    lines.push(head.join(" · "));
  if (hereIds.length)
    lines.push(`Here: ${hereIds.map((id) => personName(r, s, id)).join(", ")}.`);
  const was = Object.entries(s.scene).filter(([id, v]) => v.here && s.people[id] && !s.forgotten[id] && v.loc !== s.location && v.loc === s.lastLocation && !here.has(id)).map(([id]) => personName(r, s, id));
  if (was.length)
    lines.push(`Were with {{user}} before the move (only if they came along): ${was.join(", ")}.`);
  if (s.contest) {
    const c = s.contest;
    const kind = kindOf(r, c.kind);
    lines.push(`Contest: ${kind.label.toLowerCase()} with ${c.opponent} — ${c.round ? `after round ${c.round}` : "just started"}, ${momentumWords(c.momentum, c.opponent)}. Not over until the rules end it.`);
  }
  const recent = (turn) => turn !== undefined && s.turn - turn <= 2;
  const lookMatters = (who) => !nar || s.turn <= 1 || recent(s.look?.[who]?.turn) || who !== "you" && recent(s.scene[who]?.turn) || lookTalk && (who === "you" ? /\b(i|my|me)\b/i.test(ft) : named(personName(r, s, who)));
  if (lookMatters("you")) {
    const l = lookSentence("{{user}}", lookLine(s, "you"));
    if (l)
      lines.push(l);
  }
  for (const id of hereIds)
    if (lookMatters(id)) {
      const l = lookSentence(personName(r, s, id), lookLine(s, id));
      if (l)
        lines.push(l);
    }
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
  const conds = Object.keys(s.conditions).map((id) => r.conditions[id]?.label ?? id);
  if (conds.length)
    lines.push(`Conditions: ${conds.join(", ")}`);
  const bag = Object.entries(s.items);
  const uses = (id) => {
    const per = r.items[id]?.uses ?? 0;
    return per > 1 ? ` (${s.uses[id] ?? per} of ${per} uses left)` : "";
  };
  const bagNames = bag.map(([id]) => itemName(r, s, id));
  const inv = bag.filter(([id]) => named(itemName(r, s, id), bagNames)).map(([id, n]) => `${itemName(r, s, id)}${n > 1 ? ` ×${n}` : ""}${uses(id)}`);
  const rest = bag.length - inv.length;
  if (inv.length)
    lines.push(`Carrying: ${inv.join(", ")}${rest ? ` (and ${rest} other thing${rest === 1 ? "" : "s"} — not in play; don't bring them up unless {{user}} does)` : ""}`);
  else if (rest)
    lines.push(`Carrying ${rest} thing${rest === 1 ? "" : "s"}, none in play right now (don't bring them up unless {{user}} does).`);
  const feel = (id) => {
    const parts = r.relStatOrder.map((rs) => {
      const def = r.relStats[rs];
      if (def.show === "hidden")
        return null;
      const v = s.rel[id]?.[rs] ?? def.start;
      const words = shownText(def, bandFor(def, v), formatNumber(v));
      return words ? `${def.label} ${words}` : `${def.label} ${formatNumber(v)}`;
    }).filter(Boolean);
    const name = personName(r, s, id);
    return parts.length ? `${name} (${parts.join(", ")})` : name;
  };
  const unread = (id) => !s.calibrated[id] && r.relStatOrder.every((rs) => (s.rel[id]?.[rs] ?? r.relStats[rs].start) === r.relStats[rs].start);
  const felt = hereIds.filter((id) => !unread(id));
  if (felt.length)
    lines.push(`Relationships (here): ${felt.map(feel).join("; ")}.`);
  const gated = anyAdultGated(r);
  for (const id of hereIds) {
    const name = personName(r, s, id);
    const voice = unread(id) ? null : voiceLine(r, s, id);
    if (voice)
      lines.push(voice);
    const mem = (s.memories?.[id] ?? []).slice(-3).map((m) => `${m.text}${r.clock.enabled ? ` (${agoWords(s.minutes - m.at)})` : ""}`);
    if (mem.length)
      lines.push(`${name} remembers: ${mem.join("; ")}`);
    if (gated && isAdult(r, s, id) !== true)
      lines.push(`${name} is not known to be an adult: nothing romantic or sexual.`);
  }
  const goals = Object.entries(s.goals ?? {}).filter(([id, g]) => goalInPlay(r, s, id, g, here, nar ? ft : null)).map(([, g]) => `"${g.text}"${g.from ? ` (for ${personName(r, s, g.from)})` : ""}${g.stakes ? ` — at stake: ${g.stakes}` : ""}`);
  if (goals.length)
    lines.push(`Goals in play (only the rules decide when a goal is done): ${goals.join("; ")}.`);
  const away = Object.keys(s.people).filter((id) => !here.has(id) && !s.forgotten[id] && hasMet(s, id) && s.scene[id] && s.minutes - s.scene[id].at <= 1440).sort((a, b) => (s.scene[b]?.at ?? -1) - (s.scene[a]?.at ?? -1)).slice(0, 4);
  if (away.length)
    lines.push(`Not in this scene (seen lately; bring them in only if the story calls for it): ${away.map((id) => personName(r, s, id)).join(", ")}`);
  return lines.join(`
`);
}
function outcomePacket(r, rec, before, after, playerName) {
  const lines = [];
  if (rec.action)
    lines.push(`${playerName} chose: ${rec.action.label}`);
  if (rec.beats)
    lines.push(rec.beats);
  else if (rec.check)
    lines.push(`Check: ${rec.check.label} — ${checkSummary(rec.check)} → ${TIER_LABEL[rec.check.tier].toUpperCase()}`);
  const changes = summarizeEvents(r, before, after, rec.events).map((c) => c.band ? `${c.text} (${c.band})` : c.text);
  if (changes.length)
    lines.push(`Already applied: ${changes.join(" · ")}`);
  for (const h of rec.hints)
    lines.push(/^(Show in this reply|Since the last reply):/.test(h) ? h : `Direction: ${h}`);
  if (rec.veiled)
    lines.push("Handle this beat off-screen: fade to black and describe only the aftermath and consequences.");
  if (!lines.length)
    return null;
  return lines.join(`
`);
}
// node_modules/warp/src/engine/scene.ts
var TIME_WORDS = {
  dawn: 6 * 60,
  morning: 9 * 60,
  noon: 12 * 60,
  midday: 12 * 60,
  afternoon: 15 * 60,
  evening: 19 * 60,
  night: 22 * 60,
  "late night": 60,
  midnight: 0
};
function greetingMinutes(r, t) {
  if (!t)
    return null;
  let inDay = null;
  if (typeof t.hour === "number" && Number.isFinite(t.hour) && t.hour >= 0 && t.hour <= 23) {
    const m = typeof t.minute === "number" && Number.isFinite(t.minute) ? Math.max(0, Math.min(59, Math.round(t.minute))) : 0;
    inDay = Math.round(t.hour) * 60 + m;
  } else if (typeof t.word === "string" && TIME_WORDS[t.word.trim().toLowerCase()] !== undefined) {
    inDay = TIME_WORDS[t.word.trim().toLowerCase()];
  }
  if (inDay === null)
    return null;
  let day = 0;
  if (typeof t.weekday === "string" && t.weekday.trim()) {
    const w = t.weekday.trim().toLowerCase().slice(0, 3);
    const idx = r.clock.weekdays.findIndex((x) => x.toLowerCase().startsWith(w));
    if (idx >= 0)
      day = idx;
  }
  return day * 1440 + inDay;
}
var text160 = (v) => typeof v === "string" && v.trim() ? v.trim().slice(0, 160) : null;
function applyGreeting(r, before, read) {
  return buildTurn(r, before, "greeting", (t) => {
    const src = "start";
    if (r.clock.start === "greeting" && r.clock.enabled) {
      const m = greetingMinutes(r, read.time);
      const weekday = typeof read.time?.weekday === "string" && r.clock.weekdays.some((x) => x.toLowerCase().startsWith(read.time.weekday.trim().toLowerCase().slice(0, 3)));
      if (m !== null && (m !== t.s.minutes || weekday !== !!t.s.weekday))
        t.push({ t: "set_time", minutes: m, ...weekday ? { weekday: true } : {}, src });
    }
    const place = typeof read.place === "string" ? read.place.trim().slice(0, 120) : "";
    if (place && (r.startPlace === "greeting" || !t.s.locationName))
      t.push({ t: "move", to: placeId(place), name: place, src });
    const idOf = (name) => {
      const known = findPerson(r, t.s, name);
      if (known)
        return known;
      if (!r.peopleOpen || !name.trim())
        return null;
      const id = slug(name);
      t.push({ t: "person", id, name: name.trim().slice(0, 60), src });
      return id;
    };
    for (const name of read.present ?? []) {
      const id = typeof name === "string" ? idOf(name) : null;
      if (id && !t.s.scene[id]?.here)
        t.push({ t: "scene", who: id, here: true, src });
    }
    const looks = (who, l) => {
      if (!l)
        return;
      for (const field of ["appearance", "outfit"]) {
        const v = text160(l[field]);
        if (v && !t.s.look?.[who]?.[field])
          t.push({ t: "look", who, field, text: v, src });
      }
    };
    looks("you", read.you);
    for (const [name, l] of Object.entries(read.people ?? {})) {
      const id = findPerson(r, t.s, name);
      if (id)
        looks(id, l);
    }
    for (const [name, adult] of Object.entries(read.adults ?? {})) {
      const id = findPerson(r, t.s, name);
      if (id && typeof adult === "boolean" && t.s.adults[id] !== adult)
        t.push({ t: "adult", who: id, adult, src });
    }
  });
}

// node_modules/warp/src/engine/loop-sim.ts
var sceneOf = (r, s) => ({ place: s.locationName, here: presentPeople(r, s).sort(), looks: JSON.stringify(Object.fromEntries(Object.entries(s.look).map(([k, v]) => [k, [v.appearance, v.outfit]]))) });
var sameScene = (a, b) => a.place === b.place && a.here.join() === b.here.join() && a.looks === b.looks;
function relTotal(r, s) {
  let n = 0;
  for (const rel of Object.values(s.rel))
    for (const id of r.relStatOrder)
      if (r.relStats[id].good !== "low")
        n += rel[id] ?? 0;
  return n;
}
function kindTag(r) {
  let best = null, top = 0;
  for (const [id, a] of Object.entries(r.liveChoices.tags)) {
    if (a.check || !a.perPerson)
      continue;
    let g = 0;
    for (const m of Object.values(a.effects.rel))
      for (const v of Object.values(m))
        if (typeof v === "number")
          g += v;
    if (g > top) {
      top = g;
      best = id;
    }
  }
  return best;
}
function relGain(r, a, tier) {
  const effects = tier ? [a.effects, a.outcomes[tier] ?? (tier === "partial" ? a.outcomes.success : tier === "crit_success" ? a.outcomes.success : tier === "crit_fail" ? a.outcomes.fail : undefined)] : [a.effects];
  let n = 0;
  for (const e of effects)
    if (e) {
      for (const m of Object.values(e.rel))
        for (const [stat, v] of Object.entries(m))
          if (typeof v === "number" && r.relStats[stat]?.good !== "low")
            n += v;
    }
  return n;
}
function fakeChoices(r, s, n) {
  const c = s.contest;
  if (c) {
    const kind = kindOf(r, c.kind);
    return kind.stats.slice(0, 2).map((st, i) => ({ label: `Move ${i + 1} on ${st}`, tag: `contest:${st}` }));
  }
  const tags = Object.keys(r.liveChoices.tags);
  if (!r.liveChoices.enabled || !tags.length)
    return [];
  const here = presentPeople(r, s);
  const out = [];
  for (let k = 0;k < tags.length && out.length < 3; k++) {
    const tag = tags[(n + k) % tags.length];
    const a = r.liveChoices.tags[tag];
    if (a.perPerson && !here.length)
      continue;
    const target = a.perPerson ? here[n % here.length] : undefined;
    out.push({ label: `${tag} ${n}`, tag, ...target ? { target } : {}, difficulty: "none" });
  }
  const checked = out.filter((c) => r.liveChoices.tags[c.tag].check);
  const words = [[], ["fair"], ["easy", "hard"], ["easy", "fair", "hard"]];
  checked.forEach((c, i) => {
    c.difficulty = words[checked.length][i];
  });
  return out;
}
function fakeProposal(r, s, n, rng) {
  const p = { minutes: 5 + Math.floor(rng() * 56) };
  const here = presentPeople(r, s);
  const who = here[0] ? s.people[here[0]]?.name : undefined;
  if (who && n % 2 === 1 && r.relStatOrder.length) {
    const stat = r.relStatOrder[Math.floor(rng() * r.relStatOrder.length)];
    p.rel = { [who]: { [stat]: Math.floor(rng() * 6) - 2 } };
  }
  if (n % 15 === 14)
    p.goals = { new: [{ text: `Goal from turn ${n}`, ...who ? { from: who } : {} }] };
  if (r.style === "adventure" && n % 20 === 19 && !s.contest) {
    const kind = Object.keys(r.conflict.kinds)[0];
    if (kind)
      p.contest = { kind, opponent: "the rival", threat: DIFFICULTIES[Math.floor(rng() * 4)] };
  }
  if (who && n % 25 === 24)
    p.moments = [who];
  return p;
}
function playerTurn(r, s, run, rng, alwaysTag) {
  const live = fakeChoices(r, s, run.n);
  const views = buildChoices(r, s, { lines: [], veils: [], live });
  const x = rng();
  const policy = run.policy;
  const click = (i) => {
    const c = live[i];
    const view = views.find((v) => v.id === `${LIVE_PREFIX}${i}`);
    if (!c || !view)
      return null;
    const intent = { actionId: `${LIVE_PREFIX}${c.tag}${c.target ? `${TARGET_SEP}${c.target}` : ""}`, via: "choice", label: c.label, ...c.difficulty ? { params: { difficulty: c.difficulty } } : {} };
    return { intent, typed: false, live, shown: view.odds, tag: c.tag };
  };
  if (s.contest) {
    if (policy === "dialogue" || x >= 0.4)
      return { intent: null, typed: true, live, shown: null, tag: null };
    return click(Math.floor(rng() * live.length)) ?? { intent: null, typed: true, live, shown: null, tag: null };
  }
  if (typeof policy === "object") {
    const tag = alwaysTag && r.liveChoices.tags[alwaysTag] ? alwaysTag : null;
    const here = presentPeople(r, s);
    if (tag) {
      const a = r.liveChoices.tags[tag];
      const target = a.perPerson ? here[0] : undefined;
      if (!a.perPerson || target)
        return { intent: { actionId: `${LIVE_PREFIX}${tag}${target ? `${TARGET_SEP}${target}` : ""}`, via: "choice", label: tag, params: { difficulty: a.check ? "fair" : "none" } }, typed: false, live, shown: null, tag };
    }
  }
  if (policy === "greedy") {
    let best = -1, top = -Infinity;
    live.forEach((c, i) => {
      const a = r.liveChoices.tags[c.tag];
      const view = views.find((v) => v.id === `${LIVE_PREFIX}${i}`);
      if (!a || !view)
        return;
      let g;
      if (a.check && c.difficulty !== "none" && view.odds !== null) {
        const p = view.odds, part = view.partialOdds ?? 0;
        g = p * relGain(r, a, "success") + part * relGain(r, a, "partial") + (1 - p - part) * relGain(r, a, "fail");
      } else
        g = relGain(r, a, null);
      const pos = Math.max(0, g) * tagTaper(r, s, c.tag, c.target) + Math.min(0, g);
      if (pos > top + 0.000000001 || Math.abs(pos - top) <= 0.000000001 && rng() < 0.5) {
        top = pos;
        best = i;
      }
    });
    if (best >= 0) {
      const out = click(best);
      if (out)
        return out;
    }
  }
  const [pClick, pDialogue, pOrdinary] = policy === "dialogue" ? [0, 0.6, 0.25] : [0.4, 0.3, 0.15];
  if (x < pClick && live.length) {
    const out = click(Math.floor(rng() * live.length));
    if (out)
      return out;
  }
  if (x < pClick + pDialogue + pOrdinary || r.style === "story" || !r.checks.typed || !r.checks.stats.length)
    return { intent: null, typed: true, live, shown: null, tag: null };
  const stat = r.checks.stats[Math.floor(rng() * r.checks.stats.length)];
  const difficulty = DIFFICULTIES[Math.floor(rng() * 4)];
  return { intent: { actionId: `try:${stat}`, params: { difficulty }, via: "adjudicator" }, typed: true, live, shown: null, tag: null };
}
var timeOf = (e) => e?.time ?? 0;
function effectMinutes(a, rec, rolled) {
  if (!a)
    return 0;
  const tier = rolled && a.check ? rec.check?.tier : undefined;
  const key = tier ? TIER_FALLBACK[tier].find((t) => a.outcomes[t]) : undefined;
  return timeOf(a.cost) + timeOf(a.effects) + (key ? timeOf(a.outcomes[key]) : 0);
}
function triggerMinutes(r, rec, told, mid) {
  let n = 0;
  const turnedOn = new Set([...rec.events, ...told].filter((e) => e.t === "trig" && e.v).map((e) => e.id));
  for (const t of r.triggers) {
    if (!timeOf(t.effects))
      continue;
    if (turnedOn.has(t.id) || t.repeat && mid.triggers[t.id] === true)
      n += timeOf(t.effects);
  }
  return n;
}
function expectedMinutes(r, before, intent, story, rec, told, mid) {
  if (!r.clock.enabled)
    return 0;
  let action = 0;
  if (before.contest)
    action = 1;
  else if (intent?.actionId.startsWith("try:"))
    action = (r.checks.time ?? r.clock.minutesPerAction) + timeOf(rec.check ? r.checks.outcomes[TIER_FALLBACK[rec.check.tier].find((t) => r.checks.outcomes[t]) ?? rec.check.tier] : undefined);
  else if (intent?.actionId.startsWith(LIVE_PREFIX)) {
    const a = r.liveChoices.tags[intent.actionId.slice(LIVE_PREFIX.length).split(TARGET_SEP)[0]];
    action = (a?.time ?? r.clock.minutesPerAction) + effectMinutes(a, rec, intent.params?.difficulty !== "none");
  }
  return action + triggerMinutes(r, rec, told, mid) + Math.min(story, r.clock.narratorMax);
}
function createLoopSim(r, opts = {}) {
  const N = Math.max(1, Math.round(opts.turns ?? 50));
  const M = Math.max(1, Math.round(opts.seeds ?? 50));
  const base = opts.seed ?? "loop";
  const alwaysTag = opts.always ?? kindTag(r);
  const policies = ["mixed", "dialogue", "greedy", ...alwaysTag ? [{ always: alwaysTag }] : []];
  const total = policies.length * M * N;
  let done = 0;
  const c = {
    turns: 0,
    typed: 0,
    typedRolled: 0,
    checks: 0,
    failsWithoutDirection: 0,
    crossings: 0,
    crossingsWithoutLine: 0,
    clockMisses: 0,
    sceneMisses: 0,
    contestsStarted: 0,
    contestsEndedByStory: 0,
    worstOddsGap: 0,
    minSpread: null,
    mixedGain: 0,
    alwaysGain: 0
  };
  const dialogue = { typed: 0, rolled: 0 };
  const picks = {};
  const buckets = new Map;
  const gains = { mixed: [], always: [] };
  let run = null;
  let pi = 0, mi = 0;
  const begin = (policy, m) => {
    let s = initialState(r);
    const first = Object.values(r.people)[0]?.name ?? (r.peopleOpen ? "Robin" : undefined);
    s = foldEvents(r, [applyGreeting(r, s, { time: { hour: 19 }, place: "The Square", present: first ? [first] : [], you: { outfit: "a coat" }, people: first ? { [first]: { outfit: "a scarf" } } : {}, adults: first ? { [first]: true } : {} })], s);
    return { policy, seed: m, s, n: 0, start: s, baseline: sceneOf(r, s) };
  };
  const step = (run) => {
    const tag = typeof run.policy === "object" ? `always-${run.policy.always}` : run.policy;
    const rng = seededRng(`${base}:${tag}:${run.seed}:${run.n}`);
    const before = run.s;
    const move = playerTurn(r, before, run, rng, alwaysTag);
    const rec = resolveTurn(r, before, move.intent, { seed: `${base}:${tag}:${run.seed}:${run.n}:dice` });
    const mid = foldEvents(r, [rec.events], before);
    const proposal = fakeProposal(r, mid, run.n, rng);
    const told = applyProposal(r, mid, proposal);
    const after = foldEvents(r, [told], mid);
    const whole = { ...rec, events: [...rec.events, ...told] };
    c.turns++;
    if (after.minutes - before.minutes !== expectedMinutes(r, before, move.intent, proposal.minutes ?? 0, rec, told, mid))
      c.clockMisses++;
    if (!sameScene(sceneOf(r, after), run.baseline))
      c.sceneMisses++;
    if (move.typed) {
      c.typed++;
      if (rec.check)
        c.typedRolled++;
      if (run.policy === "dialogue") {
        dialogue.typed++;
        if (rec.check)
          dialogue.rolled++;
      }
    }
    if (rec.check) {
      c.checks++;
      const real = d20Odds(rec.check.add, rec.check.target ?? 0, 0).success;
      if (move.shown !== null)
        c.worstOddsGap = Math.max(c.worstOddsGap, Math.abs(move.shown - real));
      const key = `${rec.check.add}|${rec.check.target}`;
      const b = buckets.get(key) ?? { add: rec.check.add, dc: rec.check.target ?? 0, shown: real, real: 0, n: 0, ok: 0 };
      b.n++;
      if (rec.check.tier === "success" || rec.check.tier === "crit_success")
        b.ok++;
      buckets.set(key, b);
      if (rec.check.tier === "partial" || rec.check.tier === "fail" || rec.check.tier === "crit_fail") {
        const packet = outcomePacket(r, rec, before, mid, "Sam") ?? "";
        if (!packet.includes("Direction:") && !rec.beats)
          c.failsWithoutDirection++;
      }
    }
    const checked = buildChoices(r, before, { lines: [], veils: [], live: move.live }).filter((v) => v.id.startsWith(LIVE_PREFIX) && v.odds !== null && v.difficulty && v.difficulty !== "none");
    if (!before.contest && new Set(checked.map((v) => v.difficulty)).size >= 2) {
      const spread = Math.max(...checked.map((v) => v.odds)) - Math.min(...checked.map((v) => v.odds));
      c.minSpread = c.minSpread === null ? spread : Math.min(c.minSpread, spread);
    }
    if (move.tag && run.policy === "greedy" && !before.contest)
      picks[move.tag] = (picks[move.tag] ?? 0) + 1;
    const crossings = bandCrossings(r, before, after);
    if (crossings.length) {
      c.crossings += crossings.length;
      if (!buildRecordView(r, "m", 0, whole, before, after).lines.length)
        c.crossingsWithoutLine++;
    }
    if (told.some((e) => e.t === "contest"))
      c.contestsStarted++;
    if (told.some((e) => e.t === "contest_end"))
      c.contestsEndedByStory++;
    run.s = after;
    run.n++;
  };
  const finishRun = (run) => {
    const g = relTotal(r, run.s) - relTotal(r, run.start);
    if (run.policy === "mixed")
      gains.mixed.push(g);
    if (typeof run.policy === "object")
      gains.always.push(g);
  };
  const sim = {
    get progress() {
      return total ? done / total : 1;
    },
    run(turns) {
      let left = Math.max(1, Math.floor(turns));
      while (left > 0 && pi < policies.length) {
        if (!run)
          run = begin(policies[pi], mi);
        step(run);
        done++;
        left--;
        if (run.n >= N) {
          finishRun(run);
          run = null;
          if (++mi >= M) {
            mi = 0;
            pi++;
          }
        }
      }
      return pi >= policies.length;
    },
    report() {
      const avg = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
      c.mixedGain = avg(gains.mixed);
      c.alwaysGain = avg(gains.always);
      const pickTotal = Object.values(picks).reduce((a, b) => a + b, 0);
      const tagShare = Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, v / pickTotal]));
      const checks = [...buckets.values()].map(({ ok, ...row }) => ({ ...row, real: ok / row.n })).sort((a, b) => a.dc - b.dc || a.add - b.add);
      const contests = [];
      if (r.style === "adventure")
        for (const kind of Object.keys(r.conflict.kinds))
          for (let add = 0;add <= 6; add++)
            for (const threat of DIFFICULTIES) {
              const sim = simulateContest(r, kind, add, threat, opts.contestRuns ?? 2000, base);
              contests.push({ kind, add, threat, won: sim.won, meanRounds: sim.meanRounds, within: sim.within, brokenOff: sim.brokenOff });
            }
      const gates = [
        { id: "clock", label: "The clock is the start plus every move's minutes, the rules' time: effects and the story's (capped) minutes", value: c.clockMisses, bar: "= 0 turns off", pass: c.clockMisses === 0 },
        { id: "scene", label: "Place, who is here and looks change only when the story or a move changes them", value: c.sceneMisses, bar: "= 0 turns off", pass: c.sceneMisses === 0 },
        { id: "crossing-lines", label: "Band crossings without a line in the same record", value: c.crossingsWithoutLine, bar: "= 0", pass: c.crossingsWithoutLine === 0 },
        { id: "story-ends-contest", label: "Contests the story ended", value: c.contestsEndedByStory, bar: "= 0", pass: c.contestsEndedByStory === 0 }
      ];
      if (r.style === "adventure") {
        const typedShare = dialogue.typed ? dialogue.rolled / dialogue.typed : 0;
        gates.push({ id: "odds-shown-real", label: "Shown odds vs the real odds of the check that was rolled", value: c.worstOddsGap, bar: "≤ 0.02", pass: c.worstOddsGap <= 0.02 }, { id: "typed-rolls", label: "Typed messages that rolled, in a dialogue-heavy chat", value: typedShare, bar: "≤ 1/3", pass: typedShare <= 1 / 3 }, { id: "fail-direction", label: "Partial, failed and critically failed checks without a direction", value: c.failsWithoutDirection, bar: "= 0", pass: c.failsWithoutDirection === 0 }, { id: "odds-spread", label: "Odds spread of the written choices (easy … hard)", value: c.minSpread ?? 0, bar: "≥ 0.20", pass: c.minSpread === null || c.minSpread >= 0.2 });
        if (contests.length) {
          const mean = contests.map((x) => x.meanRounds), within = contests.map((x) => x.within), broke = contests.map((x) => x.brokenOff);
          gates.push({ id: "contest-rounds", label: "Contest mean rounds, every kind × add 0–6 × threat", value: Math.max(...mean), bar: "3–6 in every cell", pass: mean.every((m) => m >= 3 && m <= 6) }, { id: "contest-3-6", label: "Share of contests that end in 3–6 rounds (worst cell)", value: Math.min(...within), bar: "≥ 0.80", pass: within.every((w) => w >= 0.8) }, { id: "contest-break-off", label: "Share of contests that break off at the last round (worst cell)", value: Math.max(...broke), bar: "≤ 0.05", pass: broke.every((b) => b <= 0.05) });
        }
      }
      if (pickTotal) {
        const top = Math.max(...Object.values(tagShare));
        gates.push({ id: "greedy-tag-share", label: "Share of one tag in a greedy player's picks", value: top, bar: "≤ 0.50", pass: top <= 0.5 });
      }
      if (alwaysTag && gains.always.length) {
        const ratio = c.mixedGain > 0 ? c.alwaysGain / c.mixedGain : c.alwaysGain > 0 ? Infinity : 0;
        gates.push({ id: "always-kind", label: `Relationship gain of always "${alwaysTag}" vs a mixed player`, value: ratio, bar: "≤ 1.5", pass: ratio <= 1.5 });
      }
      return {
        turns: N,
        seeds: M,
        gates,
        tagShare,
        checks,
        contests,
        counts: { ...c, alwaysTag },
        pass: gates.every((g) => g.pass)
      };
    }
  };
  return sim;
}
function runLoopSim(r, opts = {}) {
  const sim = createLoopSim(r, opts);
  while (!sim.run(1000)) {}
  return sim.report();
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
async function attachedRulebooks(character, userId) {
  const books = (await Promise.all((character.world_book_ids ?? []).map((id) => host2().world_books.get(id, userId)))).filter((book) => !!book);
  const active = [...books].reverse().find((book) => isRulesetBookName(book.name) && isInstalledRulebook(book));
  return { books, active };
}
function labelOf(comment) {
  return comment.replace(/^\s*(?:\[[^\]]*\]\s*)?warp[-_ ]?ruleset\s*[·:\-–—|]?\s*/i, "").trim().toLowerCase() || "core";
}
async function rulesetEntries(characterId, userId) {
  const c = await host2().characters.get(characterId, userId);
  const entries = [];
  let rulesetBook = null;
  const attached = await attachedRulebooks(c ?? {}, userId);
  for (const book of attached.books) {
    if (attached.active && attached.active.id !== book.id)
      continue;
    const bookId = book.id;
    const whole = isRulesetBookName(book.name);
    if (whole && !rulesetBook)
      rulesetBook = bookId;
    for (let offset = 0;offset < 2000; offset += 200) {
      const page = await host2().world_books.entries.list(bookId, { limit: 200, offset, userId });
      for (const e of page.data)
        if (whole || isRulesetEntryTitle(e.comment))
          entries.push({ id: e.id, bookId, label: labelOf(e.comment ?? ""), content: e.content });
      if (page.data.length < 200)
        break;
    }
  }
  return { entries, rulesetBook, bookIds: c?.world_book_ids ?? [] };
}
var installs = new Map;
function publishRulebook(characterId, parts, userId, metadata = {}, replace) {
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
      await host2().characters.update(characterId, { world_book_ids: [...(latest.world_book_ids ?? []).filter((id) => !replace || id !== replace), book.id] }, userId);
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
var ENGINE_FORMAT = RULESET_FORMAT;
var STUDIO_VERSION = package_default.version;
var WARP_PIN = package_default.devDependencies.warp;
var WARP_PIN_SHORT = (() => {
  const m = /#([0-9a-f]{7,40})$/i.exec(WARP_PIN);
  return m ? `warp#${m[1].slice(0, 7)}` : WARP_PIN;
})();
var STAMP = { format: RULESET_FORMAT, by: `warp_studio@${package_default.version}` };
function contestAddAtStart(r, s, kind) {
  return Math.max(0, ...kind.stats.map((st) => statAdd(r, s, st)));
}

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
    if (labels.has(head))
      return head;
    const byKey = PART_OF_KEY[head.replace(/\s+/g, "_")];
    return byKey && labels.has(byKey) ? byKey : partForIssue(where);
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

// src/audit/audit.ts
var SYSTEMS = [
  { id: "scene", label: "Scene" },
  { id: "people", label: "People" },
  { id: "checks", label: "Checks" },
  { id: "choices", label: "Choices" },
  { id: "conflict", label: "Conflict" },
  { id: "growth", label: "Growth" }
];
function withWaivers(rep, waived) {
  const findings = rep.findings.map((f) => ({ ...f, waived: waived[f.id]?.reason ?? null }));
  return { findings, open: findings.filter((f) => !f.waived).length };
}
var partOf = (key) => PART_OF_KEY[key] ?? "core";
var PART = {
  scene: partOf("clock"),
  stats: partOf("stats"),
  checks: partOf("checks"),
  people: partOf("relationships"),
  world: partOf("items"),
  actions: partOf("actions"),
  secrets: partOf("secrets"),
  choices: partOf("live_choices"),
  goals: partOf("goals"),
  triggers: partOf("triggers"),
  conflict: partOf("conflict")
};
var FORMULA_KEYS = new Set(["when", "add", "target", "maxExpr", "perHourExpr", "startExpr", "doneWhen", "failWhen", "swing"]);
var CALLS = /\b(has|count|cond|flag|rel|met|present|goal|secret|in_contest|eff|gear)\(\s*'([^']+)'/g;
var isEffect = (o) => !!o && typeof o === "object" && ("stats" in o) && ("addConditions" in o) && ("removeConditions" in o);
function readFormula(v, seen) {
  try {
    compile(v);
  } catch {
    return;
  }
  for (const id of identifiers(v))
    seen.reads.add(id);
  for (const m of v.matchAll(CALLS))
    seen.calls.add(`${m[1]}:${m[2]}`);
}
function walk(o, seen, money, key = "") {
  if (typeof o === "string") {
    if (FORMULA_KEYS.has(key))
      readFormula(o, seen);
    return;
  }
  if (!o || typeof o !== "object")
    return;
  if (Array.isArray(o)) {
    for (const x of o)
      if (x && typeof x === "object")
        walk(x, seen, money);
    return;
  }
  if (isEffect(o)) {
    for (const v of [...Object.values(o.stats), ...Object.values(o.set)])
      if (typeof v === "string")
        readFormula(v, seen);
    for (const [k, v] of [...Object.entries(o.stats), ...Object.entries(o.set)]) {
      seen.changed.add(k);
      if (k === money) {
        const n = typeof v === "number" ? v : /^\s*-/.test(String(v)) ? -1 : 1;
        if (n > 0)
          seen.moneyUp = true;
        else if (n < 0)
          seen.moneyDown = true;
      }
    }
    for (const m of Object.values(o.rel ?? {}))
      for (const [k, v] of Object.entries(m ?? {})) {
        seen.relChanged.add(k);
        if (typeof v === "string")
          readFormula(v, seen);
      }
    for (const [k, v] of Object.entries(o.items ?? {}))
      (v > 0 ? seen.itemsGiven : seen.itemsTaken).add(k);
    for (const [k, d] of Object.entries(o.addConditions ?? {})) {
      seen.condAdded.add(k);
      if (d !== null)
        seen.condTimed.add(k);
    }
    for (const k of o.removeConditions ?? [])
      seen.condRemoved.add(k);
    for (const k of Object.keys(o.flags ?? {}))
      seen.flagsSet.add(k);
    if (o.contest)
      seen.contestStarted = true;
  }
  for (const [k, v] of Object.entries(o))
    walk(v, seen, money, k);
}
function effectDoes(e) {
  return !!e && Object.entries(e).some(([k, v]) => k !== "hint" && v !== undefined && v !== null && (typeof v !== "object" || (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)));
}
var actionDoes = (a) => !!a.check || (a.time ?? 0) > 0 || [a.effects, a.cost, ...Object.values(a.outcomes)].some(effectDoes);
var meaningful = (e) => effectDoes({ ...e, removeConditions: [] }) || !!e.hint;
function scoreOf(findings, declared) {
  const weight = findings.reduce((n, f) => n + (f.severity === "gap" ? 1 : 0.4), 0);
  return Math.max(0, Math.min(100, Math.round(100 * (1 - weight / Math.max(1, declared)))));
}
function auditRuleset(r) {
  const adventure = r.style !== "story";
  const money = r.statOrder.find((id) => r.stats[id].kind === "money");
  const seen = {
    changed: new Set,
    relChanged: new Set,
    reads: new Set,
    calls: new Set,
    itemsGiven: new Set,
    itemsTaken: new Set,
    condAdded: new Set,
    condTimed: new Set,
    condRemoved: new Set,
    flagsSet: new Set,
    contestStarted: false,
    moneyUp: false,
    moneyDown: false
  };
  walk(r, seen, money);
  for (const id of Object.keys(r.startItems))
    seen.itemsGiven.add(id);
  const kinds = adventure ? Object.values(r.conflict.kinds) : [];
  for (const k of kinds)
    for (const e of Object.values(k.cost))
      if (e)
        for (const s of Object.keys(e.stats))
          seen.changed.add(s);
  const out = [];
  const add = (f) => out.push(f);
  const start = initialState(r);
  if (r.clock.enabled && r.clock.start !== "greeting")
    add({ id: "scene-clock-fixed", system: "scene", severity: "thin", part: PART.scene, text: "The clock starts at a fixed time, whatever the greeting says.", fix: "Use `clock.start: greeting` with a `fallback`, so the first scene's time comes from the greeting." });
  for (const it of Object.values(r.items)) {
    const bonus = Object.keys(it.bonus).length > 0;
    const referenced = seen.calls.has(`has:${it.id}`) || seen.calls.has(`count:${it.id}`) || seen.itemsTaken.has(it.id);
    if (!it.use && !bonus && !referenced)
      add({ id: `item-dead:${it.id}`, system: "scene", severity: "gap", part: PART.world, text: `${it.name} does nothing: no use, no bonus, and nothing needs it.`, fix: `Give it a \`use:\`${it.desc ? ` (its description says: "${it.desc}")` : ""}, a \`bonus:\` to the checks it helps, or an action or tag that needs it.` });
    else if (!seen.itemsGiven.has(it.id) && !r.itemsOpen)
      add({ id: `item-unobtainable:${it.id}`, system: "scene", severity: "gap", part: PART.world, text: `${it.name} matters, but nothing gives it to the player.`, fix: "Add it to `start.items` or a `give:` effect." });
  }
  if (money && r.stats[money].narrator <= 0) {
    const label = r.stats[money].label;
    if (!seen.moneyUp)
      add({ id: "money-no-income", system: "scene", severity: "gap", part: PART.actions, text: `There is ${label} but no way to earn it.`, fix: "Add paid actions or rewards that raise it." });
    if (!seen.moneyDown)
      add({ id: "money-no-spending", system: "scene", severity: "gap", part: PART.actions, text: `${label} piles up with nothing to spend it on.`, fix: "Add costs to spend it on." });
  }
  if (!r.relStatOrder.length)
    add({ id: "rel-none", system: "people", severity: "gap", part: PART.people, text: "No relationship stats: nobody's feelings are tracked.", fix: "Add 2 relationship stats with bands (affection, trust)." });
  for (const id of r.relStatOrder) {
    const d = r.relStats[id];
    const bands = [...d.bands].sort((a, b) => a.at - b.at);
    if (bands.length < 2) {
      add({ id: `rel-no-bands:${id}`, system: "people", severity: "gap", part: PART.people, text: `${d.label} has ${bands.length ? "one band" : "no bands"}, so the player never sees it move.`, fix: "Give it bands; a band crossing is what the player sees." });
    } else {
      if (!bands.some((b) => b.voice))
        add({ id: `rel-no-voice:${id}`, system: "people", severity: "thin", part: PART.people, text: `No band of ${d.label} changes how a person speaks.`, fix: "Give each band a `voice:`: how the person speaks and acts at that level." });
      const missing = bands.some((b, i) => i > 0 && !b.say || i < bands.length - 1 && !b.sayDown);
      if (missing)
        add({ id: `rel-no-say:${id}`, system: "people", severity: "thin", part: PART.people, text: `Some bands of ${d.label} have no story line of their own (Warp shows a plain default).`, fix: "Write the line the player reads when the band is reached (`say:` going up, `say_down:` going down)." });
    }
    if (d.narrator <= 0 && !seen.relChanged.has(id))
      add({ id: `rel-frozen:${id}`, system: "people", severity: "gap", part: PART.people, text: `${d.label} never changes: the story may not move it and no effect does.`, fix: "Let the story move it a little (`narrator: 4`) or give tags effects on it." });
    else if (d.narrator > 10 || d.narrator > (d.max - d.min) / 5)
      add({ id: `rel-no-cap:${id}`, system: "people", severity: "thin", part: PART.people, text: `${d.label} may jump by ${d.narrator} in one reply: no slow burn.`, fix: "Lower the cap (4–5): one reply should not jump a band." });
  }
  const people = Object.values(r.people);
  if (people.length && !Object.keys(r.secrets).length)
    add({ id: "people-no-secret", system: "people", severity: "thin", part: PART.secrets, text: "Nobody hides anything.", fix: "Give the main person one secret with 2 stages that open by band." });
  for (const s of Object.values(r.secrets)) {
    const stuck = s.stages.some((st) => [...(st.when ?? "").matchAll(/\bflag\(\s*'([^']+)'/g)].some((m) => !seen.flagsSet.has(m[1]) && !r.flags[m[1]]?.narrator && !r.flags[m[1]]?.start));
    if (stuck)
      add({ id: `secret-stuck:${s.id}`, system: "people", severity: "gap", part: PART.secrets, text: `A stage of the secret "${s.id}" waits for a flag nothing sets.`, fix: "Set the flag from an action or trigger, or open the stage by `band:`." });
    if (s.tell === "exists" && (s.stages[0]?.when ?? "") !== "")
      add({ id: `secret-no-cue:${s.id}`, system: "people", severity: "thin", part: PART.secrets, text: `The narrator knows "${s.about}" hides something, but not how it shows.`, fix: "Add a `cue:`: what the narrator shows while it stays hidden." });
  }
  if (adventure) {
    const rolled = new Set([...r.checks.stats, ...kinds.flatMap((k) => [...k.stats, k.escape])]);
    for (const id of r.statOrder) {
      const d = r.stats[id];
      if (d.kind !== "attribute" && d.kind !== "skill")
        continue;
      if (!rolled.has(id) && !seen.reads.has(id) && !seen.calls.has(`eff:${id}`) && !seen.calls.has(`gear:${id}`))
        add({ id: `skill-unused:${id}`, system: "checks", severity: "gap", part: PART.stats, text: `${d.label} is ${d.kind === "skill" ? "a skill" : "an attribute"} no check uses.`, fix: "Let a tag, action or contest kind lean on it, or remove it." });
    }
    if (r.checks.typed && !Object.values(r.checks.outcomes).some(effectDoes))
      add({ id: "checks-no-outcomes", system: "checks", severity: "thin", part: PART.checks, text: "A failed risky move costs nothing.", fix: "Give a failed risky move a cost (`checks.outcomes.fail`)." });
    for (const a of Object.values(r.actions)) {
      if (!a.check || a.perPerson)
        continue;
      const o = odds(r, start, a);
      if (!o)
        continue;
      const p = o.success + o.partial / 2;
      if (p < 0.12 || p > 0.95)
        add({ id: `odds:${a.id}`, system: "checks", severity: "balance", part: PART.actions, text: `"${a.label}" succeeds ${Math.round(p * 100)}% of the time at the start.`, fix: "Aim for 30–80 % at the start." });
    }
  }
  const lc = r.liveChoices;
  const tags = Object.entries(lc.tags);
  if (!lc.enabled)
    add({ id: "choices-off", system: "choices", severity: "thin", part: PART.choices, text: "No choices are written with the replies.", fix: "Turn on `live_choices` with 4–6 tags." });
  else {
    if (tags.length < 3)
      add({ id: "tags-few", system: "choices", severity: "gap", part: PART.choices, text: `Only ${tags.length} live-choice tag${tags.length === 1 ? "" : "s"}: three choices cannot differ in kind.`, fix: "Add tags until 3 choices can differ in kind." });
    if (adventure) {
      for (const [id, t] of tags)
        if (!actionDoes(t))
          add({ id: `tag-dead:${id}`, system: "choices", severity: "gap", part: PART.choices, text: `The tag "${id}" changes nothing.`, fix: "Give it effects (rel, stats) or a check with success/fail." });
    }
    if (adventure && tags.length && !tags.some(([, t]) => t.check))
      add({ id: "tags-no-risk", system: "choices", severity: "thin", part: PART.choices, text: "No tag rolls: every choice is safe.", fix: "Give 1–2 tags a check, so the choices differ in odds." });
    if (adventure && tags.length && tags.every(([, t]) => t.check))
      add({ id: "tags-all-risk", system: "choices", severity: "thin", part: PART.choices, text: "Every tag rolls: there is no safe choice.", fix: "Keep one safe tag (no check)." });
    if (lc.taper === false)
      add({ id: "taper-off", system: "choices", severity: "thin", part: PART.choices, text: "Repeating the same tag never wears off.", fix: "Keep taper on, or one kind button wins every time." });
  }
  for (const a of Object.values(r.actions))
    if (!actionDoes(a))
      add({ id: `action-dead:${a.id}`, system: "choices", severity: "gap", part: PART.actions, text: `"${a.label}" does nothing.`, fix: "Give it effects, or remove it." });
  const visible = Object.values(r.actions).filter((a) => !a.hidden).length;
  if (visible > 4)
    add({ id: "actions-many", system: "choices", severity: "thin", part: PART.actions, text: `${visible} authored actions; only 4 show under the choices.`, fix: "Only 4 show under the choices; fold the rest into tags." });
  if (adventure) {
    if (!r.conflict.fromStory && !seen.contestStarted)
      add({ id: "contest-never", system: "conflict", severity: "gap", part: PART.conflict, text: "Nothing can start a contest: the story may not, and no action or trigger does.", fix: "Allow the story to start contests, or start one from an action or trigger." });
    for (const k of kinds) {
      if (!effectDoes(k.cost.fail) && !effectDoes(k.cost.crit_fail))
        add({ id: `kind-free:${k.id}`, system: "conflict", severity: "thin", part: PART.conflict, text: `Losing a round of ${k.label} costs nothing.`, fix: "Losing a round should cost something (`cost.fail: { health: -8 }`)." });
      if (!effectDoes(k.won) && !effectDoes(k.lost))
        add({ id: `kind-flat:${k.id}`, system: "conflict", severity: "thin", part: PART.conflict, text: `Winning or losing ${k.label} changes nothing.`, fix: "Winning or losing should change a stat, a relationship or a flag." });
      const sim = simulateContest(r, k.id, contestAddAtStart(r, start, k), "fair", 400, "studio");
      if (sim.won < 0.2 || sim.won > 0.95)
        add({ id: `contest-odds:${k.id}`, system: "conflict", severity: "balance", part: PART.conflict, text: `With the start stats, the player wins ${k.label} ${Math.round(sim.won * 100)}% of the time against a fair threat.`, fix: "Change the kind's `stats` or the start stats." });
    }
  }
  const kindCost = new Set(kinds.flatMap((k) => Object.values(k.cost).flatMap((e) => e ? Object.keys(e.stats) : [])));
  for (const id of r.statOrder) {
    const d = r.stats[id];
    if (d.kind === "hidden" || d.kind === "money")
      continue;
    const grows = (d.kind === "skill" || d.kind === "attribute") && r.growth.enabled && d.growth > 0 && adventure;
    const changes = seen.changed.has(id) || d.perHour !== 0 || d.perHourExpr !== undefined || d.narrator > 0 || grows || kindCost.has(id);
    if (!changes)
      add({ id: `stat-static:${id}`, system: "growth", severity: "gap", part: PART.stats, text: `${d.label} never changes.`, fix: "Let actions, contests, triggers or time move it." });
    if (d.kind === "meter") {
      if (!seen.reads.has(id) && !seen.calls.has(`eff:${id}`))
        add({ id: `stat-unread:${id}`, system: "growth", severity: "thin", part: PART.stats, text: `${d.label} is shown but nothing reacts to it.`, fix: "Let something react to it (a trigger at a band, a check penalty)." });
      if (!d.bands.length)
        add({ id: `meter-no-bands:${id}`, system: "growth", severity: "thin", part: PART.stats, text: `${d.label} shows as a bare number.`, fix: "Give it 3–4 bands, so it shows in words." });
      if (d.perHour) {
        const toEdge = d.perHour > 0 ? d.max - d.start : d.start - d.min;
        const hours = toEdge / Math.abs(d.perHour);
        const bad = d.perHour > 0 && d.good === "low" || d.perHour < 0 && d.good === "high";
        if (bad && hours < 8)
          add({ id: `drift:${id}`, system: "growth", severity: "balance", part: PART.stats, text: `${d.label} reaches its worst in about ${Math.max(1, Math.round(hours))}h of game time on its own.`, fix: "Slow the `per_hour` drift." });
      }
    }
  }
  for (const c of Object.values(r.conditions)) {
    const added = seen.condAdded.has(c.id) || c.narrator;
    if (!added) {
      add({ id: `cond-never:${c.id}`, system: "growth", severity: "gap", part: PART.world, text: `Nothing ever causes ${c.label}.`, fix: "Add it from an action, a contest cost or a trigger." });
      continue;
    }
    if (!seen.condRemoved.has(c.id) && !c.lasts && !(seen.condTimed.has(c.id) && !c.narrator))
      add({ id: `cond-uncured:${c.id}`, system: "growth", severity: "thin", part: PART.world, text: `Nothing ends ${c.label}.`, fix: "Give it `lasts:` or a cure." });
    if (!Object.keys(c.bonus).length && !seen.calls.has(`cond:${c.id}`))
      add({ id: `cond-unread:${c.id}`, system: "growth", severity: "thin", part: PART.world, text: `${c.label} only colours the narration.`, fix: "Give it a `bonus:` to checks, or a trigger that reads it." });
  }
  for (const f of Object.values(r.flags)) {
    const set = seen.flagsSet.has(f.id) || f.narrator;
    const read = seen.calls.has(`flag:${f.id}`) || seen.reads.has(f.id);
    if (set && !read)
      add({ id: `flag-unread:${f.id}`, system: "growth", severity: "thin", part: PART.world, text: `The flag ${f.id} is set but nothing reads it.`, fix: `Read it somewhere: an action's \`when\`, a trigger or a secret stage (flag('${f.id}')).` });
    if (!set && read && !f.start)
      add({ id: `flag-unset:${f.id}`, system: "growth", severity: "gap", part: PART.world, text: `The flag ${f.id} is read but nothing sets it.`, fix: `Set it from an action or trigger (\`flags: { ${f.id}: true }\`).` });
  }
  const env = makeEnv(r, start);
  for (const t of r.triggers) {
    if (t.when && !t.whenScene && !t.repeat && meaningful(t.effects) && evalBool(t.when, env, false))
      add({ id: `trig:${t.id}`, system: "growth", severity: "balance", part: PART.triggers, text: `The rule "${t.id}" fires on turn one.`, fix: "Change its `when` or the start values." });
  }
  const goals = Object.values(r.goals.list);
  if (!r.goals.fromStory && !goals.length)
    add({ id: "goals-none", system: "growth", severity: "thin", part: PART.goals, text: "There is nothing to work toward.", fix: "Let the story make goals, or add 1–3." });
  for (const g of goals) {
    if (!g.stakes && !effectDoes(g.reward) && !g.failWhen && !g.judgeFail)
      add({ id: `goal-no-stakes:${g.id}`, system: "growth", severity: "thin", part: PART.goals, text: `The goal "${g.text}" has nothing at stake.`, fix: "Say what is at stake, or give a reward." });
  }
  const declared = {
    scene: 1 + Object.keys(r.items).length + (money ? 1 : 0) + 1,
    people: r.relStatOrder.length + people.length + Object.keys(r.secrets).length + 1,
    checks: r.statOrder.filter((id) => ["attribute", "skill"].includes(r.stats[id].kind)).length + Object.values(r.actions).filter((a) => a.check).length + 1 + 1,
    choices: tags.length + Object.keys(r.actions).length + 1,
    conflict: kinds.length + 1 + 1,
    growth: r.statOrder.length + Object.keys(r.conditions).length + Object.keys(r.flags).length + r.triggers.length + goals.length + 1
  };
  const systems = SYSTEMS.map((s) => {
    const used = adventure || s.id !== "checks" && s.id !== "conflict";
    const mine = out.filter((f) => f.system === s.id);
    return { id: s.id, label: s.label, score: used ? scoreOf(mine, declared[s.id]) : null, declared: declared[s.id], findings: mine.length };
  });
  return { findings: out, systems };
}

// src/audit/report.ts
function checkView(r, waived = {}) {
  const rep = auditRuleset(r);
  const w = withWaivers(rep, waived);
  return { style: r.style === "story" ? "story" : "adventure", systems: rep.systems, findings: w.findings, open: w.open };
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
  if (hud.you.appearance || hud.you.outfit)
    panel.push(`You: ${[hud.you.appearance, hud.you.outfit && `wearing ${hud.you.outfit}`].filter(Boolean).join("; ")}`);
  for (const p of hud.people) {
    const bands = p.stats.map((x) => `${x.label} ${x.text ?? x.display}`).join(", ");
    panel.push(`${p.name}${p.present ? " (here)" : ""}${bands ? `: ${bands}` : ""}`);
  }
  for (const g of hud.goals)
    panel.push(`Goal (${g.status}): ${g.text}${g.from ? ` — for ${g.from}` : ""}${g.stakes ? ` · at stake: ${g.stakes}` : ""}`);
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

// src/sim/playtest.ts
function summarize(r, rep) {
  const start = initialState(r);
  const odds2 = [];
  if (r.style !== "story") {
    for (const [tag, a] of Object.entries(r.liveChoices.tags)) {
      if (!a.check)
        continue;
      const cells = DIFFICULTIES.map((word) => {
        const o = odds(r, start, a, { difficulty: word });
        return { word, pct: o ? Math.round(o.success * 100) : 0 };
      });
      odds2.push({ tag, label: a.check.label ?? tag, cells });
    }
  }
  const contests = [];
  for (const kind of [...new Set(rep.contests.map((c) => c.kind))]) {
    const def = r.conflict.kinds[kind];
    const rows = [];
    for (const c of rep.contests.filter((x) => x.kind === kind)) {
      let row = rows.find((x) => x.add === c.add);
      if (!row) {
        row = { add: c.add, cells: [] };
        rows.push(row);
      }
      row.cells.push({ threat: c.threat, won: c.won, meanRounds: c.meanRounds });
    }
    contests.push({ kind, label: def?.label ?? kind, best: def ? contestAddAtStart(r, start, def) : 0, rows });
  }
  return {
    turns: rep.turns,
    seeds: rep.seeds,
    pass: rep.pass,
    gates: rep.gates,
    tagShare: Object.entries(rep.tagShare).map(([tag, share]) => ({ tag, share })).sort((a, b) => b.share - a.share),
    odds: odds2,
    contests,
    counts: rep.counts
  };
}
function playtestNow(r, o) {
  return summarize(r, runLoopSim(r, { turns: o.turns, seeds: o.seeds, contestRuns: o.contestRuns, seed: o.seed }));
}

class Cancelled extends Error {
  constructor() {
    super("Cancelled.");
    this.name = "Cancelled";
  }
}
async function playtest(r, o, hooks = {}) {
  const sim = createLoopSim(r, { turns: o.turns, seeds: o.seeds, contestRuns: o.contestRuns, seed: o.seed });
  const chunk = Math.max(1, hooks.chunk ?? 50);
  for (;; ) {
    if (hooks.signal?.aborted)
      throw new Cancelled;
    const done = sim.run(chunk);
    hooks.progress?.(sim.progress);
    if (done)
      break;
    await new Promise((res) => setTimeout(res, 0));
  }
  if (hooks.signal?.aborted)
    throw new Cancelled;
  return summarize(r, sim.report());
}

// src/backend/helper.ts
class Budget {
  max;
  used = 0;
  constructor(max) {
    this.max = max;
  }
  get left() {
    return Math.max(0, this.max - this.used);
  }
  take() {
    if (this.used >= this.max)
      throw new BudgetSpent(this.max);
    this.used++;
  }
}

class BudgetSpent extends Error {
  constructor(max) {
    super(`The helper call budget (${max}) is used up.`);
    this.name = "BudgetSpent";
  }
}
async function askHelper(system, user, o) {
  if (o.signal.aborted)
    throw o.signal.reason instanceof Error ? o.signal.reason : new Error("Cancelled.");
  o.budget.take();
  const res = await host().generate.quiet({
    type: "quiet",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    connection_id: o.connectionId || undefined,
    parameters: { temperature: o.creative ? 0.8 : 0.4, max_tokens: o.maxTokens ?? 3500 },
    userId: o.userId,
    signal: AbortSignal.any([o.signal, AbortSignal.timeout(o.timeoutMs ?? 180000)])
  });
  return typeof res === "string" ? res : res?.content ?? "";
}

// src/backend/jobs.ts
var GUARD_PLAYTEST = { turns: 20, seeds: 10, contestRuns: 200 };
var clip = (v, n) => v.length > n ? `${v.slice(0, n)}…` : v;
function briefOf(c) {
  return [
    `Name: ${c.name}`,
    c.description && `Description:
${clip(c.description, 4000)}`,
    c.personality && `Personality:
${clip(c.personality, 1500)}`,
    c.scenario && `Scenario:
${clip(c.scenario, 1500)}`,
    c.first_mes && `Greeting:
${clip(c.first_mes, 2500)}`,
    c.creator_notes && `Creator notes:
${clip(c.creator_notes, 1000)}`
  ].filter(Boolean).join(`

`);
}
function contextOf(parts, except) {
  const { ruleset: r } = checkParts(parts.filter((p) => p.label !== except && p.yaml.trim()));
  if (!r)
    return "";
  const list = (label, ids) => ids.length ? `${label}: ${ids.join(", ")}` : "";
  return [
    `Style: ${r.style}`,
    list("Stats", r.statOrder.map((id) => `${id} (${r.stats[id].kind}${r.stats[id].kind === "meter" ? ` ${r.stats[id].min}–${r.stats[id].max}` : ""})`)),
    list("Relationship stats (bands)", r.relStatOrder.map((id) => `${id} (${r.relStats[id].bands.map((b) => b.text).join(", ")})`)),
    list("People", Object.keys(r.people)),
    list("Items", Object.keys(r.items)),
    list("Conditions", Object.keys(r.conditions)),
    list("Flags", Object.keys(r.flags)),
    list("Live-choice tags", Object.keys(r.liveChoices.tags)),
    r.style !== "story" ? list("Contest kinds", Object.keys(r.conflict.kinds)) : "",
    list("Goals", Object.keys(r.goals.list)),
    list("Secrets", Object.keys(r.secrets))
  ].filter(Boolean).join(`
`);
}
function assessDraft(parts) {
  const c = checkParts(parts);
  const partErrors = Object.fromEntries(c.parts.map((p) => [p.label, p.issues.filter((i) => i.level === "error").length]));
  if (!c.ruleset || c.errors)
    return { errors: Math.max(1, c.errors), partErrors, scores: {}, gates: [] };
  const scores = {};
  for (const s of auditRuleset(c.ruleset).systems)
    if (s.score !== null)
      scores[s.label] = s.score;
  const gates = playtestNow(c.ruleset, GUARD_PLAYTEST).gates.map((g) => ({ id: g.id, label: g.label, pass: g.pass }));
  return { errors: 0, partErrors, scores, gates };
}
function deepenTargets(findings) {
  const out = [];
  for (const f of findings) {
    if (f.waived || f.severity === "balance")
      continue;
    const t = out.find((x) => x.label === f.part);
    if (t)
      t.findings.push(f);
    else
      out.push({ label: f.part, findings: [f] });
  }
  return out;
}
function fixTargets(f) {
  return [{ label: f.part, findings: [f] }];
}
function legacyNote(parts) {
  const keys = legacyKeys(parts);
  if (!keys.length)
    return "";
  const blocks = [];
  for (const p of parts) {
    const lines = p.yaml.split(`
`);
    let keep = false;
    for (const l of lines) {
      const key = /^([A-Za-z_]\w*)\s*:/.exec(l)?.[1];
      if (key)
        keep = keys.includes(key);
      if (keep)
        blocks.push(l);
    }
  }
  return `This rulebook has parts Warp no longer runs (${keys.join(", ")}). Their old text is below; where it fits the card, rebuild what they did with the keys in the reference (conflict kinds for fights, goals for jobs and errands). Do not copy the removed keys.
${clip(blocks.join(`
`), 4000)}`;
}
function partsKey(parts) {
  let h = 2166136261;
  for (const ch of JSON.stringify(parts.map((p) => [p.label, p.yaml.trim()]))) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// src/rulebook/diff.ts
function diffLines(a, b) {
  const x = a.replace(/\r\n?/g, `
`).replace(/\n$/, "").split(`
`);
  const y = b.replace(/\r\n?/g, `
`).replace(/\n$/, "").split(`
`);
  if (a === "")
    x.length = 0;
  if (b === "")
    y.length = 0;
  const n = x.length, m = y.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1;i >= 0; i--)
    for (let j = m - 1;j >= 0; j--)
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      out.push({ op: " ", text: x[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1])
      out.push({ op: "-", text: x[i++] });
    else
      out.push({ op: "+", text: y[j++] });
  }
  while (i < n)
    out.push({ op: "-", text: x[i++] });
  while (j < m)
    out.push({ op: "+", text: y[j++] });
  return out;
}
function diffHunks(lines, context = 2) {
  const keep = new Array(lines.length).fill(false);
  lines.forEach((l, k) => {
    if (l.op !== " ") {
      for (let d = -context;d <= context; d++)
        if (k + d >= 0 && k + d < lines.length)
          keep[k + d] = true;
    }
  });
  const out = [];
  let skipped = false;
  lines.forEach((l, k) => {
    if (keep[k]) {
      if (skipped && out.length)
        out.push({ op: " ", text: "…" });
      skipped = false;
      out.push(l);
    } else
      skipped = true;
  });
  return out;
}
function diffStats(lines) {
  return { added: lines.filter((l) => l.op === "+").length, removed: lines.filter((l) => l.op === "-").length };
}

// src/backend/revise.ts
var STUDIO_RULES = `Studio's rules for a rewrite:
- Use only the keys in the format reference. Keep every existing id. Do not add systems.
- Keep it small: at most 3 relationship stats, 4 meters, 8 live-choice tags, 3 conflict kinds.
- Write in-world text in the card's voice. Refer to the player as {{user}}.
- Adults only in anything romantic or sexual.`;
var SYSTEM_PROMPT = `You improve one section of a Warp ruleset: YAML that a game engine runs under a roleplay chat.
Return the whole section as YAML in one \`\`\`yaml block, and nothing else. Start the YAML with one comment line:
"# Changed: <what you changed, in one short sentence>".

${STUDIO_RULES}

${DESIGN_GUIDE}

${REFERENCE}`;
var DEEPEN_TASK = `Make this section richer where the findings say it is thin, in the new format:
- every band of every relationship stat gets a say, a say_down and a voice;
- each main person gets an appearance, an outfit and one secret ladder with band: stages and a cue;
- live-choice tags themed to the card (5 to 8, at least one with no check, 1 or 2 with checks, social tags per_person);
- conflict kinds that fit the card, with costs and outcomes;
- meters with bands and say lines; conditions with a bonus and lasts;
- 1 to 3 authored goals with judge and stakes; checks.directions in the card's voice.
Change only what the findings ask for and what it needs. Keep everything else as it is.`;
var FIX_TASK = "Fix the finding below. Change as little as you can; keep everything else as it is.";
function extractYaml(text) {
  const fenced = /```(?:ya?ml)?[ \t]*\r?\n([\s\S]*?)```/i.exec(text);
  let y = (fenced ? fenced[1] : text).replace(/\r\n?/g, `
`);
  const lines = y.split(`
`);
  const first = lines.findIndex((l) => /^[A-Za-z_][\w-]*:/.test(l) || /^#/.test(l));
  if (first > 0)
    y = lines.slice(first).join(`
`);
  return `${y.trim()}
`;
}
function splitSummary(yaml) {
  const m = /^#\s*Changed:\s*(.+)\n?/i.exec(yaml);
  return m ? { yaml: yaml.slice(m[0].length).replace(/^\n+/, "") || `
`, summary: m[1].trim().slice(0, 300) } : { yaml, summary: null };
}
var findingLines = (fs) => fs.map((f) => `- [${f.severity}] ${f.id}: ${f.text} Fix: ${f.fix}`).join(`
`);
function rewritePrompt(deps, parts, t, task) {
  const current = parts.find((p) => p.label === t.label)?.yaml ?? "";
  return [
    `THE CARD
${deps.brief}`,
    `${task}`,
    `The "${t.label}" section now:
${current.trim() ? current : "(empty: write it from scratch)"}`,
    `Findings to fix in this section:
${findingLines(t.findings) || "- (none)"}`,
    (() => {
      const c = deps.context(parts, t.label);
      return c ? `Ids the other sections define (reuse them exactly; don't define them here):
${c}` : "";
    })()
  ].filter(Boolean).join(`

`);
}
function better2(before, after, label) {
  const own = after.partErrors[label] ?? 0;
  if (own)
    return `the rewrite of "${label}" has ${own} error${own === 1 ? "" : "s"}`;
  if (after.errors > before.errors)
    return `the rewrite of "${label}" causes errors elsewhere`;
  for (const [sys, was] of Object.entries(before.scores)) {
    const now = after.scores[sys];
    if (typeof now === "number" && now < was)
      return `the rewrite of "${label}" lowers ${sys} ${was} → ${now}`;
  }
  for (const g of before.gates) {
    if (!g.pass)
      continue;
    const now = after.gates.find((x) => x.id === g.id);
    if (now && !now.pass)
      return `the rewrite of "${label}" breaks the gate "${g.label}"`;
  }
  return null;
}
async function revise(kind, parts, targets, deps, o) {
  let calls = 0;
  const ask = async (system, user) => {
    if (o.signal?.aborted)
      throw new Error("Cancelled.");
    if (calls >= o.maxCalls)
      throw new Error("no helper calls left");
    calls++;
    return deps.ask(system, user);
  };
  const before = await deps.assess(parts);
  const task = o.task ?? (kind === "deepen" ? DEEPEN_TASK : FIX_TASK);
  const chosen = orderParts(targets.map((t) => ({ ...t, yaml: "" }))).slice(0, o.maxCalls);
  const drafts = new Map;
  deps.progress?.(`Writing ${chosen.map((t) => t.label).join(", ")}…`);
  await Promise.all(chosen.map(async (t) => {
    try {
      const { yaml, summary } = splitSummary(extractYaml(await ask(SYSTEM_PROMPT, rewritePrompt(deps, parts, t, task))));
      drafts.set(t.label, { yaml, summary, failed: yaml.trim() ? null : "the helper wrote nothing usable" });
    } catch (e) {
      if (o.signal?.aborted)
        throw e;
      drafts.set(t.label, { yaml: "", summary: null, failed: `the helper did not answer (${e instanceof Error ? e.message : String(e)})` });
    }
  }));
  if (o.signal?.aborted)
    throw new Error("Cancelled.");
  const merged = () => {
    let out = parts;
    for (const [label, d] of drafts)
      if (!d.failed)
        out = setPart(out, label, d.yaml);
    return out;
  };
  for (let round = 0;round < 2; round++) {
    const check = checkParts(merged());
    const broken = check.parts.filter((p) => p.status === "error" && drafts.get(p.label) && !drafts.get(p.label).failed);
    if (!broken.length || calls >= o.maxCalls)
      break;
    deps.progress?.(`Repairing ${broken.map((p) => p.label).join(", ")}…`);
    await Promise.all(broken.slice(0, o.maxCalls - calls).map(async (p) => {
      const problems = p.issues.map((i) => `- ${i.where}: ${i.message}`).join(`
`);
      const user = `This "${p.label}" section has problems reported by Warp's checker. Return the corrected YAML for the whole section.

Problems:
${problems}

Section:
${p.yaml}

${deps.context(merged(), p.label)}`;
      try {
        const d = drafts.get(p.label);
        const fixed = splitSummary(extractYaml(await ask(SYSTEM_PROMPT, user)));
        drafts.set(p.label, { ...d, yaml: fixed.yaml });
      } catch (e) {
        if (o.signal?.aborted)
          throw e;
      }
    }));
  }
  if (o.signal?.aborted)
    throw new Error("Cancelled.");
  deps.progress?.("Checking the rewrite…");
  let acc = parts;
  let accAssessment = before;
  const sections = [];
  for (const t of chosen) {
    const d = drafts.get(t.label);
    const was = parts.find((p) => p.label === t.label)?.yaml ?? "";
    let reason = d.failed;
    if (!reason && d.yaml.trim() === was.trim())
      reason = "the helper changed nothing";
    let trial = acc;
    if (!reason) {
      trial = setPart(acc, t.label, d.yaml);
      const a = await deps.assess(trial);
      reason = better2(before, a, t.label);
      if (!reason) {
        acc = trial;
        accAssessment = a;
      }
    }
    const diff = diffLines(was, d.yaml);
    sections.push({ label: t.label, before: was, after: d.yaml, kept: !reason, reason, summary: d.summary, diff: diffHunks(diff), ...diffStats(diff) });
  }
  return {
    kind,
    findingIds: targets.flatMap((t) => t.findings.map((f) => f.id)),
    sections,
    scores: { before: before.scores, after: accAssessment.scores },
    gates: { before: before.gates, after: accAssessment.gates },
    calls,
    at: Date.now()
  };
}
function applyProposal2(parts, p, accept) {
  let out = parts;
  for (const s of p.sections)
    if (s.kept && (accept === "all" || accept.includes(s.label)))
      out = setPart(out, s.label, s.after);
  return out;
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
  const out = [];
  for (const e of entries) {
    const base = cleanLabel(e.label);
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
  const { books, active } = await attachedRulebooks(c, userId);
  const views = [];
  for (const b of books) {
    const whole = isRulesetBookName(b.name);
    const n = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment)).length;
    if (!n && !whole)
      continue;
    const meta = metaOf(b);
    views.push({
      id: b.id,
      name: b.name,
      installed: isInstalledRulebook(b),
      active: (!active || active.id === b.id) && n > 0,
      format: typeof meta.format === "number" ? meta.format : null,
      by: typeof meta.by === "string" ? meta.by : null,
      entries: n
    });
  }
  const parts = partsOf((await rulesetEntries(characterId, userId)).entries);
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
  const entries = (await listAll(b.id, userId)).filter((e) => whole || isRulesetEntryTitle(e.comment)).sort((x, y) => (x.order_value ?? 100) - (y.order_value ?? 100));
  return { name: b.name, parts: partsOf(entries.map((e) => ({ label: labelOf(e.comment ?? ""), content: e.content ?? "" }))) };
}
function publish(characterId, parts, userId) {
  return publishRulebook(characterId, parts.map((p, i) => ({ label: p.label, content: p.yaml, order: (i + 1) * 10 })), userId, { ...STAMP });
}

// src/backend/session.ts
var WORKSPACE_VERSION = 1;
var MAX_PARTS = 40;
var MAX_YAML = 200000;
var FIX_CALLS = 3;
var DEEPEN_CALLS = 12;
var APP_CONTEST_RUNS = 500;
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
    proposal: restoreProposal(w.proposal),
    lastPlaytest: restorePlaytest(w.lastPlaytest),
    updatedAt: Number.isFinite(Number(w.updatedAt)) ? Number(w.updatedAt) : 0
  };
}
var isObj3 = (v) => !!v && typeof v === "object" && !Array.isArray(v);
function restoreProposal(raw) {
  if (!isObj3(raw) || raw.kind !== "fix" && raw.kind !== "deepen" || !Array.isArray(raw.sections))
    return null;
  const ok = raw.sections.every((x) => isObj3(x) && typeof x.label === "string" && typeof x.after === "string" && typeof x.kept === "boolean" && Array.isArray(x.diff));
  return ok && isObj3(raw.scores) && isObj3(raw.gates) ? raw : null;
}
function restorePlaytest(raw) {
  if (!isObj3(raw) || typeof raw.key !== "string" || !isObj3(raw.report) || !Array.isArray(raw.report.gates))
    return null;
  return { report: raw.report, key: raw.key, at: Number(raw.at) || 0 };
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
    l = { draft: null, rules: null, busy: null, controller: null, error: null, installed: null, loaded: false };
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
  let check = null;
  if (c.ruleset && !c.errors) {
    try {
      preview = previewOf(c.ruleset);
    } catch (e) {
      logError("preview", e);
    }
    try {
      check = checkView(c.ruleset, d.waived);
    } catch (e) {
      logError("check", e);
    }
  }
  return {
    base: d.base,
    parts: c.parts.map((p) => ({ label: p.label, yaml: p.yaml, status: p.status, issues: p.issues })),
    unplaced: c.unplaced,
    errors: c.errors,
    warnings: c.warnings,
    legacy: c.legacy,
    banner: legacyBanner(c.legacy, { deepen: true }),
    changed: !sameParts(d.parts, l.rules?.parts ?? []),
    installBlock: installBlock(c, d.parts),
    preview,
    check,
    playtest: d.lastPlaytest ? { report: d.lastPlaytest.report, stale: d.lastPlaytest.key !== partsKey(d.parts), at: d.lastPlaytest.at } : null,
    proposal: d.proposal ? proposalView(d.proposal) : null,
    updatedAt: d.updatedAt
  };
}
function proposalView(p) {
  return {
    kind: p.kind,
    calls: p.calls,
    at: p.at,
    scores: p.scores,
    gates: { before: p.gates.before.map(({ id, label, pass }) => ({ id, label, pass })), after: p.gates.after.map(({ id, label, pass }) => ({ id, label, pass })) },
    sections: p.sections.map(({ label, kept, reason, summary, diff, added, removed }) => ({ label, kept, reason, summary, diff, added, removed }))
  };
}
function studioView(characterId, l) {
  return { characterId, character: l.rules?.view ?? null, draft: draftView(l), busy: l.busy, cancellable: !!l.controller, error: l.error, installed: l.installed };
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
      send({ type: "studio", view: { characterId, character: null, draft: null, busy: null, cancellable: false, error: `Couldn't read this character: ${e instanceof Error ? e.message : String(e)}`, installed: null } }, userId);
      return;
    }
    l.error = null;
    try {
      await fn(l);
    } catch (e) {
      if (!(e instanceof Cancelled))
        logError("workspace", e);
      l.error = e instanceof Error ? e.message : String(e);
    }
    l.busy = null;
    l.controller = null;
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
    proposal: null,
    lastPlaytest: null,
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
function loadedDraft(l) {
  if (!l.draft || !l.draft.parts.length)
    throw new Error("Start a draft first.");
  const c = checkParts(l.draft.parts);
  if (!c.ruleset || c.errors)
    throw new Error("Fix the errors first: this works on a draft that loads.");
  return c.ruleset;
}
function startJob(characterId, l, label, userId) {
  l.controller = new AbortController;
  l.busy = label;
  emit(characterId, l, userId);
  return l.controller.signal;
}
function playtestDraft(characterId, userId) {
  return op(characterId, userId, async (l) => {
    const r = loadedDraft(l);
    const settings = await getSettings(userId);
    const signal = startJob(characterId, l, `Playtest: ${settings.playtestTurns} turns × ${settings.playtestSeeds} seeds…`, userId);
    let last = 0;
    const report = await playtest(r, { turns: settings.playtestTurns, seeds: settings.playtestSeeds, contestRuns: APP_CONTEST_RUNS }, {
      signal,
      progress: (share) => {
        const now = Date.now();
        if (share < 1 && now - last < 250)
          return;
        last = now;
        send({ type: "playtest_progress", characterId, share }, userId);
      }
    });
    l.draft.lastPlaytest = { report, key: partsKey(l.draft.parts), at: Date.now() };
    await save(l, userId);
  });
}
async function runRevise(characterId, l, kind, targets, maxCalls, task, userId) {
  const rules = needCharacter(l);
  const settings = await getSettings(userId);
  const signal = startJob(characterId, l, kind === "fix" ? "Fix: asking the helper…" : `Deepen: rewriting ${targets.map((t) => t.label).join(", ")}…`, userId);
  const budget = new Budget(maxCalls);
  const proposal = await revise(kind, l.draft.parts, targets, {
    assess: assessDraft,
    ask: (system, user) => askHelper(system, user, { connectionId: settings.helperConnectionId, creative: settings.creative, signal, budget, userId }),
    brief: briefOf(rules.card),
    context: contextOf,
    progress: (label) => {
      l.busy = `${kind === "fix" ? "Fix" : "Deepen"}: ${label}`;
      emit(characterId, l, userId);
    }
  }, { maxCalls, task, signal });
  if (signal.aborted)
    throw new Cancelled;
  l.draft.proposal = proposal;
  await save(l, userId);
}
function fixFinding(characterId, findingId, userId) {
  return op(characterId, userId, async (l) => {
    const r = loadedDraft(l);
    const f = checkView(r, l.draft.waived).findings.find((x) => x.id === findingId);
    if (!f)
      throw new Error("That finding is gone: the draft changed.");
    await runRevise(characterId, l, "fix", fixTargets(f), FIX_CALLS, FIX_TASK, userId);
  });
}
function deepenDraft(characterId, userId) {
  return op(characterId, userId, async (l) => {
    const r = loadedDraft(l);
    const targets = deepenTargets(checkView(r, l.draft.waived).findings);
    const note = legacyNote(l.draft.parts);
    if (!targets.length && !note)
      throw new Error("Nothing to deepen: no open gaps or thin spots.");
    await runRevise(characterId, l, "deepen", targets, DEEPEN_CALLS, note ? `${DEEPEN_TASK}

${note}` : DEEPEN_TASK, userId);
  });
}
function reviewProposal(characterId, accept, userId) {
  return op(characterId, userId, async (l) => {
    const d = l.draft;
    if (!d?.proposal)
      throw new Error("There is nothing to review.");
    if (accept !== "none")
      d.parts = applyProposal2(d.parts, d.proposal, accept);
    d.proposal = null;
    await save(l, userId);
  });
}
function waiveFinding(characterId, id, reason, userId) {
  return op(characterId, userId, async (l) => {
    if (!l.draft)
      throw new Error("Start a draft first.");
    const why = reason.replace(/\s+/g, " ").trim().slice(0, 400);
    if (why.length < 8)
      throw new Error("Say in a few words why it stays as it is (8 characters or more).");
    l.draft.waived[id.slice(0, 200)] = { reason: why, at: Date.now() };
    await save(l, userId);
  });
}
function unwaiveFinding(characterId, id, userId) {
  return op(characterId, userId, async (l) => {
    if (!l.draft)
      return;
    delete l.draft.waived[id];
    await save(l, userId);
  });
}
function cancelJob(characterId, userId) {
  lives.get(keyOf(characterId, userId))?.controller?.abort(new Cancelled);
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
          case "playtest":
            await playtestDraft(characterId, userId);
            break;
          case "fix":
            if (id(msg.findingId))
              await fixFinding(characterId, msg.findingId, userId);
            break;
          case "deepen":
            await deepenDraft(characterId, userId);
            break;
          case "review": {
            const a = msg.accept;
            await reviewProposal(characterId, a === "all" || a === "none" ? a : Array.isArray(a) ? a.filter((x) => typeof x === "string") : "none", userId);
            break;
          }
          case "waive":
            if (id(msg.id))
              await waiveFinding(characterId, msg.id, String(msg.reason ?? ""), userId);
            break;
          case "unwaive":
            if (id(msg.id))
              await unwaiveFinding(characterId, msg.id, userId);
            break;
          case "cancel":
            cancelJob(characterId, userId);
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
