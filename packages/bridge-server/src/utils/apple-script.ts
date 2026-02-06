import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runAppleScript(script: string): Promise<string> {
    try {
        const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
        return stdout.trim();
    } catch (error) {
        throw new Error(`AppleScript execution failed: ${(error as Error).message}`);
    }
}

/**
 * Escapes a string for use in AppleScript string literals.
 * Wraps it in double quotes and escapes backslashes and double quotes.
 */
export function escapeForAppleScript(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
