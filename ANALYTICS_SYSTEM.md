# Analytics System Documentation

## Overview

The LexOS Genesis Analytics System provides comprehensive metrics collection, aggregation, and visualization capabilities for monitoring system performance, agent behavior, and task execution.

## Architecture

### Backend Components

1. **Analytics Service** (`backend/src/services/analyticsService.js`)
   - Metrics collection and storage
   - Event tracking
   - Real-time data streaming
   - Data aggregation and rollups
   - SQLite database with Better-SQLite3

2. **Analytics Routes** (`backend/src/routes/analytics.js`)
   - RESTful API endpoints
   - Server-Sent Events (SSE) for real-time updates
   - Authentication and access control

3. **Database Schema**
   - `metrics` - Raw metric data points
   - `metrics_aggregated` - Aggregated metrics (minute, hour, day)
   - `events` - System and user events
   - `agent_performance` - Agent execution metrics
   - `task_analytics` - Task execution analytics
   - `system_health` - System health snapshots

### Frontend Components

1. **Analytics Dashboard** (`src/components/analytics/AnalyticsDashboard.tsx`)
   - Main analytics interface
   - Tab-based navigation
   - Time range selection
   - Data export functionality

2. **Analytics Chart** (`src/components/analytics/AnalyticsChart.tsx`)
   - Reusable chart component
   - Supports line, bar, pie, and doughnut charts
   - Chart.js integration
   - Export to PNG

3. **Realtime Metrics** (`src/components/analytics/RealtimeMetrics.tsx`)
   - Live metric cards
   - Auto-refresh capability
   - Trend indicators

4. **Performance Heatmap** (`src/components/analytics/PerformanceHeatmap.tsx`)
   - Hourly/daily performance visualization
   - Interactive tooltips
   - Color-coded intensity

## API Endpoints

### Metrics
- `POST /api/analytics/metrics` - Track custom metrics
- `GET /api/analytics/metrics/:category/:metricName` - Query metric data

### Events
- `POST /api/analytics/events` - Track custom events
- `GET /api/analytics/events/:eventType` - Query events

### Agent Performance
- `GET /api/analytics/agents/:agentId/performance` - Get agent performance stats

### Task Analytics
- `GET /api/analytics/tasks` - Get task execution analytics

### System Health
- `GET /api/analytics/system/health` - Get system health history

### Dashboard
- `GET /api/analytics/dashboard` - Get aggregated dashboard data

### Real-time Stream
- `GET /api/analytics/stream` - SSE endpoint for real-time updates

## Usage Examples

### Backend - Tracking Metrics

```javascript
import { analyticsService } from './services/analyticsService.js';

// Track a metric
analyticsService.trackMetric('api', 'response_time', 145.2, {
  endpoint: '/api/tasks',
  method: 'POST'
});

// Track an event
analyticsService.trackEvent('user', 'login', {
  userId: 'user123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// Track agent performance
analyticsService.trackAgentPerformance('consciousness_agent', 'consciousness', {
  taskId: 'task-123',
  executionTime: 2340,
  success: true,
  resourceUsage: {
    cpu: 45.2,
    memory: 256
  }
});
```

### Frontend - Using Analytics Hook

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

function MyComponent() {
  const { data, loading, error, trackEvent } = useAnalytics({
    refreshInterval: 30000,
    timeRange: '24h'
  });

  // Track user interaction
  const handleButtonClick = () => {
    trackEvent('ui', 'button_clicked', {
      component: 'MyComponent',
      action: 'submit'
    });
  };

  return (
    <div>
      {/* Display analytics data */}
    </div>
  );
}
```

## Data Aggregation

The system automatically aggregates raw metrics into time-based intervals:

1. **Minute aggregations** - Kept for 1 hour
2. **Hourly aggregations** - Kept for 7 days
3. **Daily aggregations** - Kept for 90 days

Raw metrics are retained for 1 hour before being cleaned up.

## Real-time Updates

The analytics system supports real-time data streaming through Server-Sent Events (SSE):

```javascript
// Frontend connection to real-time stream
const eventSource = new EventSource('/api/analytics/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

## Performance Considerations

1. **Batching** - Metrics are buffered and flushed every 5 seconds
2. **Indexing** - Database indexes on timestamp, category, and metric name
3. **Caching** - System monitor implements 5-second cache for expensive operations
4. **Aggregation** - Background process runs every minute to aggregate data

## Security

- All analytics endpoints require authentication
- Role-based access control for sensitive data
- User context automatically attached to events
- IP tracking for security analysis

## Integration Points

1. **Task Submission** - Automatically tracks task creation and execution
2. **Authentication** - Tracks login attempts and sessions
3. **System Monitor** - Collects and tracks system health metrics
4. **Agent Manager** - Tracks agent performance and resource usage
5. **WebSocket** - Provides real-time updates to connected clients

## Future Enhancements

1. **Machine Learning** - Anomaly detection and predictive analytics
2. **Custom Dashboards** - User-configurable dashboard layouts
3. **Advanced Visualizations** - 3D graphs, network diagrams
4. **Export Formats** - CSV, Excel, PDF reports
5. **Alerting** - Threshold-based alerts and notifications
6. **Time-Series Database** - Migration to specialized TSDB for better performance