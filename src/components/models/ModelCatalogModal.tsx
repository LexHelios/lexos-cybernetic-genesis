import React, { useState } from 'react';
import { X, Download, Search, Filter, Cpu, Code, Eye, Database, Sparkles } from 'lucide-react';
import { modelCatalog, getModelsByCategory, searchModels } from '../../data/modelCatalog';
import { ModelCatalogEntry } from '../../data/modelCatalog';

interface ModelCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPullModel: (modelName: string, tag?: string) => void;
  installedModels: string[];
}

const categoryIcons = {
  language: Cpu,
  code: Code,
  vision: Eye,
  embedding: Database,
  specialized: Sparkles
};

const ModelCatalogModal: React.FC<ModelCatalogModalProps> = ({
  isOpen,
  onClose,
  onPullModel,
  installedModels
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<ModelCatalogEntry | null>(null);

  if (!isOpen) return null;

  const filteredModels = React.useMemo(() => {
    let models = modelCatalog;
    
    if (selectedCategory !== 'all') {
      models = getModelsByCategory(selectedCategory as any);
    }
    
    if (searchQuery) {
      models = searchModels(searchQuery).filter(m => 
        selectedCategory === 'all' || m.category === selectedCategory
      );
    }
    
    return models;
  }, [searchQuery, selectedCategory]);

  const isModelInstalled = (modelName: string) => {
    return installedModels.some(installed => 
      installed.startsWith(modelName + ':') || installed === modelName
    );
  };

  const handlePullModel = (model: ModelCatalogEntry, size?: string) => {
    const tag = size || model.defaultSize || 'latest';
    const fullName = size ? `${model.name}:${size}` : model.name;
    onPullModel(fullName, tag);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gray-900 rounded-xl border border-cyber-pink/30 overflow-hidden">
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-cyber-pink/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-orbitron font-bold text-cyber-pink">Model Catalog</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyber-pink focus:outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyber-pink focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="language">Language Models</option>
                <option value="code">Code Models</option>
                <option value="vision">Vision Models</option>
                <option value="embedding">Embedding Models</option>
                <option value="specialized">Specialized Models</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {selectedModel ? (
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setSelectedModel(null)}
                className="mb-4 text-sm text-gray-400 hover:text-cyber-pink transition-colors"
              >
                ← Back to catalog
              </button>
              
              <div className="bg-gray-800/50 rounded-xl p-6 border border-cyber-pink/20">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-cyber-pink/10 flex items-center justify-center">
                    {React.createElement(categoryIcons[selectedModel.category], {
                      className: "w-8 h-8 text-cyber-pink"
                    })}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-orbitron font-bold text-cyber-pink mb-2">
                      {selectedModel.displayName}
                    </h3>
                    <p className="text-gray-400">{selectedModel.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Available Sizes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedModel.sizes.map(size => (
                          <button
                            key={size}
                            onClick={() => handlePullModel(selectedModel, size)}
                            disabled={isModelInstalled(selectedModel.name)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isModelInstalled(selectedModel.name)
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-cyber-pink/20 text-cyber-pink hover:bg-cyber-pink/30'
                            }`}
                          >
                            <Download className="w-4 h-4 inline mr-2" />
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Requirements</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Minimum VRAM</span>
                          <span className="text-warning-orange">{selectedModel.requirements.minVRAM}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Recommended VRAM</span>
                          <span className="text-matrix-green">{selectedModel.requirements.recommendedVRAM}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedModel.capabilities.map(cap => (
                          <span
                            key={cap}
                            className="px-3 py-1 text-xs rounded-full bg-matrix-green/10 text-matrix-green border border-matrix-green/20"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Organization</span>
                          <span className="text-gray-300">{selectedModel.organization}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">License</span>
                          <span className="text-gray-300">{selectedModel.license}</span>
                        </div>
                        {selectedModel.releaseDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Release Date</span>
                            <span className="text-gray-300">{selectedModel.releaseDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePullModel(selectedModel)}
                    disabled={isModelInstalled(selectedModel.name)}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      isModelInstalled(selectedModel.name)
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-cyber-pink text-black hover:bg-cyber-pink/90'
                    }`}
                  >
                    <Download className="w-5 h-5" />
                    {isModelInstalled(selectedModel.name) ? 'Already Installed' : `Pull ${selectedModel.defaultSize || 'Latest'}`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map(model => (
                <div
                  key={model.name}
                  onClick={() => setSelectedModel(model)}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-cyber-pink/50 cursor-pointer transition-all duration-300"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-cyber-pink/10 flex items-center justify-center flex-shrink-0">
                      {React.createElement(categoryIcons[model.category], {
                        className: "w-5 h-5 text-cyber-pink"
                      })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-orbitron font-bold text-cyber-pink truncate">
                        {model.displayName}
                      </h3>
                      <p className="text-sm text-gray-400">{model.organization}</p>
                    </div>
                    {isModelInstalled(model.name) && (
                      <span className="px-2 py-1 text-xs rounded-full bg-matrix-green/20 text-matrix-green">
                        Installed
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                    {model.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {model.sizes.length} size{model.sizes.length > 1 ? 's' : ''} available
                    </span>
                    <span className="text-warning-orange">
                      {model.requirements.minVRAM} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelCatalogModal;