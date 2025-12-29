
import React, { useState, useEffect } from 'react';
import { PaperCard, PaperButton, PaperBadge } from './PaperComponents';
import { GraphData, GraphNode } from '../types';
import { 
  Wand2, FileText, Copy, Edit3, Save, 
  Bot, Sparkles, LayoutTemplate, Network, 
  Check, HardDrive
} from 'lucide-react';
import { GoogleGenAI } from "@google/generative-ai";

interface GraphAnalysisProps {
    data: GraphData;
    selectedNode: GraphNode | null;
}

type Tab = 'connections' | 'analysis' | 'prompt';

export const GraphAnalysis: React.FC<GraphAnalysisProps> = ({ data, selectedNode }) => {
    const [activeTab, setActiveTab] = useState<Tab>('connections');
    
    // Analysis State
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    // Prompt State
    const [promptTemplate, setPromptTemplate] = useState("Analyze the relationship between {{node}} and its connections in the context of {{context}}.");
    const [systemPrompt, setSystemPrompt] = useState("You are a knowledge graph analyst. Provide concise, structural insights.");
    const [isEditingTemplate, setIsEditingTemplate] = useState(true); // Default to expanded
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    
    // UI State
    const [reportCopied, setReportCopied] = useState(false);
    const [promptSaved, setPromptSaved] = useState(false);
    const [exportedToVault, setExportedToVault] = useState(false);

    // --- Helpers ---
    const getTopConnections = () => {
        const counts: Record<string, number> = {};
        data.links.forEach(l => {
            counts[l.source] = (counts[l.source] || 0) + 1;
            counts[l.target] = (counts[l.target] || 0) + 1;
        });
        
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([id, count]) => {
                const node = data.nodes.find(n => n.id === id);
                return { label: node?.label || id, count, id, group: node?.group };
            });
    };

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            const context = selectedNode 
                ? `Node: ${selectedNode.label} (${selectedNode.group}). Connections: ${data.links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).length} links.`
                : `Graph contains ${data.nodes.length} nodes and ${data.links.length} links. Top entities: ${getTopConnections().map(c => c.label).join(', ')}.`;

            const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
            const ai = new GoogleGenAI({ apiKey });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Summarize the following knowledge graph state.\n\n${context}`,
                config: { systemInstruction: systemPrompt }
            });

            setSummary(response.text || "No summary generated.");
        } catch (e) {
            setSummary("Error generating summary. Check API Key.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const generateFromTemplate = () => {
        const nodeLabel = selectedNode ? selectedNode.label : "the entire graph";
        const contextDesc = "enterprise knowledge base";
        const filled = promptTemplate
            .replace('{{node}}', nodeLabel)
            .replace('{{context}}', contextDesc);
        setGeneratedPrompt(filled);
        
        // Auto-switch to prompt tab if not there
        if (activeTab !== 'prompt') setActiveTab('prompt');
    };

    const saveToPromptLab = () => {
        if (!generatedPrompt) return;
        const saved = JSON.parse(localStorage.getItem('pratejra_saved_prompts') || '[]');
        saved.unshift({
            id: Date.now().toString(),
            content: generatedPrompt,
            timestamp: Date.now(),
            mode: 'precise',
            preview: `Graph Export: ${generatedPrompt.substring(0, 20)}...`
        });
        localStorage.setItem('pratejra_saved_prompts', JSON.stringify(saved));
        setPromptSaved(true);
        setTimeout(() => setPromptSaved(false), 2000);
    };

    const exportToVault = () => {
        // Simulate saving
        setExportedToVault(true);
        setTimeout(() => setExportedToVault(false), 2000);
    };

    const generateReport = () => {
        const connections = getTopConnections().map(c => `- ${c.label} (${c.count})`).join('\n');
        const report = `
GRAPH INTELLIGENCE REPORT
Date: ${new Date().toLocaleDateString()}
Target: ${selectedNode ? selectedNode.label : 'Full Graph'}

1. TOP CONNECTIONS
${connections}

2. SEMANTIC ANALYSIS
${summary || '[No analysis generated]'}

