import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Cpu, FileText, Settings } from 'lucide-react';
import { ollamaService, ModelInfo } from '../../services/ollama';
import { toast } from 'sonner';

interface ModelInfoModalProps {
  isOpen: boolean;
  modelName: string;
  onClose: () => void;
}

const ModelInfoModal: React.FC<ModelInfoModalProps> = ({
  isOpen,
  modelName,
  onClose
}) => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'modelfile' | 'parameters'>('details');

  useEffect(() => {
    if (isOpen && modelName) {
      fetchModelInfo();
    }
  }, [isOpen, modelName]);

  const fetchModelInfo = async () => {
    try {
      setLoading(true);
      const info = await ollamaService.showModel(modelName);
      setModelInfo(info);
    } catch (error) {
      console.error('Failed to fetch model info:', error);
      toast.error('Failed to load model information');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-xl border border-cyber-pink/30 overflow-hidden flex flex-col">
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-cyber-pink/20 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-orbitron font-bold text-cyber-pink">
              Model Information
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-400 mt-1">{modelName}</p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-16 h-16 border-4 border-cyber-pink/30 border-t-cyber-pink rounded-full animate-spin" />
          </div>
        ) : modelInfo ? (
          <>
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'details'
                    ? 'text-cyber-pink border-b-2 border-cyber-pink'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Cpu className="w-4 h-4" />
                Details
              </button>
              <button
                onClick={() => setActiveTab('modelfile')}
                className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'modelfile'
                    ? 'text-cyber-pink border-b-2 border-cyber-pink'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Modelfile
              </button>
              <button
                onClick={() => setActiveTab('parameters')}
                className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'parameters'
                    ? 'text-cyber-pink border-b-2 border-cyber-pink'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                Parameters
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'details' && modelInfo.details && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Model Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Parent Model</span>
                          <span className="text-sm text-gray-300">{modelInfo.details.parent_model || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Format</span>
                          <span className="text-sm text-gray-300">{modelInfo.details.format || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Family</span>
                          <span className="text-sm text-gray-300">{modelInfo.details.family || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Parameter Size</span>
                          <span className="text-sm text-cyber-pink font-medium">
                            {modelInfo.details.parameter_size || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Quantization</span>
                          <span className="text-sm text-matrix-green font-medium">
                            {modelInfo.details.quantization_level || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Model Families</h3>
                      <div className="flex flex-wrap gap-2">
                        {modelInfo.details.families?.map((family, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 text-xs rounded-full bg-cyber-pink/10 text-cyber-pink border border-cyber-pink/20"
                          >
                            {family}
                          </span>
                        )) || <span className="text-sm text-gray-500">No families specified</span>}
                      </div>
                    </div>
                  </div>

                  {modelInfo.system && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <h3 className="text-sm font-medium text-gray-400 mb-3">System Prompt</h3>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                        {modelInfo.system}
                      </pre>
                    </div>
                  )}

                  {modelInfo.template && (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Template</h3>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                        {modelInfo.template}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'modelfile' && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-400">Modelfile</h3>
                    <button
                      onClick={() => copyToClipboard(modelInfo.modelfile)}
                      className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-matrix-green" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                    {modelInfo.modelfile}
                  </pre>
                </div>
              )}

              {activeTab === 'parameters' && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Parameters</h3>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                    {modelInfo.parameters || 'No parameters specified'}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-gray-400">No model information available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelInfoModal;