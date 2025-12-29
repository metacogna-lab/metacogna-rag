
import { User } from "../types";
import { systemLogs } from "./LogService";
import { observability } from "./Observability";

const STORAGE_KEY_USERS = 'pratejra_users_db_secure_v2';
const API_BASE_URL = '/api/auth'; // Cloudflare Worker Endpoint

class AuthService {
    private users: User[] = [];
    private currentUser: User | null = null;
    private initPromise: Promise<void>;

    constructor() {
        this.initPromise = this.initialize();
    }

    private async initialize() {
        this.loadUsers();
        await this.seedAdmin();
        await this.restoreSession();
    }

    private loadUsers() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_USERS);
            if (data) {
                this.users = JSON.parse(data);
            }
        } catch (e) {
            console.error("Failed to load users DB", e);
        }
    }

    private saveUsers() {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
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

    private async seedAdmin() {
        // Admin Credentials - Hardcoded for Memory Storage as requested
        const adminUser = 'sunyata';
        const adminPass = 'TestTest123!'; 
        
        const usernameHash = await this.hash(adminUser);
        
        // Ensure admin is always in local state (Memory/Cache)
        if (!this.users.find(u => u.username === usernameHash)) {
            const passwordHash = await this.hash(adminPass);
            const admin: User = {
                id: 'admin-001',
                username: usernameHash,
                passwordHash: passwordHash,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                preferences: { theme: 'light' }
            };
            this.users.push(admin);
            this.saveUsers();
            console.log("Secure Admin Account Seeded in Memory.");
        }
    }

    async register(username: string, password: string): Promise<{ success: boolean; message: string }> {
        return observability.traceDebateAction('auth-register', { userId: 'guest', sessionId: 'registration' }, async (trace) => {
            await this.initPromise;
            
            // 1. Sanitize & Validate
            const cleanUser = this.sanitizeInput(username);
            const userValidation = this.validateUsername(cleanUser);
            if (!userValidation.valid) return { success: false, message: userValidation.error! };

            const passValidation = this.validatePassword(password);
            if (!passValidation.valid) return { success: false, message: passValidation.error! };

            const userHash = await this.hash(cleanUser);

            // 2. Check Duplicates (Local Cache)
            if (this.users.find(u => u.username === userHash)) {
                trace.update({ output: 'Duplicate Username', level: 'WARNING' });
                return { success: false, message: "Username already taken." };
            }

            const passHash = await this.hash(password);
            const newUser: User = {
                id: crypto.randomUUID(),
                username: userHash,
                passwordHash: passHash,
                createdAt: Date.now(),
                lastLogin: Date.now()
            };

            // 3. Persist (Try Cloud D1 first, fallback to Local)
            try {
                const res = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUser)
                });
                if (!res.ok && res.status !== 404) {
                    const err = await res.json();
                    throw new Error(err.message || 'API Error');
                }
                // If 404 (local dev without worker), we fall through to local storage logic below
            } catch (e) {
                console.warn("D1 Registration failed, using LocalStorage fallback", e);
            }

            // Always update local cache for immediate feedback
            this.users.push(newUser);
            this.saveUsers();
            
            systemLogs.add({ level: 'success', category: 'security', source: 'Auth', message: `New user registered` });
            await this.createSession(newUser);
            
            trace.update({ output: 'Success' });
            return { success: true, message: "Registration successful." };
        });
    }

    async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
        return observability.traceDebateAction('auth-login', { userId: 'guest', sessionId: 'login-attempt' }, async (trace) => {
            await this.initPromise;
            
            const cleanUser = this.sanitizeInput(username);
            const userHash = await this.hash(cleanUser);
            
            // 1. Check Local Cache (Admin is always here)
            let user = this.users.find(u => u.username === userHash);

            // 2. If not found locally, try D1
            if (!user) {
                try {
                    const passHash = await this.hash(password);
                    const res = await fetch(`${API_BASE_URL}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: userHash, passwordHash: passHash })
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.user) {
                            user = data.user;
                            // Cache valid remote user locally
                            if (!this.users.find(u => u.id === user!.id)) {
                                this.users.push(user!);
                                this.saveUsers();
                            }
                        }
                    }
                } catch (e) {
                    // Ignore API errors, proceed with null user
                }
            }
            
            if (!user) {
                trace.update({ output: 'User Not Found', level: 'WARNING' });
                return { success: false, message: "Invalid credentials." };
            }

            const passHash = await this.hash(password);
            if (user.passwordHash !== passHash) {
                systemLogs.add({ level: 'warn', category: 'security', source: 'Auth', message: `Failed login for ${cleanUser}` });
                trace.update({ output: 'Wrong Password', level: 'WARNING' });
                return { success: false, message: "Invalid credentials." };
            }

            user.lastLogin = Date.now();
            this.saveUsers();
            
            await this.createSession(user);
            
            systemLogs.add({ level: 'success', category: 'security', source: 'Auth', message: `User logged in` });
            trace.update({ output: 'Success', tags: ['login-success'] });
            return { success: true, message: "Welcome back." };
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
    }

    private async restoreSession() {
        const match = document.cookie.match(new RegExp('(^| )pratejra_session=([^;]+)'));
        if (match) {
            const sessionId = match[2];
            let user = this.users.find(u => u.id === sessionId);
            
            if (user) {
                this.currentUser = user;
                
                // Admin Display Name Hack
                const adminHash = await this.hash('sunyata');
                if (user.username === adminHash) {
                    (this.currentUser as any)._ui_displayName = 'Sunyata'; 
                } else {
                    (this.currentUser as any)._ui_displayName = 'User';
                }
            }
        }
    }
}

export const authService = new AuthService();
