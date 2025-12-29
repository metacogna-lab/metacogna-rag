
import React, { useState, useEffect, useRef } from 'react';
import { PaperCard, PaperInput, PaperButton, PaperBadge, MarkdownText } from '../components/PaperComponents';
import { MOCK_CHAT_HISTORY, MOCK_DOCUMENTS, AVAILABLE_MODELS } from '../constants';
import { ChatMessage, Source, AppConfig, Document } from '../types';
import { Send, Sparkles, BookOpen, Bot, User, ArrowUpRight, Search, Sliders, Filter, AtSign, Check, X, Save, Cpu } from 'lucide-react';
import { ragSystem } from '../services/RAGEngine';
import { memoryService } from '../services/MemoryService';
import { sessionAnalysisService } from '../services/SessionAnalysisService';

const ChatBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-slide-in`}>
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          {isUser ? (
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">You</span>
          ) : (
             <>
                <Bot size={14} className="text-accent" />
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Assistant</span>
             </>
          )}
        </div>
        <div className={`
          p-5 text-sm leading-relaxed shadow-hard-sm relative
          ${isUser 
            ? 'bg-ink text-white border-2 border-ink rounded-none rounded-tl-lg' 
            : 'bg-white text-ink border-2 border-ink rounded-none rounded-tr-lg'}
        `}>
          <MarkdownText content={msg.content} />
        </div>
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 w-full animate-fade-in">
            {msg.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1.5 text-xs hover:border-accent hover:bg-emerald-50 cursor-pointer transition-colors group/source">
                 <BookOpen size={12} className="text-gray-400 group-hover/source:text-accent"/>
                 <span className="font-mono truncate max-w-[150px]">{s.documentTitle}</span>
                 <ArrowUpRight size={10} className="text-gray-300"/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ControlPanel: React.FC<{
    temperature: number;
    setTemperature: (v: number) => void;
    activeFilters: string[]; 
    toggleFilter: (id: string) => void;
    resetFilters: () => void;
    selectAllFilters: () => void;
    config: AppConfig;
    setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}> = ({ temperature, setTemperature, activeFilters, toggleFilter, resetFilters, selectAllFilters, config, setConfig }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Determine available models based on current provider
    const models = config.llm.provider === 'ollama' 
        ? [{id: config.llm.model, name: config.llm.model}] // Ollama models fetched in settings mostly
        : AVAILABLE_MODELS[config.llm.provider as keyof typeof AVAILABLE_MODELS] || [];

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-2 transition-all ${isOpen ? 'border-accent bg-accent-light text-ink' : 'border-gray-300 text-gray-500 hover:border-ink'}`}
            >
                <Sliders size={14}/>
                <span>Controls</span>
                {(activeFilters.length > 0 && activeFilters.length < MOCK_DOCUMENTS.length) && (
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                )}
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border-2 border-ink shadow-hard-lg z-50 p-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                         <h4 className="text-xs font-bold uppercase text-ink">Session Parameters</h4>
                         <button onClick={() => setIsOpen(false)}><X size={14} className="text-gray-400 hover:text-red-500"/></button>
                    </div>
                    
                    <div className="mb-4">
                        <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Active Model ({config.llm.provider})</label>
                        <select 
                            className="w-full text-xs p-1 border border-gray-300 rounded-sm bg-white"
                            value={config.llm.model}
                            onChange={(e) => setConfig({...config, llm: {...config.llm, model: e.target.value}})}
                        >
                            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>

                    <div className="mb-6">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Creativity (Temp)</span>
                            <span className="font-mono text-xs text-ink">{temperature}</span>
                         </div>
                         <input 
                            type="range" min="0" max="1" step="0.1"
                            value={temperature}
                            onChange={e => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none accent-ink cursor-pointer"
                         />
                    </div>
                    <div>
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase text-gray-500">Knowledge Scope</span>
                            <div className="flex gap-1">
                                <button onClick={selectAllFilters} className="text-[10px] px-1 bg-gray-100 hover:bg-gray-200">All</button>
                                <button onClick={resetFilters} className="text-[10px] px-1 bg-gray-100 hover:bg-gray-200">None</button>
                            </div>
                         </div>
                         <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-100 p-1 bg-gray-50">
                             {MOCK_DOCUMENTS.map(doc => {
                                 const isSelected = activeFilters.includes(doc.id);
                                 return (
                                     <button 
                                        key={doc.id}
                                        onClick={() => toggleFilter(doc.id)}
                                        className={`w-full flex items-center gap-2 p-2 text-xs text-left transition-colors border ${isSelected ? 'bg-white border-accent shadow-sm' : 'hover:bg-gray-100 border-transparent opacity-60'}`}
                                     >
                                         <div className={`w-3 h-3 border flex items-center justify-center ${isSelected ? 'border-accent bg-accent' : 'border-gray-400'}`}>
                                             {isSelected && <Check size={10} className="text-white"/>}
                                         </div>
                                         <span className="truncate flex-1">{doc.title}</span>
                                     </button>
                                 );
                             })}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const QuestionView: React.FC<{ config: AppConfig; setConfig: React.Dispatch<React.SetStateAction<AppConfig>> }> = ({ config, setConfig }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_HISTORY);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  
  // Advanced State
  const [temperature, setTemperature] = useState(config.llm.temperature);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Memory State
  const [streamId, setStreamId] = useState('');

  // Mention State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Session Stream
  useEffect(() => {
      const newStreamId = memoryService.createStream(`Chat-${new Date().toLocaleTimeString()}`);
      setStreamId(newStreamId);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const pos = e.target.selectionStart || 0;
      setInput(val);
      setCursorPos(pos);
      const lastAt = val.lastIndexOf('@', pos - 1);
      if (lastAt !== -1) {
          const query = val.slice(lastAt + 1, pos);
          if (!query.includes(' ')) {
              setMentionQuery(query);
              setShowMentions(true);
              return;
          }
      }
      setShowMentions(false);
  };

  const insertMention = (text: string) => {
      const lastAt = input.lastIndexOf('@', cursorPos - 1);
      const prefix = input.slice(0, lastAt);
      const suffix = input.slice(cursorPos);
      const newVal = `${prefix}@${text} ${suffix}`;
      setInput(newVal);
      setShowMentions(false);
      inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userText = input;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Save to Memory
    if (streamId) {
        memoryService.addFrame(streamId, {
            agentName: 'User',
            input: userText,
            thought: 'User Input',
            action: 'ASK',
            output: userText,
            tags: ['chat']
        });
    }

    try {
        const filterIds = activeFilters.length > 0 ? activeFilters : undefined;
        const sources = await ragSystem.search(userText, MOCK_DOCUMENTS, filterIds, config.llm);
        const activeSystemPrompt = config.systemPrompts.find(p => p.id === config.activeSystemPromptId)?.content;

        // Retrieve Short Term Memory Context
        const shortTermHistory = streamId ? memoryService.getShortTermMemory(streamId, 5) : "";

        const answerText = await ragSystem.generateRAGResponse(
            userText, 
            sources, 
            config.userGoals, 
            temperature,
            activeSystemPrompt,
            config.llm,
            shortTermHistory // Pass history
        );

        const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: answerText,
            timestamp: Date.now(),
            sources: sources
        };
        setMessages(prev => [...prev, botMsg]);

        // Save Bot Response to Memory
        if (streamId) {
            memoryService.addFrame(streamId, {
                agentName: 'Assistant',
                input: userText,
                thought: 'RAG Generation',
                action: 'ANSWER',
                output: answerText,
                tags: ['chat', 'response']
            });
        }

    } catch (e) {
        console.error("Chain failed", e);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "System Error: Failed to retrieve or generate response.",
            timestamp: Date.now()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleEndSession = async () => {
      if (!streamId) return;
      setIsEndingSession(true);
      await sessionAnalysisService.analyzeAndSave(streamId, 'chat');
      memoryService.archiveStream(streamId);
      setSessionSaved(true);
      setTimeout(() => {
          setSessionSaved(false);
          setIsEndingSession(false);
          // Optional: Reset chat or stream here
          const newId = memoryService.createStream(`Chat-${new Date().toLocaleTimeString()}`);
          setStreamId(newId);
          setMessages([]); // Clear visual
      }, 2000);
  };

  const toggleFilter = (id: string) => {
      setActiveFilters(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const mentionCandidates = MOCK_DOCUMENTS.filter(d => 
      d.title.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (showMentions && mentionCandidates.length > 0) {
          if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              insertMention(mentionCandidates[0].title);
              return;
          }
      }
      if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-fade-in">
       {/* Header */}
       <div className="flex justify-between items-center border-b-2 border-gray-200 pb-6">
          <div>
            <h2 className="text-3xl font-serif font-bold text-ink">Research Assistant</h2>
            <p className="text-gray-500 font-mono text-sm mt-1">Memory-Enabled RAG System</p>
          </div>
          <div className="flex gap-2 items-center">
             <PaperBadge color="ink">{streamId ? 'Recording Stream' : 'Offline'}</PaperBadge>
             <PaperButton 
                size="sm" 
                variant="secondary" 
                onClick={handleEndSession}
                disabled={isEndingSession || sessionSaved}
                icon={isEndingSession ? <Sparkles size={14} className="animate-spin"/> : sessionSaved ? <Check size={14}/> : <Save size={14}/>}
             >
                {isEndingSession ? 'Analyzing...' : sessionSaved ? 'Saved to List' : 'End Session'}
             </PaperButton>
          </div>
       </div>

       {/* Main Chat Layout */}
       <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          
          {/* Chat Canvas */}
          <div className="lg:col-span-3 flex flex-col bg-white border-2 border-ink shadow-hard relative overflow-visible">
             
             {/* Toolbar Overlay */}
             <div className="absolute top-[-40px] left-0 flex items-center gap-2 z-10">
                 <ControlPanel 
                    temperature={temperature} 
                    setTemperature={setTemperature}
                    activeFilters={activeFilters}
                    toggleFilter={toggleFilter}
                    resetFilters={() => setActiveFilters([])}
                    selectAllFilters={() => setActiveFilters(MOCK_DOCUMENTS.map(d => d.id))}
                    config={config}
                    setConfig={setConfig}
                 />
                 
                 {activeFilters.length > 0 && (
                     <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                         Filter: {activeFilters.length} Docs
                     </span>
                 )}
             </div>

             {/* Messages */}
             <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 bg-dot-pattern scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                        <Bot size={48} className="mb-4"/>
                        <p className="font-serif text-xl">Start a new research stream</p>
                    </div>
                )}
                {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
                
                {isTyping && (
                  <div className="flex w-full justify-start mb-6 animate-pulse">
                     <div className="flex flex-col items-start max-w-[80%]">
                        <div className="flex items-center gap-2 mb-1 px-1">
                           <Bot size={14} className="text-accent" />
                           <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Thinking</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-200 text-gray-400 text-xs font-mono flex items-center gap-2">
                           <Sparkles size={12} className="animate-spin" />
                           Reviewing memory & vectors...
                        </div>
                     </div>
                  </div>
                )}
             </div>

             {/* Input Area */}
             <div className="p-4 bg-white border-t-2 border-ink z-20 relative">
                {showMentions && mentionCandidates.length > 0 && (
                    <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border-2 border-ink shadow-hard z-50 max-h-48 overflow-y-auto animate-fade-in">
                        <div className="bg-gray-100 p-2 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-200">
                            Suggested Documents
                        </div>
                        {mentionCandidates.map((doc, idx) => (
                            <button
                                key={doc.id}
                                onClick={() => insertMention(doc.title)}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-white transition-colors flex items-center gap-2 ${idx === 0 ? 'bg-gray-50' : ''}`}
                            >
                                <BookOpen size={12}/>
                                <span className="truncate">{doc.title}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-4">
                   <div className="flex-1 relative">
                     <input 
                       ref={inputRef}
                       value={input}
                       onChange={handleInputChange}
                       onKeyDown={handleKeyDown}
                       disabled={isTyping}
                       placeholder={`Ask about project specs... Type '@' to mention docs`}
                       className="w-full bg-white text-ink border-2 border-gray-200 px-4 py-4 pr-12 font-sans focus:outline-none focus:border-ink focus:shadow-inner transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     />
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                        {showMentions ? <AtSign size={18} className="text-accent"/> : <Sparkles size={18} />}
                     </div>
                   </div>
                   <PaperButton onClick={handleSend} disabled={isTyping || !input.trim()} className="h-full aspect-square !px-0 flex items-center justify-center">
                      <Send size={20} />
                   </PaperButton>
                </div>
             </div>
          </div>

          {/* Context Panel (Right) */}
          <div className="hidden lg:flex flex-col gap-4">
             <PaperCard title="Context" className="flex-1 bg-gray-50">
                <div className="space-y-4">
                   <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>Stream Status</span>
                      <span className="text-accent flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-accent"></div> Active</span>
                   </div>
                   
                   <div className="p-3 bg-white border-l-2 border-accent text-[10px] text-gray-600">
                      <span className="font-bold block mb-1 uppercase text-gray-400">Memory Stream ID</span>
                      <div className="font-mono">{streamId}</div>
                   </div>

                   <div className="p-3 bg-white border-l-2 border-gray-300 text-[10px] text-gray-600">
                      <span className="font-bold block mb-1 uppercase text-gray-400">Active Model</span>
                      <div className="font-mono flex items-center gap-2">
                          <Cpu size={10}/>
                          {config.llm.model}
                      </div>
                   </div>

                   <hr className="border-gray-200"/>
                   
                   <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase text-ink">Suggested Queries</h4>
                      {['Explain the data pipeline', 'What is the latency budget?', 'Summarize deep learning trends'].map(q => (
                         <button key={q} onClick={() => setInput(q)} disabled={isTyping} className="w-full text-left text-xs p-2 bg-white border border-gray-200 hover:border-accent hover:text-accent transition-colors truncate">
                           {q}
                         </button>
                      ))}
                   </div>
                </div>
             </PaperCard>
          </div>
       </div>
    </div>
  );
};
