
import React, { useEffect, useState } from 'react';
import { PaperCard, PaperButton, PaperBadge, MarkdownText } from '../components/PaperComponents';
import { ViewState, Document, AppConfig } from '../types';
import { 
  Bot, Network, Terminal, Shield, ArrowRight, Layers, 
  Cpu, GitBranch, Database, Zap, BookOpen, Sparkles, Loader2, Calendar
} from 'lucide-react';
import { llmService } from '../services/LLMService';
import { Type } from '@google/genai';

interface LandingPageViewProps {
  onNavigate: (view: ViewState) => void;
  documents: Document[];
  config: AppConfig;
}

interface MorningBriefing {
  summary: string[];
  insight: string;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onNavigate, documents, config }) => {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  useEffect(() => {
    const generateBriefing = async () => {
      // If no docs, skip
      if (documents.length === 0) return;
      
      // Basic cache check (session storage) to avoid re-generating on every nav click
      const cached = sessionStorage.getItem('metacogna_morning_briefing');
      const cachedTimestamp = sessionStorage.getItem('metacogna_briefing_ts');
      
      // Invalidate cache if older than 1 hour or if we want fresh
      const isStale = !cachedTimestamp || (Date.now() - parseInt(cachedTimestamp) > 3600000);

      if (cached && !isStale) {
        setBriefing(JSON.parse(cached));
        return;
      }

      setLoadingBriefing(true);

      try {
        // 1. Prepare Context (Last 5 Docs)
        const recentDocs = documents.slice(0, 5).map(d => ({
          title: d.title,
          type: d.type,
          meta: d.metadata
        }));

        const contextString = JSON.stringify(recentDocs, null, 2);

        // 2. Prompt
        const prompt = `
          Analyze these recently modified documents in the user's Knowledge Base.
          Generate a "Morning Briefing" Executive Summary.
          
          DOCUMENTS:
          ${contextString}
          
          OUTPUT FORMAT (JSON):
          {
            "summary": ["Point 1", "Point 2", "Point 3"],
            "insight": "A single, high-value strategic insight or connection between these files."
          }
        `;

        // Strict schema definition
        const schema = {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.ARRAY, items: { type: Type.STRING } },
            insight: { type: Type.STRING }
          },
          required: ["summary", "insight"]
        };

        // 3. Call LLM
        const response = await llmService.generate(config.llm, prompt, {
          temperature: 0.4,
          jsonSchema: schema
        });

        const data = JSON.parse(response);
        setBriefing(data);
        
        // Cache
        sessionStorage.setItem('metacogna_morning_briefing', JSON.stringify(data));
        sessionStorage.setItem('metacogna_briefing_ts', Date.now().toString());

      } catch (e) {
        console.error("Briefing generation failed:", e);
        // Fallback silently to avoid UI noise, or set a safe fallback state
        setBriefing({
          summary: ["Welcome back.", "System ready for queries.", "Reviewing recent uploads..."],
          insight: "Upload additional documents to generate deeper insights."
        });
      } finally {
        setLoadingBriefing(false);
      }
    };

    generateBriefing();
  }, [documents, config.llm]);

  return (
    <div className="animate-fade-in flex flex-col gap-12 pb-20">
      
      {/* 1. Hero Section */}
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
            <PaperBadge color="ink">SYSTEM_STATUS: ONLINE // v1.0</PaperBadge>
            <h1 className="text-6xl md:text-8xl font-serif font-bold text-ink tracking-tight leading-none">
                METACOGNA
            </h1>
            <p className="text-xl font-sans text-gray-600 max-w-2xl leading-relaxed">
                The <span className="font-bold text-ink">Cognitive Operating System</span> for high-dimensional research and autonomous synthesis.
            </p>
            
            <div className="flex gap-4 mt-8">
                <PaperButton 
                    size="lg" 
                    onClick={() => onNavigate(ViewState.UPLOAD)}
                    icon={<ArrowRight size={20}/>}
                    className="!px-8 !py-4 text-lg"
                >
                    INITIALIZE SYSTEM
                </PaperButton>
                <PaperButton 
                    size="lg" 
                    variant="ghost" 
                    onClick={() => onNavigate(ViewState.SETTINGS)}
                    className="!px-8 !py-4 text-lg"
                >
                    CONFIGURE
                </PaperButton>
            </div>
        </div>
      </div>

      {/* 2. Morning Briefing (Zero-UI Feature) */}
      {(loadingBriefing || briefing) && (
        <div className="max-w-4xl mx-auto w-full animate-slide-in">
           <PaperCard className="border-t-4 border-t-accent bg-white shadow-hard relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Cpu size={120} />
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 relative z-10">
                 {/* Left: Header */}
                 <div className="md:w-1/3 border-r border-gray-100 pr-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-accent mb-2">
                       <Sparkles size={18} className={loadingBriefing ? "animate-spin" : ""} />
                       <span className="text-xs font-bold uppercase tracking-widest">System Pulse</span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-ink mb-2">
                       Morning Briefing
                    </h2>
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
                       <Calendar size={12}/>
                       {new Date().toLocaleDateString()}
                    </div>
                 </div>

                 {/* Right: Content */}
                 <div className="md:w-2/3">
                    {loadingBriefing ? (
                       <div className="flex flex-col gap-3">
                          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                          <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div>
                          <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse"></div>
                       </div>
                    ) : briefing ? (
                       <div className="space-y-4">
                          <ul className="space-y-2">
                             {briefing.summary.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                   <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ink shrink-0"></div>
                                   {point}
                                </li>
                             ))}
                          </ul>
                          
                          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-sm flex gap-3">
                             <div className="p-1 bg-white rounded-full h-fit border border-emerald-200">
                                <Zap size={14} className="text-accent"/>
                             </div>
                             <div>
                                <span className="text-[10px] font-bold uppercase text-emerald-600 block mb-1">Strategic Insight</span>
                                <p className="text-sm font-medium text-emerald-900 leading-snug">
                                   "{briefing.insight}"
                                </p>
                             </div>
                          </div>
                       </div>
                    ) : null}
                 </div>
              </div>
           </PaperCard>
        </div>
      )}

      {/* 3. Core Modules (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Agent Workspace (Large) */}
          <div className="md:col-span-2 group cursor-pointer" onClick={() => onNavigate(ViewState.AGENT_CANVAS)}>
              <PaperCard className="h-full border-ink transition-all duration-200 hover:-translate-y-1 hover:shadow-hard-lg">
                  <div className="flex flex-col h-full gap-4">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-ink text-paper rounded-sm">
                              <Bot size={32}/>
                          </div>
                          <ArrowRight className="text-gray-300 group-hover:text-accent transition-colors"/>
                      </div>
                      <div className="mt-auto">
                          <h3 className="text-2xl font-serif font-bold text-ink mb-2">Agent Workspace</h3>
                          <p className="text-gray-500 font-mono text-sm uppercase tracking-wide">
                              Autonomous Swarm // Synthesis & Critique
                          </p>
                      </div>
                  </div>
              </PaperCard>
          </div>

          {/* Card 2: Knowledge Graph */}
          <div className="group cursor-pointer" onClick={() => onNavigate(ViewState.GRAPH)}>
              <PaperCard className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-hard-lg">
                  <div className="flex flex-col h-full gap-4">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-paper border-2 border-ink text-ink rounded-sm">
                              <Network size={24}/>
                          </div>
                          <ArrowRight className="text-gray-300 group-hover:text-accent transition-colors"/>
                      </div>
                      <div className="mt-auto">
                          <h3 className="text-xl font-serif font-bold text-ink mb-2">Knowledge Graph</h3>
                          <p className="text-gray-500 font-mono text-xs uppercase">
                              Force-Directed Ontology
                          </p>
                      </div>
                  </div>
              </PaperCard>
          </div>

          {/* Card 3: Research Chat */}
          <div className="group cursor-pointer" onClick={() => onNavigate(ViewState.QUESTION)}>
              <PaperCard className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-hard-lg">
                  <div className="flex flex-col h-full gap-4">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-accent-light border-2 border-accent text-accent-hover rounded-sm">
                              <BookOpen size={24}/>
                          </div>
                          <ArrowRight className="text-gray-300 group-hover:text-accent transition-colors"/>
                      </div>
                      <div className="mt-auto">
                          <h3 className="text-xl font-serif font-bold text-ink mb-2">Contextual Chat</h3>
                          <p className="text-gray-500 font-mono text-xs uppercase">
                              RAG Inference Engine
                          </p>
                      </div>
                  </div>
              </PaperCard>
          </div>

          {/* Card 4: Prompt Lab */}
          <div className="group cursor-pointer" onClick={() => onNavigate(ViewState.PROMPT)}>
              <PaperCard className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-hard-lg">
                  <div className="flex flex-col h-full gap-4">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-surface border-2 border-gray-300 text-gray-700 rounded-sm">
                              <Terminal size={24}/>
                          </div>
                          <ArrowRight className="text-gray-300 group-hover:text-accent transition-colors"/>
                      </div>
                      <div className="mt-auto">
                          <h3 className="text-xl font-serif font-bold text-ink mb-2">Prompt Lab</h3>
                          <p className="text-gray-500 font-mono text-xs uppercase">
                              Instruction Engineering
                          </p>
                      </div>
                  </div>
              </PaperCard>
          </div>

          {/* Card 5: Infrastructure (Wide) */}
          <div className="md:col-span-1 lg:col-span-1 group cursor-pointer" onClick={() => onNavigate(ViewState.SETTINGS)}>
              <PaperCard className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-hard-lg">
                  <div className="flex flex-col h-full gap-4">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-blue-50 border-2 border-blue-100 text-blue-700 rounded-sm">
                              <Shield size={24}/>
                          </div>
                          <ArrowRight className="text-gray-300 group-hover:text-accent transition-colors"/>
                      </div>
                      <div className="mt-auto">
                          <h3 className="text-xl font-serif font-bold text-ink mb-2">Secure Vaults</h3>
                          <p className="text-gray-500 font-mono text-xs uppercase">
                              Storage & Encryption
                          </p>
                      </div>
                  </div>
              </PaperCard>
          </div>
      </div>

      {/* 3. Tech Stack / Footer */}
      <div className="border-t-2 border-gray-200 pt-12 mt-8">
          <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2">
                  <Zap size={16}/>
                  <span className="font-mono font-bold text-sm">Vite + React</span>
              </div>
              <div className="flex items-center gap-2">
                  <Layers size={16}/>
                  <span className="font-mono font-bold text-sm">ChromaDB</span>
              </div>
              <div className="flex items-center gap-2">
                  <Database size={16}/>
                  <span className="font-mono font-bold text-sm">PostgreSQL</span>
              </div>
              <div className="flex items-center gap-2">
                  <GitBranch size={16}/>
                  <span className="font-mono font-bold text-sm">Gemini / GPT-5</span>
              </div>
          </div>
          <div className="text-center mt-8 text-xs font-mono text-gray-400 tracking-widest">
              METACOGNA.AI // ARCHITECTURE v1.0
          </div>
      </div>

    </div>
  );
};
