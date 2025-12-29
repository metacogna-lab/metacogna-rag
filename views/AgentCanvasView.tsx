
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PaperCard, PaperButton, PaperBadge } from '../components/PaperComponents';
import { AppConfig, AgentGoal, AgentTurn, Idea, SavedPrompt } from '../types';
import { AGENT_GOALS, agentService, MAX_TURNS, AGENT_PROMPTS } from '../services/AgentGraphService';
import { memoryService } from '../services/MemoryService';
import { sessionAnalysisService } from '../services/SessionAnalysisService';
import { Play, RefreshCw, Bot, BrainCircuit, Target, Terminal, ArrowRight, Loader2, FileJson, FileText, Pause, Download, Copy, Check, Lightbulb, Wand2, Zap, Crosshair, Network, Save } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ragSystem } from '../services/RAGEngine';
import { GoogleGenAI } from "@google/genai";

interface AgentCanvasViewProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}

// --- Visual Components ---

const RealRobotAgent: React.FC<{ type: 'Coordinator' | 'Critic'; isActive: boolean; isFiring: boolean; position: {x: number, y: number} }> = ({ type, isActive, isFiring, position }) => {
    return (
        <motion.div 
            animate={{ 
                scale: isFiring ? 1.2 : 1, 
                rotate: isFiring ? (type === 'Coordinator' ? 10 : -10) : 0 
            }}
            className={`absolute w-12 h-12 flex items-center justify-center rounded-full border-2 shadow-hard transition-colors z-20
                ${type === 'Coordinator' 
                    ? (isActive ? 'bg-emerald-100 border-emerald-600 text-emerald-700' : 'bg-gray-100 border-gray-300 text-gray-400') 
                    : (isActive ? 'bg-rose-100 border-rose-600 text-rose-700' : 'bg-gray-100 border-gray-300 text-gray-400')
                }
            `}
            style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
        >
            <Bot size={24} />
            <div className="absolute -bottom-6 bg-white px-1 text-[10px] font-bold uppercase border border-gray-200 rounded whitespace-nowrap">
                {type}
            </div>
        </motion.div>
    );
};

const RealIdeaComponent: React.FC<{ idea: Idea }> = ({ idea }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: idea.scale, x: `${idea.x}%`, y: `${idea.y}%` }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className={`absolute p-3 border-2 shadow-sm flex items-center justify-center text-xs font-bold text-center z-10 w-32 min-h-[40px] bg-white
                ${idea.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}
            `}
            style={{ 
                borderColor: idea.color,
                color: '#18181b',
                // Position is handled by animate prop for smooth transitions
            }}
        >
            {idea.content}
        </motion.div>
    );
};

const BeamOverlay: React.FC<{ beams: { start: {x: number, y: number}, end: {x: number, y: number}, color: string }[] }> = ({ beams }) => {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            {beams.map((beam, i) => (
                <motion.line
                    key={i}
                    x1={`${beam.start.x}%`}
                    y1={`${beam.start.y}%`}
                    x2={`${beam.end.x}%`}
                    y2={`${beam.end.y}%`}
                    stroke={beam.color}
                    strokeWidth="3"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                />
            ))}
        </svg>
    );
};

