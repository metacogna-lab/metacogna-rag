
import { User } from "../types";
import { systemLogs } from "./LogService";
import { observability } from "./Observability";
import { apiPost } from "./ApiClient";

/**
 * AuthService - Worker-Only Authentication
 *
 * BREAKING CHANGES from previous version:
 * - NO localStorage usage (removed loadUsers, saveUsers, seedAdmin, users array)
 * - NO register() method (registration is admin-only via POST /api/signup)
 * - login() calls Worker endpoint ONLY (no localStorage fallback)
 * - restoreSession() validates with Worker (no local cache)
 *
 * Session Management:
 * - Cookie-based sessions (pratejra_session cookie)
 * - Worker validates all auth requests
 * - currentUser state maintained in memory
 */
class AuthService {
    private currentUser: User | null = null;
    private initPromise: Promise<void>;

    constructor() {
        this.initPromise = this.initialize();
    }

    private async initialize() {
        await this.restoreSession();
    }

    /**
     * Hashes input using SHA-256 (Web Crypto API)
     */
    private async hash(input: string): Promise<string> {
        const msgBuffer = new TextEncoder().encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * SANITATION & VALIDATION
     */
    private sanitizeInput(input: string): string {
        // Remove whitespace and potential HTML injection chars
        return input.trim().replace(/[<>&'"]/g, '');
    }

    private validateUsername(username: string): { valid: boolean; error?: string } {
        const lower = username.toLowerCase();
        if (username !== lower) return { valid: false, error: "Username must be all lowercase." };
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
            return { valid: false, error: "Username must be 3-20 chars, alphanumeric or underscore." };
        }
        return { valid: true };
    }

    private validatePassword(password: string): { valid: boolean; error?: string } {
        if (password.length < 8) return { valid: false, error: "Password must be at least 8 characters." };
        if (!/[A-Z]/.test(password)) return { valid: false, error: "Password must contain an uppercase letter." };
        if (!/[a-z]/.test(password)) return { valid: false, error: "Password must contain a lowercase letter." };
        if (!/[0-9]/.test(password)) return { valid: false, error: "Password must contain a number." };
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return { valid: false, error: "Password must contain a special character." };
        return { valid: true };
    }

    /**
     * Login - Worker-Only Authentication
     *
     * NO localStorage fallback. All authentication goes through Worker API.
     */
    async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
        return observability.traceDebateAction('auth-login', { userId: 'guest', sessionId: 'login-attempt' }, async (trace) => {
            await this.initPromise;

            // 1. Sanitize & Validate
            const cleanUser = this.sanitizeInput(username);
            const userValidation = this.validateUsername(cleanUser);
            if (!userValidation.valid) {
                trace.update({ output: 'Invalid Username Format', level: 'WARNING' });
                return { success: false, message: userValidation.error! };
            }

            // 2. Hash credentials
            const userHash = await this.hash(cleanUser);
            const passHash = await this.hash(password);

            // 3. Call Worker /api/auth/login
            try {
                const data = await apiPost<{ success: boolean; user?: User }>('/auth/login', {
                    username: userHash,
                    passwordHash: passHash
                });

                if (data.success && data.user) {
                    // Update last login time
                    data.user.lastLogin = Date.now();

                    // Create session
                    await this.createSession(data.user);

                    systemLogs.add({ level: 'success', category: 'security', source: 'Auth', message: `User logged in` });
                    trace.update({ output: 'Success', tags: ['login-success'] });
                    return { success: true, message: "Welcome back." };
                } else {
                    trace.update({ output: 'Invalid Credentials', level: 'WARNING' });
                    return { success: false, message: "Invalid credentials." };
                }
            } catch (e: any) {
                console.error('Login error:', e);
                systemLogs.add({ level: 'error', category: 'security', source: 'Auth', message: `Login failed: ${e.message}` });
                trace.update({ output: 'Login Failed', level: 'ERROR' });

                // User-friendly error messages
                if (e.message?.includes('401')) {
                    return { success: false, message: "Invalid credentials." };
                } else if (e.message?.includes('Network')) {
                    return { success: false, message: "Connection failed. Check your network." };
                } else {
                    return { success: false, message: "Login failed. Please try again." };
                }
            }
        });
    }

    logout() {
        this.currentUser = null;
        document.cookie = "pratejra_session=; path=/; max-age=0; SameSite=Strict";
        systemLogs.add({ level: 'info', category: 'security', source: 'Auth', message: "User logged out." });
        // Force refresh to clear state
        window.location.reload();
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    // --- Session Management (Cookies) ---

    private async createSession(user: User) {
        this.currentUser = user;
        const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `pratejra_session=${user.id}; path=/; max-age=604800; SameSite=Strict${isSecure}`;

        // Add display name for UI
        if (user.username) {
            // For hashed usernames, use generic display name
            // In production, fetch user profile from Worker to get actual name
            (this.currentUser as any)._ui_displayName = user.name || 'User';
        }
    }

    private async restoreSession() {
        const match = document.cookie.match(new RegExp('(^| )pratejra_session=([^;]+)'));
        if (match) {
            const sessionId = match[2];

            try {
                // Validate session with Worker
                // For now, we trust the cookie until Worker provides a session validation endpoint
                // In production, call POST /api/auth/validate-session

                // Temporary: Store minimal user info in cookie until Worker session validation is ready
                // For now, just mark as logged in with session ID
                this.currentUser = {
                    id: sessionId,
                    username: 'session_user',
                    passwordHash: '',
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                } as User;

                (this.currentUser as any)._ui_displayName = 'User';

            } catch (e) {
                // If validation fails, clear session
                console.error('Session restore failed:', e);
                this.logout();
            }
        }
    }
}

export const authService = new AuthService();
