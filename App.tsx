
import React, { Suspense, useEffect } from 'react';
import { Layout } from './components/Layout';
import { UploadView } from './views/UploadView';
import { QuestionView } from './views/QuestionView';
import { KnowledgeGraphView } from './views/KnowledgeGraphView';
import { PromptGenView } from './views/PromptGenView';
import { MyProfileView } from './views/MyProfileView';
import { AgentCanvasView } from './views/AgentCanvasView';
import { ProductXView } from './views/ProductXView';
import { SettingsView } from './views/SettingsView';
import { LandingPageView } from './views/LandingPageView';
import { ConsoleView } from './views/ConsoleView';
import { AuthView } from './views/AuthView'; // Import Auth
import { SignupView } from './views/SignupView'; // Import Signup
import { GlobalAIModal } from './components/GlobalAIModal';
import { SystemPromptAlert } from './components/SystemPromptAlert';
import { SupervisorWidget } from './components/SupervisorWidget';
import { SupervisorToast } from './components/SupervisorToast';
import { ViewState } from './types';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { systemLogs } from './services/LogService';
import { authService } from './services/AuthService';
import { useAppStore, selectAuth, selectDocuments, selectConfig, selectCurrentView } from './store';
import { pollingManager } from './services/PollingManager';

function App() {
  // Zustand selectors
  const { isAuthenticated, isAdmin, username } = useAppStore(selectAuth);
  const documents = useAppStore(selectDocuments);
  const config = useAppStore(selectConfig);
  const currentView = useAppStore(selectCurrentView);
  const isAIModalOpen = useAppStore(state => state.isAIModalOpen);

  // Zustand actions
  const setView = useAppStore(state => state.setView);
  const setConfig = useAppStore(state => state.setConfig);
  const setDocuments = useAppStore(state => state.setDocuments);
  const setAIModalOpen = useAppStore(state => state.setAIModalOpen);
  const setAuth = useAppStore(state => state.setAuth);
  const logout = useAppStore(state => state.logout);

  // Keyboard Shortcut for My AI Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsAIModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Check initial auth
    const user = authService.getCurrentUser();
    if (user) {
        setAuth({
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin === 1
        });
    }

    // Log app init
    systemLogs.add({
        level: 'info',
        category: 'app',
        source: 'App',
        message: 'Application mounted successfully.'
    });

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Supervisor Polling Manager
  useEffect(() => {
    if (isAuthenticated && username) {
      pollingManager.start();
      return () => pollingManager.stop();
    }
  }, [isAuthenticated, username]);

  const handleLoginSuccess = () => {
      const user = authService.getCurrentUser();
      if (user) {
          setAuth({
              id: user.id,
              username: user.username,
              isAdmin: user.isAdmin === 1
          });
      }
  };

  const handleLogout = () => {
      authService.logout();
      logout(); // Zustand logout action (resets auth state and sets view to LANDING)
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.LANDING:
        return (
          <LandingPageView
            onNavigate={setView}
            documents={documents}
            config={config}
          />
        );
      case ViewState.UPLOAD:
        return (
          <UploadView
            documents={documents}
            setDocuments={setDocuments}
            config={config}
            onNavigateToSettings={() => setView(ViewState.SETTINGS)}
          />
        );
      case ViewState.QUESTION:
        return <QuestionView config={config} setConfig={setConfig} />;
      case ViewState.GRAPH:
        return <KnowledgeGraphView documents={documents} />;
      case ViewState.PROMPT:
        return <PromptGenView />;
      case ViewState.PRODUCT_X:
        return <ProductXView config={config} />;
      case ViewState.MY_PROFILE:
        return <MyProfileView documents={documents} config={config} setConfig={setConfig} />;
      case ViewState.AGENT_CANVAS:
        return <AgentCanvasView config={config} setConfig={setConfig} />;
      case ViewState.SETTINGS:
        return <SettingsView config={config} setConfig={setConfig} />;
      case ViewState.CONSOLE:
        return <ConsoleView config={config} />;
      case ViewState.SIGNUP:
        return (
          <SignupView
            onClose={() => setView(ViewState.LANDING)}
            onSuccess={() => {
              setView(ViewState.LANDING);
              systemLogs.add({
                level: 'success',
                category: 'admin',
                source: 'App',
                message: 'New user created successfully'
              });
            }}
          />
        );
      default:
        return (
          <LandingPageView
            onNavigate={setView}
            documents={documents}
            config={config}
          />
        );
    }
  };

  if (!isAuthenticated) {
      return (
          <ErrorBoundary>
              <AuthView onLoginSuccess={handleLoginSuccess} />
          </ErrorBoundary>
      );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#f4f4f5]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-emerald-500" />
            <h2 className="font-serif text-xl font-bold text-gray-700">Initializing System...</h2>
          </div>
        </div>
      }>
        <Layout
            currentView={currentView}
            setView={setView}
            config={config}
            isAdmin={isAdmin}
            onLogout={handleLogout}
        >
          <SystemPromptAlert
            config={config}
            onNavigateToSettings={() => setView(ViewState.SETTINGS)}
          />
          {renderView()}
        </Layout>

        {/* Global Modal */}
        <GlobalAIModal
          isOpen={isAIModalOpen}
          onClose={() => setAIModalOpen(false)}
          config={config}
          setConfig={setConfig}
        />

        {/* Supervisor Components */}
        <SupervisorWidget />
        <SupervisorToast />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
