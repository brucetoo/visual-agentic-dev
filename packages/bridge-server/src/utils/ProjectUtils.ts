import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Resolve project root path from a port number using lsof (macOS).
 * This finds the process listening on the given port and extracts its CWD,
 * then searches upward for package.json to find the project root.
 */
export async function resolveProjectPath(port: number): Promise<string | null> {
    try {
        // Step 1: Find PID of process listening on the port
        const { stdout: lsofOutput } = await execAsync(
            `lsof -i :${port} -P -n | grep LISTEN | awk '{print $2}' | head -1`
        );
        const pid = lsofOutput.trim();

        if (!pid) {
            console.log(`[ProjectUtils] No process found listening on port ${port}`);
            return null;
        }

        console.log(`[ProjectUtils] Found PID ${pid} for port ${port}`);

        // Step 2: Get the CWD of that process
        const { stdout: cwdOutput } = await execAsync(
            `lsof -p ${pid} | grep cwd | awk '{print $NF}'`
        );
        const cwd = cwdOutput.trim();

        if (!cwd) {
            console.log(`[ProjectUtils] Could not determine CWD for PID ${pid}`);
            return null;
        }

        console.log(`[ProjectUtils] Process CWD: ${cwd}`);

        // Step 3: Find project root by looking for package.json upward
        const projectRoot = findProjectRoot(cwd);

        if (projectRoot) {
            console.log(`[ProjectUtils] Resolved project root: ${projectRoot}`);
        } else {
            console.log(`[ProjectUtils] Could not find project root from ${cwd}`);
        }

        return projectRoot;
    } catch (error) {
        console.error('[ProjectUtils] Error resolving project path:', error);
        return null;
    }
}

/**
 * Derive project root path from a source file path.
 * This is more reliable than port-based detection when source files come from different projects.
 */
export function deriveProjectPathFromSource(sourceFilePath: string): string | null {
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

/**
 * Find project root by searching upward for package.json
 */
function findProjectRoot(startPath: string): string | null {
    let currentPath = startPath;

    while (currentPath !== '/') {
        const packageJsonPath = path.join(currentPath, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
            return currentPath;
        }

        currentPath = path.dirname(currentPath);
    }

    return null;
}