3. PROMPT STRATEGY
${generatedPrompt || '[No prompt generated]'}
        `.trim();
        
        navigator.clipboard.writeText(report);
        setReportCopied(true);
        setTimeout(() => setReportCopied(false), 2000);
    };

    return (
        <PaperCard className="h-full min-h-[400px] flex flex-col">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-ink pb-4 mb-4 gap-4">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-sm">
                    <button 
                        onClick={() => setActiveTab('connections')}
                        className={`px-4 py-2 text-xs font-bold uppercase transition-all flex items-center gap-2 rounded-sm ${activeTab === 'connections' ? 'bg-white shadow-sm text-ink' : 'text-gray-500 hover:text-ink'}`}
                    >
                        <Network size={14}/> Topology
                    </button>
                    <button 
                        onClick={() => setActiveTab('analysis')}
                        className={`px-4 py-2 text-xs font-bold uppercase transition-all flex items-center gap-2 rounded-sm ${activeTab === 'analysis' ? 'bg-white shadow-sm text-ink' : 'text-gray-500 hover:text-ink'}`}
                    >
                        <Bot size={14}/> Analysis
                    </button>
                    <button 
                        onClick={() => setActiveTab('prompt')}
                        className={`px-4 py-2 text-xs font-bold uppercase transition-all flex items-center gap-2 rounded-sm ${activeTab === 'prompt' ? 'bg-white shadow-sm text-ink' : 'text-gray-500 hover:text-ink'}`}
                    >
                        <Wand2 size={14}/> Prompting
                    </button>
                </div>

                <div className="flex gap-2">
                     <PaperButton 
                        size="sm" 
                        variant="secondary" 
                        onClick={exportToVault}
                        icon={exportedToVault ? <Check size={14}/> : <HardDrive size={14}/>}
                    >
                        {exportedToVault ? 'Saved' : 'Save to Vault'}
                    </PaperButton>
                    <PaperButton 
                        size="sm" 
                        variant="secondary" 
                        onClick={generateReport}
                        icon={reportCopied ? <Check size={14}/> : <FileText size={14}/>}
                    >
                        {reportCopied ? 'Copied' : 'Report'}
                    </PaperButton>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto animate-fade-in">
                
                {/* 1. Topology Tab */}
                {activeTab === 'connections' && (
                    <div className="space-y-4">
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="text-sm font-bold text-ink uppercase">Central Entities</h4>
                             <PaperBadge color="ink">{getTopConnections().length} Items</PaperBadge>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {getTopConnections().map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-sm hover:border-accent transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:border-accent group-hover:text-accent">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-ink truncate max-w-[120px]">{item.label}</span>
                                            <span className="text-[10px] text-gray-400 uppercase">{item.group}</span>
                                        </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-gray-400">{item.count}</span>
                                </div>
                            ))}
                        </div>
                        {data.links.length === 0 && <div className="text-gray-400 text-sm italic p-4 text-center">No active connections in view.</div>}
                    </div>
                )}

                {/* 2. Analysis Tab */}
                {activeTab === 'analysis' && (
                    <div className="space-y-4 h-full flex flex-col">
                        <div className="flex-1 bg-gray-50 border border-gray-200 p-6 text-sm leading-relaxed font-mono text-gray-700 overflow-y-auto min-h-[200px] relative group">
                            {summary ? summary : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                                    <Sparkles size={24} className="opacity-50"/>
                                    <p className="text-xs italic">AI Analysis not generated yet.</p>
                                </div>
                            )}
                            {summary && (
                                <button 
                                    className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-accent rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => navigator.clipboard.writeText(summary)}
                                    title="Copy Text"
                                >
                                    <Copy size={14}/>
                                </button>
                            )}
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                             <PaperButton 
                                onClick={handleSummarize} 
                                disabled={isSummarizing} 
                                className="w-full"
                                icon={isSummarizing ? <Sparkles size={16} className="animate-spin"/> : <Bot size={16}/>}
                            >
                                {isSummarizing ? 'Analyzing Context...' : 'Generate Semantic Analysis'}
                            </PaperButton>
                        </div>
                    </div>
                )}

                {/* 3. Prompting Tab */}
                {activeTab === 'prompt' && (
                    <div className="space-y-6">
                        {/* Editor */}
                        <div className="bg-gray-50 p-4 border border-gray-200">
                             <div className="flex justify-between items-center mb-3">
                                 <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                                     <LayoutTemplate size={14}/> Template Strategy
                                 </h4>
                                 <button 
                                    onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                                    className="text-xs text-accent hover:underline flex items-center gap-1"
                                 >
                                     {isEditingTemplate ? <Save size={12}/> : <Edit3 size={12}/>}
                                     {isEditingTemplate ? 'Save Config' : 'Edit Config'}
                                 </button>
                             </div>
                             
                             {isEditingTemplate ? (
                                <div className="space-y-3 animate-fade-in">
                                    <textarea 
                                        className="w-full p-2 border border-gray-300 text-xs font-mono focus:border-accent outline-none bg-white text-ink"
                                        value={systemPrompt}
                                        onChange={e => setSystemPrompt(e.target.value)}
                                        rows={2}
                                        placeholder="System Prompt..."
                                    />
                                    <textarea 
                                        className="w-full p-2 border border-gray-300 text-xs font-mono focus:border-accent outline-none bg-white text-ink"
                                        value={promptTemplate}
                                        onChange={e => setPromptTemplate(e.target.value)}
                                        rows={3}
                                        placeholder="User Template..."
                                    />
                                </div>
                             ) : (
                                <div className="text-xs font-mono text-gray-600 bg-white p-2 border border-gray-200">
                                    <span className="text-gray-400 select-none">$ </span>{promptTemplate}
                                </div>
                             )}
                        </div>

                        {/* Generation Controls */}
                        <div className="flex gap-4">
                             <PaperButton onClick={generateFromTemplate} variant="primary" className="flex-1" icon={<Wand2 size={16}/>}>
                                Generate Prompt
                             </PaperButton>
                             {generatedPrompt && (
                                 <PaperButton 
                                    onClick={saveToPromptLab} 
                                    variant="secondary" 
                                    className="flex-1" 
                                    icon={promptSaved ? <Check size={16}/> : <Save size={16}/>}
                                 >
                                     {promptSaved ? 'Saved to Lab' : 'Export to Lab'}
                                 </PaperButton>
                             )}
                        </div>

                        {/* Result */}
                        {generatedPrompt && (
                            <div className="relative group animate-slide-in">
                                <div className="absolute -left-1 top-4 bottom-4 w-1 bg-accent"></div>
                                <div className="p-4 bg-white border border-gray-200 shadow-sm text-sm font-mono text-ink">
                                    {generatedPrompt}
                                </div>
                                <button 
                                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-accent"
                                    onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                                >
                                    <Copy size={14}/>
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </PaperCard>
    );
};
