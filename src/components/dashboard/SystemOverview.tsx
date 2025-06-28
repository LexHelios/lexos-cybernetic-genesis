
import React from 'react';
import MetricCard from './MetricCard';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const performanceData = [
  { time: '00:00', cpu: 45, memory: 67, gpu: 89 },
  { time: '04:00', cpu: 52, memory: 71, gpu: 92 },
  { time: '08:00', cpu: 67, memory: 78, gpu: 85 },
  { time: '12:00', cpu: 58, memory: 82, gpu: 94 },
  { time: '16:00', cpu: 71, memory: 75, gpu: 87 },
  { time: '20:00', cpu: 48, memory: 69, gpu: 91 },
];

const modelUsageData = [
  { name: 'Mixtral-8x22B', value: 35, color: '#00ff88' },
  { name: 'LLaMA-3-70B', value: 28, color: '#ff0080' },
  { name: 'DeepSeek-R1', value: 22, color: '#0088ff' },
  { name: 'Qwen2.5-72B', value: 15, color: '#8000ff' },
];

const SystemOverview = () => {
  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="H100 GPU Usage"
          value="87%"
          subtitle="34°C Core Temp"
          trend="up"
          color="matrix"
          icon="⚡"
          animate
        />
        <MetricCard
          title="Active Agents"
          value="12"
          subtitle="8 Learning, 4 Executing"
          trend="stable"
          color="cyber"
          icon="🤖"
        />
        <MetricCard
          title="Neural Throughput"
          value="2.4M"
          subtitle="Tokens/sec"
          trend="up"
          color="electric"
          icon="🧠"
        />
        <MetricCard
          title="Knowledge Base"
          value="847GB"
          subtitle="Vector embeddings"
          trend="up"
          color="neural"
          icon="💾"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Monitor */}
        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            Performance Monitor
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gpu" 
                  stroke="hsl(var(--matrix-green))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--matrix-green))', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="hsl(var(--cyber-pink))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--cyber-pink))', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="hsl(var(--electric-blue))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--electric-blue))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-matrix-green rounded-full"></div>
              <span className="text-sm">GPU</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-cyber-pink rounded-full"></div>
              <span className="text-sm">CPU</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-electric-blue rounded-full"></div>
              <span className="text-sm">Memory</span>
            </div>
          </div>
        </div>

        {/* Model Usage Distribution */}
        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            Model Usage Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelUsageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {modelUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {modelUsageData.map((model, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: model.color }}
                  ></div>
                  <span className="text-sm">{model.name}</span>
                </div>
                <span className="text-sm font-medium">{model.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Activity Stream */}
      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
          Neural Agent Activity Stream
        </h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {[
            { agent: 'LEX-Alpha', action: 'Learning new code patterns from GitHub repositories', time: '2 seconds ago', status: 'active' },
            { agent: 'LEX-Beta', action: 'Optimizing neural network architecture', time: '15 seconds ago', status: 'completed' },
            { agent: 'LEX-Gamma', action: 'Processing scientific papers from ArXiv', time: '1 minute ago', status: 'active' },
            { agent: 'LEX-Delta', action: 'Synthesizing knowledge graphs', time: '2 minutes ago', status: 'completed' },
            { agent: 'LEX-Epsilon', action: 'Self-modifying decision algorithms', time: '3 minutes ago', status: 'active' },
            { agent: 'LEX-Zeta', action: 'Creating specialized sub-agents', time: '5 minutes ago', status: 'completed' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/10 border border-muted/20">
              <div className={`w-2 h-2 rounded-full ${
                activity.status === 'active' ? 'bg-matrix-green neural-pulse' : 'bg-muted-foreground'
              }`}></div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-primary">{activity.agent}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{activity.action}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                activity.status === 'active' 
                  ? 'bg-matrix-green/20 text-matrix-green' 
                  : 'bg-muted/20 text-muted-foreground'
              }`}>
                {activity.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemOverview;
