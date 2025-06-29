
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'matrix' | 'cyber' | 'electric' | 'neural' | 'warning';
  icon?: string;
  animate?: boolean;
  backgroundImage?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color = 'primary',
  icon,
  animate = false,
  backgroundImage = '/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png'
}) => {
  const colorClasses = {
    primary: 'border-primary/30 bg-primary/5',
    matrix: 'border-matrix-green/30 bg-matrix-green/5',
    cyber: 'border-cyber-pink/30 bg-cyber-pink/5',
    electric: 'border-electric-blue/30 bg-electric-blue/5',
    neural: 'border-neural-purple/30 bg-neural-purple/5',
    warning: 'border-warning-orange/30 bg-warning-orange/5'
  };

  const textColorClasses = {
    primary: 'text-primary',
    matrix: 'text-matrix-green',
    cyber: 'text-cyber-pink',
    electric: 'text-electric-blue',
    neural: 'text-neural-purple',
    warning: 'text-warning-orange'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '➡️';
  };

  return (
    <div className={`holographic-panel p-6 rounded-lg border ${colorClasses[color]} ${animate ? 'neural-pulse' : ''} relative overflow-hidden`}>
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1px)'
        }}
      />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <div className={`text-3xl font-orbitron font-bold ${textColorClasses[color]} mb-1`}>
            {value}
          </div>
          {subtitle && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">{subtitle}</span>
              {trend && (
                <span className="text-sm">{getTrendIcon()}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
