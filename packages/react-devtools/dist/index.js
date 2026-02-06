"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DevToolsProvider: () => DevToolsProvider,
  Highlighter: () => Highlighter,
  SelectionBox: () => SelectionBox,
  createMessageHandler: () => createMessageHandler,
  findSourceElement: () => findSourceElement,
  getSourceFromElement: () => getSourceFromElement,
  notifyReady: () => notifyReady,
  parseSourceAttr: () => parseSourceAttr,
  sendToExtension: () => sendToExtension,
  useDevTools: () => useDevTools
});
module.exports = __toCommonJS(src_exports);

// src/components/DevToolsProvider.tsx
var import_react3 = require("react");

// src/overlay/Highlighter.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var Highlighter = ({
  element,
  color = "rgba(66, 153, 225, 0.3)"
}) => {
  const [rect, setRect] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const update = () => setRect(element.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [element]);
  if (!rect) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      style: {
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        backgroundColor: color,
        border: "2px solid #4299e1",
        pointerEvents: "none",
        zIndex: 999999,
        transition: "all 0.1s ease",
        boxSizing: "border-box"
      },
      "data-vdev-overlay": "highlighter"
    }
  );
};

// src/overlay/SelectionBox.tsx
var import_react2 = require("react");

// src/utils/sourceLocator.ts
function getReactFiber(element) {
  const key = Object.keys(element).find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
  );
  return key ? element[key] : null;
}
function findFiberWithSource(fiber) {
  let current = fiber;
  while (current) {
    if (current._debugSource) {
      return current;
    }
    current = current.return;
  }
  return null;
}
function getSourceFromFiber(element) {
  const fiber = getReactFiber(element);
  if (!fiber) return null;
  const fiberWithSource = findFiberWithSource(fiber);
  if (fiberWithSource?._debugSource) {
    const { fileName, lineNumber, columnNumber } = fiberWithSource._debugSource;
    return {
      fileName,
      lineNumber,
      columnNumber: columnNumber || 1
    };
  }
  return null;
}
function parseSourceAttr(attrValue) {
  if (!attrValue) return null;
  try {
    const parsed = JSON.parse(attrValue);
    if (typeof parsed.fileName === "string" && typeof parsed.lineNumber === "number" && typeof parsed.columnNumber === "number") {
      return parsed;
    }
  } catch {
  }
  return null;
}
function findSourceElement(target, prefix = "vdev") {
  let current = target;
  while (current && current !== document.body) {
    if (getSourceFromFiber(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return target.closest(`[data-${prefix}-file], [data-${prefix}-source]`);
}
function getSourceFromElement(element, prefix = "vdev") {
  const fiberSource = getSourceFromFiber(element);
  if (fiberSource) {
    return fiberSource;
  }
  const fileName = element.getAttribute(`data-${prefix}-file`);
  const lineStr = element.getAttribute(`data-${prefix}-line`);
  const colStr = element.getAttribute(`data-${prefix}-col`);
  if (fileName && lineStr) {
    return {
      fileName,
      lineNumber: parseInt(lineStr, 10),
      columnNumber: colStr ? parseInt(colStr, 10) : 1
    };
  }
  const attrValue = element.getAttribute(`data-${prefix}-source`);
  return parseSourceAttr(attrValue);
}

// src/overlay/SelectionBox.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var SelectionBox = ({ element, prefix = "vdev" }) => {
  const [rect, setRect] = (0, import_react2.useState)(null);
  const [source, setSource] = (0, import_react2.useState)(null);
  (0, import_react2.useEffect)(() => {
    const update = () => setRect(element.getBoundingClientRect());
    update();
    setSource(getSourceFromElement(element, prefix));
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [element, prefix]);
  if (!rect) return null;
  const fileName = source?.fileName.split("/").pop() || "unknown";
  const lineInfo = source ? `${fileName}:${source.lineNumber}` : "";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        style: {
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: "2px solid #6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          pointerEvents: "none",
          zIndex: 999999,
          boxSizing: "border-box"
        },
        "data-vdev-overlay": "selection"
      }
    ),
    lineInfo && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        style: {
          position: "fixed",
          top: Math.max(0, rect.top - 24),
          left: rect.left,
          backgroundColor: "#6366f1",
          color: "white",
          fontSize: "11px",
          fontFamily: "monospace",
          padding: "2px 6px",
          borderRadius: "3px",
          pointerEvents: "none",
          zIndex: 999999,
          whiteSpace: "nowrap"
        },
        "data-vdev-overlay": "label",
        children: lineInfo
      }
    )
  ] });
};

