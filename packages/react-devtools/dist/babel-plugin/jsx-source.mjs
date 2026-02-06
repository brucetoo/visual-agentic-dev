// src/babel-plugin/jsx-source.ts
import { declare } from "@babel/helper-plugin-utils";
import * as t from "@babel/types";
var jsx_source_default = declare((api, options) => {
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
export {
  jsx_source_default as default
};
//# sourceMappingURL=jsx-source.mjs.map