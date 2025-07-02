import React, { useState, useEffect } from 'react';
import { Activity, Users, MessageSquare, Cpu } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalChats: 0,
    activeAgents: 0,
    systemLoad: 0
  });

  useEffect(() => {
    // Fetch stats from API
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const statCards = [
    { 
      title: 'Active Users', 
      value: stats.activeUsers, 
      icon: Users, 
      color: 'bg-blue-600' 
    },
    { 
      title: 'Total Chats', 
      value: stats.totalChats, 
      icon: MessageSquare, 
      color: 'bg-green-600' 
    },
    { 
      title: 'Active Agents', 
      value: stats.activeAgents, 
      icon: Activity, 
      color: 'bg-purple-600' 
    },
    { 
      title: 'System Load', 
      value: `${stats.systemLoad}%`, 
      icon: Cpu, 
      color: 'bg-orange-600' 
    }
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <div>
              <p className="text-white">New chat session started</p>
              <p className="text-gray-400 text-sm">2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <div>
              <p className="text-white">Agent LEX responded to query</p>
              <p className="text-gray-400 text-sm">5 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-white">System health check completed</p>
              <p className="text-gray-400 text-sm">10 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;