// src/utils/messaging.ts
var MESSAGE_SOURCE = "vdev-react-sdk";
function sendToExtension(message) {
  window.postMessage(
    { ...message, source: MESSAGE_SOURCE },
    "*"
  );
}
function notifyReady() {
  sendToExtension({ type: "VDEV_SDK_READY" });
}
function createMessageHandler(handler) {
  return (event) => {
    if (event.source !== window) return;
    if (event.data?.source === MESSAGE_SOURCE) return;
    if (event.data?.type?.startsWith("VDEV_")) {
      handler(event.data);
    }
  };
}

// src/components/DevToolsProvider.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var DevToolsContext = (0, import_react3.createContext)(null);
var useDevTools = () => {
  const context = (0, import_react3.useContext)(DevToolsContext);
  if (!context) {
    throw new Error("useDevTools must be used within a DevToolsProvider");
  }
  return context;
};
var DevToolsProvider = ({
  children,
  enabled = true,
  prefix = "vdev"
}) => {
  const [isInspecting, setInspecting] = (0, import_react3.useState)(false);
  const [hoveredElement, setHoveredElement] = (0, import_react3.useState)(null);
  const [selectedElement, setSelectedElement] = (0, import_react3.useState)(null);
  const [selectedSource, setSelectedSource] = (0, import_react3.useState)(null);
  const clearSelection = (0, import_react3.useCallback)(() => {
    setSelectedElement(null);
    setSelectedSource(null);
  }, []);
  (0, import_react3.useEffect)(() => {
    if (!enabled) return;
    const handler = createMessageHandler((message) => {
      console.log("[DevTools] Received message:", message);
      if (message.type === "VDEV_START_INSPECT") {
        console.log("[DevTools] Starting inspection");
        setInspecting(true);
        clearSelection();
      } else if (message.type === "VDEV_STOP_INSPECT") {
        console.log("[DevTools] Stopping inspection");
        setInspecting(false);
        setHoveredElement(null);
      } else if (message.type === "VDEV_CLEAR_SELECTION") {
        clearSelection();
      }
    });
    window.addEventListener("message", handler);
    notifyReady();
    console.log("[DevTools] SDK Ready, listening for messages");
    return () => window.removeEventListener("message", handler);
  }, [enabled, clearSelection]);
  (0, import_react3.useEffect)(() => {
    if (!isInspecting || !enabled) return;
    const handleMouseMove = (e) => {
      const target = e.target;
      if (target.hasAttribute("data-vdev-overlay")) return;
      const sourceElement = findSourceElement(target, prefix);
      if (sourceElement && sourceElement !== hoveredElement) {
        console.log("[DevTools] Hovered element found:", sourceElement);
        setHoveredElement(sourceElement);
      }
    };
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target;
      if (target.hasAttribute("data-vdev-overlay")) return;
      const sourceElement = findSourceElement(target, prefix);
      if (sourceElement) {
        const source = getSourceFromElement(sourceElement, prefix);
        setSelectedElement(sourceElement);
        setSelectedSource(source);
        setInspecting(false);
        setHoveredElement(null);
        sendToExtension({
          type: "VDEV_ELEMENT_SELECTED",
          payload: {
            source,
            elementInfo: {
              tagName: sourceElement.tagName.toLowerCase(),
              className: sourceElement.className,
              textContent: sourceElement.textContent?.slice(0, 100) || ""
            }
          }
        });
      }
    };
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.body.style.cursor = "crosshair";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      document.body.style.cursor = "";
    };
  }, [isInspecting, enabled, hoveredElement, prefix]);
  if (!enabled) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_jsx_runtime3.Fragment, { children });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    DevToolsContext.Provider,
    {
      value: {
        isInspecting,
        setInspecting,
        selectedElement,
        selectedSource,
        clearSelection
      },
      children: [
        children,
        isInspecting && hoveredElement && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Highlighter, { element: hoveredElement }),
        selectedElement && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(SelectionBox, { element: selectedElement, prefix })
      ]
    }
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DevToolsProvider,
  Highlighter,
  SelectionBox,
  createMessageHandler,
  findSourceElement,
  getSourceFromElement,
  notifyReady,
  parseSourceAttr,
  sendToExtension,
  useDevTools
});
//# sourceMappingURL=index.js.map