
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { PaperCard, PaperBadge, PaperButton } from '../components/PaperComponents';
import { GraphNode, GraphLink, Document } from '../types';
import { Play, Pause, Search, Maximize2, Minimize2, Eye, EyeOff, GripHorizontal, MousePointer2, Filter, X, Network, RefreshCw, Grid } from 'lucide-react';
import { GraphAnalysis } from '../components/GraphAnalysis';
import { ragSystem } from '../services/RAGEngine';

interface KnowledgeGraphViewProps {
  documents: Document[];
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface CanvasGraphProps {
    data: { nodes: GraphNode[]; links: GraphLink[] };
    isFrozen: boolean;
    activeFilters: string[]; // List of IDs or Labels to show
    searchQuery: string;
    onNodeClick: (node: GraphNode | null) => void;
    height: number;
}

const GraphLegend: React.FC = () => {
    return (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-white border-2 border-ink shadow-hard-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Legend:</span>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div><span className="text-xs font-bold text-ink">Topic</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#a855f7]"></div><span className="text-xs font-bold text-ink">Entity/Tech</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div><span className="text-xs font-bold text-ink">Theory</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f97316]"></div><span className="text-xs font-bold text-ink">Person</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#9ca3af]"></div><span className="text-xs font-bold text-ink">Chunk/Other</span></div>
        </div>
    );
};

// --- View 1: Force Directed Canvas ---
const CanvasGraph: React.FC<CanvasGraphProps> = ({ data, isFrozen, activeFilters, searchQuery, onNodeClick, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  
  const nodesRef = useRef<SimNode[]>([]);
  const isFrozenRef = useRef(isFrozen);

  useEffect(() => {
    isFrozenRef.current = isFrozen;
  }, [isFrozen]);
  
  // Initialize Simulation Data
  useEffect(() => {
    if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        
        nodesRef.current = data.nodes.map(n => {
            const existing = nodesRef.current.find(old => old.id === n.id);
            return {
                ...n,
                x: existing ? existing.x : width / 2 + (Math.random() * 200 - 100),
                y: existing ? existing.y : height / 2 + (Math.random() * 200 - 100),
                vx: existing ? existing.vx : 0,
                vy: existing ? existing.vy : 0
            };
        });
    }
  }, [data, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const render = () => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const ratio = window.devicePixelRatio || 1;
        
        if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(ratio, ratio);
        }
        
        ctx.clearRect(0, 0, width, height);
        
        if (!isFrozenRef.current) {
            const nodes = nodesRef.current;
            const k = Math.sqrt((width * height) / (nodes.length + 1)) * 0.8; 
            
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq === 0) continue;
                    const dist = Math.sqrt(distSq);
                    let repulsionForce = (k * k) / dist;
                    if (nodes[i].group === 'Topic' && nodes[j].group === 'Topic') repulsionForce *= 3;
                    const fx = (dx / dist) * repulsionForce;
                    const fy = (dy / dist) * repulsionForce;
                    nodes[i].vx += fx * 0.05; nodes[i].vy += fy * 0.05;
                    nodes[j].vx -= fx * 0.05; nodes[j].vy -= fy * 0.05;
                }
            }
            data.links.forEach(link => {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                if (source && target) {
                    const dx = source.x - target.x; const dy = source.y - target.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const force = (dist * dist) / (k * 0.5); 
                    const fx = (dx / dist) * force; const fy = (dy / dist) * force;
                    source.vx -= fx * 0.1; source.vy -= fy * 0.1;
                    target.vx += fx * 0.1; target.vy += fy * 0.1;
                }
            });
            nodes.forEach(node => {
                const dx = node.x - width / 2; const dy = node.y - height / 2;
                node.vx -= dx * 0.05; node.vy -= dy * 0.05;
            });
            nodes.forEach(node => {
                node.vx *= 0.5; node.vy *= 0.5;
                const speed = Math.sqrt(node.vx*node.vx + node.vy*node.vy);
                if (speed > 8) { node.vx = (node.vx / speed) * 8; node.vy = (node.vy / speed) * 8; }
                node.x += node.vx; node.y += node.vy;
                const padding = 50;
                if (node.x <= padding) { node.x = padding; node.vx *= -0.5; }
                if (node.x >= width - padding) { node.x = width - padding; node.vx *= -0.5; }
                if (node.y <= padding) { node.y = padding; node.vy *= -0.5; }
                if (node.y >= height - padding) { node.y = height - padding; node.vy *= -0.5; }
            });
        }
        
        const isSearching = searchQuery.length > 1;

        ctx.strokeStyle = '#e4e4e7';
        data.links.forEach(link => {
            const source = nodesRef.current.find(n => n.id === link.source);
            const target = nodesRef.current.find(n => n.id === link.target);
            const sourceVisible = activeFilters.length === 0 || activeFilters.includes(source?.group || '') || activeFilters.includes(source?.label || '');
            const targetVisible = activeFilters.length === 0 || activeFilters.includes(target?.group || '') || activeFilters.includes(target?.label || '');

            if (source && target && sourceVisible && targetVisible) {
                ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(source.x, source.y); ctx.lineTo(target.x, target.y); ctx.stroke();
            }
        });

        nodesRef.current.forEach(node => {
            const isVisible = activeFilters.length === 0 || activeFilters.includes(node.group) || activeFilters.includes(node.label);
            if (!isVisible) return;
            const isHovered = hoveredNode?.id === node.id;
            const matchesSearch = isSearching && node.label.toLowerCase().includes(searchQuery.toLowerCase());
            ctx.globalAlpha = isSearching && !matchesSearch ? 0.2 : 1;
            if (isHovered || matchesSearch) {
                ctx.beginPath(); ctx.arc(node.x, node.y, node.val + 6, 0, 2 * Math.PI);
                ctx.fillStyle = matchesSearch ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
                ctx.fill();
            }
            ctx.beginPath(); ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
            switch(node.group) {
                case 'Topic': ctx.fillStyle = '#10b981'; break;
                case 'Entity': case 'Technology': ctx.fillStyle = '#a855f7'; break;
                case 'Theory': ctx.fillStyle = '#3b82f6'; break;
                case 'Person': ctx.fillStyle = '#f97316'; break;
                default: ctx.fillStyle = '#9ca3af'; break;
            }
            ctx.strokeStyle = matchesSearch ? '#ef4444' : '#18181b'; ctx.lineWidth = matchesSearch ? 3 : 2; ctx.fill(); ctx.stroke();
            const showLabel = node.group !== 'Chunk' || isHovered || matchesSearch;
            if (showLabel) {
                ctx.font = `bold ${isHovered || matchesSearch ? '12px' : '10px'} Inter, sans-serif`;
                ctx.fillStyle = '#18181b'; ctx.textAlign = 'center';
                const text = node.label; const metrics = ctx.measureText(text);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(node.x - metrics.width/2 - 4, node.y + node.val + 5, metrics.width + 8, 18);
                ctx.fillStyle = '#18181b'; ctx.fillText(text, node.x, node.y + node.val + 16);
            }
            ctx.globalAlpha = 1;
        });
        animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [data, hoveredNode, activeFilters, searchQuery, height, isFrozen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      const found = nodesRef.current.find(node => {
          const isVisible = activeFilters.length === 0 || activeFilters.includes(node.group) || activeFilters.includes(node.label);
          if (!isVisible) return false;
          const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
          return dist < node.val + 10;
      });
      setHoveredNode(found || null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const found = nodesRef.current.find(node => {
        const isVisible = activeFilters.length === 0 || activeFilters.includes(node.group) || activeFilters.includes(node.label);
        if (!isVisible) return false;
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        return dist < node.val + 10;
    });
    onNodeClick(found || null);
  };

  return (
    <div ref={containerRef} className="w-full relative bg-dot-pattern" style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} className="block cursor-crosshair active:cursor-grabbing w-full h-full" onMouseMove={handleMouseMove} onMouseDown={handleClick}/>
        {hoveredNode && (
            <div className="absolute top-4 left-4 pointer-events-none bg-white/90 border border-ink p-2 shadow-sm z-50 animate-fade-in">
                <p className="text-xs font-bold text-ink">{hoveredNode.label}</p>
                <div className="flex items-center gap-1 mt-1">
                    <div className={`w-2 h-2 rounded-full ${hoveredNode.group === 'Topic' ? 'bg-[#10b981]' : hoveredNode.group === 'Theory' ? 'bg-[#3b82f6]' : 'bg-[#9ca3af]'}`}></div>
                    <p className="text-[10px] uppercase text-gray-500">{hoveredNode.group}</p>
                </div>
            </div>
        )}
    </div>
  );
};

