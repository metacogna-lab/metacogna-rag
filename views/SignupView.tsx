
import React, { useState } from 'react';
import { PaperCard, PaperButton, PaperInput, PaperBadge } from '../components/PaperComponents';
import { UserPlus, Upload, Info, Shield, AlertCircle, X } from 'lucide-react';
import { apiPost } from '../services/ApiClient';

interface SignupViewProps {
    onClose: () => void;
    onSuccess: () => void;
}

/**
 * SignupView - Admin-Only User Creation Interface
 *
 * Features:
 * - Full name, email, password, goals input
 * - Multi-file upload (.md, .pdf, .txt)
 * - Goal monitoring instructions banner
 * - Submits to POST /api/signup with admin token
 * - FormData submission with files
 */
export const SignupView: React.FC<SignupViewProps> = ({ onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [goals, setGoals] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(e.target.files);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validation
        if (!name || name.trim().length === 0) {
            setError("Full name is required.");
            setIsLoading(false);
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Valid email is required.");
            setIsLoading(false);
            return;
        }

        if (!password || password.length < 8) {
            setError("Password must be at least 8 characters.");
            setIsLoading(false);
            return;
        }

        try {
            // Prepare FormData
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('goals', goals || '');

            // Add files if provided
            if (files) {
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }
            }

            // Get admin token from session
            // In production, this would come from authService or stored session
            const adminToken = 'Bearer admin-token-placeholder';

            // Submit to Worker
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Authorization': adminToken
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                onSuccess();
            } else {
                setError(data.error || 'Signup failed. Please try again.');
            }
        } catch (e: any) {
            console.error('Signup error:', e);
            setError('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="w-full max-w-2xl relative">
                <PaperCard className="border-t-4 border-t-accent">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                                <UserPlus size={24}/>
                                Create New User
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Admin-only user account creation
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
                            aria-label="Close"
                        >
                            <X size={20} className="text-gray-400"/>
                        </button>
                    </div>

                    {/* Instructions Banner */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                        <div className="flex items-start gap-3">
                            <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0"/>
                            <div className="text-xs">
                                <p className="font-bold text-blue-900 mb-1">Goal Monitoring Active</p>
                                <p className="text-blue-700">
                                    User goals are monitored by the MetaCogna agent to personalize interactions
                                    and provide context-aware assistance. Goals will be summarized using AI
                                    and stored securely.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <PaperInput
                            label="Full Name"
                            placeholder="Enter user's full name..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            disabled={isLoading}
                            required
                        />

                        {/* Email */}
                        <PaperInput
                            label="Email Address"
                            type="email"
                            placeholder="user@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            disabled={isLoading}
                            required
                        />

                        {/* Password */}
                        <PaperInput
                            label="Password"
                            type="password"
                            placeholder="Minimum 8 characters..."
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />

                        {/* User Goals */}
                        <div>
                            <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                                User Goals (Optional)
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border-2 border-ink bg-white text-sm font-mono focus:outline-none focus:shadow-hard transition-all resize-none"
                                rows={4}
                                placeholder="Describe the user's goals, learning objectives, or areas of interest..."
                                value={goals}
                                onChange={e => setGoals(e.target.value)}
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                These will be summarized by AI and used to personalize the user experience.
                            </p>
                        </div>

                        {/* Initial Files Upload */}
                        <div>
                            <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                                Initial Files (Optional)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-sm p-4 hover:border-accent transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    accept=".md,.pdf,.txt"
                                    onChange={handleFileChange}
                                    disabled={isLoading}
                                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-ink file:text-white hover:file:bg-gray-800 cursor-pointer"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Upload initial documents (.md, .pdf, .txt). Up to 10 files supported.
                            </p>
                            {files && files.length > 0 && (
                                <div className="mt-2 p-2 bg-gray-50 rounded-sm">
                                    <p className="text-xs font-bold text-gray-700 mb-1">
                                        Selected Files ({files.length}):
                                    </p>
                                    <ul className="text-xs text-gray-600 space-y-0.5">
                                        {Array.from(files).map((file, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <Upload size={12}/>
                                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-sm animate-slide-in flex items-start gap-2">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5"/>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4 flex gap-3">
                            <PaperButton
                                type="button"
                                onClick={onClose}
                                className="flex-1 justify-center bg-gray-200 hover:bg-gray-300 text-gray-700"
                                disabled={isLoading}
                            >
                                Cancel
                            </PaperButton>
                            <PaperButton
                                type="submit"
                                className="flex-1 justify-center"
                                disabled={isLoading}
                                icon={<Shield size={16}/>}
                            >
                                {isLoading ? 'Creating User...' : 'Create User'}
                            </PaperButton>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <PaperBadge color="accent">Admin Action • Secure</PaperBadge>
                    </div>
                </PaperCard>
            </div>
        </div>
    );
};
