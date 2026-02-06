// src/vite-plugin/jsx-source.ts
import MagicString from "magic-string";
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
      const magicString = new MagicString(code);
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
export {
  jsx_source_default as default,
  vdevJsxSource
};
//# sourceMappingURL=jsx-source.mjs.map