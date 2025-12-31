
import React, { useState, Suspense, useEffect } from 'react';
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
import { ViewState, Document, AppConfig } from './types';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DEFAULT_CONFIG } from './constants'; // Removed MOCK_DOCUMENTS
import { systemLogs } from './services/LogService';
import { authService } from './services/AuthService';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LANDING);
  // Start empty for production readiness
  const [documents, setDocuments] = useState<Document[]>([]); 
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
        setIsAuthenticated(true);
        setIsAdmin(user.isAdmin === 1);
        setConfig(prev => ({ ...prev, userName: user.username }));
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

  const handleLoginSuccess = () => {
      setIsAuthenticated(true);
      const user = authService.getCurrentUser();
      if (user) {
          setIsAdmin(user.isAdmin === 1);
          setConfig(prev => ({ ...prev, userName: user.username }));
      }
  };

  const handleLogout = () => {
      authService.logout();
      setIsAuthenticated(false);
      setCurrentView(ViewState.LANDING);
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.LANDING:
        return (
          <LandingPageView 
            onNavigate={setCurrentView} 
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
            onNavigateToSettings={() => setCurrentView(ViewState.SETTINGS)}
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
            onClose={() => setCurrentView(ViewState.LANDING)}
            onSuccess={() => {
              setCurrentView(ViewState.LANDING);
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
            onNavigate={setCurrentView} 
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
            setView={setCurrentView}
            config={config}
            isAdmin={isAdmin}
            onLogout={handleLogout}
        >
          <SystemPromptAlert 
            config={config} 
            onNavigateToSettings={() => setCurrentView(ViewState.SETTINGS)} 
          />
          {renderView()}
        </Layout>
        
        {/* Global Modal */}
        <GlobalAIModal 
          isOpen={isAIModalOpen} 
          onClose={() => setIsAIModalOpen(false)} 
          config={config} 
          setConfig={setConfig} 
        />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
