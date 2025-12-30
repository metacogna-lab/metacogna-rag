
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PaperCard, PaperButton, PaperBadge, MarkdownText } from '../components/PaperComponents';
import { Document, AppConfig, RecursiveNode } from '../types';
import { Filter, X, Zap, BarChart2, Hash, Settings2, GitBranch, Cloud, ChevronRight, ChevronDown, RefreshCw, Copy, Download, Check, Network, Layout, Grid, Play, Target, Sparkles, Save, BrainCircuit, Activity } from 'lucide-react';
import { ragSystem } from '../services/RAGEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_KNOWLEDGE_BASE } from '../constants';

interface MyProfileViewProps {
  documents: Document[];
  config: AppConfig;
  setConfig?: React.Dispatch<React.SetStateAction<AppConfig>>;
}

// ... (Keep existing WordCloud, AnimatedTreeNode, RecursiveTreeView, MindmapView components)
const WordCloud: React.FC<{ 
    data: { text: string; value: number }[];
    onWordClick: (text: string) => void;
}> = ({ data, onWordClick }) => {
  const layout = useMemo(() => {
     const items: any[] = [];
     const goldenAngle = Math.PI * (3 - Math.sqrt(5));
     
     data.forEach((item, i) => {
         const maxVal = data[0].value;
         const size = Math.max(12, (item.value / maxVal) * 48);
         const r = Math.sqrt(i + 1) * 35;
         const theta = i * goldenAngle;
         const x = r * Math.cos(theta);
         const y = r * Math.sin(theta);
         items.push({ ...item, x, y, size });
     });
     return items;
  }, [data]);

  return (
    <div className="relative w-full h-[400px] bg-white border border-gray-200 overflow-hidden flex items-center justify-center cursor-move active:cursor-grabbing rounded-sm">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-radial-gradient from-gray-100 to-transparent opacity-50 rounded-full blur-3xl"></div>
      </div>
      {layout.map((item, idx) => (
         <div 
            key={idx}
            className="absolute transition-all duration-700 ease-out hover:z-50 group"
            style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
         >
             <span 
                className={`block font-serif font-bold transition-all duration-300 group-hover:scale-110 group-hover:text-accent cursor-pointer select-none ${idx < 5 ? 'text-ink' : 'text-gray-400'}`}
                style={{ fontSize: `${item.size}px` }}
                onClick={(e) => { e.stopPropagation(); onWordClick(item.text); }}
             >
                 {item.text}
             </span>
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                 Count: {item.value}
             </div>
         </div>
      ))}
      <div className="absolute bottom-4 right-4 text-[10px] font-mono text-gray-300 bg-white/80 px-2 py-1 rounded border border-gray-100">
          Semantic Projection v2.0
      </div>
    </div>
  );
};

