
import React from 'react';
import { ListTodo, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const TaskPipeline = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-electric-blue/10 to-cyber-pink/10"
        style={{
          backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-electric-blue/50 bg-electric-blue/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <ListTodo className="w-6 h-6 text-electric-blue opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-electric-blue">
                Task Pipeline
              </h1>
              <p className="text-muted-foreground">
                Autonomous task management and execution queue
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Tasks"
            value="23"
            subtitle="In execution"
            color="electric"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Queued"
            value="147"
            subtitle="Pending tasks"
            color="warning"
            trend="stable"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Completed"
            value="1,842"
            subtitle="Today"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Success Rate"
            value="98.7%"
            subtitle="Task completion"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Pipeline Status</h2>
            <div className="space-y-4">
              {[
                { name: "Data Processing", status: "active", progress: 73 },
                { name: "Model Training", status: "queued", progress: 0 },
                { name: "Report Generation", status: "completed", progress: 100 },
                { name: "API Deployment", status: "active", progress: 45 }
              ].map((task, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {task.status === 'active' && <Clock className="w-4 h-4 text-electric-blue" />}
                    {task.status === 'completed' && <CheckCircle className="w-4 h-4 text-matrix-green" />}
                    {task.status === 'queued' && <AlertCircle className="w-4 h-4 text-warning-orange" />}
                    <span className="text-sm font-medium">{task.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-electric-blue transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{task.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-cyber-pink/30 bg-cyber-pink/5">
            <h2 className="text-xl font-orbitron font-bold text-cyber-pink mb-4">Resource Allocation</h2>
            <div className="flex items-center justify-center h-48 bg-black/20 rounded-lg border border-cyber-pink/20">
              <div className="text-center">
                <ListTodo className="w-16 h-16 text-cyber-pink mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Task Distribution Chart</p>
                <p className="text-sm text-muted-foreground">Real-time resource monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskPipeline;
