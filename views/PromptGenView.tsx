
import React, { useState, useEffect, useMemo } from 'react';
import { PaperCard, PaperInput, PaperButton, PaperBadge } from '../components/PaperComponents';
import { Copy, Wand2, Loader2, Save, Trash2, Clock, Check, Layers, Target, AlertTriangle, Lightbulb, Zap } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AVAILABLE_MODELS } from '../constants';

interface SavedPrompt {
  id: string;
  content: string;
  timestamp: number;
  mode: 'precise' | 'creative';
  preview: string;
  tags?: string[];
}

// --- Semantic Grouping Component ---
const SemanticPromptGrouper: React.FC<{
    prompts: SavedPrompt[];
    query: string;
    onSelectGroup: (prompts: SavedPrompt[]) => void;
}> = ({ prompts, query, onSelectGroup }) => {
    // Mock semantic grouping based on simple keyword scoring
    const groups = useMemo(() => {
        if (!query.trim()) return [];

        const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
        const scored = prompts.map(p => {
            let score = 0;
            const contentLower = p.content.toLowerCase();
            keywords.forEach(k => {
                if (contentLower.includes(k)) score += 1;
            });
            return { ...p, score };
        }).filter(p => p.score > 0).sort((a,b) => b.score - a.score);

        // Group into clusters (mock logic)
        const highRelevance = scored.filter(p => p.score >= 2);
        const mediumRelevance = scored.filter(p => p.score === 1);

        const result = [];
        if (highRelevance.length > 0) result.push({ title: 'High Relevance', items: highRelevance, color: 'green' });
        if (mediumRelevance.length > 0) result.push({ title: 'Related Concepts', items: mediumRelevance, color: 'blue' });
        
        return result;
    }, [prompts, query]);

    if (groups.length === 0) return null;

    return (
        <div className="animate-slide-in mt-6">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
                <Layers size={14}/> Semantic Library Matches
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((group, idx) => (
                    <div key={idx} className="bg-white border-2 border-gray-100 p-3 shadow-sm hover:border-accent transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold uppercase ${group.color === 'green' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                {group.title}
                            </span>
                            <button 
                                onClick={() => onSelectGroup(group.items)}
                                className="text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                            >
                                Use Group
                            </button>
                        </div>
                        <div className="space-y-1">
                            {group.items.slice(0, 3).map(p => (
                                <div key={p.id} className="text-xs text-gray-600 truncate border-l-2 border-gray-200 pl-2">
                                    {p.preview}
                                </div>
                            ))}
                            {group.items.length > 3 && (
                                <div className="text-[10px] text-gray-400 pl-2">
                                    + {group.items.length - 3} more
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Product Analysis Component ---
const ProductAnalysisComponent: React.FC<{
    selectedPrompts: SavedPrompt[];
    onClose: () => void;
}> = ({ selectedPrompts, onClose }) => {
    const [mode, setMode] = useState<'product' | 'goals' | 'criticism'>('product');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) 
              ? process.env.API_KEY 
              : import.meta.env.VITE_API_KEY || '';
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ 
                model: 'gemini-3-flash-preview',
                systemInstruction: "You are a Product Manager. Analyze the following prompt ideas and propose 3 concrete Product Features or Applications."
            });
            
            const context = selectedPrompts.map(p => p.content).join('\n---\n');
            let systemPrompt = '';
            
            switch(mode) {
                case 'product':
                    systemPrompt = "You are a Product Manager. Analyze the following prompt ideas and propose 3 concrete Product Features or Applications.";
                    break;
                case 'goals':
                    systemPrompt = "You are a Strategic Planner. Analyze the prompts and suggest a Roadmap Progression to achieve these capabilities.";
                    break;
                case 'criticism':
                    systemPrompt = "You are a Lead Critic. Analyze the prompts for flaws, edge cases, and safety risks. Be harsh but constructive.";
                    break;
            }

            const response = await model.generateContent({
                contents: `Analyze these inputs:\n\n${context}`
            });
            
            setResult(response.response.text() || "Analysis failed.");
        } catch (e) {
            setResult("Error running analysis.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t-4 border-accent bg-gray-50 p-6 shadow-hard animate-slide-in relative">
            <button onClick={onClose} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500">
                <Trash2 size={16}/>
            </button>
            
            <div className="mb-4">
                <h3 className="font-serif font-bold text-xl text-ink flex items-center gap-2">
                    <Target size={24} className="text-accent"/> Product Intelligence
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Analyzing <span className="font-bold">{selectedPrompts.length}</span> selected prompt strategies.
                </p>
            </div>

            <div className="flex gap-2 mb-4">
                <button 
                    onClick={() => setMode('product')}
                    className={`flex-1 py-2 text-xs font-bold uppercase border-2 transition-all flex items-center justify-center gap-2 ${mode === 'product' ? 'bg-ink text-white border-ink' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    <Lightbulb size={14}/> Product Ideas
                </button>
                <button 
                    onClick={() => setMode('goals')}
                    className={`flex-1 py-2 text-xs font-bold uppercase border-2 transition-all flex items-center justify-center gap-2 ${mode === 'goals' ? 'bg-ink text-white border-ink' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    <Target size={14}/> Goal Roadmap
                </button>
                <button 
                    onClick={() => setMode('criticism')}
                    className={`flex-1 py-2 text-xs font-bold uppercase border-2 transition-all flex items-center justify-center gap-2 ${mode === 'criticism' ? 'bg-ink text-white border-ink' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                    <AlertTriangle size={14}/> Criticism
                </button>
            </div>

            {result ? (
                <div className="bg-white p-4 border border-gray-200 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto shadow-inner text-ink">
                    {result}
                </div>
            ) : (
                <div className="h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-white/50 text-gray-400">
                    <Zap size={32} className="mb-2 opacity-20"/>
                    <p className="text-sm">Ready to analyze selection</p>
                </div>
            )}

            <div className="mt-4 flex justify-end">
                <PaperButton onClick={runAnalysis} disabled={loading} icon={loading ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14}/>}>
                    {loading ? 'Analyzing...' : 'Run Analysis'}
                </PaperButton>
            </div>
        </div>
    );
};


export const PromptGenView: React.FC = () => {
  const [temperature, setTemperature] = useState(0.7);
  const [targetModel, setTargetModel] = useState('gpt-5');
  const [inputText, setInputText] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'precise' | 'creative'>('precise');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  
  // Analysis State
  const [analysisPrompts, setAnalysisPrompts] = useState<SavedPrompt[]>([]);

  // Consolidate models for the dropdown
  const modelOptions = useMemo(() => {
      const allModels = [
          ...AVAILABLE_MODELS.openai,
          ...AVAILABLE_MODELS.google,
          ...AVAILABLE_MODELS.anthropic,
          { id: 'llama3.2', name: 'Llama 3.2 (Local)' },
          { id: 'mistral-nemo', name: 'Mistral Nemo (Local)' }
      ];
      return allModels;
  }, []);

  // Load saved prompts from local storage
  useEffect(() => {
    const saved = localStorage.getItem('pratejra_saved_prompts');
    if (saved) {
      try {
        setSavedPrompts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved prompts");
      }
    }
  }, []);

  // Save to local storage whenever list changes
  useEffect(() => {
    localStorage.setItem('pratejra_saved_prompts', JSON.stringify(savedPrompts));
  }, [savedPrompts]);

  const generate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setGeneratedPrompt('');
    setJustSaved(false);
    
    try {
      // Safely access API Key
      const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) 
        ? process.env.API_KEY 
        : import.meta.env.VITE_API_KEY || '';
      
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ 
        model: 'gemini-3-flash-preview',
        systemInstruction: `You are a world-class prompt engineer. Your goal is to take a user's rough idea and convert it into a highly optimized system prompt for an LLM (Large Language Model). 
      
      Follow these rules:
      1. Target Model Optimization: Optimize specifically for ${targetModel}.
      2. Style: Use the "${mode}" style. (Precise = clear, structured, constraint-heavy. Creative = descriptive, persona-based, open-ended).
      3. Structure: Include specific sections for [Role], [Context], [Task], and [Constraints].
      4. Output: ONLY the optimized prompt, no conversational filler.`
      });

      const response = await model.generateContent({
        contents: [
            { role: 'user', parts: [{ text: `Original Input: ${inputText}\n\nOptimize this prompt.` }] }
        ],
        generationConfig: {
            systemInstruction: systemPrompt,
            temperature: temperature
        }
      });

      setGeneratedPrompt(response.response.text() || "Failed to generate prompt.");
    } catch (error) {
      console.error("Prompt generation failed:", error);
      setGeneratedPrompt("Error: Could not access the backend generation service or API Key is missing.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedPrompt) return;
    
    const newPrompt: SavedPrompt = {
      id: Date.now().toString(),
      content: generatedPrompt,
      timestamp: Date.now(),
      mode: mode,
      preview: inputText.slice(0, 40) + (inputText.length > 40 ? '...' : '')
    };
    
    setSavedPrompts(prev => [newPrompt, ...prev]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-ink">Prompt Engineering Lab</h2>
        <p className="text-gray-500 mt-2 text-sm">Refine your queries into high-quality LLM prompts</p>
      </div>

      {/* 1. Parameters - Smaller, organized 2-col */}
      <PaperCard title="Configuration">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                 <div className="space-y-2">
                     <p className="text-xs font-bold uppercase text-gray-500">Target Model</p>
                     <select 
                        value={targetModel}
                        onChange={(e) => setTargetModel(e.target.value)}
                        className="w-full p-2 border-2 border-ink rounded-sm font-sans bg-white text-ink focus:ring-2 focus:ring-accent outline-none text-sm"
                     >
                       {modelOptions.map(m => (
                           <option key={m.id} value={m.id}>{m.name}</option>
                       ))}
                     </select>
                 </div>
                 
                 <div>
                    <label className="flex justify-between text-xs font-bold uppercase text-gray-500 mb-2">
                      Temperature <span>{temperature}</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.1" 
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-accent h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
            </div>

            <div className="space-y-2">
                 <p className="text-xs font-bold uppercase text-gray-500">Optimization Mode</p>
                 <div className="flex flex-col gap-2 h-full">
                   <button 
                    onClick={() => setMode('precise')}
                    className={`flex-1 py-2 text-xs font-bold border-2 transition-all flex items-center justify-center ${mode === 'precise' ? 'border-ink bg-ink text-white' : 'border-gray-200 text-gray-500 hover:border-ink'}`}
                   >
                     PRECISE
                   </button>
                   <button 
                    onClick={() => setMode('creative')}
                    className={`flex-1 py-2 text-xs font-bold border-2 transition-all flex items-center justify-center ${mode === 'creative' ? 'border-ink bg-ink text-white' : 'border-gray-200 text-gray-500 hover:border-ink'}`}
                   >
                     CREATIVE
                   </button>
                 </div>
            </div>
         </div>
      </PaperCard>

      {/* 2. Input Strategy - Below Parameters */}
      <PaperCard title="Input Strategy">
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-32 p-4 border-2 border-gray-200 bg-white text-ink focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none font-sans text-sm"
          placeholder="Describe what you want the LLM to do (e.g., 'Summarize legal contracts emphasizing liabilities')..."
        ></textarea>
        
        <SemanticPromptGrouper 
            prompts={savedPrompts} 
            query={inputText} 
            onSelectGroup={(group) => setAnalysisPrompts(group)}
        />

        <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
          <PaperButton onClick={generate} disabled={isLoading} icon={isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}>
            {isLoading ? 'Optimizing...' : 'Generate Prompt'}
          </PaperButton>
        </div>
      </PaperCard>
      
      {/* Analysis Panel */}
      {analysisPrompts.length > 0 && (
          <ProductAnalysisComponent 
              selectedPrompts={analysisPrompts} 
              onClose={() => setAnalysisPrompts([])}
          />
      )}

      {/* Generated Result */}
      {generatedPrompt && (
        <div className="animate-slide-up">
          <div className="bg-ink text-white p-6 rounded-sm shadow-hard relative group border-2 border-ink">
            <div className="absolute top-4 right-4 flex gap-2">
               <button 
                onClick={handleSave}
                disabled={justSaved}
                className={`p-2 rounded transition-all duration-200 ${justSaved ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-emerald-500 hover:text-white'}`}
                title="Save to Library"
              >
                {justSaved ? <Check size={16} /> : <Save size={16} />}
              </button>
              <button 
                onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                className="p-2 bg-white/10 hover:bg-blue-500 hover:text-white rounded transition-all duration-200"
                title="Copy to Clipboard"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
               <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
               <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400">Optimized Result ({targetModel})</h4>
            </div>
            <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-200">{generatedPrompt}</p>
          </div>
        </div>
      )}

      {/* 3. Library - Below Input Strategy */}
      <PaperCard title="Prompt Library">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[500px]">
          {savedPrompts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm italic">
              No prompts saved yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedPrompts.map(p => (
                  <div key={p.id} className="p-3 border border-gray-200 rounded-sm bg-gray-50 hover:border-accent hover:shadow-sm transition-all group relative">
                    <div className="flex justify-between items-start mb-2">
                      <PaperBadge color={p.mode === 'precise' ? 'blue' : 'green'}>
                        {p.mode}
                      </PaperBadge>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity relative z-20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-ink font-medium mb-2 line-clamp-2">"{p.preview}"</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                      <Clock size={10} />
                      {new Date(p.timestamp).toLocaleDateString()}
                    </div>
                    
                    {/* Expand/Copy Trigger */}
                    <button 
                      onClick={() => {
                        setGeneratedPrompt(p.content);
                        setMode(p.mode);
                        setInputText(p.content); 
                      }}
                      className="absolute inset-0 bg-transparent w-full h-full cursor-pointer z-10"
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </PaperCard>
    </div>
  );
};