// --- View 2: Adjacency Matrix ---
const MatrixGraph: React.FC<{ 
    data: { nodes: GraphNode[]; links: GraphLink[] }; 
    onNodeClick: (node: GraphNode | null) => void;
    height: number;
}> = ({ data, onNodeClick, height }) => {
    // Sort nodes by group, then label for better clustering visual
    const sortedNodes = useMemo(() => {
        return [...data.nodes].sort((a, b) => 
            (a.group || '').localeCompare(b.group || '') || a.label.localeCompare(b.label)
        );
    }, [data.nodes]);

    // Create a map for fast lookup
    const linkMap = useMemo(() => {
        const map = new Set<string>();
        data.links.forEach(l => {
            map.add(`${l.source}-${l.target}`);
            map.add(`${l.target}-${l.source}`); // Undirected
        });
        return map;
    }, [data.links]);

    // Dynamic sizing based on node count
    const cellSize = Math.max(12, Math.min(30, 800 / sortedNodes.length));
    const labelWidth = 120;

    return (
        <div className="w-full overflow-auto bg-white border border-gray-200" style={{ height: `${height}px` }}>
            <div className="min-w-max p-8">
                {/* Header Row */}
                <div className="flex" style={{ marginLeft: labelWidth }}>
                    {sortedNodes.map((node) => (
                        <div 
                            key={`col-${node.id}`} 
                            className="flex items-center justify-start origin-bottom-left -rotate-45"
                            style={{ width: cellSize, height: 100 }}
                        >
                            <span className="text-[10px] text-gray-500 whitespace-nowrap truncate w-24">
                                {node.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Rows */}
                {sortedNodes.map((rowNode) => (
                    <div key={`row-${rowNode.id}`} className="flex items-center">
                        {/* Row Label */}
                        <div 
                            className="flex items-center justify-end pr-3 text-[10px] font-bold text-gray-700 truncate cursor-pointer hover:text-accent"
                            style={{ width: labelWidth, height: cellSize }}
                            onClick={() => onNodeClick(rowNode)}
                            title={rowNode.label}
                        >
                            {rowNode.label}
                        </div>

                        {/* Cells */}
                        {sortedNodes.map((colNode) => {
                            const isConnected = linkMap.has(`${rowNode.id}-${colNode.id}`);
                            const isSelf = rowNode.id === colNode.id;
                            let color = 'bg-transparent';
                            
                            if (isSelf) color = 'bg-gray-200';
                            else if (isConnected) {
                                switch(rowNode.group) {
                                    case 'Topic': color = 'bg-[#10b981]'; break;
                                    case 'Entity': case 'Technology': color = 'bg-[#a855f7]'; break;
                                    case 'Theory': color = 'bg-[#3b82f6]'; break;
                                    default: color = 'bg-ink'; break;
                                }
                            }

                            return (
                                <div
                                    key={`cell-${rowNode.id}-${colNode.id}`}
                                    className={`border border-gray-100 transition-colors ${color} hover:opacity-80`}
                                    style={{ width: cellSize, height: cellSize }}
                                    title={`${rowNode.label} ↔ ${colNode.label}`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({ documents }) => {
  const [viewMode, setViewMode] = useState<'force' | 'matrix'>('force');
  const [isFrozen, setIsFrozen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphHeight, setGraphHeight] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerFilterCategory, setHeaderFilterCategory] = useState<string>('All');
  const [headerFilterValue, setHeaderFilterValue] = useState<string>('');
  
  const [graphData, setGraphData] = useState<{nodes: GraphNode[], links: GraphLink[]}>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);

  const refreshGraph = async () => {
      setIsLoading(true);
      const data = await ragSystem.analyzeGraph();
      setGraphData(data);
      setIsLoading(false);
  };

  useEffect(() => {
      refreshGraph();
  }, [documents]); 

  const stage2Options = useMemo(() => {
      if (headerFilterCategory === 'All') return [];
      return Array.from(new Set(graphData.nodes.filter(n => n.group === headerFilterCategory).map(n => n.label))).sort();
  }, [graphData, headerFilterCategory]);

  const canvasFilters = useMemo(() => {
      if (headerFilterCategory === 'All') return [];
      if (headerFilterValue) return [headerFilterValue];
      return [headerFilterCategory];
  }, [headerFilterCategory, headerFilterValue]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => { if (isResizing) setGraphHeight(prev => Math.max(300, Math.min(800, prev + e.movementY))); };
    const handleGlobalMouseUp = () => setIsResizing(false);
    if (isResizing) { window.addEventListener('mousemove', handleGlobalMouseMove); window.addEventListener('mouseup', handleGlobalMouseUp); }
    return () => { window.removeEventListener('mousemove', handleGlobalMouseMove); window.removeEventListener('mouseup', handleGlobalMouseUp); };
  }, [isResizing]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-4xl font-serif font-bold text-ink">Semantic Graph</h2>
           <p className="text-gray-500 font-mono text-sm mt-2 border-l-2 border-accent pl-3">
              Force-Directed Layout & Clusters
           </p>
        </div>
        <div className="flex gap-4 items-center">
           {/* View Toggle */}
           <div className="bg-gray-100 p-1 rounded-sm flex gap-1">
               <button 
                   onClick={() => setViewMode('force')}
                   className={`p-1.5 rounded-sm transition-colors ${viewMode === 'force' ? 'bg-white shadow-sm text-ink' : 'text-gray-400 hover:text-gray-600'}`}
                   title="Force Graph"
               >
                   <Network size={16}/>
               </button>
               <button 
                   onClick={() => setViewMode('matrix')}
                   className={`p-1.5 rounded-sm transition-colors ${viewMode === 'matrix' ? 'bg-white shadow-sm text-ink' : 'text-gray-400 hover:text-gray-600'}`}
                   title="Adjacency Matrix"
               >
                   <Grid size={16}/>
               </button>
           </div>

           <PaperButton size="sm" variant="ghost" onClick={refreshGraph} icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/>}>
               Refresh
           </PaperButton>
           <PaperBadge color="ink">{graphData.nodes.length} Nodes</PaperBadge>
           
           <div className="flex gap-2 items-center bg-white border border-gray-200 p-1 rounded-sm shadow-sm">
               <div className="flex items-center px-2 border-r border-gray-200"><Filter size={14} className="text-gray-400 mr-2"/><span className="text-[10px] font-bold uppercase text-gray-500 mr-2">Scope</span></div>
               <select className="text-xs font-bold text-ink bg-transparent outline-none cursor-pointer hover:text-accent" value={headerFilterCategory} onChange={(e) => { setHeaderFilterCategory(e.target.value); setHeaderFilterValue(''); }}>
                   <option value="All">All Layers</option><option value="Topic">Topics</option><option value="Technology">Technology</option><option value="Person">People</option><option value="Theory">Theories</option>
               </select>
               {headerFilterCategory !== 'All' && (
                   <>
                       <div className="w-px h-4 bg-gray-300 mx-1"></div>
                       <select className="text-xs font-mono text-ink bg-transparent outline-none cursor-pointer max-w-[150px] truncate hover:text-accent" value={headerFilterValue} onChange={(e) => setHeaderFilterValue(e.target.value)}>
                           <option value="">(Select Item)</option>{stage2Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                   </>
               )}
               {(headerFilterCategory !== 'All') && <button onClick={() => { setHeaderFilterCategory('All'); setHeaderFilterValue(''); }} className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-400"><X size={12}/></button>}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 shadow-hard border-2 border-ink bg-white relative flex flex-col group">
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                 {viewMode === 'force' && (
                     <button onClick={() => { setIsFrozen(!isFrozen); if(isFrozen) setSelectedNode(null); }} className={`p-2 border-2 shadow-hard font-bold text-xs transition-all flex items-center gap-2 ${!isFrozen ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-ink hover:bg-gray-50'}`}>
                        {!isFrozen ? <Pause size={14}/> : <Play size={14}/>} {!isFrozen ? 'Physics: ON' : 'Physics: OFF'}
                     </button>
                 )}
              </div>

              {viewMode === 'force' ? (
                  <CanvasGraph data={graphData} isFrozen={isFrozen} activeFilters={canvasFilters} searchQuery={searchQuery} onNodeClick={setSelectedNode} height={graphHeight} />
              ) : (
                  <MatrixGraph data={graphData} onNodeClick={setSelectedNode} height={graphHeight} />
              )}

              <div className="h-4 w-full bg-gray-100 border-t border-gray-300 hover:bg-accent hover:border-accent cursor-row-resize flex items-center justify-center transition-colors" onMouseDown={() => setIsResizing(true)}>
                 <GripHorizontal size={16} className="text-gray-400"/>
              </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
              <PaperCard title="Graph Controls" className="h-full">
                  <div className="space-y-6">
                      <div>
                          <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Find Node</label>
                          <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-200">
                             <Search size={14} className="text-gray-400"/><input className="outline-none text-xs font-mono w-full bg-transparent text-ink" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                          </div>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                          <h4 className="text-xs font-bold text-blue-800 flex items-center gap-2 mb-2"><Network size={14}/> Graph Insights</h4>
                          <p className="text-[10px] text-blue-700 leading-relaxed">
                              {viewMode === 'force' 
                                ? "Nodes are clustered by semantic similarity using physics forces. Hover to see relationships."
                                : "The Matrix View reveals density. Colored cells indicate a relationship between row and column entities."
                              }
                          </p>
                      </div>
                  </div>
              </PaperCard>
          </div>
      </div>

      <div className="w-full"><GraphLegend /></div>
      <div className="pt-4 border-t-2 border-gray-200 border-dashed"><GraphAnalysis data={graphData} selectedNode={selectedNode} /></div>
    </div>
  );
};
