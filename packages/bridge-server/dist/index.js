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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ClaudeCodeRunner: () => ClaudeCodeRunner,
  PromptBuilder: () => PromptBuilder,
  VDevWebSocketServer: () => VDevWebSocketServer,
  startServer: () => startServer
});
module.exports = __toCommonJS(index_exports);

// src/server/WebSocketServer.ts
var import_ws = require("ws");

// src/claude/ClaudeCodeRunner.ts
var import_crypto = require("crypto");

// src/claude/PromptBuilder.ts
var PromptBuilder = class {
  static build(options) {
    const { source, instruction } = options;
    const startLine = Math.max(1, source.lineNumber - 10);
    const endLine = source.lineNumber + 10;
    return `
\u4F60\u9700\u8981\u5E2E\u6211\u4FEE\u6539\u4EE3\u7801\u3002

## \u76EE\u6807\u4F4D\u7F6E
- \u6587\u4EF6: ${source.fileName}
- \u884C\u53F7: ${source.lineNumber}
- \u5217\u53F7: ${source.columnNumber}

\u8BF7\u5148\u4F7F\u7528 view_file \u5DE5\u5177\u67E5\u770B\u8FD9\u4E2A\u6587\u4EF6\u7684\u7B2C ${startLine} \u5230 ${endLine} \u884C\uFF0C\u4E86\u89E3\u4E0A\u4E0B\u6587\u3002

## \u4EFB\u52A1
${instruction}

## \u8981\u6C42
1. \u53EA\u4FEE\u6539\u5FC5\u8981\u7684\u4EE3\u7801\uFF0C\u4FDD\u6301\u4EE3\u7801\u98CE\u683C\u4E00\u81F4
2. \u5982\u679C\u9700\u8981\u6DFB\u52A0\u65B0\u7EC4\u4EF6\uFF0C\u8BF7\u5728\u5408\u9002\u7684\u4F4D\u7F6E\u6DFB\u52A0 import
3. \u5982\u679C\u9700\u8981\u6DFB\u52A0\u6837\u5F0F\uFF0C\u8BF7\u4F7F\u7528\u5185\u8054\u6837\u5F0F\u6216\u5728\u5408\u9002\u7684\u6837\u5F0F\u6587\u4EF6\u4E2D\u6DFB\u52A0
4. \u5B8C\u6210\u540E\u7B80\u8981\u8BF4\u660E\u4F60\u505A\u4E86\u4EC0\u4E48\u4FEE\u6539
`.trim();
  }
};

