// src/components/DevToolsProvider.tsx
import {
  createContext,
  useContext,
  useState as useState3,
  useCallback,
  useEffect as useEffect3
} from "react";

// src/overlay/Highlighter.tsx
import { useEffect, useState } from "react";
import { jsx } from "react/jsx-runtime";
var Highlighter = ({
  element,
  color = "rgba(66, 153, 225, 0.3)"
}) => {
  const [rect, setRect] = useState(null);
  useEffect(() => {
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
  return /* @__PURE__ */ jsx(
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
import { useEffect as useEffect2, useState as useState2 } from "react";

// src/utils/sourceLocator.ts
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
  return target.closest(`[data-${prefix}-file], [data-${prefix}-source]`);
}
function getSourceFromElement(element, prefix = "vdev") {
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
import { Fragment, jsx as jsx2, jsxs } from "react/jsx-runtime";
var SelectionBox = ({ element, prefix = "vdev" }) => {
  const [rect, setRect] = useState2(null);
  const [source, setSource] = useState2(null);
  useEffect2(() => {
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
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx2(
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
    lineInfo && /* @__PURE__ */ jsx2(
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
import { Fragment as Fragment2, jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var DevToolsContext = createContext(null);
var useDevTools = () => {
  const context = useContext(DevToolsContext);
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
  const [isInspecting, setInspecting] = useState3(false);
  const [hoveredElement, setHoveredElement] = useState3(null);
  const [selectedElement, setSelectedElement] = useState3(null);
  const [selectedSource, setSelectedSource] = useState3(null);
  const clearSelection = useCallback(() => {
    setSelectedElement(null);
    setSelectedSource(null);
  }, []);
  useEffect3(() => {
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
  useEffect3(() => {
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
    return /* @__PURE__ */ jsx3(Fragment2, { children });
  }
  return /* @__PURE__ */ jsxs2(
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
        isInspecting && hoveredElement && /* @__PURE__ */ jsx3(Highlighter, { element: hoveredElement }),
        selectedElement && /* @__PURE__ */ jsx3(SelectionBox, { element: selectedElement, prefix })
      ]
    }
  );
};
export {
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
};
//# sourceMappingURL=index.mjs.map