
import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import {
  LayoutGrid,
  MessageSquare,
  Network,
  Terminal,
  Settings,
  ChevronRight,
  ChevronLeft,
  Cpu,
  UserCircle,
  Bot,
  Activity,
  LogOut,
  BrainCircuit,
  UserPlus
} from 'lucide-react';
import { authService } from '../services/AuthService';
import { SupervisorWidget } from './SupervisorWidget';
import { GlobalToast } from './GlobalToast'; // New Import
import { AppConfig } from '../types'; // Import types

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  config: AppConfig; // Pass config for Supervisor
  isAdmin: boolean; // Admin status for UI gates
  onLogout: () => void;
}

const SidebarItem: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  expanded: boolean;
}> = ({ active, onClick, icon, label, expanded }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-4 p-3 w-full transition-all duration-200 group relative rounded-sm
      ${active ? 'bg-ink text-paper shadow-hard-sm' : 'text-gray-500 hover:bg-surface hover:text-ink'}
    `}
  >
    <div className={`shrink-0 ${active ? 'text-accent' : ''}`}>{icon}</div>
    
    {expanded && (
      <span className="font-sans font-bold text-sm tracking-wide whitespace-nowrap animate-fade-in">{label}</span>
    )}

    {!expanded && (
      <div className="absolute left-full ml-4 px-2 py-1 bg-ink text-paper text-xs font-mono font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-hard-sm border-2 border-paper">
        {label}
      </div>
    )}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, config, isAdmin, onLogout }) => {
  const [expanded, setExpanded] = useState(false);
  const user = authService.getCurrentUser();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface font-sans">
      
      {/* Supervisor Overlay */}
      <SupervisorWidget config={config} />
      
      {/* Global Toast Overlay */}
      <GlobalToast setView={setView} />

      {/* Sidebar Dock */}
      <aside 
        className={`
          flex flex-col bg-paper border-r-2 border-ink h-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 relative
          ${expanded ? 'w-64' : 'w-20'}
        `}
      >
        {/* Brand / Header */}
        <div 
            className="h-24 flex items-center justify-center border-b-2 border-ink bg-ink relative overflow-hidden cursor-pointer group"
            onClick={() => setView(ViewState.LANDING)}
        >
          <div className={`flex items-center ${expanded ? 'gap-3' : ''} transition-all duration-300`}>
             <div className="w-10 h-10 relative flex items-center justify-center group-hover:scale-110 transition-transform">
                 <div className="absolute inset-0 border-2 border-accent rounded-full border-t-transparent animate-[spin_3s_linear_infinite]"></div>
                 <div className="absolute inset-1 border-2 border-cyan-400 rounded-full border-b-transparent animate-[spin_2s_linear_infinite_reverse]"></div>
                 <Cpu size={20} className="text-paper relative z-10" />
             </div>
             
             {expanded && (
                <div className="animate-fade-in flex flex-col">
                    <h1 className="font-serif font-bold text-xl text-paper tracking-wide leading-none">
                      METACOGNA
                    </h1>
                    <span className="text-[9px] font-mono text-accent uppercase tracking-[0.2em] mt-1">
                      System v1.0
                    </span>
                </div>
             )}
          </div>
          
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[gradient_15s_ease_infinite] pointer-events-none"></div>
        </div>

        {/* User Info (Mini) */}
        {expanded && user && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-xs font-bold text-ink truncate">{user.username}</p>
                    <p className="text-[9px] text-gray-400 font-mono truncate">ID: {user.id.substring(0, 6)}</p>
                </div>
            </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          <SidebarItem 
            label="Documents" 
            icon={<LayoutGrid size={22} />} 
            active={currentView === ViewState.UPLOAD} 
            onClick={() => setView(ViewState.UPLOAD)}
            expanded={expanded}
          />
          <SidebarItem 
            label="My Profile" 
            icon={<UserCircle size={22} />} 
            active={currentView === ViewState.MY_PROFILE} 
            onClick={() => setView(ViewState.MY_PROFILE)}
            expanded={expanded}
          />
          <SidebarItem 
            label="Agent Workspace" 
            icon={<Bot size={22} />} 
            active={currentView === ViewState.AGENT_CANVAS} 
            onClick={() => setView(ViewState.AGENT_CANVAS)}
            expanded={expanded}
          />
          <div className="my-2 border-t border-gray-200"></div>
          <SidebarItem 
            label="ProductX Engine" 
            icon={<BrainCircuit size={22} />} 
            active={currentView === ViewState.PRODUCT_X} 
            onClick={() => setView(ViewState.PRODUCT_X)}
            expanded={expanded}
          />
          <div className="my-2 border-t border-gray-200"></div>
          <SidebarItem 
            label="Research Chat" 
            icon={<MessageSquare size={22} />} 
            active={currentView === ViewState.QUESTION} 
            onClick={() => setView(ViewState.QUESTION)}
            expanded={expanded}
          />
          <SidebarItem 
            label="Knowledge Graph" 
            icon={<Network size={22} />} 
            active={currentView === ViewState.GRAPH} 
            onClick={() => setView(ViewState.GRAPH)}
            expanded={expanded}
          />
          <SidebarItem 
            label="Prompt Lab" 
            icon={<Terminal size={22} />} 
            active={currentView === ViewState.PROMPT} 
            onClick={() => setView(ViewState.PROMPT)}
            expanded={expanded}
          />
          <SidebarItem 
            label="System Console" 
            icon={<Activity size={22} />} 
            active={currentView === ViewState.CONSOLE} 
            onClick={() => setView(ViewState.CONSOLE)}
            expanded={expanded}
          />
        </nav>

        {/* Footer */}
        <div className="p-3 border-t-2 border-ink bg-surface flex flex-col gap-2">
          <SidebarItem
             label="Settings"
             icon={<Settings size={22} />}
             active={currentView === ViewState.SETTINGS}
             onClick={() => setView(ViewState.SETTINGS)}
             expanded={expanded}
          />
          {isAdmin && (
            <SidebarItem
               label="Create User"
               icon={<UserPlus size={22} />}
               active={currentView === ViewState.SIGNUP}
               onClick={() => setView(ViewState.SIGNUP)}
               expanded={expanded}
            />
          )}
          <button
            onClick={onLogout}
            className="flex items-center gap-4 p-3 w-full text-red-500 hover:bg-red-50 rounded-sm transition-colors"
            title="Sign Out"
          >
             <LogOut size={22} className="shrink-0"/>
             {expanded && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>

        {/* Toggle Handle */}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="absolute -right-3 top-28 bg-paper border-2 border-ink w-6 h-6 flex items-center justify-center rounded-sm hover:bg-accent transition-colors z-50 shadow-sm"
        >
          {expanded ? <ChevronLeft size={14}/> : <ChevronRight size={14}/>}
        </button>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Removed subtle gradient to adhere to strict flat paper aesthetics or keep it very subtle */}
        <div className="absolute inset-0 bg-surface pointer-events-none z-0" />
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative z-10">
          <div className="max-w-[1400px] mx-auto min-h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
