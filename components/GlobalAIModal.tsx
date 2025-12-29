
import React, { useState, useEffect } from 'react';
import { AppConfig, SystemPrompt } from '../types';
import { PaperButton, PaperInput, PaperBadge } from './PaperComponents';
import { 
  X, BrainCircuit, Plus, Save, Trash2, Edit3, Check, 
  Terminal, Settings2, Sliders, Target, User
} from 'lucide-react';

interface GlobalAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}

export const GlobalAIModal: React.FC<GlobalAIModalProps> = ({ isOpen, onClose, config, setConfig }) => {
  const [activeTab, setActiveTab] = useState<'prompts' | 'params' | 'goals'>('goals');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit State
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<SystemPrompt['category']>('analysis');

  // Goals State
  const [tempUserName, setTempUserName] = useState(config.userName);
  const [tempGoals, setTempGoals] = useState(config.userGoals);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (selectedPromptId) {
      const p = config.systemPrompts.find(sp => sp.id === selectedPromptId);
      if (p) {
        setEditName(p.name);
        setEditContent(p.content);
        setEditCategory(p.category);
      }
    } else {
      setEditName('');
      setEditContent('');
      setEditCategory('analysis');
    }
  }, [selectedPromptId, config.systemPrompts]);

  if (!isOpen) return null;

  const handleSavePrompt = () => {
    const newPrompt: SystemPrompt = {
      id: selectedPromptId || `sp-${Date.now()}`,
      name: editName,
      content: editContent,
      category: editCategory,
      lastModified: Date.now()
    };

    setConfig(prev => {
      const exists = prev.systemPrompts.find(p => p.id === newPrompt.id);
      let newPrompts;
      if (exists) {
        newPrompts = prev.systemPrompts.map(p => p.id === newPrompt.id ? newPrompt : p);
      } else {
        newPrompts = [...prev.systemPrompts, newPrompt];
      }
      return { ...prev, systemPrompts: newPrompts };
    });
    
    setIsEditing(false);
    setSelectedPromptId(newPrompt.id);
  };

  const handleDeletePrompt = (id: string) => {
    if (window.confirm('Delete this system prompt?')) {
      setConfig(prev => ({
        ...prev,
        systemPrompts: prev.systemPrompts.filter(p => p.id !== id),
        activeSystemPromptId: prev.activeSystemPromptId === id ? undefined : prev.activeSystemPromptId
      }));
      if (selectedPromptId === id) setSelectedPromptId(null);
    }
  };

  const updateLLM = (key: string, val: any) => {
    setConfig(prev => ({
      ...prev,
      llm: { ...prev.llm, [key]: val }
    }));
  };

  const handleSaveGoals = () => {
      setConfig(prev => ({
          ...prev,
          userName: tempUserName,
          userGoals: tempGoals
      }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white w-[800px] h-[600px] shadow-hard-lg border-2 border-ink relative flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b-2 border-ink bg-gray-50">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-ink text-white rounded-sm">
                 <BrainCircuit size={20}/>
              </div>
              <div>
                 <h2 className="text-lg font-bold font-serif text-ink">My AI System</h2>
                 <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Global Intelligence Config</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-sm transition-colors">
              <X size={20}/>
           </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
           {/* Sidebar */}
           <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col p-2 gap-2">
              <button 
                onClick={() => setActiveTab('goals')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase rounded-sm transition-all ${activeTab === 'goals' ? 'bg-white border border-gray-300 shadow-sm text-ink' : 'text-gray-500 hover:text-ink hover:bg-gray-100'}`}
              >
                 <Target size={14}/> Goals & Context
              </button>
              <button 
                onClick={() => setActiveTab('prompts')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase rounded-sm transition-all ${activeTab === 'prompts' ? 'bg-white border border-gray-300 shadow-sm text-ink' : 'text-gray-500 hover:text-ink hover:bg-gray-100'}`}
              >
                 <Terminal size={14}/> System Prompts
              </button>
              <button 
                onClick={() => setActiveTab('params')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase rounded-sm transition-all ${activeTab === 'params' ? 'bg-white border border-gray-300 shadow-sm text-ink' : 'text-gray-500 hover:text-ink hover:bg-gray-100'}`}
              >
                 <Sliders size={14}/> Parameters
              </button>
           </div>

           {/* Content */}
           <div className="flex-1 p-6 overflow-y-auto bg-dot-pattern">
              
              {/* --- GOALS TAB --- */}
              {activeTab === 'goals' && (
                  <div className="h-full flex flex-col gap-6 animate-fade-in">
                      <div>
                          <h3 className="font-bold text-lg text-ink border-b-2 border-ink pb-2 mb-4 flex items-center gap-2">
                              <User size={18}/> User Identity
                          </h3>
                          <PaperInput 
                            label="Display Name" 
                            value={tempUserName} 
                            onChange={e => setTempUserName(e.target.value)} 
                          />
                      </div>

                      <div className="flex-1 flex flex-col">
                          <h3 className="font-bold text-lg text-ink border-b-2 border-ink pb-2 mb-4 flex items-center gap-2">
                              <Target size={18}/> Custom Instructions (Goal Setting)
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">
                              These goals are appended to every interaction to guide the LLM towards your long-term objectives.
                          </p>
                          <textarea 
                              className="flex-1 w-full p-4 border-2 border-ink font-mono text-sm resize-none focus:outline-none focus:border-accent bg-white text-ink"
                              value={tempGoals}
                              onChange={e => setTempGoals(e.target.value)}
                              placeholder="e.g., Focus on cross-disciplinary insights..."
                          />
                      </div>

                      <div className="flex justify-end pt-4 border-t border-gray-200">
                          <PaperButton onClick={handleSaveGoals} icon={<Save size={14}/>}>
                              Update Context
                          </PaperButton>
                      </div>
                  </div>
              )}

              {/* --- PROMPTS TAB --- */}
              {activeTab === 'prompts' && (
                 <div className="h-full flex gap-6">
                    {/* List */}
                    <div className="w-1/3 border-r border-gray-200 pr-6 flex flex-col gap-3">
                       <PaperButton 
                          size="sm" 
                          variant="secondary" 
                          icon={<Plus size={14}/>} 
                          onClick={() => { setSelectedPromptId(null); setIsEditing(true); }}
                          className="w-full mb-2"
                       >
                          New Prompt
                       </PaperButton>
                       
                       <div className="flex-1 overflow-y-auto space-y-2">
                          {config.systemPrompts.map(p => (
                             <div 
                                key={p.id}
                                onClick={() => { setSelectedPromptId(p.id); setIsEditing(false); }}
                                className={`
                                   p-3 border rounded-sm cursor-pointer transition-all group relative
                                   ${selectedPromptId === p.id ? 'bg-ink text-white border-ink shadow-hard-sm' : 'bg-white border-gray-200 hover:border-accent text-ink'}
                                `}
                             >
                                <div className="font-bold text-xs mb-1 truncate">{p.name}</div>
                                <div className={`text-[10px] uppercase tracking-wide opacity-70 ${selectedPromptId === p.id ? 'text-gray-300' : 'text-gray-500'}`}>{p.category}</div>
                                
                                <button 
                                   onClick={(e) => { e.stopPropagation(); handleDeletePrompt(p.id); }}
                                   className={`absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${selectedPromptId === p.id ? 'hover:bg-white/20' : 'hover:bg-red-50 hover:text-red-500'}`}
                                >
                                   <Trash2 size={12}/>
                                </button>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Editor / Details */}
                    <div className="flex-1 flex flex-col">
                       {isEditing || selectedPromptId ? (
                          <div className="flex flex-col h-full gap-4 animate-fade-in">
                             <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <h3 className="font-bold text-lg text-ink">
                                   {isEditing ? (selectedPromptId ? 'Edit Prompt' : 'Create Prompt') : config.systemPrompts.find(p => p.id === selectedPromptId)?.name}
                                </h3>
                                <div className="flex gap-2">
                                   {!isEditing && (
                                      <PaperButton size="sm" variant="secondary" icon={<Edit3 size={14}/>} onClick={() => setIsEditing(true)}>Edit</PaperButton>
                                   )}
                                   {isEditing && (
                                      <>
                                         <PaperButton size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</PaperButton>
                                         <PaperButton size="sm" icon={<Save size={14}/>} onClick={handleSavePrompt}>Save</PaperButton>
                                      </>
                                   )}
                                </div>
                             </div>

                             {isEditing ? (
                                <div className="space-y-4 flex-1">
                                   <PaperInput label="Prompt Name" value={editName} onChange={e => setEditName(e.target.value)} />
                                   
                                   <div>
                                      <label className="text-xs font-bold uppercase text-gray-500 block mb-2">Category</label>
                                      <select 
                                         className="w-full p-2 border-2 border-ink text-sm font-mono outline-none bg-white text-ink"
                                         value={editCategory}
                                         onChange={e => setEditCategory(e.target.value as any)}
                                      >
                                         <option value="analysis">Analysis</option>
                                         <option value="profile">Profile</option>
                                         <option value="technical">Technical</option>
                                         <option value="creative">Creative</option>
                                      </select>
                                   </div>

                                   <div className="flex-1 flex flex-col">
                                      <label className="text-xs font-bold uppercase text-gray-500 block mb-2">System Instruction</label>
                                      <textarea 
                                         className="flex-1 w-full p-4 border-2 border-ink font-mono text-sm resize-none focus:outline-none focus:border-accent bg-white text-ink"
                                         value={editContent}
                                         onChange={e => setEditContent(e.target.value)}
                                      />
                                   </div>
                                </div>
                             ) : (
                                <div className="flex-1 bg-gray-50 border border-gray-200 p-6 font-mono text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap">
                                   {config.systemPrompts.find(p => p.id === selectedPromptId)?.content}
                                </div>
                             )}

                             {/* Use as Active Button */}
                             {!isEditing && selectedPromptId && (
                                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                                   <span className="text-xs text-gray-500">
                                      ID: <span className="font-mono">{selectedPromptId}</span>
                                   </span>
                                   {config.activeSystemPromptId === selectedPromptId ? (
                                      <PaperBadge color="green"><Check size={12} className="mr-1"/> Active Global Prompt</PaperBadge>
                                   ) : (
                                      <PaperButton 
                                         size="sm" 
                                         variant="secondary" 
                                         onClick={() => setConfig(prev => ({ ...prev, activeSystemPromptId: selectedPromptId! }))}
                                      >
                                         Set as Active
                                      </PaperButton>
                                   )}
                                </div>
                             )}
                          </div>
                       ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                             <Terminal size={48} className="opacity-20"/>
                             <p className="text-sm font-bold">Select a prompt to manage details</p>
                          </div>
                       )}
                    </div>
                 </div>
              )}

              {/* --- PARAMETERS TAB --- */}
              {activeTab === 'params' && (
                 <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
                    <div className="space-y-4">
                       <h3 className="font-bold text-lg text-ink border-b-2 border-ink pb-2">Generation Config</h3>
                       
                       <div>
                          <label className="flex justify-between text-xs font-bold uppercase text-gray-500 mb-2">
                             Temperature <span className="font-mono">{config.llm.temperature}</span>
                          </label>
                          <input 
                             type="range" min="0" max="1" step="0.1"
                             value={config.llm.temperature}
                             onChange={e => updateLLM('temperature', parseFloat(e.target.value))}
                             className="w-full accent-ink h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono uppercase">
                             <span>Precise</span>
                             <span>Creative</span>
                          </div>
                       </div>

                       <div className="space-y-2">
                           <label className="text-xs font-bold uppercase text-gray-500">Model ID</label>
                           <select 
                              className="w-full bg-white border-2 border-ink px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-accent"
                              value={config.llm.model}
                              onChange={e => updateLLM('model', e.target.value)}
                           >
                               <option value="gpt-5">GPT-5</option>
                               <option value="gpt-5-mini">GPT-5 Mini</option>
                               <option value="gpt-4o">GPT-4o</option>
                               <option value="gpt-4o-mini">GPT-4o Mini</option>
                               <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                               <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                               <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
                               <option value="llama3.2">Llama 3.2 7B</option>
                           </select>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="font-bold text-lg text-ink border-b-2 border-ink pb-2">Safety & System</h3>
                       <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs">
                          <p className="font-bold mb-1">Note:</p>
                          These parameters apply globally to the Research Chat and Quick Analysis tools. 
                          Prompt Engineering Lab uses its own isolated configuration.
                       </div>
                    </div>
                 </div>
              )}

           </div>
        </div>
      </div>
    </div>
  );
};
