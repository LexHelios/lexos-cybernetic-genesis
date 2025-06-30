
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Clock, User } from 'lucide-react';

interface BrowsingActivity {
  id: string;
  agentId: string;
  agentName: string;
  url: string;
  title: string;
  timestamp: Date;
  status: 'browsing' | 'completed' | 'error';
  duration?: number;
}

export const AgentBrowsingMonitor: React.FC = () => {
  const [activities, setActivities] = useState<BrowsingActivity[]>([
    {
      id: '1',
      agentId: 'lex-alpha-001',
      agentName: 'LEX-Alpha-001',
      url: 'https://arxiv.org/abs/2401.12345',
      title: 'Latest AI Research Papers',
      timestamp: new Date(Date.now() - 2000),
      status: 'browsing'
    },
    {
      id: '2',
      agentId: 'research-agent',
      agentName: 'Research Agent',
      url: 'https://github.com/trending',
      title: 'GitHub Trending Repositories',
      timestamp: new Date(Date.now() - 15000),
      status: 'completed',
      duration: 12
    },
    {
      id: '3',
      agentId: 'lex-alpha-001',
      agentName: 'LEX-Alpha-001',
      url: 'https://news.ycombinator.com',
      title: 'Hacker News - Latest Tech Updates',
      timestamp: new Date(Date.now() - 45000),
      status: 'completed',
      duration: 8
    }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update browsing activities
      if (Math.random() > 0.7) {
        const newActivity: BrowsingActivity = {
          id: Date.now().toString(),
          agentId: Math.random() > 0.5 ? 'lex-alpha-001' : 'research-agent',
          agentName: Math.random() > 0.5 ? 'LEX-Alpha-001' : 'Research Agent',
          url: [
            'https://stackoverflow.com/questions/tagged/ai',
            'https://www.nature.com/articles/ai-research',
            'https://openai.com/blog',
            'https://huggingface.co/models'
          ][Math.floor(Math.random() * 4)],
          title: [
            'AI Development Resources',
            'Scientific AI Publications',
            'OpenAI Blog Updates',
            'ML Model Repository'
          ][Math.floor(Math.random() * 4)],
          timestamp: new Date(),
          status: 'browsing'
        };
        
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'browsing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Real-time Browsing Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span className="text-xs font-medium">{activity.agentName}</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getStatusColor(activity.status)} text-white`}
                  >
                    {activity.status}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium truncate">{activity.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate pl-5">
                    {activity.url}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                  {activity.duration && (
                    <span>{activity.duration}s duration</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
