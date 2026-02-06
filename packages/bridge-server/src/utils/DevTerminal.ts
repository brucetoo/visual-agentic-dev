import { runAppleScript, escapeForAppleScript } from './apple-script';

export class DevTerminal {
    // Track window IDs by project ID
    private static windowIdMap = new Map<string, number>();
    // Track sessions where we've started ccr code
    private static activeSessions = new Set<string>();

    /**
     * Checks if a session with the given project ID exists
     */
    static async sessionExists(projectId: string): Promise<boolean> {
        const windowId = this.windowIdMap.get(projectId);
        if (!windowId) return false;

        try {
            // Check if window with this ID still exists
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
            return result === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * Gets the current terminal content for the project's window
     */
    static async getSessionContent(projectId: string): Promise<string> {
        const windowId = this.windowIdMap.get(projectId);
        if (!windowId) return '';

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
            return '';
        }
    }

    /**
     * Waits for ccr code to be ready (polls for prompt indicator)
     */
    static async waitForAgentReady(projectId: string, timeoutMs: number = 30000): Promise<boolean> {
        const startTime = Date.now();
        const pollInterval = 500;

        while (Date.now() - startTime < timeoutMs) {
            const content = await this.getSessionContent(projectId);

            // ccr code shows these indicators when ready
            if (content.includes('Claude Code v') ||
                content.includes('Welcome back') ||
                content.includes('/model to try') ||
                content.includes('Tips for getting')) {
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        return false;
    }

    /**
     * Launches a new iTerm window/session for the project and stores its ID
     */
    static async launchSession(projectId: string, projectPath: string): Promise<void> {
        // Create window and get its ID
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
    static async ensureAgentRunning(projectId: string): Promise<boolean> {
        if (!this.activeSessions.has(projectId)) {
            await this.sendInput(projectId, 'ccr code');
            this.activeSessions.add(projectId);
        }

        return await this.waitForAgentReady(projectId);
    }

    /**
     * Sends input to the session using window ID
     */
    static async sendInput(projectId: string, text: string): Promise<void> {
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
}
