
import React, { useState } from 'react';
import { PaperCard, PaperButton, PaperInput, PaperBadge } from '../components/PaperComponents';
import { Shield, LogIn, Cpu, Lock, AlertCircle } from 'lucide-react';
import { authService } from '../services/AuthService';

interface AuthViewProps {
    onLoginSuccess: () => void;
}

/**
 * AuthView - Login-Only Interface
 *
 * CHANGES from previous version:
 * - Removed mode toggle (login/register)
 * - Removed Sign Up button
 * - Removed authService.register() calls
 * - Added "No account? Contact administrator" message
 * - Login-only authentication via Worker API
 */
export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simple validation
        if (username.length < 3 || password.length < 4) {
            setError("Username must be 3+ chars, Password 4+ chars.");
            setIsLoading(false);
            return;
        }

        try {
            await new Promise(r => setTimeout(r, 800)); // Fake network delay for realism

            const res = await authService.login(username, password);
            if (res.success) {
                onLoginSuccess();
            } else {
                setError(res.message);
            }
        } catch (e) {
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-ink rounded-full mb-4 shadow-hard">
                        <Cpu size={32} className="text-white"/>
                    </div>
                    <h1 className="text-4xl font-serif font-bold text-ink mb-1">Metacogna AI RAG</h1>
                    <p className="text-sm font-mono text-gray-500 uppercase tracking-widest">Cognitive Operating System</p>
                </div>

                <PaperCard className="border-t-4 border-t-accent">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                            <LogIn size={20}/>
                            System Access
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Enter your credentials to access the system
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <PaperInput
                            label="Username"
                            placeholder="Enter ID..."
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            disabled={isLoading}
                        />
                        <div className="relative">
                            <PaperInput
                                label="Password"
                                type="password"
                                placeholder="Enter Secret..."
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                            <Lock size={14} className="absolute right-3 top-[34px] text-gray-400"/>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-sm animate-slide-in">
                                ! {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <PaperButton
                                type="submit"
                                className="w-full justify-center"
                                disabled={isLoading}
                                icon={isLoading ? <Cpu size={16} className="animate-spin"/> : <Shield size={16}/>}
                            >
                                {isLoading ? 'Authenticating...' : 'Initialize Session'}
                            </PaperButton>
                        </div>
                    </form>

                    {/* No Account Message */}
                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0"/>
                            <div className="text-xs">
                                <p className="font-bold text-blue-900 mb-1">No account?</p>
                                <p className="text-blue-700">
                                    Contact your system administrator to request access.
                                    Account creation is restricted to authorized personnel.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <PaperBadge color="ink">Worker Auth • SHA-256</PaperBadge>
                    </div>
                </PaperCard>
            </div>
        </div>
    );
};
