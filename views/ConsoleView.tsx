
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PaperCard, PaperButton, PaperBadge, MarkdownText } from '../components/PaperComponents';
import { AppConfig, LogEntry } from '../types';
import { 
  Activity, AlertTriangle, Terminal, Filter, RefreshCw, 
  Trash2, Search, Bot, Shield, Cpu, Play, Check, X
} from 'lucide-react';
import { systemLogs } from '../services/LogService';
import { llmService } from '../services/LLMService';

interface ConsoleViewProps {
  config: AppConfig;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ config }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI Summary State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    const unsubscribe = systemLogs.subscribe(setLogs);
    return () => unsubscribe();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
      const matchesSearch = !searchQuery || 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
        log.source.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [logs, filterCategory, filterLevel, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      errors: logs.filter(l => l.level === 'error').length,
      warnings: logs.filter(l => l.level === 'warn').length,
      agents: logs.filter(l => l.category === 'agent').length
    };
  }, [logs]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAnalysisResult('');

    try {
      // Grab top 50 filtered logs for context
      const contextLogs = filteredLogs.slice(0, 50).map(l => 
        `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.level.toUpperCase()} (${l.category}): ${l.message}`
      ).join('\n');

      if (!contextLogs) {
        setAnalysisResult("No logs matching current filters to analyze.");
        setIsAnalyzing(false);
        return;
      }

      const prompt = `
      Analyze the following system logs from the Pratejra Application.
      
      LOG DATA:
      ${contextLogs}
      
      TASK:
      1. Identify any recurring Error patterns or critical failures.
      2. Summarize the recent activity of Agents (Coordinator/Critic).
      3. Provide a brief health assessment.
      
      Output in Markdown. Be concise and technical.
      `;

      const result = await llmService.generate(config.llm, prompt, { temperature: 0.2 });
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      setAnalysisResult("Analysis failed due to LLM provider error.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-100';
      case 'warn': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'success': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-gray-600 bg-white border-gray-100';
    }
  };

  const getIcon = (category: string) => {
    switch(category) {
      case 'agent': return <Bot size={14}/>;
      case 'system': return <Cpu size={14}/>;
      case 'security': return <Shield size={14}/>;
      default: return <Terminal size={14}/>;
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-fade-in">
      {/* Header Stats */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white border-2 border-ink p-4 shadow-hard-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-bold uppercase text-gray-500">Total Events</p>
             <p className="text-2xl font-serif font-bold text-ink">{stats.total}</p>
           </div>
           <Activity size={24} className="text-gray-300"/>
        </div>
        <div className="flex-1 bg-white border-2 border-ink p-4 shadow-hard-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-bold uppercase text-red-500">Errors</p>
             <p className="text-2xl font-serif font-bold text-red-600">{stats.errors}</p>
           </div>
           <AlertTriangle size={24} className="text-red-200"/>
        </div>
        <div className="flex-1 bg-white border-2 border-ink p-4 shadow-hard-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-bold uppercase text-blue-500">Agent Turns</p>
             <p className="text-2xl font-serif font-bold text-blue-600">{stats.agents}</p>
           </div>
           <Bot size={24} className="text-blue-200"/>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Left Control Panel */}
        <div className="w-64 flex flex-col gap-4">
           <PaperCard title="Console Controls" className="bg-gray-50">
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Search</label>
                    <div className="relative">
                       <Search size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                       <input 
                         className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-sm text-xs font-mono focus:border-ink outline-none"
                         placeholder="Filter logs..."
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                       />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Category</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-sm text-xs font-bold uppercase"
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                    >
                       <option value="all">All Categories</option>
                       <option value="agent">Agent Activities</option>
                       <option value="system">System Events</option>
                       <option value="app">Application</option>
                       <option value="security">Security</option>
                    </select>
                 </div>

                 <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Severity</label>
                    <div className="flex gap-1 flex-wrap">
                       {['all', 'info', 'warn', 'error'].map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setFilterLevel(lvl)}
                            className={`px-2 py-1 text-[10px] font-bold uppercase border rounded-sm transition-colors ${filterLevel === lvl ? 'bg-ink text-white border-ink' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                          >
                             {lvl}
                          </button>
                       ))}
                    </div>
                 </div>

                 <hr className="border-gray-200"/>

                 <PaperButton 
                    className="w-full" 
                    icon={isAnalyzing ? <RefreshCw size={14} className="animate-spin"/> : <Bot size={14}/>}
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                 >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Feed'}
                 </PaperButton>

                 <PaperButton 
                    variant="ghost" 
                    className="w-full text-red-500 hover:text-red-700" 
                    icon={<Trash2 size={14}/>}
                    onClick={() => systemLogs.clear()}
                 >
                    Clear Console
                 </PaperButton>
              </div>
           </PaperCard>
        </div>

        {/* Main Feed Area */}
        <div className="flex-1 flex flex-col gap-4">
           {showAnalysis && (
              <div className="bg-white border-2 border-accent p-4 shadow-hard animate-slide-up relative">
                 <button 
                   onClick={() => setShowAnalysis(false)} 
                   className="absolute top-2 right-2 text-gray-400 hover:text-ink"
                 >
                    <X size={16}/>
                 </button>
                 <h4 className="text-sm font-bold text-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Bot size={16}/> AI Insight Report
                 </h4>
                 {isAnalyzing ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-4">
                       <RefreshCw size={14} className="animate-spin"/> Parsing {filteredLogs.slice(0, 50).length} log entries...
                    </div>
                 ) : (
                    <div className="prose prose-sm max-w-none text-xs font-mono leading-relaxed">
                       <MarkdownText content={analysisResult} />
                    </div>
                 )}
              </div>
           )}

           <div className="flex-1 bg-ink text-green-400 p-4 font-mono text-xs overflow-y-auto shadow-inner rounded-sm border-2 border-ink flex flex-col gap-1">
              {filteredLogs.length === 0 ? (
                 <div className="text-gray-500 italic p-4 text-center">-- No logs available --</div>
              ) : (
                 filteredLogs.map(log => (
                    <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
                       <span className="text-gray-500 min-w-[80px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       <span className={`font-bold uppercase min-w-[60px] ${
                          log.level === 'error' ? 'text-red-500' : 
                          log.level === 'warn' ? 'text-yellow-500' : 
                          log.level === 'success' ? 'text-emerald-500' : 'text-blue-400'
                       }`}>
                          {log.level}
                       </span>
                       <span className="text-gray-400 min-w-[100px] truncate" title={log.source}>[{log.source}]</span>
                       <span className="text-gray-300 flex-1 break-all">{log.message}</span>
                       {log.details && (
                          <span className="text-gray-600 text-[10px] hidden group-hover:inline-block">
                             {JSON.stringify(log.details)}
                          </span>
                       )}
                    </div>
                 ))
              )}
           </div>
        </div>

      </div>
    </div>
  );
};
