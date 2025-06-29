
import React, { useState, useEffect } from 'react';
import { MessageSquare, Radio, Wifi, Users, Bell, AlertCircle } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import MessagingInterface from '../components/communications/MessagingInterface';
import SystemAlerts from '../components/communications/SystemAlerts';
import NotificationCenter from '../components/communications/NotificationCenter';

const Communications = () => {
  const [messageStats, setMessageStats] = useState({
    activeChannels: 0,
    throughput: 0,
    latency: 0,
    efficiency: 0,
  });

  useEffect(() => {
    // Fetch real stats from backend
    fetchCommunicationStats();
    
    // Set up WebSocket for real-time updates
    const ws = new WebSocket(`ws://localhost:3001`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'communication:stats') {
        setMessageStats(data.stats);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchCommunicationStats = async () => {
    try {
      // This would be a real API call
      // For now, using placeholder data
      setMessageStats({
        activeChannels: 47,
        throughput: 15300,
        latency: 12,
        efficiency: 99.1,
      });
    } catch (error) {
      console.error('Failed to fetch communication stats:', error);
    }
  };

  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-matrix-green/10 to-electric-blue/10"
        style={{
          backgroundImage: `url('/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center border border-matrix-green/50 bg-matrix-green/10 overflow-hidden"
                style={{
                  backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <MessageSquare className="w-6 h-6 text-matrix-green opacity-80" />
              </div>
              <div>
                <h1 className="text-3xl font-orbitron font-bold text-matrix-green">
                  Communications Hub
                </h1>
                <p className="text-muted-foreground">
                  Real-time messaging, notifications, and system alerts
                </p>
              </div>
            </div>
            
            {/* Notification Center in header */}
            <div className="flex items-center gap-2">
              <NotificationCenter />
              {/* Test button for demo - remove in production */}
              <button
                onClick={async () => {
                  const token = localStorage.getItem('auth_token');
                  // Create test notification
                  await fetch('/api/notifications', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      type: 'test',
                      title: 'Test Notification',
                      message: 'This is a test notification from the Communications Hub',
                      priority: 'normal',
                    }),
                  });
                  // Create test alert
                  await fetch('/api/alerts', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      alertType: 'system',
                      severity: 'high',
                      title: 'High CPU Usage Detected',
                      message: 'CPU usage has exceeded 90% threshold',
                      component: 'cpu',
                    }),
                  });
                }}
                className="px-3 py-1 text-xs bg-primary/20 hover:bg-primary/30 rounded"
              >
                Test Notifications
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Channels"
            value={messageStats.activeChannels.toString()}
            subtitle="Communication links"
            color="matrix"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Message Throughput"
            value={`${(messageStats.throughput / 1000).toFixed(1)}k`}
            subtitle="Messages/min"
            color="electric"
            trend="up"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Network Latency"
            value={`${messageStats.latency}ms`}
            subtitle="Average delay"
            color="cyber"
            trend="down"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Protocol Efficiency"
            value={`${messageStats.efficiency}%`}
            subtitle="Success rate"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
        </div>

        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              System Alerts
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Network
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages" className="space-y-4">
            <MessagingInterface />
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-4">
            <SystemAlerts />
          </TabsContent>
          
          <TabsContent value="network" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30 bg-matrix-green/5">
                <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4">Communication Mesh</h2>
                <div className="space-y-4">
                  {[
                    { agent: "Consciousness Agent", messages: 2847, status: "active" },
                    { agent: "Research Agent", messages: 1932, status: "active" },
                    { agent: "Executor Agent", messages: 1456, status: "standby" },
                    { agent: "Gemma 3N", messages: 987, status: "active" }
                  ].map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-matrix-green neural-pulse' : 'bg-warning-orange'}`} />
                        <span className="text-sm font-medium">{agent.agent}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-muted-foreground">{agent.messages} msgs</span>
                        <Radio className="w-4 h-4 text-matrix-green" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
                <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Network Topology</h2>
                <div className="flex items-center justify-center h-48 bg-black/20 rounded-lg border border-electric-blue/20">
                  <div className="text-center">
                    <Wifi className="w-16 h-16 text-electric-blue mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Network Visualization</p>
                    <p className="text-sm text-muted-foreground">Real-time connection mapping</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Communications;
