
import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Database, Activity, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import ModelCard from '../components/models/ModelCard';
import ModelCatalogModal from '../components/models/ModelCatalogModal';
import PullProgressModal from '../components/models/PullProgressModal';
import ModelInfoModal from '../components/models/ModelInfoModal';
import { ollamaService, OllamaModel, PullProgress, ModelStatus } from '../services/ollama';
import { getModelByName } from '../data/modelCatalog';
import { formatBytes, formatNumber } from '../utils/formatters';
import { toast } from 'sonner';

const ModelArsenal = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [runningModels, setRunningModels] = useState<ModelStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [ollamaHealthy, setOllamaHealthy] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showPullProgress, setShowPullProgress] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [pullingModel, setPullingModel] = useState<string>('');

  useEffect(() => {
    checkOllamaHealth();
    fetchModels();
    fetchRunningModels();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchModels();
      fetchRunningModels();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkOllamaHealth = async () => {
    try {
      const healthy = await ollamaService.checkHealth();
      setOllamaHealthy(healthy);
      if (!healthy) {
        toast.error('Ollama service is not running. Please start Ollama to manage models.');
      }
    } catch (error) {
      setOllamaHealthy(false);
    }
  };

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await ollamaService.listModels();
      setModels(response.models || []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      toast.error('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const fetchRunningModels = async () => {
    try {
      const running = await ollamaService.getRunningModels();
      setRunningModels(running);
    } catch (error) {
      console.error('Failed to fetch running models:', error);
    }
  };

  const handlePullModel = async (modelName: string, tag?: string) => {
    try {
      setShowCatalog(false);
      setShowPullProgress(true);
      setPullingModel(modelName);
      setPullProgress(null);
      
      await ollamaService.pullModel(modelName, (progress) => {
        setPullProgress(progress);
      });
      
      toast.success(`Successfully pulled ${modelName}`);
      fetchModels();
    } catch (error) {
      console.error('Failed to pull model:', error);
      toast.error(`Failed to pull ${modelName}: ${error}`);
    } finally {
      setShowPullProgress(false);
      setPullingModel('');
      setPullProgress(null);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) return;
    
    try {
      await ollamaService.deleteModel(modelName);
      toast.success(`Successfully deleted ${modelName}`);
      fetchModels();
    } catch (error) {
      console.error('Failed to delete model:', error);
      toast.error(`Failed to delete ${modelName}`);
    }
  };

  const handleRunModel = async (modelName: string) => {
    try {
      // Generate a test prompt to load the model
      await ollamaService.generate({
        model: modelName,
        prompt: 'Hello',
        stream: false
      });
      toast.success(`Model ${modelName} is now running`);
      fetchRunningModels();
    } catch (error) {
      console.error('Failed to run model:', error);
      toast.error(`Failed to run ${modelName}`);
    }
  };

  const handleStopModel = async (modelName: string) => {
    // Note: Ollama doesn't have a direct stop API, models are unloaded automatically
    toast.info('Model will be unloaded automatically when idle');
    setTimeout(fetchRunningModels, 2000);
  };

  const handleShowModelInfo = (modelName: string) => {
    setSelectedModel(modelName);
    setShowModelInfo(true);
  };

  const isModelRunning = (modelName: string) => {
    return runningModels.some(m => m.name === modelName);
  };

  // Calculate metrics
  const totalModels = models.length;
  const activeModels = runningModels.length;
  const totalSize = models.reduce((sum, model) => sum + model.size, 0);
  const totalVRAMUsed = runningModels.reduce((sum, model) => sum + (model.size_vram || 0), 0);

  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-cyber-pink/10 to-warning-orange/10"
        style={{
          backgroundImage: `url('/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center border border-cyber-pink/50 bg-cyber-pink/10 overflow-hidden"
                style={{
                  backgroundImage: `url('/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <Cpu className="w-6 h-6 text-cyber-pink opacity-80" />
              </div>
              <div>
                <h1 className="text-3xl font-orbitron font-bold text-cyber-pink">
                  Model Arsenal
                </h1>
                <p className="text-muted-foreground">
                  Ollama model management and deployment
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!ollamaHealthy && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning-orange/20 text-warning-orange">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Ollama Offline</span>
                </div>
              )}
              <button
                onClick={fetchModels}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCatalog(true)}
                className="px-4 py-2 rounded-lg bg-cyber-pink text-black hover:bg-cyber-pink/90 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                Pull Model
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Models"
            value={totalModels.toString()}
            subtitle="Installed"
            color="cyber"
            trend="stable"
            animate={true}
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="Active Models"
            value={activeModels.toString()}
            subtitle="Running"
            color="matrix"
            trend={activeModels > 0 ? "up" : "stable"}
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Total Size"
            value={formatBytes(totalSize)}
            subtitle="Storage used"
            color="warning"
            trend="stable"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="VRAM Usage"
            value={formatBytes(totalVRAMUsed)}
            subtitle="GPU memory"
            color="matrix"
            trend={totalVRAMUsed > 0 ? "up" : "stable"}
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-cyber-pink/30 border-t-cyber-pink rounded-full animate-spin" />
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-16">
            <Cpu className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-orbitron text-gray-400 mb-2">No Models Installed</h3>
            <p className="text-gray-500 mb-6">Pull your first model from the catalog to get started</p>
            <button
              onClick={() => setShowCatalog(true)}
              className="px-6 py-3 rounded-lg bg-cyber-pink text-black hover:bg-cyber-pink/90 transition-colors font-medium"
            >
              Browse Model Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => {
              const catalogEntry = getModelByName(model.name.split(':')[0]);
              return (
                <ModelCard
                  key={model.digest}
                  model={model}
                  catalogEntry={catalogEntry}
                  isRunning={isModelRunning(model.name)}
                  onDelete={handleDeleteModel}
                  onRun={handleRunModel}
                  onStop={handleStopModel}
                  onShowInfo={handleShowModelInfo}
                />
              );
            })}
          </div>
        )}
      </div>

      <ModelCatalogModal
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        onPullModel={handlePullModel}
        installedModels={models.map(m => m.name)}
      />

      <PullProgressModal
        isOpen={showPullProgress}
        modelName={pullingModel}
        progress={pullProgress}
        onClose={() => setShowPullProgress(false)}
      />

      <ModelInfoModal
        isOpen={showModelInfo}
        modelName={selectedModel}
        onClose={() => {
          setShowModelInfo(false);
          setSelectedModel('');
        }}
      />
    </div>
  );
};

export default ModelArsenal;
