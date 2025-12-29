
import React, { useState } from 'react';
import { PaperCard, PaperButton, PaperInput, PaperBadge } from '../components/PaperComponents';
import { Shield, UserPlus, LogIn, Cpu, Lock } from 'lucide-react';
import { authService } from '../services/AuthService';

interface AuthViewProps {
    onLoginSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
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

            if (mode === 'register') {
                const res = await authService.register(username, password);
                if (res.success) {
                    onLoginSuccess();
                } else {
                    setError(res.message);
                }
            } else {
                const res = await authService.login(username, password);
                if (res.success) {
                    onLoginSuccess();
                } else {
                    setError(res.message);
                }
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
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                            {mode === 'login' ? <LogIn size={20}/> : <UserPlus size={20}/>}
                            {mode === 'login' ? 'System Access' : 'Create Identity'}
                        </h2>
                        <div className="flex bg-gray-100 p-1 rounded-sm">
                            <button 
                                onClick={() => { setMode('login'); setError(''); }}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-all ${mode === 'login' ? 'bg-white shadow-sm text-ink' : 'text-gray-400'}`}
                            >
                                Sign In
                            </button>
                            <button 
                                onClick={() => { setMode('register'); setError(''); }}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-all ${mode === 'register' ? 'bg-white shadow-sm text-ink' : 'text-gray-400'}`}
                            >
                                Sign Up
                            </button>
                        </div>
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
                                {isLoading ? 'Authenticating...' : mode === 'login' ? 'Initialize Session' : 'Register Identity'}
                            </PaperButton>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <PaperBadge color="ink">Secure Local Vault • SHA-256</PaperBadge>
                    </div>
                </PaperCard>
            </div>
        </div>
    );
};
