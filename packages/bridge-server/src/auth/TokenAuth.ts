import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Simple token-based authentication for the bridge server.
 * Token is stored in ~/.vdev/token
 */
export class TokenAuth {
    private token: string;
    private tokenPath: string;

    constructor() {
        this.tokenPath = path.join(os.homedir(), '.vdev', 'token');
        this.token = this.loadOrCreateToken();
    }

    private loadOrCreateToken(): string {
        try {
            if (fs.existsSync(this.tokenPath)) {
                return fs.readFileSync(this.tokenPath, 'utf-8').trim();
            }
        } catch {
            // Token file doesn't exist or is unreadable
        }

        // Generate new token
        const token = crypto.randomBytes(32).toString('hex');
        const dir = path.dirname(this.tokenPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(this.tokenPath, token, { mode: 0o600 });
        console.log(`[VDev Bridge] Token saved to ${this.tokenPath}`);

        return token;
    }

    verify(token: string): boolean {
        return token === this.token;
    }

    getToken(): string {
        return this.token;
    }

    getTokenPath(): string {
        return this.tokenPath;
    }
}