export const AgentCanvasView: React.FC<AgentCanvasViewProps> = ({ config, setConfig }) => {
  const [selectedGoal, setSelectedGoal] = useState<AgentGoal>(AGENT_GOALS[0]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [history, setHistory] = useState<AgentTurn[]>([]);
  const [streamId, setStreamId] = useState<string>('');
  
  const [goalInput, setGoalInput] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Visual State
  const [coordinatorPos] = useState({ x: 15, y: 50 });
  const [criticPos] = useState({ x: 85, y: 50 });
  const [activeBeams, setActiveBeams] = useState<{ start: {x: number, y: number}, end: {x: number, y: number}, color: string }[]>([]);
  const [activeAgent, setActiveAgent] = useState<'Coordinator' | 'Critic' | null>(null);
  
  const [agentPrompts, setAgentPrompts] = useState(AGENT_PROMPTS);

  // Initialize
  const handleInitialize = async () => {
      if (!goalInput.trim()) return;
      setIsInitializing(true);
      const newStreamId = memoryService.createStream(goalInput);
      setStreamId(newStreamId);
      
      try {
          const generatedBlocks = await agentService.generateInitialBlocks(goalInput, config.llm.model, config.llm);
          setIdeas(generatedBlocks);
          setIsInitialized(true);
      } catch(e) {
          console.error("Init failed", e);
          alert("Initialization failed. Check API Settings.");
      } finally { 
          setIsInitializing(false); 
      }
  };

  // --- Core Simulation Logic ---
  const executeTurn = async () => {
      if (turnCount >= MAX_TURNS) { setIsRunning(false); return; }
      
      try {
          // 1. THINK
          const turn = await agentService.generateTurn(streamId, selectedGoal, history, ideas, turnCount, config.llm.model, agentPrompts, config.llm);
          setHistory(prev => [...prev, turn]);
          setTurnCount(prev => prev + 1);

          // 2. PREPARE VISUALS
          const currentAgentPos = turn.agentName === 'Coordinator' ? coordinatorPos : criticPos;
          const beamColor = turn.agentName === 'Coordinator' ? '#10b981' : '#f43f5e';
          setActiveAgent(turn.agentName);

          const targets = ideas.filter(i => turn.action.targetBlockIds.includes(i.id));
          
          // 3. FIRE BEAMS
          if (targets.length > 0) {
              setActiveBeams(targets.map(t => ({
                  start: currentAgentPos,
                  end: { x: t.x, y: t.y },
                  color: beamColor
              })));
              
              // Wait for beam animation impact
              await new Promise(r => setTimeout(r, 800));
          }

          // 4. PHYSICS UPDATE (Effect)
          setIdeas(prev => {
              let nextIdeas = [...prev];
              const targetIds = turn.action.targetBlockIds;
              const actionType = turn.action.type;

              if (actionType === 'MERGE' && targetIds.length > 1) {
                  // Find center
                  const targets = prev.filter(i => targetIds.includes(i.id));
                  if (targets.length > 0) {
                      const avgX = targets.reduce((s, i) => s + i.x, 0) / targets.length;
                      const avgY = targets.reduce((s, i) => s + i.y, 0) / targets.length;
                      
                      // Remove old
                      nextIdeas = nextIdeas.filter(i => !targetIds.includes(i.id));
                      
                      // Add merged
                      nextIdeas.push({
                          id: `merged-${Date.now()}`,
                          content: turn.outputContent || "Synthesis",
                          type: 'insight',
                          x: avgX,
                          y: avgY,
                          shape: 'hexagon',
                          color: '#8b5cf6', // Violet
                          scale: 1.2
                      });
                  }
              } else if (actionType === 'EXPLODE' && targetIds.length === 1) {
                  const target = prev.find(i => i.id === targetIds[0]);
                  if (target) {
                      // Remove old
                      nextIdeas = nextIdeas.filter(i => i.id !== targetIds[0]);
                      // Add fragments
                      nextIdeas.push({ ...target, id: target.id + '-a', x: target.x - 5, y: target.y - 5, scale: 0.8, content: "Part A" });
                      nextIdeas.push({ ...target, id: target.id + '-b', x: target.x + 5, y: target.y + 5, scale: 0.8, content: "Part B" });
                  }
              } else if (actionType === 'SHAKE' || actionType === 'IDLE') {
                  // Just highlight/shake
                  nextIdeas = nextIdeas.map(i => {
                      if (targetIds.includes(i.id)) {
                          return { ...i, color: turn.agentName === 'Critic' ? '#fbbf24' : '#3b82f6' };
                      }
                      return i;
                  });
              }
              
              return nextIdeas;
          });

          // 5. CLEANUP
          await new Promise(r => setTimeout(r, 500));
          setActiveBeams([]);
          setActiveAgent(null);

      } catch (e) {
          console.error("Turn execution failed", e);
          setIsRunning(false);
          // Don't alert here to avoid loop spam, just stop.
      }
  };

  useEffect(() => {
      let timer: any;
      if (isRunning) { timer = setTimeout(executeTurn, 100); }
      return () => clearTimeout(timer);
  }, [isRunning, turnCount]);

  const handleEndAndAnalyze = async () => {
      if (!streamId) return;
      setIsRunning(false);
      setIsAnalyzing(true);
      await sessionAnalysisService.analyzeAndSave(streamId, 'agent');
      memoryService.archiveStream(streamId);
      setIsAnalyzing(false);
      alert("Session Analyzed & Saved to Settings.");
  };

  const reset = () => { setIsInitialized(false); setHistory([]); setIdeas([]); setStreamId(''); setTurnCount(0); };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2">
            <div><h2 className="text-3xl font-serif font-bold text-ink">Agent Workspace</h2></div>
             <div className="flex gap-2">
                 {isInitialized && (
                     <>
                        <PaperButton onClick={() => setIsRunning(!isRunning)} variant={isRunning ? 'secondary' : 'primary'} size="sm" icon={isRunning ? <Pause size={14}/> : <Play size={14}/>}>
                            {isRunning ? 'Pause' : 'Play'}
                        </PaperButton>
                        <PaperButton onClick={handleEndAndAnalyze} disabled={isAnalyzing} size="sm" icon={isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}>
                            End & Analyze
                        </PaperButton>
                     </>
                 )}
                 <PaperButton onClick={reset} variant="ghost" size="sm" className="!px-3"><RefreshCw size={14} className="mr-1"/> Reset</PaperButton>
             </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <PaperCard title="Mission Control" className="bg-gray-50/50">
                {!isInitialized ? (
                    <div className="flex gap-4">
                        <textarea className="flex-1 p-3 border-2 border-gray-300 rounded-sm focus:border-ink outline-none" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="Enter simulation goal (e.g. 'Design a new sustainable coffee cup')..."/>
                        <PaperButton onClick={handleInitialize} disabled={isInitializing} icon={isInitializing ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16}/>}>
                            {isInitializing ? 'Initializing...' : 'Initialize Simulation'}
                        </PaperButton>
                    </div>
                ) : (
                    <div className="h-[500px] bg-white border-2 border-ink relative rounded-sm shadow-inner overflow-hidden">
                        {/* Simulation Canvas */}
                        <div className="absolute inset-0 bg-dot-pattern opacity-50 pointer-events-none"></div>
                        
                        <BeamOverlay beams={activeBeams} />

                        <RealRobotAgent type="Coordinator" isActive={activeAgent === 'Coordinator'} isFiring={activeAgent === 'Coordinator' && activeBeams.length > 0} position={coordinatorPos} />
                        <RealRobotAgent type="Critic" isActive={activeAgent === 'Critic'} isFiring={activeAgent === 'Critic' && activeBeams.length > 0} position={criticPos} />
                        
                        <AnimatePresence>
                            {ideas.map(idea => <RealIdeaComponent key={idea.id} idea={idea} />)}
                        </AnimatePresence>
                        
                        {/* Turn Indicator */}
                        <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 border border-ink text-xs font-mono font-bold rounded-sm">
                            TURN: {turnCount} / {MAX_TURNS}
                        </div>
                    </div>
                )}
            </PaperCard>
            
            {/* Logs */}
            <div className="p-4 bg-gray-100 border border-gray-200 h-48 overflow-y-auto font-mono text-xs rounded-sm shadow-inner">
                {history.length === 0 && <div className="text-gray-400 italic">Waiting for agents to start...</div>}
                {history.map((h, i) => (
                    <div key={i} className="mb-2 border-b border-gray-200 pb-1 last:border-0">
                        <span className={`font-bold ${h.agentName === 'Coordinator' ? 'text-emerald-600' : 'text-rose-600'}`}>{h.agentName}</span>
                        <span className="text-gray-500 mx-2">[{h.action.type}]</span>
                        <span className="text-ink">{h.thought}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
