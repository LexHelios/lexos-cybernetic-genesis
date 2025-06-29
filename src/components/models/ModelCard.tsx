import React from 'react';
import { Download, Trash2, Play, Stop, Info, Cpu, HardDrive } from 'lucide-react';
import { OllamaModel } from '../../services/ollama';
import { ModelCatalogEntry } from '../../data/modelCatalog';
import { formatBytes } from '../../utils/formatters';

interface ModelCardProps {
  model: OllamaModel;
  catalogEntry?: ModelCatalogEntry;
  isRunning?: boolean;
  onDelete: (name: string) => void;
  onRun: (name: string) => void;
  onStop: (name: string) => void;
  onShowInfo: (name: string) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  catalogEntry,
  isRunning,
  onDelete,
  onRun,
  onStop,
  onShowInfo
}) => {
  const modelInfo = React.useMemo(() => {
    const parts = model.name.split(':');
    const baseName = parts[0];
    const tag = parts[1] || 'latest';
    
    // Extract size from tag
    const sizeMatch = tag.match(/(\d+)b/i);
    const size = sizeMatch ? sizeMatch[1] + 'B' : undefined;
    
    // Extract quantization
    const quantMatch = tag.match(/q\d+_\d+/i);
    const quantization = quantMatch ? quantMatch[0].toUpperCase() : 'FP16';
    
    return { baseName, tag, size, quantization };
  }, [model.name]);

  const displayName = catalogEntry?.displayName || modelInfo.baseName;
  const description = catalogEntry?.description || `${modelInfo.baseName} model with ${modelInfo.tag} configuration`;

  return (
    <div className="holographic-panel p-6 rounded-lg border border-cyber-pink/30 bg-cyber-pink/5 hover:border-cyber-pink/50 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-orbitron font-bold text-cyber-pink mb-1">
            {displayName}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{model.name}</p>
          <p className="text-sm text-gray-400 line-clamp-2">{description}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ml-4 ${isRunning ? 'bg-matrix-green neural-pulse' : 'bg-gray-600'}`} />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Size</span>
          <span className="text-cyber-pink font-medium">{formatBytes(model.size)}</span>
        </div>
        
        {modelInfo.size && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Parameters</span>
            <span className="text-warning-orange">{modelInfo.size}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Quantization</span>
          <span className="text-matrix-green">{modelInfo.quantization}</span>
        </div>

        {catalogEntry && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">VRAM Required</span>
            <span className="text-warning-orange">{catalogEntry.requirements.minVRAM}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Modified</span>
          <span className="text-gray-500">
            {new Date(model.modified_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {catalogEntry?.tags && catalogEntry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {catalogEntry.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-full bg-cyber-pink/10 text-cyber-pink border border-cyber-pink/20"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {isRunning ? (
          <button
            onClick={() => onStop(model.name)}
            className="flex-1 px-3 py-2 rounded-lg bg-warning-orange/20 text-warning-orange hover:bg-warning-orange/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Stop className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => onRun(model.name)}
            className="flex-1 px-3 py-2 rounded-lg bg-matrix-green/20 text-matrix-green hover:bg-matrix-green/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
        )}
        
        <button
          onClick={() => onShowInfo(model.name)}
          className="p-2 rounded-lg bg-cyber-pink/10 text-cyber-pink hover:bg-cyber-pink/20 transition-colors"
          title="Model Info"
        >
          <Info className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onDelete(model.name)}
          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          title="Delete Model"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ModelCard;