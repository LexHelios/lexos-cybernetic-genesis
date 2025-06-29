import React from 'react';
import { Download, X } from 'lucide-react';
import { PullProgress } from '../../services/ollama';

interface PullProgressModalProps {
  isOpen: boolean;
  modelName: string;
  progress: PullProgress | null;
  onClose: () => void;
}

const PullProgressModal: React.FC<PullProgressModalProps> = ({
  isOpen,
  modelName,
  progress,
  onClose
}) => {
  if (!isOpen) return null;

  const percentage = progress?.total && progress?.completed
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 rounded-xl border border-cyber-pink/30 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-lg bg-cyber-pink/10 flex items-center justify-center">
            <Download className="w-6 h-6 text-cyber-pink animate-bounce" />
          </div>
          <div>
            <h3 className="text-lg font-orbitron font-bold text-cyber-pink">
              Pulling Model
            </h3>
            <p className="text-sm text-gray-400">{modelName}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">
                {progress?.status || 'Initializing...'}
              </span>
              <span className="text-sm font-medium text-cyber-pink">
                {percentage}%
              </span>
            </div>
            
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyber-pink to-warning-orange transition-all duration-300 relative"
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
          
          {progress?.total && progress?.completed && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatBytes(progress.completed)}</span>
              <span>{formatBytes(progress.total)}</span>
            </div>
          )}
          
          {progress?.digest && (
            <div className="text-xs text-gray-500 font-mono truncate">
              Digest: {progress.digest}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PullProgressModal;