const AnimatedTreeNode: React.FC<{ node: RecursiveNode; onExpand: (node: RecursiveNode) => void; isLoading: boolean; depth: number; }> = ({ node, onExpand, isLoading, depth }) => {
    return (
        <div className="relative flex flex-col items-start">
             <motion.div 
                layout initial={{ opacity: 0, scale: 0.9, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: 0.3 }}
                className="flex items-center gap-4 relative z-10"
             >
                 {depth > 0 && <div className="w-8 h-0.5 bg-gray-300 absolute right-full top-1/2 -translate-y-1/2"></div>}
                 <div className={`w-64 bg-white border-2 p-3 rounded-sm shadow-sm hover:shadow-md transition-all relative group ${node.type === 'root' ? 'border-accent border-l-8' : node.children.length > 0 ? 'border-ink' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-1">
                          <h5 className="font-bold text-sm text-ink truncate pr-2">{node.label}</h5>
                          {node.type !== 'leaf' && (
                                <button onClick={() => onExpand(node)} disabled={node.children.length > 0 || isLoading} className={`p-1 rounded-full transition-colors ${node.children.length > 0 ? 'bg-gray-100 text-gray-400' : 'bg-ink text-white hover:bg-accent'}`}>
                                    {isLoading ? <RefreshCw size={10} className="animate-spin"/> : <ChevronRight size={10}/>}
                                </button>
                          )}
                      </div>
                      <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{node.summary}</p>
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"><PaperBadge color={node.type === 'root' ? 'green' : 'ink'}>{node.type}</PaperBadge></div>
                 </div>
             </motion.div>
             <AnimatePresence>
                 {node.children.length > 0 && (
                     <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4 pl-12 pt-4 border-l-2 border-dashed border-gray-200 ml-8">
                         {node.children.map(child => <AnimatedTreeNode key={child.id} node={child} onExpand={onExpand} isLoading={isLoading} depth={depth + 1} />)}
                     </motion.div>
                 )}
             </AnimatePresence>
        </div>
    );
};

const RecursiveTreeView: React.FC<{ rootConcept: string; onReset: () => void; treeData: RecursiveNode; setTreeData: React.Dispatch<React.SetStateAction<RecursiveNode>>; loadingNodeId: string | null; handleExpand: (node: RecursiveNode) => void; handleCopyMarkdown: () => void; handleDownloadJSON: () => void; exportFeedback: 'copy'|'download'|null; }> = ({ rootConcept, onReset, treeData, loadingNodeId, handleExpand, handleCopyMarkdown, handleDownloadJSON, exportFeedback }) => {
    return (
        <div className="h-[500px] flex flex-col bg-gray-50 border border-gray-200">
             <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-ink flex items-center gap-2"><GitBranch size={16}/> Recursive Analysis: <span className="text-accent">{rootConcept}</span></h4>
                    <div className="flex gap-1 ml-4">
                        <button onClick={handleCopyMarkdown} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-ink transition-colors" title="Copy Markdown">{exportFeedback === 'copy' ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}</button>
                        <button onClick={handleDownloadJSON} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-ink transition-colors" title="Download JSON">{exportFeedback === 'download' ? <Check size={14} className="text-green-500"/> : <Download size={14}/>}</button>
                    </div>
                 </div>
                 <PaperButton size="sm" variant="secondary" onClick={onReset} icon={<X size={14}/>}>Close</PaperButton>
             </div>
             <div className="flex-1 overflow-auto p-8 relative bg-dot-pattern">
                 <AnimatedTreeNode node={treeData} onExpand={handleExpand} isLoading={loadingNodeId === treeData.id || (loadingNodeId !== null && loadingNodeId !== treeData.id && false)} depth={0} />
                 {loadingNodeId && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-10 right-10 bg-white border-2 border-accent p-3 shadow-lg flex items-center gap-3 z-50 rounded-sm"><RefreshCw size={16} className="animate-spin text-accent"/><span className="text-xs font-bold text-ink">Analyzing Sub-components...</span></motion.div>}
             </div>
        </div>
    );
};

interface MindmapVisualNode extends RecursiveNode { x: number; y: number; angle?: number; }
const MindmapView: React.FC<{ rootConcept: string; onReset: () => void; }> = ({ rootConcept, onReset }) => {
    const centerX = 400; const centerY = 250;
    const [nodes, setNodes] = useState<MindmapVisualNode[]>([{ id: 'root', label: rootConcept, summary: "Root Concept", children: [], isExpanded: false, depth: 0, type: 'root', x: centerX, y: centerY }]);
    const [links, setLinks] = useState<{source: string, target: string}[]>([]);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleExpand = async (node: MindmapVisualNode) => {
        if (node.isExpanded || loadingId) return;
        setLoadingId(node.id);
        try {
            const childrenData = await ragSystem.recursiveBreakdown(node.label, node.summary);
            const count = childrenData.length; const levelRadius = 160; const baseAngle = node.angle !== undefined ? node.angle : 0;
            const spread = node.depth === 0 ? Math.PI * 2 : Math.PI / 1.5; const startAngle = node.depth === 0 ? 0 : baseAngle - spread / 2;
            const newNodes: MindmapVisualNode[] = childrenData.map((child, i) => {
                const angle = startAngle + (i + 0.5) * (spread / count); const dist = levelRadius * 0.8;
                return { ...child, id: `${child.id}-${Date.now()}`, children: [], isExpanded: false, depth: node.depth + 1, x: node.x + Math.cos(angle) * dist, y: node.y + Math.sin(angle) * dist, angle: angle };
            });
            const newLinks = newNodes.map(child => ({ source: node.id, target: child.id }));
            setNodes(prev => prev.map(n => n.id === node.id ? { ...n, isExpanded: true } : n).concat(newNodes)); setLinks(prev => [...prev, ...newLinks]);
        } catch (e) { console.error(e); } finally { setLoadingId(null); }
    };

    return (
        <div className="h-[500px] flex flex-col bg-gray-50 border border-gray-200">
             <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                 <div className="flex items-center gap-2"><h4 className="font-bold text-sm text-ink flex items-center gap-2"><Network size={16}/> Mindmap: <span className="text-accent">{rootConcept}</span></h4></div>
                 <PaperButton size="sm" variant="secondary" onClick={onReset} icon={<X size={14}/>}>Close</PaperButton>
             </div>
             <div className="flex-1 overflow-hidden relative bg-dot-pattern cursor-grab active:cursor-grabbing">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {links.map((link, i) => {
                        const source = nodes.find(n => n.id === link.source); const target = nodes.find(n => n.id === link.target);
                        if (!source || !target) return null;
                        return <motion.line key={i} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />;
                    })}
                </svg>
                {nodes.map(node => (
                    <motion.div key={node.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`absolute flex flex-col items-center justify-center p-3 rounded-xl shadow-hard-sm border-2 cursor-pointer transition-colors max-w-[140px] text-center z-10 ${node.type === 'root' ? 'bg-ink text-white border-ink z-20' : node.isExpanded ? 'bg-white border-gray-300' : 'bg-white border-accent hover:bg-emerald-50'}`} style={{ left: node.x, top: node.y, x: '-50%', y: '-50%' }} onClick={() => handleExpand(node)}>
                        <span className="text-xs font-bold leading-tight">{node.label}</span> {node.type === 'root' && <span className="text-[9px] uppercase tracking-wider mt-1 opacity-70">Central Topic</span>} {loadingId === node.id && <RefreshCw size={12} className="animate-spin mt-1 text-accent"/>}
                    </motion.div>
                ))}
             </div>
        </div>
    );
};

// --- TOP CONTEXT PANEL (Goals, Dreams, Stats) ---
const ProfileContextPanel: React.FC<{ 
    documents: Document[]; 
    activeFilters: Record<string, string>; 
    metadataOptions: any; 
    filteredDocsCount: number;
    config: AppConfig;
    setConfig?: React.Dispatch<React.SetStateAction<AppConfig>>;
}> = ({ documents, activeFilters, metadataOptions, filteredDocsCount, config, setConfig }) => {
    const [viewMode, setViewMode] = useState<'stats' | 'goals' | 'dreams'>('goals');
    const [tempGoals, setTempGoals] = useState(config.userGoals || '');
    const [tempDreams, setTempDreams] = useState(config.userDreams || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        if (setConfig) {
            setIsSaving(true);
            setConfig(prev => ({
                ...prev,
                userGoals: tempGoals,
                userDreams: tempDreams
            }));
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    return (
        <PaperCard 
            className="flex flex-col border-accent min-h-[300px]"
            title="Identity & System Context"
            action={
                <div className="flex bg-gray-100 p-1 rounded-sm gap-1">
                    <button onClick={() => setViewMode('stats')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${viewMode === 'stats' ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'}`}>Stats</button>
                    <button onClick={() => setViewMode('goals')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${viewMode === 'goals' ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'}`}>Goals</button>
                    <button onClick={() => setViewMode('dreams')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${viewMode === 'dreams' ? 'bg-white text-ink shadow-sm' : 'text-gray-500 hover:text-ink'}`}>Dreams</button>
                </div>
            }
        >
            <div className="h-full flex flex-col pt-2">
                {viewMode === 'stats' && (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in content-start">
                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-sm text-center">
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Knowledge</span>
                            <span className="text-3xl font-serif font-bold text-ink">{documents.length}</span>
                            <span className="text-[10px] text-gray-400 block mt-1">Documents</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-sm text-center">
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Filtered View</span>
                            <span className="text-3xl font-serif font-bold text-accent">{filteredDocsCount}</span>
                            <span className="text-[10px] text-gray-400 block mt-1">Active Set</span>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-sm text-center">
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Semantic Tags</span>
                            <span className="text-3xl font-serif font-bold text-ink">{Object.keys(metadataOptions).length}</span>
                            <span className="text-[10px] text-gray-400 block mt-1">Dimensions</span>
                        </div>
                        <div className="p-4 border-2 border-dashed border-gray-200 rounded-sm flex flex-col justify-center items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase mb-2">Active Filters</span>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {Object.keys(activeFilters).length === 0 ? <span className="text-gray-300 italic text-[10px]">None</span> : 
                                    Object.entries(activeFilters).slice(0,3).map(([k,v]) => <PaperBadge key={k} color="ink">{k}</PaperBadge>)
                                }
                                {Object.keys(activeFilters).length > 3 && <span className="text-[10px] text-gray-400">+{Object.keys(activeFilters).length - 3}</span>}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'goals' && (
                    <div className="flex flex-col h-full gap-4 animate-fade-in">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-800 text-xs">
                            <Target size={18} className="shrink-0"/>
                            <div>
                                <strong className="block uppercase text-[10px] tracking-wider mb-0.5">Supervisor Context</strong>
                                Defining clear goals helps the Supervisor Agent filter irrelevant noise and prioritize aligned research paths.
                            </div>
                        </div>
                        <textarea 
                            className="flex-1 w-full p-4 border-2 border-gray-200 font-mono text-sm resize-none focus:outline-none focus:border-accent bg-white text-ink rounded-sm"
                            value={tempGoals}
                            onChange={e => setTempGoals(e.target.value)}
                            placeholder="e.g. Master the architecture of Transformer models for low-latency inference..."
                        />
                        <div className="flex justify-end">
                            <PaperButton 
                                onClick={handleSave} 
                                disabled={isSaving} 
                                icon={isSaving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
                            >
                                {isSaving ? 'Syncing...' : 'Update Context'}
                            </PaperButton>
                        </div>
                    </div>
                )}

                {viewMode === 'dreams' && (
                    <div className="flex flex-col h-full gap-4 animate-fade-in">
                        <div className="flex items-center gap-3 p-3 bg-purple-50 border-l-4 border-purple-500 text-purple-800 text-xs">
                            <Sparkles size={18} className="shrink-0"/>
                            <div>
                                <strong className="block uppercase text-[10px] tracking-wider mb-0.5">Divergent Memory</strong>
                                Dreams allow the system to make loose associations and suggest creative leaps that might not strictly align with current goals.
                            </div>
                        </div>
                        <textarea 
                            className="flex-1 w-full p-4 border-2 border-gray-200 font-serif text-sm resize-none focus:outline-none focus:border-accent bg-white text-ink rounded-sm italic"
                            value={tempDreams}
                            onChange={e => setTempDreams(e.target.value)}
                            placeholder="e.g. Build a self-replicating knowledge base that evolves with me..."
                        />
                         <div className="flex justify-end">
                            <PaperButton 
                                onClick={handleSave} 
                                disabled={isSaving} 
                                variant="secondary"
                                icon={isSaving ? <RefreshCw size={14} className="animate-spin"/> : <BrainCircuit size={14}/>}
                            >
                                {isSaving ? 'Syncing...' : 'Update Manifesto'}
                            </PaperButton>
                        </div>
                    </div>
                )}
            </div>
        </PaperCard>
    );
};

export const MyProfileView: React.FC<MyProfileViewProps> = ({ documents, config, setConfig }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [keywordFilter, setKeywordFilter] = useState('');
  
  // Summary State
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryFeedback, setSummaryFeedback] = useState<'copy' | 'download' | null>(null);
  
  // Recursive View State
  const [activeRecursiveConcept, setActiveRecursiveConcept] = useState<string | null>(null);
  const [vizMode, setVizMode] = useState<'tree' | 'mindmap'>('tree');
  
  // Prompt State
  const [selectedPromptId, setSelectedPromptId] = useState<string>(config.activeSystemPromptId || (config.systemPrompts[0]?.id || ''));

  // Filtering Logic
  const metadataOptions = useMemo<Record<string, Set<string>>>(() => {
    const options: Record<string, Set<string>> = {};
    documents.forEach(doc => {
      if (doc.metadata) {
        Object.entries(doc.metadata).forEach(([k, v]) => {
          if (!options[k]) options[k] = new Set<string>();
          options[k].add(`${v}`); 
        });
      }
    });
    return options;
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (keywordFilter && !doc.title.toLowerCase().includes(keywordFilter.toLowerCase())) return false;
      for (const [key, val] of Object.entries(activeFilters)) {
        if (!doc.metadata || doc.metadata[key] !== val) return false;
      }
      return true;
    });
  }, [documents, keywordFilter, activeFilters]);

  const wordCloudData = useMemo(() => {
     const counts: Record<string, number> = {};
     filteredDocs.forEach(doc => {
        doc.title.split(/[\s._-]+/).forEach(w => {
           if (w.length > 4) counts[w] = (counts[w] || 0) + 100;
        });
        if(doc.metadata) Object.values(doc.metadata).forEach(v => { const val = String(v); counts[val] = (counts[val] || 0) + 300; });
     });
     return Object.entries(counts).map(([text, value]) => ({ text, value })).sort((a,b) => b.value - a.value).slice(0, 30); 
  }, [filteredDocs]);

  const activePrompt = config.systemPrompts.find(p => p.id === selectedPromptId) || config.systemPrompts[0] || { content: 'Summarize.', name: 'Default Strategy' };

  const handleSummarize = async () => {
    setIsSummarizing(true); setSummary('');
    const relevantDocIds = filteredDocs.map(d => d.id);
    const relevantChunks = MOCK_KNOWLEDGE_BASE.filter(c => relevantDocIds.includes(c.docId));
    const sources = relevantChunks.slice(0, 20).map((chunk, idx) => ({ id: `summary-source-${idx}`, documentTitle: documents.find(d => d.id === chunk.docId)?.title || 'Unknown Doc', snippet: chunk.content, score: 1, page: chunk.metadata.page || 1 }));
    if (sources.length === 0) filteredDocs.slice(0, 15).forEach(doc => sources.push({ id: doc.id, documentTitle: doc.title, snippet: `Document Title: ${doc.title}. Metadata: ${JSON.stringify(doc.metadata)}.`, score: 1, page: 1 }));
    
    try {
        // Map prompt ID to agentType
        const agentTypeMap: Record<string, string> = {
            'sp-1': 'graph-analyst',
            'sp-2': 'executive-summary',
            'sp-3': 'technical-auditor',
            'sp-4': 'future-planner'
        };
        const agentType = selectedPromptId ? agentTypeMap[selectedPromptId] : 'executive-summary';
        
        const result = await ragSystem.generateRAGResponse(
            `Task: Generate a concise summary of the provided document set.\nSystem Instruction: ${activePrompt.content}`, 
            sources, 
            config.userGoals, 
            0.3, 
            activePrompt.content,
            config.llm,
            undefined,
            agentType
        );
        setSummary(result);
    } catch (e) { setSummary("Failed to generate summary. Please check your API key and connection."); } finally { setIsSummarizing(false); }
  };

  const handleCopySummary = () => { if (!summary) return; navigator.clipboard.writeText(summary); setSummaryFeedback('copy'); setTimeout(() => setSummaryFeedback(null), 2000); };
  const handleDownloadSummary = () => { if (!summary) return; const blob = new Blob([summary], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `strategic-analysis-${Date.now()}.md`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setSummaryFeedback('download'); setTimeout(() => setSummaryFeedback(null), 2000); };
  const toggleFilter = (key: string, value: string) => { setActiveFilters(prev => { const next = { ...prev }; if (next[key] === value) delete next[key]; else next[key] = value; return next; }); };
  const handleWordClick = (text: string) => { setKeywordFilter(text); };

  // Recursive State
  const [treeData, setTreeData] = useState<RecursiveNode>({ id: 'root', label: '', summary: '', children: [], isExpanded: true, depth: 0, type: 'root' });
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<'copy'|'download'|null>(null);

  useEffect(() => { if (activeRecursiveConcept) setTreeData({ id: 'root', label: activeRecursiveConcept, summary: "Root Concept derived from your selection.", children: [], isExpanded: true, depth: 0, type: 'root' }); }, [activeRecursiveConcept]);

  const handleTreeExpand = async (node: RecursiveNode) => {
    setLoadingNodeId(node.id);
    try {
        const children = await ragSystem.recursiveBreakdown(node.label, node.summary);
        const updateTree = (current: RecursiveNode): RecursiveNode => { if (current.id === node.id) return { ...current, children: children, isExpanded: true }; return { ...current, children: current.children.map(updateTree) }; };
        setTreeData(prev => updateTree(prev));
    } catch (e) { console.error(e); } finally { setLoadingNodeId(null); }
  };
  
  const generateMarkdown = (node: RecursiveNode, depth = 0): string => { const indent = "  ".repeat(depth); let output = `${indent}- **${node.label}**: ${node.summary}\n`; if (node.children) node.children.forEach(child => output += generateMarkdown(child, depth + 1)); return output; };
  const handleCopyMarkdown = () => { const md = generateMarkdown(treeData); navigator.clipboard.writeText(md); setExportFeedback('copy'); setTimeout(() => setExportFeedback(null), 2000); };
  const handleDownloadJSON = () => { const json = JSON.stringify(treeData, null, 2); const element = document.createElement("a"); const file = new Blob([json], {type: 'application/json'}); element.href = URL.createObjectURL(file); element.download = `recursive-analysis.json`; document.body.appendChild(element); element.click(); document.body.removeChild(element); setExportFeedback('download'); setTimeout(() => setExportFeedback(null), 2000); };

  return (
    <div className="h-[calc(100vh-6rem)] relative flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center border-b-2 border-gray-200 pb-6">
        <div><h2 className="text-3xl font-serif font-bold text-ink">My Profile</h2><p className="text-gray-500 font-mono text-sm mt-1">Analytics & Collections</p></div>
        <div className="flex gap-4"><PaperButton variant="secondary" icon={<Filter size={16}/>} onClick={() => setIsFilterOpen(true)}>Filters {Object.keys(activeFilters).length > 0 && `(${Object.keys(activeFilters).length})`}</PaperButton></div>
      </div>

      {/* TOP: Identity Context Panel */}
      <ProfileContextPanel 
          documents={documents} 
          activeFilters={activeFilters} 
          metadataOptions={metadataOptions} 
          filteredDocsCount={filteredDocs.length}
          config={config}
          setConfig={setConfig}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="flex flex-col gap-6 h-full">
            {!activeRecursiveConcept ? (
                <PaperCard title="Semantic Cloud" className="flex-1 flex flex-col min-h-[400px]" action={<div className="text-[10px] text-gray-400 font-mono">Click Word to Filter • Select from list for Deep Dive</div>}>
                    {wordCloudData.length > 0 ? (
                        <div className="relative h-full">
                            <WordCloud data={wordCloudData} onWordClick={handleWordClick} />
                            <div className="absolute top-2 right-2 bg-white/90 p-2 border border-gray-200 shadow-sm text-xs rounded-sm"><span className="font-bold text-ink block mb-2">Recursive Tool</span><div className="space-y-1 max-h-32 overflow-y-auto">{wordCloudData.slice(0, 5).map(item => <button key={item.text} onClick={() => setActiveRecursiveConcept(item.text)} className="block w-full text-left px-2 py-1 hover:bg-accent hover:text-white transition-colors">Breakdown "{item.text}"</button>)}</div></div>
                        </div>
                    ) : <div className="flex-1 flex items-center justify-center text-gray-400 italic">No data available. Try adjusting filters.</div>}
                </PaperCard>
            ) : (
                <div className="flex flex-col gap-4 flex-1">
                     <div className="flex justify-end gap-2"><span className="text-xs font-bold text-gray-500 uppercase self-center mr-2">Visual Mode:</span><button onClick={() => setVizMode('tree')} className={`p-2 border-2 rounded-sm transition-all ${vizMode === 'tree' ? 'bg-ink text-white border-ink' : 'bg-white border-gray-200 text-gray-400'}`} title="Tree View"><Layout size={16}/></button><button onClick={() => setVizMode('mindmap')} className={`p-2 border-2 rounded-sm transition-all ${vizMode === 'mindmap' ? 'bg-ink text-white border-ink' : 'bg-white border-gray-200 text-gray-400'}`} title="Mindmap View"><Network size={16}/></button></div>
                     {vizMode === 'tree' ? <RecursiveTreeView rootConcept={activeRecursiveConcept} onReset={() => setActiveRecursiveConcept(null)} treeData={treeData} setTreeData={setTreeData} loadingNodeId={loadingNodeId} handleExpand={handleTreeExpand} handleCopyMarkdown={handleCopyMarkdown} handleDownloadJSON={handleDownloadJSON} exportFeedback={exportFeedback}/> : <MindmapView rootConcept={activeRecursiveConcept} onReset={() => setActiveRecursiveConcept(null)}/>}
                </div>
            )}
        </div>

        <div className="flex flex-col gap-6 h-full">
            <PaperCard className="flex-1 flex flex-col border-ink" title="Strategic Analysis" action={<div className="flex items-center gap-2"><select className="bg-white text-ink border border-gray-300 text-xs font-bold uppercase py-1 px-2 rounded-sm focus:outline-none max-w-[150px] truncate" value={selectedPromptId} onChange={(e) => setSelectedPromptId(e.target.value)}>{config.systemPrompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={handleSummarize} disabled={isSummarizing || filteredDocs.length === 0} className="p-1.5 bg-ink text-white rounded-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Run Analysis">{isSummarizing ? <RefreshCw size={12} className="animate-spin"/> : <Play size={12} fill="currentColor"/>}</button><div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 ml-2"><Settings2 size={12}/> Cmd+I to Manage</div></div>}>
                <div className="flex-1 relative">
                    {summary ? (
                        <div className="relative h-full flex flex-col"><div className="prose prose-sm max-w-none animate-fade-in font-serif leading-relaxed p-2 overflow-y-auto max-h-[400px]"><MarkdownText content={summary} /></div><div className="absolute bottom-2 right-2 flex gap-2"><button onClick={handleCopySummary} className="p-1.5 bg-white border border-gray-200 shadow-sm rounded-sm hover:border-accent hover:text-accent transition-colors text-gray-500" title="Copy to Clipboard">{summaryFeedback === 'copy' ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}</button><button onClick={handleDownloadSummary} className="p-1.5 bg-white border border-gray-200 shadow-sm rounded-sm hover:border-accent hover:text-accent transition-colors text-gray-500" title="Download Report">{summaryFeedback === 'download' ? <Check size={14} className="text-green-500"/> : <Download size={14}/>}</button></div></div>
                    ) : <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-10"><BarChart2 size={32} className="opacity-20"/><p className="text-sm italic">Select a strategy and generate insights.</p></div>}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100"><PaperButton onClick={handleSummarize} disabled={isSummarizing || filteredDocs.length === 0} icon={isSummarizing ? <Zap size={16} className="animate-pulse"/> : <Zap size={16}/>} className="w-full">{isSummarizing ? 'Processing Intelligence...' : `Run Analysis: ${activePrompt.name}`}</PaperButton></div>
            </PaperCard>
        </div>
      </div>

      {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end"><div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" onClick={() => setIsFilterOpen(false)}></div><div className="relative w-80 bg-white shadow-hard-lg border-l-2 border-ink h-full flex flex-col animate-slide-in"><div className="p-6 border-b-2 border-ink flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-ink flex items-center gap-2"><Filter size={18}/> Filters</h3><button onClick={() => setIsFilterOpen(false)} className="hover:text-red-500"><X size={20}/></button></div><div className="flex-1 overflow-y-auto p-6 space-y-6"><div><label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Keyword</label><input className="w-full bg-white text-ink border-2 border-gray-200 p-2 text-sm focus:border-accent outline-none" placeholder="Filter by title..." value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)}/></div><hr className="border-gray-100"/>{Object.entries(metadataOptions).map(([key, values]) => (<div key={key}><div className="flex items-center gap-2 mb-2"><Hash size={14} className="text-accent"/><label className="text-xs font-bold uppercase text-ink">{key}</label></div><div className="flex flex-wrap gap-2">{Array.from(values as Set<string>).map((val: string) => (<button key={val} onClick={() => toggleFilter(key, val)} className={`px-2 py-1 text-xs border transition-all ${activeFilters[key] === val ? 'bg-accent text-white border-accent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-accent'}`}>{val}</button>))}</div></div>))}</div><div className="p-4 border-t-2 border-gray-100 bg-gray-50"><PaperButton onClick={() => { setActiveFilters({}); setKeywordFilter(''); }} variant="ghost" className="w-full">Reset All</PaperButton></div></div></div>
      )}
    </div>
  );
};
