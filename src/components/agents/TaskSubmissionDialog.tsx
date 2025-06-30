
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Agent, TaskSubmission } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';
import { Play, Zap } from 'lucide-react';

interface TaskSubmissionDialogProps {
  agent: Agent;
  onTaskSubmit?: (taskId: string) => void;
}

const TaskSubmissionDialog: React.FC<TaskSubmissionDialogProps> = ({ 
  agent, 
  onTaskSubmit 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [taskType, setTaskType] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!taskType || !description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let parsedParameters = {};
      if (parameters.trim()) {
        parsedParameters = JSON.parse(parameters);
      }

      const taskSubmission: TaskSubmission = {
        task_type: taskType,
        parameters: {
          description,
          ...parsedParameters
        },
        priority,
        timeout: 300000 // 5 minutes default
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/agents/${agent.agent_id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(taskSubmission)
      });

      if (!response.ok) {
        throw new Error('Failed to submit task');
      }

      const result = await response.json();
      
      toast({
        title: "Task Submitted",
        description: `Task ${result.task_id} has been queued for ${agent.name}`,
      });

      if (onTaskSubmit) {
        onTaskSubmit(result.task_id);
      }

      // Reset form
      setTaskType('');
      setDescription('');
      setParameters('{}');
      setPriority('normal');
      setIsOpen(false);

    } catch (error) {
      console.error('Task submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="neural-button">
          <Play className="w-3 h-3 mr-1" />
          Assign Task
        </Button>
      </DialogTrigger>
      <DialogContent className="holographic-panel max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Assign Task to {agent.name}
          </DialogTitle>
          <DialogDescription>
            Configure and submit a new task for this agent to execute.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agent Info */}
          <div className="p-3 bg-background/50 rounded border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-sm text-muted-foreground">{agent.type}</p>
              </div>
              <Badge variant="outline">{agent.status}</Badge>
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Capabilities:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {agent.capabilities?.slice(0, 3).map((cap, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {typeof cap === 'string' ? cap : 'Unknown'}
                  </Badge>
                ))}
                {agent.capabilities && agent.capabilities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{agent.capabilities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Task Configuration */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="task-type">Task Type *</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analysis">Data Analysis</SelectItem>
                  <SelectItem value="generation">Content Generation</SelectItem>
                  <SelectItem value="processing">Data Processing</SelectItem>
                  <SelectItem value="research">Research Task</SelectItem>
                  <SelectItem value="computation">Computation</SelectItem>
                  <SelectItem value="custom">Custom Task</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="normal">Normal Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want the agent to do..."
                className="neural-input"
              />
            </div>

            <div>
              <Label htmlFor="parameters">Parameters (JSON)</Label>
              <Textarea
                id="parameters"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder='{"key": "value"}'
                className="neural-input font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional JSON parameters for the task
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 neural-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskSubmissionDialog;
