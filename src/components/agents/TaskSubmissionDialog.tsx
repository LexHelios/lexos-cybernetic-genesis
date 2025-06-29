import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Play, Loader2 } from 'lucide-react';
import { apiClient } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Agent } from '@/types/api';

interface TaskSubmissionDialogProps {
  agent: Agent;
  onTaskSubmitted?: (taskId: string) => void;
}

const TaskSubmissionDialog: React.FC<TaskSubmissionDialogProps> = ({ agent, onTaskSubmitted }) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskType, setTaskType] = useState('');
  const [priority, setPriority] = useState('normal');
  const [parameters, setParameters] = useState<Record<string, any>>({});

  // Define task types based on agent
  const getTaskTypes = () => {
    switch (agent.agent_id) {
      case 'consciousness-001':
        return [
          { value: 'consciousness_query', label: 'Consciousness Query' },
          { value: 'self_reflection', label: 'Self Reflection' },
          { value: 'philosophical_reasoning', label: 'Philosophical Reasoning' }
        ];
      case 'executor-001':
        return [
          { value: 'code_generation', label: 'Code Generation' },
          { value: 'task_planning', label: 'Task Planning' },
          { value: 'file_operation', label: 'File Operation' },
          { value: 'analysis', label: 'General Analysis' }
        ];
      case 'research-001':
        return [
          { value: 'general', label: 'General Research' },
          { value: 'synthesis', label: 'Information Synthesis' },
          { value: 'fact_check', label: 'Fact Checking' },
          { value: 'research_plan', label: 'Research Planning' },
          { value: 'extraction', label: 'Knowledge Extraction' }
        ];
      default:
        return [{ value: 'general', label: 'General Task' }];
    }
  };

  const getParameterFields = () => {
    if (agent.agent_id === 'consciousness-001') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="query">Query</Label>
            <Textarea
              id="query"
              placeholder="Enter your consciousness query..."
              value={parameters.query || ''}
              onChange={(e) => setParameters({ ...parameters, query: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depth">Depth</Label>
            <Select
              value={parameters.depth || 'standard'}
              onValueChange={(value) => setParameters({ ...parameters, depth: value })}
            >
              <SelectTrigger id="depth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deep">Deep Analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature ({parameters.temperature || 0.9})</Label>
            <Input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={parameters.temperature || 0.9}
              onChange={(e) => setParameters({ ...parameters, temperature: parseFloat(e.target.value) })}
            />
          </div>
        </>
      );
    } else if (agent.agent_id === 'executor-001') {
      if (taskType === 'code_generation') {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="command">Code Description</Label>
              <Textarea
                id="command"
                placeholder="Describe the code you want to generate..."
                value={parameters.command || ''}
                onChange={(e) => setParameters({ ...parameters, command: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Programming Language</Label>
              <Select
                value={parameters.language || 'javascript'}
                onValueChange={(value) => setParameters({ ...parameters, language: value })}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      } else if (taskType === 'file_operation') {
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="operation">Operation</Label>
              <Select
                value={parameters.operation || 'read'}
                onValueChange={(value) => setParameters({ ...parameters, operation: value })}
              >
                <SelectTrigger id="operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Write</SelectItem>
                  <SelectItem value="append">Append</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="exists">Check Exists</SelectItem>
                  <SelectItem value="mkdir">Create Directory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file_path">File Path</Label>
              <Input
                id="file_path"
                placeholder="/path/to/file"
                value={parameters.file_path || ''}
                onChange={(e) => setParameters({ ...parameters, file_path: e.target.value })}
              />
            </div>
            {(parameters.operation === 'write' || parameters.operation === 'append') && (
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="File content..."
                  value={parameters.content || ''}
                  onChange={(e) => setParameters({ ...parameters, content: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
            )}
          </>
        );
      } else {
        return (
          <div className="space-y-2">
            <Label htmlFor="command">Command/Description</Label>
            <Textarea
              id="command"
              placeholder="Enter your task description..."
              value={parameters.command || ''}
              onChange={(e) => setParameters({ ...parameters, command: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
        );
      }
    } else if (agent.agent_id === 'research-001') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="query">Research Query</Label>
            <Textarea
              id="query"
              placeholder="What would you like to research?"
              value={parameters.query || ''}
              onChange={(e) => setParameters({ ...parameters, query: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
          {taskType === 'extraction' && (
            <div className="space-y-2">
              <Label htmlFor="text">Source Text</Label>
              <Textarea
                id="text"
                placeholder="Paste the text to extract knowledge from..."
                value={parameters.text || ''}
                onChange={(e) => setParameters({ ...parameters, text: e.target.value })}
                className="min-h-[150px]"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="depth">Research Depth</Label>
            <Select
              value={parameters.depth || 'standard'}
              onValueChange={(value) => setParameters({ ...parameters, depth: value })}
            >
              <SelectTrigger id="depth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deep">Deep Research</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }
    
    return (
      <div className="space-y-2">
        <Label htmlFor="parameters">Parameters (JSON)</Label>
        <Textarea
          id="parameters"
          placeholder='{"key": "value"}'
          value={JSON.stringify(parameters, null, 2)}
          onChange={(e) => {
            try {
              setParameters(JSON.parse(e.target.value));
            } catch (error) {
              // Invalid JSON, ignore
            }
          }}
          className="min-h-[100px] font-mono text-sm"
        />
      </div>
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Add task_type to parameters for executor agent
      const submissionParams = { ...parameters };
      if (agent.agent_id === 'executor-001') {
        submissionParams.task_type = taskType;
      } else if (agent.agent_id === 'research-001') {
        submissionParams.research_type = taskType === 'general' ? 'general' : taskType;
      }
      
      const response = await apiClient.submitTask(agent.agent_id, {
        task_type: taskType,
        parameters: submissionParams,
        priority: priority as any
      });
      
      toast({
        title: "Task Submitted Successfully",
        description: `Task ID: ${response.task_id}`,
      });
      
      setOpen(false);
      setParameters({});
      
      if (onTaskSubmitted) {
        onTaskSubmitted(response.task_id);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Task Submission Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          Submit Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Task to {agent.name}</DialogTitle>
          <DialogDescription>
            Configure and submit a task to this agent for processing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="task-type">Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger id="task-type">
                <SelectValue placeholder="Select a task type" />
              </SelectTrigger>
              <SelectContent>
                {getTaskTypes().map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
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
          
          {taskType && getParameterFields()}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!taskType || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Submit Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskSubmissionDialog;