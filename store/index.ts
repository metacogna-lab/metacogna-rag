import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Document, AppConfig, ViewState } from '../types';
import { DEFAULT_CONFIG } from '../constants';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId: string | null;
  username: string | null;
  setAuth: (user: { id: string; username: string; isAdmin: boolean }) => void;
  logout: () => void;
}

interface DocumentState {
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
}

interface ConfigState {
  config: AppConfig;
  setConfig: (config: AppConfig | ((prev: AppConfig) => AppConfig)) => void;
  updateConfigField: <K extends keyof AppConfig>(field: K, value: AppConfig[K]) => void;
}

interface UIState {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isAIModalOpen: boolean;
  setAIModalOpen: (open: boolean) => void;
}

interface SupervisorState {
  isMonitoring: boolean;
  lastPolledAt: number | null;
  stateChangePercentage: number;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updatePollTimestamp: () => void;
  setStateChange: (percentage: number) => void;
}

interface InteractionState {
  logInteraction: (action: {
    viewState: ViewState;
    actionType: string;
    actionTarget?: string;
    actionPayload?: any;
    durationMs?: number;
  }) => Promise<void>;
}

export interface AppStore extends AuthState, DocumentState, ConfigState, UIState, SupervisorState, InteractionState {}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Auth
        isAuthenticated: false,
        isAdmin: false,
        userId: null,
        username: null,
        setAuth: (user) => set({
          isAuthenticated: true,
          userId: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          config: { ...get().config, userName: user.username }
        }),
        logout: () => set({
          isAuthenticated: false,
          userId: null,
          username: null,
          isAdmin: false,
          currentView: ViewState.LANDING
        }),

        // Documents
        documents: [],
        setDocuments: (docs) => set({ documents: docs }),
        addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
        updateDocument: (id, updates) => set((state) => ({
          documents: state.documents.map(d => d.id === id ? { ...d, ...updates } : d)
        })),
        removeDocument: (id) => set((state) => ({
          documents: state.documents.filter(d => d.id !== id)
        })),

        // Config
        config: DEFAULT_CONFIG,
        setConfig: (configOrFn) => set((state) => ({
          config: typeof configOrFn === 'function' ? configOrFn(state.config) : configOrFn
        })),
        updateConfigField: (field, value) => set((state) => ({
          config: { ...state.config, [field]: value }
        })),

        // UI
        currentView: ViewState.LANDING,
        setView: (view) => set({ currentView: view }),
        isAIModalOpen: false,
        setAIModalOpen: (open) => set({ isAIModalOpen: open }),

        // Supervisor
        isMonitoring: false,
        lastPolledAt: null,
        stateChangePercentage: 0,
        startMonitoring: () => set({ isMonitoring: true }),
        stopMonitoring: () => set({ isMonitoring: false }),
        updatePollTimestamp: () => set({ lastPolledAt: Date.now() }),
        setStateChange: (percentage) => set({ stateChangePercentage: percentage }),

        // Interaction Logging
        logInteraction: async (action) => {
          const state = get();
          if (!state.userId) return;

          try {
            await fetch('/api/interactions/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: state.userId,
                timestamp: Date.now(),
                viewState: action.viewState,
                actionType: action.actionType,
                actionTarget: action.actionTarget,
                actionPayload: JSON.stringify(action.actionPayload || {}),
                durationMs: action.durationMs
              })
            });
          } catch (err) {
            console.error('Failed to log interaction:', err);
          }
        }
      }),
      {
        name: 'metacogna-store',
        partialize: (state) => ({ config: state.config })
      }
    )
  )
);

// Selectors for optimized re-renders
export const selectAuth = (state: AppStore) => ({
  isAuthenticated: state.isAuthenticated,
  isAdmin: state.isAdmin,
  userId: state.userId,
  username: state.username
});

export const selectDocuments = (state: AppStore) => state.documents;
export const selectConfig = (state: AppStore) => state.config;
export const selectCurrentView = (state: AppStore) => state.currentView;
export const selectSupervisor = (state: AppStore) => ({
  isMonitoring: state.isMonitoring,
  lastPolledAt: state.lastPolledAt,
  stateChangePercentage: state.stateChangePercentage
});
