import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Timer, TrendingUp } from 'lucide-react';
import { apiClient } from '@/services/api';

interface AutoRoutingStats {
  routing_cache_size: number;
  model_usage: Record<string, number>;
  average_response_times: Record<string, number>;
  total_requests: number;
}

const modelDisplayNames: Record<string, string> = {
  'phi3:mini': 'Phi3 Mini',
  'deepseek-r1:7b': 'DeepSeek R1',
  'qwen2.5-coder:7b': 'Qwen Coder',
  'llama3.3:70b': 'Llama 3.3 70B',
  'mistral:7b': 'Mistral 7B',
  'mixtral:8x7b': 'Mixtral 8x7B',
  'gemma2:9b': 'Gemma 2 9B'
};

export const AutoRoutingStats: React.FC = () => {
  const [stats, setStats] = useState<AutoRoutingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getChatAutoStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch auto-routing stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg font-orbitron flex items-center space-x-2">
            <Brain className="w-5 h-5 text-primary" />
            <span>LLM Auto-Routing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-primary/20 rounded w-3/4"></div>
            <div className="h-4 bg-primary/20 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedModelUsage = Object.entries(stats.model_usage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxUsage = Math.max(...Object.values(stats.model_usage), 1);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg font-orbitron flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-primary animate-pulse" />
            <span>LLM Auto-Routing</span>
          </div>
          <div className="text-sm font-mono text-muted-foreground">
            {stats.total_requests} requests
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Usage */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span>Model Usage</span>
          </h3>
          {sortedModelUsage.map(([model, count]) => {
            const percentage = (count / maxUsage) * 100;
            const avgTime = stats.average_response_times[model] || 0;
            return (
              <div key={model} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-primary/80">
                    {modelDisplayNames[model] || model}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">
                      {count} calls
                    </span>
                    {avgTime > 0 && (
                      <span className="text-xs text-primary/60 flex items-center">
                        <Timer className="w-3 h-3 mr-1" />
                        {(avgTime / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* Cache Info */}
        <div className="flex items-center justify-between pt-2 border-t border-primary/10">
          <div className="flex items-center space-x-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-muted-foreground">Cache Size</span>
          </div>
          <span className="text-sm font-mono text-primary">
            {stats.routing_cache_size} entries
          </span>
        </div>

        {/* Average Response Time */}
        {Object.keys(stats.average_response_times).length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Timer className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">Avg Response</span>
            </div>
            <span className="text-sm font-mono text-primary">
              {(
                Object.values(stats.average_response_times).reduce((a, b) => a + b, 0) /
                Object.values(stats.average_response_times).length /
                1000
              ).toFixed(2)}s
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};