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

// src/babel-plugin/jsx-source.ts
var jsx_source_exports = {};
__export(jsx_source_exports, {
  default: () => jsx_source_default
});
module.exports = __toCommonJS(jsx_source_exports);
var import_helper_plugin_utils = require("@babel/helper-plugin-utils");
var t = __toESM(require("@babel/types"));
var jsx_source_default = (0, import_helper_plugin_utils.declare)((api, options) => {
  api.assertVersion(7);
  const prefix = options.prefix || "vdev";
  const exclude = options.exclude || [/node_modules/];
  return {
    name: "visual-dev-jsx-source",
    visitor: {
      JSXOpeningElement(path, state) {
        const filename = state.filename || "";
        if (exclude.some((pattern) => pattern.test(filename))) {
          return;
        }
        const { line, column } = path.node.loc?.start || {};
        if (!filename || line === void 0) return;
        const hasAttr = path.node.attributes.some(
          (attr) => t.isJSXAttribute(attr) && (attr.name.name === `data-${prefix}-file` || attr.name.name === `data-${prefix}-source`)
        );
        if (hasAttr) return;
        const fileAttr = t.jsxAttribute(
          t.jsxIdentifier(`data-${prefix}-file`),
          t.stringLiteral(filename)
        );
        const lineAttr = t.jsxAttribute(
          t.jsxIdentifier(`data-${prefix}-line`),
          t.stringLiteral(String(line))
        );
        const colAttr = t.jsxAttribute(
          t.jsxIdentifier(`data-${prefix}-col`),
          t.stringLiteral(String(column))
        );
        path.node.attributes.push(fileAttr, lineAttr, colAttr);
      }
    }
  };
});
//# sourceMappingURL=jsx-source.js.map