
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Agent, TaskSubmission } from '@/types/api';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Clock, AlertCircle } from 'lucide-react';

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
  const [taskType, setTaskType] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [parameters, setParameters] = useState('{}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    setIsSubmitting(true);
    try {
      let parsedParameters = {};
      try {
        parsedParameters = JSON.parse(parameters);
      } catch {
        parsedParameters = { description };
      }

      const submission: TaskSubmission = {
        task_type: taskType,
        parameters: {
          ...parsedParameters,
          description
        },
        priority,
        timeout: 300000 // 5 minutes default
      };

      const response = await apiClient.submitTask(agent.agent_id, submission);
      
      if (response.success) {
        toast({
          title: 'Task Submitted',
          description: `Task submitted to ${agent.name}. Queue position: ${response.queue_position}`
        });
        
        // Reset form
        setTaskType('');
        setDescription('');
        setPriority('normal');
        setParameters('{}');
        onOpenChange(false);
      } else {
        throw new Error('Task submission failed');
      }
    } catch (error) {
      console.error('Task submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit task. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="holographic-panel max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-orbitron">
            <Bot className="w-5 h-5 text-primary" />
            Submit Task to {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Info */}
          <div className="p-4 bg-background/50 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{agent.name}</h3>
              <Badge variant="outline" className="text-xs">
                {agent.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{agent.type}</p>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Queue: {agent.current_tasks || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Completed: {agent.total_tasks_completed || 0}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Task Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type</Label>
                <Select value={taskType} onValueChange={setTaskType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="research">Research Task</SelectItem>
                    <SelectItem value="analysis">Data Analysis</SelectItem>
                    <SelectItem value="generation">Content Generation</SelectItem>
                    <SelectItem value="processing">Data Processing</SelectItem>
                    <SelectItem value="custom">Custom Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Task Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want the agent to do..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parameters">Additional Parameters (JSON)</Label>
              <Textarea
                id="parameters"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Provide additional parameters as JSON
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !taskType || !description}
                className="neural-button"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskSubmissionDialog;
