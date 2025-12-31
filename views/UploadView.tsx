
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PaperCard, PaperButton, PaperBadge, PaperInput } from '../components/PaperComponents';
import { Document, AppConfig } from '../types';
import { FileText, Trash2, Upload, RefreshCw, Database, CheckCircle2, Search, X, Cpu, Tag, Plus, Activity, Cloud, HardDrive, Shield, Layers, AlertTriangle, Check, PieChart as PieChartIcon, ArrowLeft } from 'lucide-react';
import { ragSystem } from '../services/RAGEngine';
import { analyticsService } from '../services/AnalyticsService';

interface UploadViewProps {
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  config: AppConfig;
  onNavigateToSettings: () => void;
}

// --- Components ---

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  // Determine pipeline stage based on progress
  const getStage = () => {
    if (progress < 30) return { label: 'Chunking...', color: 'bg-blue-500' };
    if (progress < 60) return { label: 'Embedding...', color: 'bg-purple-500' };
    if (progress < 90) return { label: 'Graph extraction...', color: 'bg-indigo-500' };
    return { label: 'Finalizing...', color: 'bg-emerald-500' };
  };

  const stage = getStage();

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-wider">
          {stage.label}
        </span>
        <span className="text-[10px] font-mono font-bold text-gray-500">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden relative">
        <div
          className={`${stage.color} h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden`}
          style={{
            width: `${progress}%`,
            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.2) 50%, rgba(255,255,255,.2) 75%, transparent 75%, transparent)',
            backgroundSize: '20px 20px',
            animation: 'progress-stripes 1s linear infinite'
          }}
        >
        </div>
      </div>
      <style>{`
        @keyframes progress-stripes {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
};

const SimplePieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    if (total === 0) return (
        <div className="h-32 flex items-center justify-center text-xs text-gray-400 italic">No data to display</div>
    );

    return (
        <div className="flex items-center gap-4">
            <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {data.map((item, i) => {
                        const angle = (item.value / total) * 360;
                        const largeArc = angle > 180 ? 1 : 0;
                        const x1 = 50 + 50 * Math.cos((Math.PI * currentAngle) / 180);
                        const y1 = 50 + 50 * Math.sin((Math.PI * currentAngle) / 180);
                        const x2 = 50 + 50 * Math.cos((Math.PI * (currentAngle + angle)) / 180);
                        const y2 = 50 + 50 * Math.sin((Math.PI * (currentAngle + angle)) / 180);
                        
                        const pathData = total === item.value 
                            ? `M 50 50 m -50, 0 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0` // Full circle
                            : `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

                        const el = (
                            <path
                                key={i}
                                d={pathData}
                                fill={item.color}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                            >
                                <title>{item.label}: {item.value}</title>
                            </path>
                        );
                        currentAngle += angle;
                        return el;
                    })}
                    {/* Inner hole for Donut Chart effect */}
                    <circle cx="50" cy="50" r="30" fill="white" />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-gray-500">{total}</span>
                </div>
            </div>
            
            <div className="space-y-1 flex-1">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-gray-600">{item.label}</span>
                        </div>
                        <span className="font-mono font-bold text-ink">{Math.round((item.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{ 
    isOpen: boolean; 
    docTitle: string; 
    isBulk?: boolean;
    count?: number;
    onConfirm: () => void; 
    onCancel: () => void; 
}> = ({ isOpen, docTitle, isBulk, count, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onCancel}></div>
            <div className="bg-white border-2 border-red-500 shadow-hard-lg p-6 w-[400px] relative z-10 animate-fade-in">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <AlertTriangle size={24}/>
                    <h3 className="text-lg font-bold">Confirm Deletion</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    {isBulk ? (
                        <>Are you sure you want to delete <span className="font-bold text-ink">{count} items</span>?</>
                    ) : (
                        <>Are you sure you want to delete <span className="font-bold text-ink">"{docTitle}"</span>?</>
                    )}
                    <br/><br/>
                    This action removes source files and all associated vector embeddings from the Knowledge Base.
                </p>
                <div className="flex justify-end gap-3">
                    <PaperButton variant="secondary" size="sm" onClick={onCancel}>Cancel</PaperButton>
                    <PaperButton variant="danger" size="sm" onClick={onConfirm} icon={<Trash2 size={14}/>}>
                        {isBulk ? 'Delete Selected' : 'Delete Source'}
                    </PaperButton>
                </div>
            </div>
        </div>
    );
};

const MetadataModal: React.FC<{
    doc: Document;
    onClose: () => void;
    onUpdate: (docId: string, key: string, value: string) => void;
    onRemove: (docId: string, key: string) => void;
}> = ({ doc, onClose, onUpdate, onRemove }) => {
    const [key, setKey] = useState('');
    const [val, setVal] = useState('');

    const handleSubmit = () => {
        if (key && val) {
            onUpdate(doc.id, key, val);
            setKey('');
            setVal('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
             <div className="bg-white border-2 border-ink shadow-hard-lg w-[500px] relative z-10 flex flex-col animate-fade-in">
                 <div className="p-4 border-b-2 border-ink bg-gray-50 flex justify-between items-center">
                     <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                         <Tag size={18}/> Metadata Editor
                     </h3>
                     <button onClick={onClose}><X size={20}/></button>
                 </div>
                 
                 <div className="p-6 space-y-6">
                     <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-sm">
                         <FileText size={20} className="text-blue-600"/>
                         <div>
                             <p className="text-[10px] font-bold uppercase text-blue-400">Target Document</p>
                             <p className="font-bold text-sm text-ink">{doc.title}</p>
                         </div>
                     </div>

                     <div className="space-y-2">
                         <label className="text-xs font-bold uppercase text-gray-500">Current Tags</label>
                         <div className="border border-gray-200 p-2 min-h-[100px] max-h-[200px] overflow-y-auto bg-gray-50/50 space-y-2">
                             {doc.metadata && Object.keys(doc.metadata).length > 0 ? (
                                 Object.entries(doc.metadata).map(([k,v]) => (
                                     <div key={k} className="flex justify-between items-center bg-white border border-gray-200 p-2 shadow-sm">
                                         <span className="text-xs font-mono"><span className="font-bold">{k}:</span> {v}</span>
                                         <button onClick={() => onRemove(doc.id, k)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                     </div>
                                 ))
                             ) : (
                                 <div className="text-center text-gray-400 italic text-xs py-4">No metadata defined.</div>
                             )}
                         </div>
                     </div>

                     <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm space-y-3">
                         <p className="text-xs font-bold uppercase text-gray-500">Add New Tag</p>
                         <div className="grid grid-cols-2 gap-3">
                             <PaperInput 
                                placeholder="Key (e.g. Project)" 
                                value={key} 
                                onChange={e => setKey(e.target.value)}
                                className="!text-xs !py-2"
                             />
                             <PaperInput 
                                placeholder="Value (e.g. Alpha)" 
                                value={val} 
                                onChange={e => setVal(e.target.value)}
                                className="!text-xs !py-2"
                             />
                         </div>
                         <PaperButton size="sm" onClick={handleSubmit} className="w-full" icon={<Plus size={14}/>}>Add Tag</PaperButton>
                     </div>
                 </div>
                 
                 <div className="p-4 border-t-2 border-ink flex justify-end">
                     <PaperButton onClick={onClose}>Done</PaperButton>
                 </div>
             </div>
        </div>
    );
};

// --- Resource Manager Sub-Components ---

const TabSidebarItem: React.FC<{ 
    active: boolean; 
    icon: React.ReactNode; 
    label: string; 
    onClick: () => void 
}> = ({ active, icon, label, onClick }) => (
    <div 
        onClick={onClick}
        className={`relative group flex items-center justify-center p-4 cursor-pointer transition-all duration-200 border-l-4 ${active ? 'bg-white border-accent text-accent' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100 hover:text-ink'}`}
    >
        {icon}
        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-ink text-white text-[10px] font-bold uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
            {label}
            {/* Arrow */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-2 h-2 bg-ink transform rotate-45"></div>
        </div>
    </div>
);

const UploadTab: React.FC<{ 
    handleDrop: (e: React.DragEvent) => void; 
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: () => void;
    isDragging: boolean;
    activeVaultName: string;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ handleDrop, handleDragOver, handleDragLeave, isDragging, activeVaultName, onFileSelect }) => {
    const [viewMode, setViewMode] = useState<'drop' | 'browse'>('drop');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (viewMode === 'browse') {
        return (
            <div className="h-full flex flex-col animate-fade-in">
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-2">
                    <button onClick={() => setViewMode('drop')} className="text-gray-400 hover:text-ink flex items-center gap-1 text-xs font-bold uppercase transition-colors">
                        <ArrowLeft size={14}/> Back
                    </button>
                    <h4 className="text-sm font-bold text-ink">Select Source</h4>
                </div>
                
                <div className="flex-1 flex flex-col gap-3 justify-center">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        multiple 
                        onChange={(e) => {
                            onFileSelect(e);
                            setViewMode('drop');
                        }}
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-sm hover:border-ink hover:bg-gray-50 transition-all group text-left bg-white shadow-sm"
                    >
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-ink group-hover:text-white transition-colors border border-gray-200">
                            <HardDrive size={20}/>
                        </div>
                        <div>
                            <span className="font-bold text-sm text-ink block group-hover:text-accent transition-colors">Local File System</span>
                            <span className="text-[10px] text-gray-500">Upload documents from this device</span>
                        </div>
                    </button>

                    <button className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-sm hover:border-blue-500 hover:bg-blue-50 transition-all group text-left bg-white shadow-sm">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors border border-blue-100">
                            <Cloud size={20}/>
                        </div>
                        <div>
                            <span className="font-bold text-sm text-ink block group-hover:text-blue-700 transition-colors">Google Drive</span>
                            <span className="text-[10px] text-gray-500">Connect to cloud storage</span>
                        </div>
                    </button>

                    <button className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left bg-white shadow-sm">
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors border border-emerald-100">
                            <Database size={20}/>
                        </div>
                        <div>
                            <span className="font-bold text-sm text-ink block group-hover:text-emerald-700 transition-colors">Current Vault</span>
                            <span className="text-[10px] text-gray-500">{activeVaultName}</span>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <h4 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <Cloud size={20} className="text-accent"/> Upload Files
            </h4>
            <div className="mb-2 text-xs font-mono text-gray-400">Target: <span className="font-bold text-ink">{activeVaultName}</span></div>
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-sm p-6 text-center transition-all cursor-pointer flex flex-col justify-center items-center ${
                isDragging ? 'border-accent bg-accent-light/30' : 'border-gray-200 hover:border-ink hover:bg-gray-50'
                }`}
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors mb-4 ${isDragging ? 'bg-accent text-white' : 'bg-ink text-white'}`}>
                    <Upload size={20} />
                </div>
                <p className="text-sm font-bold text-ink">Drag & Drop</p>
                <p className="text-gray-400 text-xs mt-1 mb-4">PDF, MD, TXT</p>
                <input type="file" className="hidden" />
                <PaperButton 
                    variant={isDragging ? 'primary' : 'secondary'} 
                    size="sm"
                    onClick={() => setViewMode('browse')}
                >
                    Browse Files
                </PaperButton>
            </div>
        </div>
    );
};

const MetadataTab: React.FC<{
    selectedDoc: Document | undefined;
    metaKey: string;
    setMetaKey: (v: string) => void;
    metaValue: string;
    setMetaValue: (v: string) => void;
    handleAddMetadata: () => void;
    removeMetadata: (id: string, key: string) => void;
}> = ({ selectedDoc, metaKey, setMetaKey, metaValue, setMetaValue, handleAddMetadata, removeMetadata }) => (
    <div className="h-full flex flex-col animate-fade-in">
        <h4 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <Tag size={20} className="text-accent"/> Metadata Editor
        </h4>
        
        {selectedDoc ? (
            <div className="flex flex-col h-full gap-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-sm">
                    <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Selected Document</p>
                    <div className="flex items-center gap-2 font-bold text-ink text-sm truncate">
                        <FileText size={14}/> {selectedDoc.title}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 min-h-0 border border-gray-100 p-2 bg-gray-50/50">
                    {selectedDoc.metadata && Object.keys(selectedDoc.metadata).length > 0 ? (
                        Object.entries(selectedDoc.metadata).map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center bg-white px-3 py-2 text-xs border border-gray-200 shadow-sm group hover:border-accent transition-colors">
                                <span className="font-mono text-gray-600"><span className="font-bold text-ink">{k}:</span> {v}</span>
                                <button onClick={() => removeMetadata(selectedDoc.id, k)} className="text-gray-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-xs">
                            No tags. Add one below.
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <PaperInput placeholder="Key" value={metaKey} onChange={e => setMetaKey(e.target.value)} className="!py-2 !text-xs" />
                        <PaperInput placeholder="Value" value={metaValue} onChange={e => setMetaValue(e.target.value)} className="!py-2 !text-xs" />
                    </div>
                    <PaperButton onClick={handleAddMetadata} size="sm" className="w-full" icon={<Plus size={14}/>}>Add Tag</PaperButton>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-200 rounded-sm">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                    <Tag size={20}/>
                </div>
                <p className="text-sm font-bold text-gray-500">No Selection</p>
                <p className="text-xs text-gray-400 mt-1">Select a document from the Knowledge Base to edit tags.</p>
            </div>
        )}
    </div>
);

const StatsTab: React.FC<{
    documents: Document[],
    config: AppConfig,
    onReindexAll: () => void,
    onPurgeErrors: () => void
}> = ({ documents, config, onReindexAll, onPurgeErrors }) => {
    const totalChunks = documents.reduce((acc, doc) => acc + (doc.chunkCount || 0), 0);
    const indexedDocs = documents.filter(d => d.status === 'indexed').length;
    const activeVault = config.vaults.find(v => v.id === config.activeVaultId);

    const getVaultIcon = () => {
        if (!activeVault) return <HardDrive size={14} className="text-gray-400"/>;
        if (activeVault.type === 's3') return <Cloud size={14} className="text-orange-400"/>;
        if (activeVault.type === 'proton') return <Shield size={14} className="text-purple-400"/>;
        return <HardDrive size={14} className="text-gray-400"/>;
    };

    // Data for Pie Chart
    const typeData = useMemo(() => {
        const counts: Record<string, number> = { pdf: 0, md: 0, txt: 0 };
        documents.forEach(d => {
            if (counts[d.type] !== undefined) counts[d.type]++;
            else counts[d.type] = 1;
        });
        return [
            { label: 'PDF', value: counts.pdf, color: '#ef4444' }, // Red
            { label: 'MD', value: counts.md, color: '#10b981' },  // Emerald
            { label: 'TXT', value: counts.txt, color: '#3b82f6' } // Blue
        ].filter(d => d.value > 0);
    }, [documents]);
    
    return (
        <div className="h-full flex flex-col animate-fade-in">
            <h4 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <Activity size={20} className="text-accent"/> System Stats
            </h4>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {/* Active Vault Card */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                    <div className="flex items-center gap-2 mb-1">
                        {getVaultIcon()}
                        <span className="text-[10px] font-bold uppercase text-gray-500">Active Vault</span>
                    </div>
                    <div className="font-bold text-ink text-sm truncate">{activeVault?.name || 'None Selected'}</div>
                    <div className="text-[10px] font-mono text-gray-400 truncate">{activeVault?.path}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                     <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-sm text-center">
                        <p className="text-2xl font-bold text-emerald-700">{documents.length}</p>
                        <p className="text-[10px] font-bold uppercase text-emerald-400">Total Docs</p>
                     </div>
                     <div className="p-3 bg-blue-50 border border-blue-100 rounded-sm text-center">
                        <p className="text-2xl font-bold text-blue-700">{indexedDocs}</p>
                        <p className="text-[10px] font-bold uppercase text-blue-400">Indexed</p>
                     </div>
                </div>

                {/* Pie Chart Visualization */}
                <div className="p-4 bg-white border border-gray-200 rounded-sm">
                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-500 uppercase">
                        <PieChartIcon size={12}/> Content Distribution
                    </div>
                    <SimplePieChart data={typeData} />
                </div>

                {/* Storage Architecture Visualization */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-600 flex items-center gap-2">
                            <Layers size={14} className="text-indigo-500"/> ChromaDB (Vectors)
                        </span>
                        <span className="font-mono text-ink">Active</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-[28%]"></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs mt-2">
                        <span className="font-bold text-gray-600 flex items-center gap-2">
                            <Database size={14} className="text-blue-600"/> PostgreSQL (Metadata)
                        </span>
                        <span className="font-mono text-ink">Active</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 w-[45%]"></div>
                    </div>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
                     <div className="flex items-center gap-3">
                        <Database size={14} className="text-gray-400"/>
                        <span className="text-xs font-mono text-gray-500">Total Chunks: <span className="text-ink font-bold">{totalChunks}</span></span>
                     </div>
                     <div className="flex items-center gap-3">
                        <Layers size={14} className="text-gray-400"/>
                        <span className="text-xs font-mono text-gray-500">Total Vectors: <span className="text-ink font-bold">{totalChunks}</span></span>
                     </div>
                     <div className="flex items-center gap-3">
                        <Cpu size={14} className="text-gray-400"/>
                        <span className="text-xs font-mono text-gray-500">Est. Cost: <span className="text-ink font-bold">$0.04/mo</span></span>
                     </div>
                </div>

                {/* Maintenance Panel */}
                <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-sm space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="text-orange-600"/>
                        <h5 className="text-sm font-bold text-orange-900 uppercase tracking-wide">Document Store Maintenance</h5>
                    </div>
                    <p className="text-xs text-orange-700">
                        Use these tools to maintain document store integrity and performance.
                    </p>

                    <div className="space-y-2 pt-2">
                        <button
                            onClick={onReindexAll}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-orange-100 border-2 border-orange-300 text-orange-900 font-bold text-sm rounded-sm transition-colors"
                        >
                            <RefreshCw size={16}/>
                            Reindex All Documents
                        </button>
                        <button
                            onClick={onPurgeErrors}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-red-100 border-2 border-red-300 text-red-900 font-bold text-sm rounded-sm transition-colors"
                        >
                            <Trash2 size={16}/>
                            Purge Error Documents
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Main View ---

export const UploadView: React.FC<UploadViewProps> = ({ documents, setDocuments, config, onNavigateToSettings }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'meta' | 'stats'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  // Metadata Form State (Sidebar)
  const [metaKey, setMetaKey] = useState('');
  const [metaValue, setMetaValue] = useState('');

  // Metadata Modal State
  const [modalDocId, setModalDocId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Deletion Workflow State
  const [docToDelete, setDocToDelete] = useState<{id: string, title: string} | null>(null);

  const activeVault = config.vaults.find(v => v.id === config.activeVaultId);

  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const performMockUpload = async () => {
    const newId = Math.random().toString();
    const mockContent = "This is simulated content for the dropped file. It contains technical specifications about neural networks and transformer architecture latency optimization techniques.";
    
    const newDoc: Document = {
      id: newId,
      title: "New_Upload_" + Math.floor(Math.random() * 1000) + ".pdf",
      type: 'pdf',
      size: (Math.random() * 5).toFixed(1) + ' MB',
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'processing',
      chunkCount: 0,
      progress: 0,
      metadata: {},
      vaultId: config.activeVaultId // Assign to active vault
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    // Trigger Modal immediately on upload
    setModalDocId(newDoc.id);
    
    // Simulate Progress
    const progressInterval = setInterval(() => {
        setDocuments(prev => prev.map(d => {
            if (d.id === newId && d.status === 'processing' && (d.progress || 0) < 90) {
                return { ...d, progress: (d.progress || 0) + 10 };
            }
            return d;
        }));
    }, 200);

    // Start Ingestion Process
    try {
        const totalChunks = await ragSystem.ingest(newDoc, mockContent);
        
        clearInterval(progressInterval);

        if (isMounted.current) {
            // Explicit state change: Processing -> Indexed
            setDocuments(prev => prev.map(d => 
              d.id === newId 
                ? { ...d, status: 'indexed', chunkCount: totalChunks, progress: 100 } 
                : d
            ));
        }
    } catch (error) {
        clearInterval(progressInterval);
        console.error("Ingestion failed", error);
        if (isMounted.current) {
            setDocuments(prev => prev.map(d => 
              d.id === newId ? { ...d, status: 'error', progress: 0 } : d
            ));
        }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await performMockUpload();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          await performMockUpload();
      }
  };

  const updateDocumentMetadata = (docId: string, key: string, value: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          metadata: { ...doc.metadata, [key]: value }
        };
      }
      return doc;
    }));
  };

  const removeMetadata = (docId: string, key: string) => {
     setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        const newMeta = { ...doc.metadata };
        delete newMeta[key];
        return { ...doc, metadata: newMeta };
      }
      return doc;
    }));
  };

  const handleAddMetadata = () => {
    if (!selectedDocId || !metaKey.trim() || !metaValue.trim()) return;
    updateDocumentMetadata(selectedDocId, metaKey, metaValue);
    setMetaKey('');
    setMetaValue('');
  };

  // Maintenance Operations
  const handleReindexAll = () => {
    if (!window.confirm('Reindex all documents? This will reset processing status and re-run indexing for all documents.')) {
      return;
    }

    setDocuments(prev => prev.map(doc => ({
      ...doc,
      status: 'processing' as const,
      progress: 0,
      chunkCount: 0
    })));

    // Simulate reindexing with mock progress
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => ({
        ...doc,
        status: 'indexed' as const,
        progress: 100,
        chunkCount: Math.floor(Math.random() * 50) + 10
      })));
      alert('All documents reindexed successfully!');
    }, 2000);
  };

  const handlePurgeErrors = () => {
    const errorDocs = documents.filter(d => d.status === 'error');

    if (errorDocs.length === 0) {
      alert('No error documents to purge.');
      return;
    }

    if (!window.confirm(`Purge ${errorDocs.length} error document(s)? This action cannot be undone.`)) {
      return;
    }

    setDocuments(prev => prev.filter(doc => doc.status !== 'error'));
    alert(`Purged ${errorDocs.length} error document(s).`);
  };

  // Delete Workflow
  const initiateDelete = (doc: Document) => {
      setDocToDelete({ id: doc.id, title: doc.title });
  };

  const initiateBulkDelete = () => {
      if (selectedIds.size > 0) {
          setIsBulkDelete(true);
      }
  };

  const confirmDelete = () => {
      if (docToDelete) {
          // Single Delete
          setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
          if (selectedDocId === docToDelete.id) setSelectedDocId(null);
          // Also remove from multi-select
          setSelectedIds(prev => {
              const next = new Set(prev);
              next.delete(docToDelete.id);
              return next;
          });
      } else if (isBulkDelete) {
          // Bulk Delete
          setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
          if (selectedDocId && selectedIds.has(selectedDocId)) setSelectedDocId(null);
          setSelectedIds(new Set());
      }
      
      // Cleanup
      setDocToDelete(null);
      setIsBulkDelete(false);
  };

  // Multi-Select Logic
  const toggleSelection = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleSelectAll = (filtered: Document[]) => {
      const allSelected = filtered.every(d => selectedIds.has(d.id));
      if (allSelected) {
          // Deselect all visible
          setSelectedIds(prev => {
              const next = new Set(prev);
              filtered.forEach(d => next.delete(d.id));
              return next;
          });
      } else {
          // Select all visible
          setSelectedIds(prev => {
              const next = new Set(prev);
              filtered.forEach(d => next.add(d.id));
              return next;
          });
      }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  // Filter Logic
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || doc.type === filterType;
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
      const matchesVault = doc.vaultId ? doc.vaultId === config.activeVaultId : true; 
      
      return matchesSearch && matchesType && matchesStatus && matchesVault;
    });
  }, [documents, searchQuery, filterType, filterStatus, config.activeVaultId]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
  };

  const hasFilters = searchQuery || filterType !== 'all' || filterStatus !== 'all';
  const allFilteredSelected = filteredDocs.length > 0 && filteredDocs.every(d => selectedIds.has(d.id));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
          isOpen={!!docToDelete || isBulkDelete} 
          docTitle={docToDelete?.title || ''} 
          isBulk={isBulkDelete}
          count={selectedIds.size}
          onConfirm={confirmDelete} 
          onCancel={() => { setDocToDelete(null); setIsBulkDelete(false); }}
      />

      {/* Metadata Modal */}
      {modalDocId && documents.find(d => d.id === modalDocId) && (
        <MetadataModal 
            doc={documents.find(d => d.id === modalDocId)!} 
            onClose={() => setModalDocId(null)}
            onUpdate={updateDocumentMetadata}
            onRemove={removeMetadata}
        />
      )}

      {/* Hero Section */}
      <div className="relative h-64 w-full rounded-sm bg-black overflow-hidden shadow-hard group flex flex-col items-center justify-center gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-90"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] mask-image-gradient"></div>
        
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-full border-[4px] border-cyan-500/30 border-t-cyan-400 border-l-cyan-400 border-r-transparent shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-[spin_4s_linear_infinite]"></div>
            <div className="absolute inset-2 rounded-full border-[4px] border-emerald-500/30 border-b-emerald-400 border-r-emerald-400 border-l-transparent shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-[spin_3s_linear_infinite_reverse]"></div>
            <Cpu size={28} className="text-white relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
        </div>

        <div className="relative z-10 text-center">
             <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-sm leading-tight">
                Metacogna AI RAG
             </h1>
             <div className="flex items-center justify-center gap-3 mt-2">
                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-accent"></div>
                <span className="font-mono text-accent text-[10px] uppercase tracking-[0.3em]">Personal RAG System</span>
                <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-accent"></div>
             </div>
        </div>
      </div>

      {/* Main Content Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
        
        {/* Left Panel: Resource Manager (Combined) */}
        <div className="lg:col-span-4 h-full">
            <div className="bg-white border-2 border-ink shadow-hard rounded-none h-full flex flex-row overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-16 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-2 shrink-0">
                    <TabSidebarItem 
                        icon={<Cloud size={20}/>} 
                        label="Upload Files" 
                        active={activeTab === 'upload'} 
                        onClick={() => setActiveTab('upload')} 
                    />
                    <TabSidebarItem 
                        icon={<Tag size={20}/>} 
                        label="Metadata" 
                        active={activeTab === 'meta'} 
                        onClick={() => setActiveTab('meta')} 
                    />
                    <TabSidebarItem 
                        icon={<Activity size={20}/>} 
                        label="System Stats" 
                        active={activeTab === 'stats'} 
                        onClick={() => setActiveTab('stats')} 
                    />
                    {/* Add Vault Shortcut */}
                     <div 
                        onClick={onNavigateToSettings}
                        className="mt-auto relative group flex items-center justify-center p-4 cursor-pointer transition-all duration-200 hover:text-accent"
                    >
                        <Plus size={20}/>
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-ink text-white text-[10px] font-bold uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                            New Vault
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-2 h-2 bg-ink transform rotate-45"></div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-hidden relative">
                    {activeTab === 'upload' && (
                        <UploadTab 
                            handleDrop={handleDrop} 
                            handleDragOver={handleDragOver} 
                            handleDragLeave={handleDragLeave} 
                            isDragging={isDragging} 
                            activeVaultName={activeVault?.name || 'Local'}
                            onFileSelect={handleFileSelect}
                        />
                    )}
                    {activeTab === 'meta' && (
                        <MetadataTab 
                            selectedDoc={selectedDoc}
                            metaKey={metaKey} setMetaKey={setMetaKey}
                            metaValue={metaValue} setMetaValue={setMetaValue}
                            handleAddMetadata={handleAddMetadata}
                            removeMetadata={removeMetadata}
                        />
                    )}
                    {activeTab === 'stats' && (
                        <StatsTab
                            documents={documents}
                            config={config}
                            onReindexAll={handleReindexAll}
                            onPurgeErrors={handlePurgeErrors}
                        />
                    )}
                </div>
            </div>
        </div>

        {/* Right Panel: Document List */}
        <div className="lg:col-span-8 h-full flex flex-col">
          <PaperCard title={`Knowledge Base (${filteredDocs.length})`} className="h-full flex flex-col">
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-sm">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search by name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-sm focus:border-accent focus:outline-none bg-white text-ink text-xs"
                />
              </div>
              
              <div className="flex gap-2 items-center">
                {selectedIds.size > 0 && (
                    <PaperButton 
                        variant="danger" 
                        size="sm" 
                        onClick={initiateBulkDelete}
                        className="animate-fade-in"
                        icon={<Trash2 size={12}/>}
                    >
                        Delete Selected ({selectedIds.size})
                    </PaperButton>
                )}

                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-sm focus:border-accent focus:outline-none bg-white text-ink text-xs min-w-[100px]"
                >
                  <option value="all">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="md">MD</option>
                  <option value="txt">TXT</option>
                </select>

                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-sm focus:border-accent focus:outline-none bg-white text-ink text-xs min-w-[100px]"
                >
                  <option value="all">All Status</option>
                  <option value="indexed">Indexed</option>
                  <option value="processing">Processing</option>
                  <option value="error">Error</option>
                </select>

                {hasFilters && (
                  <button 
                    onClick={clearFilters}
                    className="px-2 py-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                    title="Clear Filters"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto border-t border-gray-100">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="py-3 pl-4 font-bold bg-white w-10 text-center">
                        <input 
                            type="checkbox" 
                            checked={allFilteredSelected}
                            onChange={() => toggleSelectAll(filteredDocs)}
                            className="cursor-pointer accent-ink"
                        />
                    </th>
                    <th className="py-3 pl-2 font-bold bg-white">Name</th>
                    <th className="py-3 font-bold bg-white">Type</th>
                    <th className="py-3 font-bold bg-white">Status</th>
                    <th className="py-3 font-bold bg-white">Metadata</th>
                    <th className="py-3 pr-4 text-right bg-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => (
                      <tr 
                        key={doc.id} 
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`border-b border-gray-50 transition-colors cursor-pointer text-xs ${selectedDocId === doc.id ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3 pl-4 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                                type="checkbox" 
                                checked={selectedIds.has(doc.id)}
                                onChange={() => toggleSelection(doc.id)}
                                className="cursor-pointer accent-ink"
                            />
                        </td>
                        <td className="py-3 pl-2 font-medium w-[40%]">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded border shrink-0 ${doc.type === 'pdf' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                              <FileText size={14} />
                            </div>
                            <div className="w-full max-w-[250px]">
                              <div className={`truncate ${selectedDocId === doc.id ? 'text-blue-700 font-bold' : 'text-ink'}`}>{doc.title}</div>
                              {doc.status === 'processing' && doc.progress !== undefined && (
                                <ProgressBar progress={doc.progress} />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-gray-500 uppercase">{doc.type}</td>
                        <td className="py-3">
                          {doc.status === 'processing' ? (
                             <PaperBadge color="blue"><RefreshCw size={10} className="mr-1 animate-spin"/> Processing</PaperBadge>
                          ) : doc.status === 'error' ? (
                             <PaperBadge color="red"><AlertTriangle size={10} className="mr-1"/> Error</PaperBadge>
                          ) : (
                             <PaperBadge color="green"><CheckCircle2 size={10} className="mr-1"/> Indexed</PaperBadge>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="relative group">
                            <div className="flex gap-1 flex-wrap">
                              {doc.metadata && Object.keys(doc.metadata).length > 0 ? (
                                Object.entries(doc.metadata).slice(0, 3).map(([k,v]) => (
                                   <span key={k} className="text-[10px] bg-white border border-gray-200 px-1 rounded text-gray-600 truncate max-w-[80px]">{k}:{v}</span>
                                ))
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                              {doc.metadata && Object.keys(doc.metadata).length > 3 && <span className="text-[10px] text-gray-400">...</span>}
                            </div>

                            {/* Hover Tooltip - Shows all metadata */}
                            {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                              <div className="absolute left-0 top-full mt-2 bg-ink text-paper text-xs font-mono p-3 rounded-sm shadow-hard-lg border-2 border-paper opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap min-w-[200px]">
                                <div className="font-bold text-accent mb-2 text-[10px] uppercase tracking-wider">Full Metadata</div>
                                <div className="space-y-1">
                                  {Object.entries(doc.metadata).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                      <span className="font-bold text-cyan-400">{k}:</span>
                                      <span className="text-paper">{v}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); initiateDelete(doc); }}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded"
                            title="Delete Document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 italic text-sm">
                        No documents found in this vault.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  );
};
