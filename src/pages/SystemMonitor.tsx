
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';
import MetricCard from '../components/dashboard/MetricCard';

const SystemMonitor = () => {
  const gpuData = [
    { time: '00:00', utilization: 87, memory: 65, temperature: 34 },
    { time: '04:00', utilization: 92, memory: 71, temperature: 36 },
    { time: '08:00', utilization: 85, memory: 68, temperature: 35 },
    { time: '12:00', utilization: 94, memory: 73, temperature: 37 },
    { time: '16:00', utilization: 89, memory: 69, temperature: 35 },
    { time: '20:00', utilization: 91, memory: 72, temperature: 36 },
  ];

  const modelPerformance = [
    { model: 'Mixtral-8x22B', tokens: 2400, efficiency: 94 },
    { model: 'LLaMA-3-70B', tokens: 2100, efficiency: 89 },
    { model: 'DeepSeek-R1', tokens: 1850, efficiency: 92 },
    { model: 'Qwen2.5-72B', tokens: 1650, efficiency: 87 },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron font-bold text-primary mb-2">
          System Performance Monitor
        </h1>
        <p className="text-muted-foreground">
          Real-time H100 GPU metrics and infrastructure monitoring
        </p>
      </div>

      {/* Hardware Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="GPU Utilization"
          value="87%"
          subtitle="34°C Temperature"
          color="matrix"
          icon="⚡"
          animate
        />
        <MetricCard
          title="VRAM Usage"
          value="65GB"
          subtitle="80GB Total"
          color="cyber"
          icon="💾"
        />
        <MetricCard
          title="Compute Units"
          value="16,896"
          subtitle="CUDA Cores Active"
          color="electric"
          icon="🔥"
        />
        <MetricCard
          title="Throughput"
          value="2.4M"
          subtitle="Tokens/second"
          color="neural"
          icon="🚀"
        />
      </div>

      {/* GPU Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            H100 GPU Metrics
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gpuData}>
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
                <Area
                  type="monotone"
                  dataKey="utilization"
                  stroke="hsl(var(--matrix-green))"
                  fill="hsl(var(--matrix-green) / 0.3)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="hsl(var(--cyber-pink))"
                  fill="hsl(var(--cyber-pink) / 0.3)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-matrix-green rounded-full"></div>
              <span className="text-sm">Utilization</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-cyber-pink rounded-full"></div>
              <span className="text-sm">Memory</span>
            </div>
          </div>
        </div>

        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            Model Performance
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelPerformance} layout="horizontal">
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="model" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  width={100}
                />
                <Bar 
                  dataKey="tokens" 
                  fill="hsl(var(--electric-blue))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            Infrastructure Status
          </h3>
          <div className="space-y-4">
            {[
              { component: 'H100 GPU', status: 'Optimal', uptime: '99.9%', color: 'matrix-green' },
              { component: 'Memory Pool', status: 'Healthy', uptime: '100%', color: 'matrix-green' },
              { component: 'Storage Array', status: 'Active', uptime: '99.8%', color: 'matrix-green' },
              { component: 'Network I/O', status: 'Stable', uptime: '99.7%', color: 'matrix-green' },
              { component: 'Cooling System', status: 'Normal', uptime: '100%', color: 'matrix-green' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 bg-${item.color} rounded-full neural-pulse`}></div>
                  <span className="font-medium">{item.component}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{item.status}</div>
                  <div className="text-xs text-muted-foreground">{item.uptime}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            Resource Allocation
          </h3>
          <div className="space-y-4">
            {[
              { resource: 'GPU Compute', used: 87, total: 100, unit: '%' },
              { resource: 'VRAM', used: 65, total: 80, unit: 'GB' },
              { resource: 'System Memory', used: 128, total: 256, unit: 'GB' },
              { resource: 'Storage', used: 2.3, total: 22.5, unit: 'TB' },
            ].map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.resource}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.used}{item.unit} / {item.total}{item.unit}
                  </span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-matrix-green h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(item.used / item.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            Network Activity
          </h3>
          <div className="space-y-4">
            {[
              { metric: 'Inbound Traffic', value: '2.4 GB/s', status: 'high' },
              { metric: 'Outbound Traffic', value: '1.8 GB/s', status: 'normal' },
              { metric: 'API Requests', value: '12,847/min', status: 'high' },
              { metric: 'Agent Communications', value: '847/sec', status: 'normal' },
              { metric: 'Data Sync', value: '99.9% Success', status: 'optimal' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                <span className="text-sm font-medium">{item.metric}</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{item.value}</div>
                  <div className={`text-xs ${
                    item.status === 'optimal' ? 'text-matrix-green' :
                    item.status === 'high' ? 'text-warning-orange' :
                    'text-muted-foreground'
                  }`}>
                    {item.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
