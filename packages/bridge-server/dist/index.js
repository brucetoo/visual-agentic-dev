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
  PromptBuilder: () => PromptBuilder,
  VDevWebSocketServer: () => VDevWebSocketServer,
  startServer: () => startServer
});
module.exports = __toCommonJS(index_exports);

// src/server/WebSocketServer.ts
var import_ws = require("ws");
var crypto = __toESM(require("crypto"));

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

// src/utils/ProjectUtils.ts
var import_child_process = require("child_process");
var import_util = require("util");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var execAsync = (0, import_util.promisify)(import_child_process.exec);
async function resolveProjectPath(port) {
  try {
    const { stdout: lsofOutput } = await execAsync(
      `lsof -i :${port} -P -n | grep LISTEN | awk '{print $2}' | head -1`
    );
    const pid = lsofOutput.trim();
    if (!pid) {
      console.log(`[ProjectUtils] No process found listening on port ${port}`);
      return null;
    }
    console.log(`[ProjectUtils] Found PID ${pid} for port ${port}`);
    const { stdout: cwdOutput } = await execAsync(
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

// src/utils/TerminalManager.ts
var pty = __toESM(require("node-pty"));
var os = __toESM(require("os"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
var import_headless = require("@xterm/headless");
var import_addon_serialize = require("@xterm/addon-serialize");

// src/utils/ToolManager.ts
var import_child_process2 = require("child_process");
var ToolManager = class {
  /**
   * Checks if a command exists in the system PATH
   */
  static checkCommand(command) {
    try {
      (0, import_child_process2.execSync)(`which ${command}`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Checks if both required tools are installed
   */
  static checkTools() {
    return {
      claude: this.checkCommand("claude"),
      ccr: this.checkCommand("ccr")
    };
  }
  /**
   * Attempts to install the missing tools
   */
  static async installTools() {
    const { claude, ccr } = this.checkTools();
    if (claude && ccr) {
      console.log("[ToolManager] All tools are already installed.");
      return true;
    }
    try {
      if (!claude) {
        console.log("[ToolManager] Installing @anthropic-ai/claude-code...");
        (0, import_child_process2.execSync)("npm install -g @anthropic-ai/claude-code", { stdio: "inherit" });
      }
      if (!ccr) {
        console.log("[ToolManager] Installing @musistudio/claude-code-router...");
        (0, import_child_process2.execSync)("npm install -g @musistudio/claude-code-router", { stdio: "inherit" });
      }
      return true;
    } catch (error) {
      console.error(`[ToolManager] Installation failed: ${error.message}`);
      return false;
    }
  }
  /**
   * Ensures tools are ready, installs if necessary
   */
  static async ensureTools() {
    const status = this.checkTools();
    if (status.claude && status.ccr) return true;
    console.log("[ToolManager] Some tools are missing. Attempting auto-installation...");
    return await this.installTools();
  }
};

// src/utils/TerminalManager.ts
var shell = os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/zsh";
var TerminalManager = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
    // Persist serialized state for sessions by ID
    this.persistedState = /* @__PURE__ */ new Map();
    this.READINESS_BUFFER_SIZE = 50;
    this._onReady = () => {
    };
  }
  // Register a callback for when a session is ready
  onReady(callback) {
    this._onReady = callback;
  }
  clearHistory(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.headless.reset();
      session.historyBuffer = [];
    }
    this.persistedState.delete(id);
  }
  isSessionReady(id) {
    return this.sessions.get(id)?.isReady || false;
  }
  async getOrCreateSession(id, cwd, useYolo = false) {
    let sessionWrapper = this.sessions.get(id);
    if (sessionWrapper && sessionWrapper.useYolo !== useYolo) {
      console.log(`[TerminalManager] YOLO mode changed for session ${id}. Restarting...`);
      this.terminateSession(id);
      sessionWrapper = void 0;
    }
    if (!sessionWrapper) {
      console.log(`[TerminalManager] Creating new session for project: ${cwd} (useYolo: ${useYolo})`);
      await ToolManager.ensureTools();
      console.log(`[TerminalManager] Spawning shell: ${shell} in verified CWD: ${cwd}`);
      const nodePath = path2.dirname(process.execPath);
      const env = { ...process.env };
      env.PATH = `${nodePath}${path2.delimiter}${env.PATH || ""}`;
      console.log("[TerminalManager] --- Diagnostic Check ---");
      console.log(`[TerminalManager] Platform: ${os.platform()}, Arch: ${os.arch()}`);
      console.log(`[TerminalManager] Node Version: ${process.version}`);
      console.log(`[TerminalManager] Exec Path: ${process.execPath}`);
      console.log(`[TerminalManager] Shell Path: ${shell}`);
      try {
        if (fs2.existsSync(shell)) {
          console.log(`[TerminalManager] Shell exists at ${shell}`);
          try {
            fs2.accessSync(shell, fs2.constants.X_OK);
            console.log(`[TerminalManager] Shell is executable`);
          } catch (e) {
            console.error(`[TerminalManager] Shell is NOT executable: ${e}`);
          }
        } else {
          console.error(`[TerminalManager] Shell does NOT exist at ${shell}`);
        }
      } catch (e) {
        console.error(`[TerminalManager] Error checking shell: ${e}`);
      }
      console.log(`[TerminalManager] CWD: ${cwd}`);
      try {
        if (fs2.existsSync(cwd)) {
          console.log(`[TerminalManager] CWD exists`);
        } else {
          console.error(`[TerminalManager] CWD does NOT exist`);
        }
      } catch (e) {
        console.error(`[TerminalManager] Error checking CWD: ${e}`);
      }
      console.log(`[TerminalManager] PATH: ${env.PATH}`);
      console.log("[TerminalManager] ------------------------");
      let ptyProcess;
      try {
        ptyProcess = pty.spawn(shell, [], {
          name: "xterm-color",
          cols: 80,
          rows: 24,
          cwd,
          env
        });
      } catch (error) {
        console.error("[TerminalManager] Failed to spawn shell:", error);
        console.error("[TerminalManager] Shell:", shell);
        console.error("[TerminalManager] CWD:", cwd);
        throw error;
      }
      const headless = new import_headless.Terminal({
        allowProposedApi: true,
        cols: 80,
        rows: 24,
        scrollback: 1e3
      });
      const serializer = new import_addon_serialize.SerializeAddon();
      headless.loadAddon(serializer);
      const savedState = this.persistedState.get(id);
      if (savedState) {
        headless.write(savedState);
      }
      let historyBuffer = [];
      const readyMarkers = [
        "Welcome back",
        "Visual Dev",
        // If we have a custom banner
        'Try "',
        // Suggestion text (generic)
        "bypass permissions",
        "\u276F",
        // The prompt character often used by Claude Code
        "/model to try",
        // Hint text often present at startup
        "> "
        // Standard prompt fallback
      ];
      sessionWrapper = {
        pty: ptyProcess,
        headless,
        serializer,
        useYolo,
        isReady: false,
        historyBuffer
      };
      ptyProcess.onData((data) => {
        if (sessionWrapper) {
          sessionWrapper.headless.write(data);
          sessionWrapper.historyBuffer.push(data);
          if (sessionWrapper.historyBuffer.length > this.READINESS_BUFFER_SIZE) {
            sessionWrapper.historyBuffer.shift();
          }
          if (!sessionWrapper.isReady) {
            const cleanData = data.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
            const hasMarker = readyMarkers.some((marker) => cleanData.includes(marker) || data.includes(marker));
            if (hasMarker) {
              sessionWrapper.isReady = true;
              console.log(`[TerminalManager] Session ${id} is READY. Match found.`);
              this._onReady(id);
            }
          }
        }
      });
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`[TerminalManager] Session ${id} exited with code ${exitCode}, signal ${signal}`);
        if (this.sessions.get(id) === sessionWrapper) {
          this.sessions.delete(id);
        }
      });
      this.sessions.set(id, sessionWrapper);
      const launchCmd = useYolo ? "ccr code --dangerously-skip-permissions" : "ccr code";
      console.log(`[TerminalManager] Launching: ${launchCmd}`);
      ptyProcess.write(`${launchCmd}\r`);
    } else {
    }
    return sessionWrapper.pty;
  }
  sendData(id, data) {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.write(data);
    }
  }
  resize(id, cols, rows) {
    const session = this.sessions.get(id);
    if (session) {
      try {
        session.pty.resize(cols, rows);
        session.headless.resize(cols, rows);
      } catch (e) {
        console.error("[TerminalManager] Resize error:", e);
      }
    }
  }
  terminateSession(id) {
    const session = this.sessions.get(id);
    if (session) {
      const pid = session.pty.pid;
      this.persistedState.set(id, session.serializer.serialize());
      session.headless.dispose();
      this.sessions.delete(id);
      try {
        if (os.platform() !== "win32") {
          try {
            process.kill(-pid, "SIGKILL");
          } catch (e) {
            if (e.code !== "ESRCH") {
              console.warn(`[TerminalManager] Failed to kill process group ${pid}, falling back to pty.kill:`, e);
              session.pty.kill("SIGKILL");
            }
          }
        } else {
          session.pty.kill();
        }
      } catch (e) {
        console.error("[TerminalManager] Kill error:", e);
      }
    }
  }
  getHistory(id) {
    const session = this.sessions.get(id);
    if (session) {
      return session.serializer.serialize();
    }
    return this.persistedState.get(id) || "";
  }
};

// src/server/WebSocketServer.ts
var VDevWebSocketServer = class {
  constructor(port = 9527) {
    this.terminalManager = new TerminalManager();
    // Mapping from sessionId (projectPath hash) to connected clients
    this.sessionClients = /* @__PURE__ */ new Map();
    // Track which PTYs we are currently listening to, to handle restarts (Swap PTY)
    this.activePtys = /* @__PURE__ */ new Map();
    this.wss = new import_ws.WebSocketServer({ port });
    this.wss.on("connection", this.handleConnection.bind(this));
    this.terminalManager.onReady((sessionId) => {
      console.log(`[VDev Bridge] Session ${sessionId} is ready. Broadcasting to clients...`);
      this.broadcastToSession(sessionId, {
        type: "TERMINAL_READY",
        id: "broadcast",
        payload: { sessionId }
      });
    });
    console.log(`[VDev Bridge] WebSocket server running on ws://localhost:${port}`);
  }
  getSessionId(projectPath) {
    return crypto.createHash("md5").update(projectPath).digest("hex");
  }
  handleConnection(ws) {
    console.log("[VDev Bridge] Client connected");
    const clientId = Math.random().toString(36).substring(7);
    const subscribedSessions = /* @__PURE__ */ new Set();
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case "EXECUTE_TASK":
            await this.handleExecuteTask(ws, message, subscribedSessions);
            break;
          case "RESOLVE_PROJECT_PATH":
            await this.handleResolveProjectPath(ws, message);
            break;
          case "TERMINAL_DATA":
            await this.handleTerminalData(ws, message, subscribedSessions);
            break;
          case "TERMINAL_RESIZE":
            this.handleTerminalResize(message);
            break;
          case "TERMINAL_INIT":
            await this.handleTerminalInit(ws, message, subscribedSessions);
            break;
          case "TERMINAL_RESET":
            this.handleTerminalReset(message);
            break;
        }
      } catch (error) {
        console.error("[VDev Bridge] Message error:", error);
      }
    });
    ws.on("close", () => {
      console.log(`[VDev Bridge] Client disconnected`);
      for (const sessionId of subscribedSessions) {
        const clients = this.sessionClients.get(sessionId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            this.sessionClients.delete(sessionId);
          }
        }
      }
    });
  }
  async ensureSession(sessionId, projectPath, useYolo = false) {
    try {
      const sessionPty = await this.terminalManager.getOrCreateSession(sessionId, projectPath, useYolo);
      const lastPty = this.activePtys.get(sessionId);
      if (lastPty !== sessionPty) {
        console.log(`[VDev Bridge] Attaching listener to new PTY for session ${sessionId}`);
        sessionPty.onData((data) => {
          this.broadcastToSession(sessionId, data);
        });
        this.activePtys.set(sessionId, sessionPty);
      }
    } catch (error) {
      console.error(`[VDev Bridge] Error ensuring session ${sessionId} for project ${projectPath}:`, error);
      const errorMessage = error.message || String(error);
      this.broadcastToSession(sessionId, {
        type: "TERMINAL_OUTPUT",
        id: "broadcast",
        payload: { data: `\r
\x1B[31mError: Failed to ensure terminal session. ${errorMessage}\r
Check if 'npx' execution environment has correct permissions and 'node-pty' is compatible.\x1B[0m\r
` }
      });
    }
  }
  subscribeToSession(ws, sessionId, subscribedSessions) {
    const currentSessions = Array.from(subscribedSessions);
    for (const oldSessionId of currentSessions) {
      if (oldSessionId !== sessionId) {
        console.log(`[VDev Bridge] Unsubscribing client from old session: ${oldSessionId}`);
        const oldClients = this.sessionClients.get(oldSessionId);
        if (oldClients) {
          oldClients.delete(ws);
          if (oldClients.size === 0) {
            this.sessionClients.delete(oldSessionId);
          }
        }
        subscribedSessions.delete(oldSessionId);
      }
    }
    if (!subscribedSessions.has(sessionId)) {
      console.log(`[VDev Bridge] Subscribing client to new session: ${sessionId}`);
      if (!this.sessionClients.has(sessionId)) {
        this.sessionClients.set(sessionId, /* @__PURE__ */ new Set());
      }
      this.sessionClients.get(sessionId)?.add(ws);
      subscribedSessions.add(sessionId);
    }
  }
  broadcastToSession(sessionId, messageOrData) {
    const clients = this.sessionClients.get(sessionId);
    if (clients && clients.size > 0) {
      let payload;
      if (typeof messageOrData === "string") {
        payload = JSON.stringify({
          type: "TERMINAL_OUTPUT",
          id: "stream",
          payload: { data: messageOrData }
        });
      } else {
        payload = JSON.stringify(messageOrData);
      }
      for (const client of clients) {
        if (client.readyState === import_ws.WebSocket.OPEN) {
          client.send(payload);
        }
      }
    }
  }
  async handleTerminalInit(ws, message, subscribedSessions) {
    const payload = message.payload;
    const { projectPath, useYolo } = payload;
    if (!projectPath) return;
    console.log(`[VDev Bridge] Initializing terminal for ${projectPath}`);
    const sessionId = this.getSessionId(projectPath);
    this.subscribeToSession(ws, sessionId, subscribedSessions);
    await this.ensureSession(sessionId, projectPath, !!useYolo);
    const history = this.terminalManager.getHistory(sessionId);
    if (history) {
      this.send(ws, {
        type: "TERMINAL_OUTPUT",
        id: message.id,
        // Response to INIT
        payload: { data: history }
      });
    }
    if (this.terminalManager.isSessionReady(sessionId)) {
      console.log(`[VDev Bridge] Session ${sessionId} is already READY. Notifying client.`);
      this.send(ws, {
        type: "TERMINAL_READY",
        id: message.id,
        payload: { sessionId }
      });
    }
  }
  async handleExecuteTask(ws, message, subscribedSessions) {
    const payload = message.payload;
    const { source, instruction, projectPath: extensionProvidedPath } = payload;
    const projectPath = deriveProjectPathFromSource(source.fileName) || extensionProvidedPath;
    const sessionId = this.getSessionId(projectPath);
    console.log(`[VDev Bridge] Executing task for ${projectPath} (Session: ${sessionId})`);
    this.subscribeToSession(ws, sessionId, subscribedSessions);
    await this.ensureSession(sessionId, projectPath, false);
    const prompt = PromptBuilder.build({ source, instruction });
    this.terminalManager.sendData(sessionId, `
${prompt}
`);
    this.send(ws, {
      type: "TASK_STARTED",
      id: message.id,
      payload: { status: "running" },
      projectPath
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
  async handleTerminalData(ws, message, subscribedSessions) {
    const payload = message.payload;
    if (!payload) return;
    const { data, projectPath, useYolo } = payload;
    if (projectPath) {
      const sessionId = this.getSessionId(projectPath);
      this.subscribeToSession(ws, sessionId, subscribedSessions);
      try {
        await this.ensureSession(sessionId, projectPath, !!useYolo);
        if (data) {
          this.terminalManager.sendData(sessionId, data);
        }
      } catch (error) {
        console.error("[VDev Bridge] Error ensuring session likely due to spawn failure:", error);
        const errorMessage = error.message || String(error);
        this.send(ws, {
          type: "TERMINAL_OUTPUT",
          id: message.id,
          payload: { data: `\r
\x1B[31mError: Failed to start terminal session. ${errorMessage}\x1B[0m\r
` }
        });
      }
    }
  }
  handleTerminalResize(message) {
    const payload = message.payload;
    if (payload && payload.projectPath) {
      const sessionId = this.getSessionId(payload.projectPath);
      this.terminalManager.resize(sessionId, payload.cols, payload.rows);
    }
  }
  handleTerminalReset(message) {
    const payload = message.payload;
    if (payload && payload.projectPath) {
      const sessionId = this.getSessionId(payload.projectPath);
      console.log(`[VDev Bridge] RESETTING session for ${payload.projectPath} (Session: ${sessionId})`);
      this.terminalManager.terminateSession(sessionId);
      this.terminalManager.clearHistory(sessionId);
      this.activePtys.delete(sessionId);
    }
  }
  send(ws, message) {
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  close() {
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
  PromptBuilder,
  VDevWebSocketServer,
  startServer
});
//# sourceMappingURL=index.js.map