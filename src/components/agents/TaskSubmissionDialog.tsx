
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Agent, TaskSubmission } from '../../types/api';
import { apiClient } from '../../services/api';

interface TaskSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent;
}

const TaskSubmissionDialog: React.FC<TaskSubmissionDialogProps> = ({
  open,
  onOpenChange,
  agent
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskData, setTaskData] = useState<TaskSubmission>({
    task_type: 'analysis',
    parameters: {},
    priority: 'normal'
  });
  const [queryText, setQueryText] = useState('');
  const [customParams, setCustomParams] = useState('');

  const taskTypes = {
    'consciousness_query': { 
      label: 'Consciousness Query', 
      description: 'Deep reasoning and philosophical exploration',
      params: ['query', 'depth', 'temperature']
    },
    'code_generation': { 
      label: 'Code Generation', 
      description: 'Generate code in various programming languages',
      params: ['prompt', 'language', 'temperature']
    },
    'research': { 
      label: 'Research Task', 
      description: 'Information gathering and synthesis',
      params: ['query', 'research_type', 'depth']
    },
    'analysis': { 
      label: 'General Analysis', 
      description: 'Analyze and provide insights',
      params: ['request', 'temperature']
    },
    'task_planning': { 
      label: 'Task Planning', 
      description: 'Break down complex tasks into steps',
      params: ['task_description', 'temperature']
    }
  };

  const handleSubmit = async () => {
    if (!agent || !queryText.trim()) return;

    setIsSubmitting(true);
    
    try {
      // Build parameters based on task type
      let parameters = { query: queryText };
      
      // Add custom parameters if provided
      if (customParams.trim()) {
        try {
          const parsed = JSON.parse(customParams);
          parameters = { ...parameters, ...parsed };
        } catch (e) {
          toast({
            title: "Invalid Parameters",
            description: "Custom parameters must be valid JSON",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }

      const submission: TaskSubmission = {
        ...taskData,
        parameters
      };

      const result = await apiClient.submitTask(agent.agent_id, submission);
      
      toast({
        title: "Task Submitted Successfully",
        description: `Task ${result.task_id} submitted to ${agent.name}. Queue position: ${result.queue_position}`,
      });

      // Reset form
      setQueryText('');
      setCustomParams('');
      setTaskData({
        task_type: 'analysis',
        parameters: {},
        priority: 'normal'
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit task",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTaskType = taskTypes[taskData.task_type as keyof typeof taskTypes];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-orbitron">
            Submit Task to {agent?.name}
          </DialogTitle>
          <DialogDescription>
            Configure and submit a task to the selected agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Agent Info */}
          <div className="flex items-center space-x-3 p-3 border border-matrix-green/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                agent?.status === 'active' ? 'bg-green-500' : 
                agent?.status === 'busy' ? 'bg-blue-500' : 'bg-yellow-500'
              } animate-pulse`} />
              <span className="font-medium">{agent?.name}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {agent?.capabilities?.slice(0, 2).map((cap, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {cap.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="task_type">Task Type</Label>
            <Select
              value={taskData.task_type}
              onValueChange={(value) => setTaskData(prev => ({ ...prev, task_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(taskTypes).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Query/Prompt */}
          <div className="space-y-2">
            <Label htmlFor="query">Query/Prompt</Label>
            <Textarea
              id="query"
              placeholder="Enter your query or prompt here..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={taskData.priority}
              onValueChange={(value) => setTaskData(prev => ({ ...prev, priority: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Parameters */}
          <div className="space-y-2">
            <Label htmlFor="params">Custom Parameters (JSON)</Label>
            <Textarea
              id="params"
              placeholder='{"temperature": 0.7, "max_tokens": 1000}'
              value={customParams}
              onChange={(e) => setCustomParams(e.target.value)}
              rows={3}
              className="resize-none font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground">
              Available parameters: {selectedTaskType?.params.join(', ')}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !queryText.trim()}
            className="bg-matrix-green/20 hover:bg-matrix-green/30 border-matrix-green/50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskSubmissionDialog;
