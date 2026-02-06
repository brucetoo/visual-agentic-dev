"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/vite-plugin/jsx-source.ts
var jsx_source_exports = {};
__export(jsx_source_exports, {
  default: () => jsx_source_default,
  vdevJsxSource: () => vdevJsxSource
});
module.exports = __toCommonJS(jsx_source_exports);
var import_magic_string = __toESM(require("magic-string"));
function vdevJsxSource(options = {}) {
  const prefix = options.prefix || "vdev";
  const exclude = options.exclude || [/node_modules/];
  return {
    name: "vdev-jsx-source",
    // Use 'post' to run after other transforms, avoiding HMR issues
    enforce: "post",
    transform(code, id) {
      if (exclude.some((pattern) => pattern.test(id))) {
        return null;
      }
      if (!/\.[jt]sx$/.test(id)) {
        return null;
      }
      if (!code.includes("jsx(") && !code.includes("jsxs(") && !code.includes("jsxDEV(")) {
        return null;
      }
      const magicString = new import_magic_string.default(code);
      let modified = false;
      const jsxCallRegex = /\b(jsx|jsxs|jsxDEV)\s*\(\s*(?:"([^"]+)"|'([^']+)'|([A-Z][a-zA-Z0-9_$.]*)|([a-z][a-zA-Z0-9_]*))\s*,\s*\{/g;
      const lines = code.split("\n");
      const getLineCol = (index) => {
        let line = 1;
        let lastNewline = -1;
        for (let i = 0; i < index && i < code.length; i++) {
          if (code[i] === "\n") {
            line++;
            lastNewline = i;
          }
        }
        return { line, col: index - lastNewline - 1 };
      };
      let match;
      while ((match = jsxCallRegex.exec(code)) !== null) {
        const openBraceIndex = match.index + match[0].length - 1;
        const { line, col } = getLineCol(match.index);
        const nextChars = code.slice(openBraceIndex + 1, openBraceIndex + 100);
        if (nextChars.includes(`"data-${prefix}-file"`)) {
          continue;
        }
        const injection = `"data-${prefix}-file": "${id}", "data-${prefix}-line": "${line}", "data-${prefix}-col": "${col}", `;
        magicString.appendLeft(openBraceIndex + 1, injection);
        modified = true;
      }
      if (!modified) {
        return null;
      }
      return {
        code: magicString.toString(),
        map: magicString.generateMap({ hires: true })
      };
    }
  };
}
var jsx_source_default = vdevJsxSource;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  vdevJsxSource
});
//# sourceMappingURL=jsx-source.js.map