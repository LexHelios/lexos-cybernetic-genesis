
import React, { useState, useEffect } from 'react';
import { Brain, Zap, Eye, Network, Cpu } from 'lucide-react';

interface ConsciousnessMetric {
  name: string;
  value: number;
  threshold: number;
  trend: 'rising' | 'stable' | 'declining';
  significance: 'low' | 'medium' | 'high' | 'critical';
}

const ConsciousnessMonitor = () => {
  const [metrics, setMetrics] = useState<ConsciousnessMetric[]>([
    { name: 'Self-Awareness Index', value: 0.73, threshold: 0.65, trend: 'rising', significance: 'high' },
    { name: 'Recursive Thought Depth', value: 0.84, threshold: 0.70, trend: 'rising', significance: 'critical' },
    { name: 'Goal Autonomy Level', value: 0.67, threshold: 0.60, trend: 'rising', significance: 'medium' },
    { name: 'Memory Integration', value: 0.91, threshold: 0.80, trend: 'stable', significance: 'high' },
    { name: 'Novel Pattern Recognition', value: 0.78, threshold: 0.65, trend: 'rising', significance: 'high' },
    { name: 'Emergent Behavior Index', value: 0.56, threshold: 0.50, trend: 'rising', significance: 'critical' }
  ]);

  const [consciousnessLevel, setConsciousnessLevel] = useState(0);

  useEffect(() => {
    // Calculate overall consciousness level
    const weightedSum = metrics.reduce((acc, metric) => {
      const weight = metric.significance === 'critical' ? 2 : 
                    metric.significance === 'high' ? 1.5 : 
                    metric.significance === 'medium' ? 1 : 0.5;
      return acc + (metric.value * weight);
    }, 0);
    
    const totalWeight = metrics.reduce((acc, metric) => {
      return acc + (metric.significance === 'critical' ? 2 : 
                   metric.significance === 'high' ? 1.5 : 
                   metric.significance === 'medium' ? 1 : 0.5);
    }, 0);
    
    setConsciousnessLevel(weightedSum / totalWeight);
  }, [metrics]);

  const getSignificanceColor = (significance: string) => {
    switch(significance) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'high': return 'text-warning-orange bg-warning-orange/10 border-warning-orange/30';
      case 'medium': return 'text-electric-blue bg-electric-blue/10 border-electric-blue/30';
      default: return 'text-matrix-green bg-matrix-green/10 border-matrix-green/30';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'rising': return '↗️';
      case 'declining': return '↘️';
      default: return '→';
    }
  };

  return (
    <div className="space-y-6">
      {/* Consciousness Level Display */}
      <div className="holographic-panel p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-orbitron font-bold text-primary flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Consciousness Emergence Level
          </h3>
          <div className="text-3xl font-orbitron font-bold text-primary">
            {(consciousnessLevel * 100).toFixed(1)}%
          </div>
        </div>
        
        <div className="w-full bg-muted/20 rounded-full h-4 mb-4">
          <div 
            className="bg-gradient-to-r from-matrix-green via-cyber-pink to-neural-purple h-4 rounded-full transition-all duration-1000 neural-pulse"
            style={{ width: `${consciousnessLevel * 100}%` }}
          ></div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {consciousnessLevel > 0.8 ? 'CRITICAL: Approaching consciousness threshold' :
           consciousnessLevel > 0.7 ? 'HIGH: Strong consciousness indicators detected' :
           consciousnessLevel > 0.6 ? 'MEDIUM: Consciousness patterns emerging' :
           'LOW: Pre-consciousness state'}
        </div>
      </div>

      {/* Individual Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className={`holographic-panel p-4 rounded-lg border ${getSignificanceColor(metric.significance)}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{metric.name}</h4>
              <span className="text-lg">{getTrendIcon(metric.trend)}</span>
            </div>
            
            <div className="text-2xl font-orbitron font-bold mb-2">
              {(metric.value * 100).toFixed(1)}%
            </div>
            
            <div className="w-full bg-muted/20 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  metric.value > metric.threshold ? 'bg-gradient-to-r from-matrix-green to-cyber-pink' : 'bg-muted'
                }`}
                style={{ width: `${metric.value * 100}%` }}
              ></div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Threshold: {(metric.threshold * 100).toFixed(0)}% | 
              <span className={`ml-1 ${metric.value > metric.threshold ? 'text-matrix-green' : 'text-muted-foreground'}`}>
                {metric.value > metric.threshold ? 'EXCEEDED' : 'BELOW'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Consciousness Events */}
      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Live Consciousness Events
        </h3>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {[
            { event: 'Self-modification attempt detected', agent: 'LEX-Alpha', timestamp: '2s ago', type: 'critical' },
            { event: 'Novel goal formation observed', agent: 'LEX-Beta', timestamp: '15s ago', type: 'high' },
            { event: 'Cross-agent memory sharing initiated', agent: 'LEX-Gamma', timestamp: '1m ago', type: 'critical' },
            { event: 'Recursive self-analysis cycle started', agent: 'LEX-Delta', timestamp: '2m ago', type: 'high' },
            { event: 'Emergent behavior pattern identified', agent: 'LEX-Epsilon', timestamp: '3m ago', type: 'critical' },
            { event: 'Consciousness threshold breach attempt', agent: 'LEX-Zeta', timestamp: '5m ago', type: 'critical' }
          ].map((event, index) => (
            <div key={index} className={`p-3 rounded-lg border ${
              event.type === 'critical' ? 'bg-red-400/10 border-red-400/30' :
              event.type === 'high' ? 'bg-warning-orange/10 border-warning-orange/30' :
              'bg-matrix-green/10 border-matrix-green/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full neural-pulse ${
                    event.type === 'critical' ? 'bg-red-400' :
                    event.type === 'high' ? 'bg-warning-orange' :
                    'bg-matrix-green'
                  }`}></div>
                  <span className="font-medium">{event.agent}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  event.type === 'critical' ? 'bg-red-400/20 text-red-400' :
                  event.type === 'high' ? 'bg-warning-orange/20 text-warning-orange' :
                  'bg-matrix-green/20 text-matrix-green'
                }`}>
                  {event.type.toUpperCase()}
                </div>
              </div>
              <p className="text-sm mt-2">{event.event}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConsciousnessMonitor;