// src/utils/apple-script.ts
var import_child_process = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
async function runAppleScript(script) {
  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    return stdout.trim();
  } catch (error) {
    throw new Error(`AppleScript execution failed: ${error.message}`);
  }
}
function escapeForAppleScript(text) {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// src/utils/DevTerminal.ts
var DevTerminal = class {
  static {
    // Track window IDs by project ID
    this.windowIdMap = /* @__PURE__ */ new Map();
  }
  static {
    // Track sessions where we've started ccr code
    this.activeSessions = /* @__PURE__ */ new Set();
  }
  /**
   * Checks if a session with the given project ID exists
   */
  static async sessionExists(projectId) {
    const windowId = this.windowIdMap.get(projectId);
    if (!windowId) return false;
    try {
      const script = `
                tell application "iTerm"
                    repeat with w in windows
                        if id of w is ${windowId} then
                            return "true"
                        end if
                    end repeat
                end tell
                return "false"
            `;
      const result = await runAppleScript(script);
      return result === "true";
    } catch (e) {
      return false;
    }
  }
  /**
   * Gets the current terminal content for the project's window
   */
  static async getSessionContent(projectId) {
    const windowId = this.windowIdMap.get(projectId);
    if (!windowId) return "";
    try {
      const script = `
                tell application "iTerm"
                    repeat with w in windows
                        if id of w is ${windowId} then
                            return contents of current session of w
                        end if
                    end repeat
                end tell
                return ""
            `;
      return await runAppleScript(script);
    } catch (e) {
      return "";
    }
  }
  /**
   * Waits for ccr code to be ready (polls for prompt indicator)
   */
  static async waitForAgentReady(projectId, timeoutMs = 3e4) {
    const startTime = Date.now();
    const pollInterval = 500;
    while (Date.now() - startTime < timeoutMs) {
      const content = await this.getSessionContent(projectId);
      if (content.includes("Claude Code v") || content.includes("Welcome back") || content.includes("/model to try") || content.includes("Tips for getting")) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    return false;
  }
  /**
   * Launches a new iTerm window/session for the project and stores its ID
   */
  static async launchSession(projectId, projectPath) {
    const script = `
            tell application "iTerm"
                set newWindow to (create window with default profile)
                set windowId to id of newWindow
                tell current session of newWindow
                    write text "cd ${escapeForAppleScript(projectPath)}"
                    write text "clear"
                    write text "ccr code"
                end tell
                return windowId
            end tell
        `;
    const windowIdStr = await runAppleScript(script);
    const windowId = parseInt(windowIdStr, 10);
    if (!isNaN(windowId)) {
      this.windowIdMap.set(projectId, windowId);
    }
    this.activeSessions.add(projectId);
  }
  /**
   * Ensures ccr code is running and ready for input
   */
  static async ensureAgentRunning(projectId) {
    if (!this.activeSessions.has(projectId)) {
      await this.sendInput(projectId, "ccr code");
      this.activeSessions.add(projectId);
    }
    return await this.waitForAgentReady(projectId);
  }
  /**
   * Sends input to the session using window ID
   */
  static async sendInput(projectId, text) {
    const windowId = this.windowIdMap.get(projectId);
    if (!windowId) {
      throw new Error(`No window found for project ${projectId}`);
    }
    const escapedText = escapeForAppleScript(text);
    const script = `
            tell application "iTerm"
                repeat with w in windows
                    if id of w is ${windowId} then
                        tell current session of w
                            write text "${escapedText}"
                            select
                        end tell
                        set index of w to 1
                        activate
                        return
                    end if
                end repeat
            end tell
        `;
    await runAppleScript(script);
  }
};

// src/claude/ClaudeCodeRunner.ts
var ClaudeCodeRunner = class {
  async execute(options) {
    const { projectPath, source, instruction, onLog } = options;
    const prompt = PromptBuilder.build({ source, instruction });
    const projectId = (0, import_crypto.createHash)("md5").update(projectPath).digest("hex").substring(0, 8);
    try {
      onLog?.(`[ClaudeRunner] Target Session: vdev-${projectId}`);
      const exists = await DevTerminal.sessionExists(projectId);
      if (!exists) {
        onLog?.("[ClaudeRunner] Launching new iTerm session...");
        await DevTerminal.launchSession(projectId, projectPath);
      } else {
        onLog?.("[ClaudeRunner] Reusing existing session");
      }
      onLog?.("[ClaudeRunner] Waiting for ccr to be ready...");
      const ready = await DevTerminal.ensureAgentRunning(projectId);
      if (!ready) {
        onLog?.("[ClaudeRunner] Warning: ccr may not be fully ready");
      }
      onLog?.("[ClaudeRunner] Sending instruction...");
      await DevTerminal.sendInput(projectId, prompt);
      return {
        success: true,
        filesModified: [],
        // Interactive mode doesn't track this automatically
        messages: []
      };
    } catch (error) {
      onLog?.(`[ClaudeRunner] Error: ${error.message}`);
      throw error;
    }
  }
  cancel() {
  }
  isRunning() {
    return false;
  }
};

// src/utils/ProjectUtils.ts
var import_child_process2 = require("child_process");
var import_util2 = require("util");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var execAsync2 = (0, import_util2.promisify)(import_child_process2.exec);
async function resolveProjectPath(port) {
  try {
    const { stdout: lsofOutput } = await execAsync2(
      `lsof -i :${port} -P -n | grep LISTEN | awk '{print $2}' | head -1`
    );
    const pid = lsofOutput.trim();
    if (!pid) {
      console.log(`[ProjectUtils] No process found listening on port ${port}`);
      return null;
    }
    console.log(`[ProjectUtils] Found PID ${pid} for port ${port}`);
    const { stdout: cwdOutput } = await execAsync2(
      `lsof -p ${pid} | grep cwd | awk '{print $NF}'`
    );
    const cwd = cwdOutput.trim();
    if (!cwd) {
      console.log(`[ProjectUtils] Could not determine CWD for PID ${pid}`);
      return null;
    }
    console.log(`[ProjectUtils] Process CWD: ${cwd}`);
    const projectRoot = findProjectRoot(cwd);
    if (projectRoot) {
      console.log(`[ProjectUtils] Resolved project root: ${projectRoot}`);
    } else {
      console.log(`[ProjectUtils] Could not find project root from ${cwd}`);
    }
    return projectRoot;
  } catch (error) {
    console.error("[ProjectUtils] Error resolving project path:", error);
    return null;
  }
}
function deriveProjectPathFromSource(sourceFilePath) {
  if (!sourceFilePath || !path.isAbsolute(sourceFilePath)) {
    console.log(`[ProjectUtils] Invalid source file path: ${sourceFilePath}`);
    return null;
  }
  const dir = path.dirname(sourceFilePath);
  const projectRoot = findProjectRoot(dir);
  if (projectRoot) {
    console.log(`[ProjectUtils] Derived project root from source: ${projectRoot}`);
  } else {
    console.log(`[ProjectUtils] Could not derive project root from source: ${sourceFilePath}`);
  }
  return projectRoot;
}
function findProjectRoot(startPath) {
  let currentPath = startPath;
  while (currentPath !== "/") {
    const packageJsonPath = path.join(currentPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
}

// src/server/WebSocketServer.ts
var VDevWebSocketServer = class {
  constructor(port = 9527) {
    this.runners = /* @__PURE__ */ new Map();
    this.wss = new import_ws.WebSocketServer({ port });
    this.wss.on("connection", this.handleConnection.bind(this));
    console.log(`[VDev Bridge] WebSocket server running on ws://localhost:${port}`);
  }
  handleConnection(ws) {
    console.log("[VDev Bridge] Client connected");
    const clientId = Math.random().toString(36).substring(7);
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case "EXECUTE_TASK":
            await this.handleExecuteTask(ws, message, clientId);
            break;
          case "CANCEL_TASK":
            this.handleCancelTask(ws, message, clientId);
            break;
          case "GET_STATUS":
            this.handleGetStatus(ws, message, clientId);
            break;
          case "RESOLVE_PROJECT_PATH":
            await this.handleResolveProjectPath(ws, message);
            break;
        }
      } catch (error) {
        console.error("[VDev Bridge] Message error:", error);
      }
    });
    ws.on("close", () => {
      console.log(`[VDev Bridge] Client ${clientId} disconnected`);
      const runner = this.runners.get(clientId);
      if (runner) {
        runner.cancel();
        this.runners.delete(clientId);
      }
    });
  }
  async handleExecuteTask(ws, message, clientId) {
    const payload = message.payload;
    const { source, instruction, projectPath: extensionProvidedPath } = payload;
    const projectPath = deriveProjectPathFromSource(source.fileName) || extensionProvidedPath;
    console.log(`[VDev Bridge] Executing task for ${projectPath}`);
    console.log(`[VDev Bridge] Target: ${source.fileName}:${source.lineNumber}`);
    console.log(`[VDev Bridge] Instruction: ${instruction.slice(0, 100)}...`);
    this.send(ws, {
      type: "TASK_STARTED",
      id: message.id,
      payload: { status: "running" }
    });
    const runner = new ClaudeCodeRunner();
    this.runners.set(clientId, runner);
    try {
      const result = await runner.execute({
        projectPath,
        source,
        instruction,
        onLog: (log) => {
          console.log(`[VDev Bridge log] ${log}`);
          this.send(ws, {
            type: "TASK_LOG",
            id: message.id,
            payload: { log }
          });
        }
      });
      console.log(`[VDev Bridge] Task completed. Files modified: ${result.filesModified.join(", ")}`);
      this.send(ws, {
        type: "TASK_COMPLETED",
        id: message.id,
        payload: result
      });
    } catch (error) {
      console.error("[VDev Bridge] Task error:", error);
      this.send(ws, {
        type: "TASK_ERROR",
        id: message.id,
        payload: { error: error.message }
      });
    } finally {
      this.runners.delete(clientId);
    }
  }
  handleCancelTask(ws, message, clientId) {
    const runner = this.runners.get(clientId);
    if (runner) {
      runner.cancel();
      this.runners.delete(clientId);
      console.log(`[VDev Bridge] Task cancelled for client ${clientId}`);
    }
    this.send(ws, {
      type: "TASK_COMPLETED",
      id: message.id,
      payload: { cancelled: true }
    });
  }
  handleGetStatus(ws, message, clientId) {
    const runner = this.runners.get(clientId);
    this.send(ws, {
      type: "TASK_PROGRESS",
      id: message.id,
      payload: {
        running: runner?.isRunning() ?? false
      }
    });
  }
  async handleResolveProjectPath(ws, message) {
    const payload = message.payload;
    const port = payload?.port;
    if (!port) {
      this.send(ws, {
        type: "PROJECT_PATH_RESOLVED",
        id: message.id,
        payload: { projectPath: null, error: "No port provided" }
      });
      return;
    }
    console.log(`[VDev Bridge] Resolving project path for port ${port}`);
    const projectPath = await resolveProjectPath(port);
    this.send(ws, {
      type: "PROJECT_PATH_RESOLVED",
      id: message.id,
      payload: { projectPath }
    });
  }
  send(ws, message) {
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  close() {
    for (const runner of this.runners.values()) {
      runner.cancel();
    }
    this.runners.clear();
    this.wss.close();
    console.log("[VDev Bridge] Server closed");
  }
};

// src/index.ts
function startServer(options = {}) {
  const port = options.port || 9527;
  console.log("[VDev Bridge] Starting server...");
  const server = new VDevWebSocketServer(port);
  process.on("SIGINT", () => {
    console.log("\n[VDev Bridge] Shutting down...");
    server.close();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    server.close();
    process.exit(0);
  });
  return server;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ClaudeCodeRunner,
  PromptBuilder,
  VDevWebSocketServer,
  startServer
});
//# sourceMappingURL=index.js.map