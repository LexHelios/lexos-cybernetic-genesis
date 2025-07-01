#!/usr/bin/env python3
"""
LexOS Agent Orchestrator - H100 Production Edition
Central orchestration system for all AI agents
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
from loguru import logger
import sys

sys.path.append('/home/user')
from agents.base_agent import BaseAgent, AgentTask, AgentStatus, AgentCapability
from agents.web_agent import web_agent
from agents.code_agent import code_agent
from agents.financial_agent import financial_agent
# from agents.intelligence_agent import intelligence_agent  # Will be imported after fixing

class OrchestratorStatus(Enum):
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    SHUTTING_DOWN = "shutting_down"
    ERROR = "error"

@dataclass
class WorkflowStep:
    step_id: str
    agent_id: str
    task_type: str
    parameters: Dict[str, Any]
    depends_on: List[str] = field(default_factory=list)
    timeout: int = 300  # 5 minutes default
    retry_count: int = 0
    max_retries: int = 3
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@dataclass
class Workflow:
    workflow_id: str
    name: str
    description: str
    user_id: str
    steps: List[WorkflowStep]
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    status: str = "created"
    progress: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

class AgentOrchestrator:
    """Central orchestration system for all AI agents"""
    
    def __init__(self):
        self.status = OrchestratorStatus.INITIALIZING
        self.agents: Dict[str, BaseAgent] = {}
        self.active_tasks: Dict[str, AgentTask] = {}
        self.workflows: Dict[str, Workflow] = {}
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.workflow_queue: asyncio.Queue = asyncio.Queue()
        
        # Performance metrics
        self.metrics = {
            "total_tasks_processed": 0,
            "total_workflows_processed": 0,
            "average_task_time": 0.0,
            "agent_utilization": {},
            "error_rate": 0.0,
            "uptime": 0.0,
            "start_time": time.time()
        }
        
        # Configuration
        self.config = {
            "max_concurrent_tasks": 50,
            "max_concurrent_workflows": 10,
            "task_timeout": 300,
            "workflow_timeout": 3600,
            "enable_auto_scaling": True,
            "enable_load_balancing": True
        }
        
        # Worker tasks
        self.task_workers: List[asyncio.Task] = []
        self.workflow_workers: List[asyncio.Task] = []
        self.is_running = False
        
        # Security manager reference
        self.security_manager = None
        
        logger.info("🎭 Agent Orchestrator initialized")
    
    async def initialize(self, config: Dict[str, Any], security_manager=None):
        """Initialize the orchestrator and all agents"""
        self.config.update(config.get("orchestrator", {}))
        self.security_manager = security_manager
        
        logger.info("🚀 Initializing Agent Orchestrator...")
        
        # Register all agents
        await self._register_agents()
        
        # Initialize all agents
        await self._initialize_agents()
        
        # Start worker tasks
        await self._start_workers()
        
        self.status = OrchestratorStatus.ACTIVE
        self.is_running = True
        
        logger.success("✅ Agent Orchestrator fully initialized!")
    
    async def _register_agents(self):
        """Register all available agents"""
        # Register core agents
        self.agents["web_agent"] = web_agent
        self.agents["code_agent"] = code_agent
        self.agents["financial_agent"] = financial_agent
        # self.agents["intelligence_agent"] = intelligence_agent  # Will add after fixing
        
        logger.info(f"📋 Registered {len(self.agents)} agents")
    
    async def _initialize_agents(self):
        """Initialize all registered agents"""
        for agent_id, agent in self.agents.items():
            try:
                agent_config = self.config.get("agents", {}).get(agent_id, {})
                await agent.initialize(agent_config, self.security_manager)
                
                # Set up callbacks
                agent.on_task_start = self._on_agent_task_start
                agent.on_task_complete = self._on_agent_task_complete
                agent.on_task_error = self._on_agent_task_error
                agent.on_status_change = self._on_agent_status_change
                
                logger.success(f"✅ Agent {agent_id} initialized")
                
            except Exception as e:
                logger.error(f"❌ Failed to initialize agent {agent_id}: {e}")
    
    async def _start_workers(self):
        """Start worker tasks for processing tasks and workflows"""
        # Start task workers
        num_task_workers = self.config.get("num_task_workers", 5)
        for i in range(num_task_workers):
            worker = asyncio.create_task(self._task_worker(f"task_worker_{i}"))
            self.task_workers.append(worker)
        
        # Start workflow workers
        num_workflow_workers = self.config.get("num_workflow_workers", 3)
        for i in range(num_workflow_workers):
            worker = asyncio.create_task(self._workflow_worker(f"workflow_worker_{i}"))
            self.workflow_workers.append(worker)
        
        logger.info(f"🔄 Started {len(self.task_workers)} task workers and {len(self.workflow_workers)} workflow workers")
    
    async def submit_task(self, task: AgentTask) -> str:
        """Submit a task to the orchestrator"""
        if self.status != OrchestratorStatus.ACTIVE:
            raise RuntimeError("Orchestrator is not active")
        
        # Validate task
        if not await self._validate_task(task):
            raise ValueError(f"Invalid task: {task.task_id}")
        
        # Check if agent exists
        if task.agent_id not in self.agents:
            raise ValueError(f"Unknown agent: {task.agent_id}")
        
        # Security check
        if self.security_manager:
            has_access = await self.security_manager.check_agent_access(
                task.user_id, task.agent_id, task.task_type
            )
            if not has_access:
                raise PermissionError(f"User {task.user_id} does not have access to {task.agent_id}")
        
        # Add to queue
        self.active_tasks[task.task_id] = task
        await self.task_queue.put(task)
        
        logger.info(f"📋 Task {task.task_id} submitted to orchestrator")
        return task.task_id
    
    async def submit_workflow(self, workflow: Workflow) -> str:
        """Submit a workflow to the orchestrator"""
        if self.status != OrchestratorStatus.ACTIVE:
            raise RuntimeError("Orchestrator is not active")
        
        # Validate workflow
        if not await self._validate_workflow(workflow):
            raise ValueError(f"Invalid workflow: {workflow.workflow_id}")
        
        # Add to workflows
        self.workflows[workflow.workflow_id] = workflow
        await self.workflow_queue.put(workflow)
        
        logger.info(f"🔄 Workflow {workflow.workflow_id} submitted to orchestrator")
        return workflow.workflow_id
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific task"""
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            return {
                "task_id": task.task_id,
                "agent_id": task.agent_id,
                "status": task.status,
                "progress": task.progress,
                "result": task.result,
                "error": task.error,
                "created_at": task.created_at,
                "started_at": task.started_at,
                "completed_at": task.completed_at
            }
        
        # Check if task is with an agent
        for agent in self.agents.values():
            agent_task = await agent.get_task_status(task_id)
            if agent_task:
                return {
                    "task_id": agent_task.task_id,
                    "agent_id": agent_task.agent_id,
                    "status": agent_task.status,
                    "progress": agent_task.progress,
                    "result": agent_task.result,
                    "error": agent_task.error,
                    "created_at": agent_task.created_at,
                    "started_at": agent_task.started_at,
                    "completed_at": agent_task.completed_at
                }
        
        return None
    
    async def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific workflow"""
        if workflow_id in self.workflows:
            workflow = self.workflows[workflow_id]
            return {
                "workflow_id": workflow.workflow_id,
                "name": workflow.name,
                "status": workflow.status,
                "progress": workflow.progress,
                "steps": [
                    {
                        "step_id": step.step_id,
                        "agent_id": step.agent_id,
                        "status": step.status,
                        "result": step.result,
                        "error": step.error
                    }
                    for step in workflow.steps
                ],
                "created_at": workflow.created_at,
                "started_at": workflow.started_at,
                "completed_at": workflow.completed_at
            }
        return None
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a running task"""
        # Try to cancel from active tasks
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            task.status = "cancelled"
            del self.active_tasks[task_id]
            return True
        
        # Try to cancel from agents
        for agent in self.agents.values():
            if await agent.cancel_task(task_id):
                return True
        
        return False
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel a running workflow"""
        if workflow_id in self.workflows:
            workflow = self.workflows[workflow_id]
            workflow.status = "cancelled"
            
            # Cancel all active steps
            for step in workflow.steps:
                if step.status == "running":
                    # Find and cancel the task
                    for task_id, task in self.active_tasks.items():
                        if task.metadata.get("workflow_id") == workflow_id and task.metadata.get("step_id") == step.step_id:
                            await self.cancel_task(task_id)
                            break
            
            return True
        
        return False
    
    async def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific agent"""
        if agent_id in self.agents:
            return await self.agents[agent_id].get_status()
        return None
    
    async def get_all_agents_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all agents"""
        status = {}
        for agent_id, agent in self.agents.items():
            status[agent_id] = await agent.get_status()
        return status
    
    async def get_orchestrator_status(self) -> Dict[str, Any]:
        """Get comprehensive orchestrator status"""
        # Update metrics
        self.metrics["uptime"] = time.time() - self.metrics["start_time"]
        
        # Calculate agent utilization
        for agent_id, agent in self.agents.items():
            agent_metrics = await agent.get_metrics()
            if agent_metrics.total_execution_time > 0:
                utilization = (agent_metrics.total_execution_time / self.metrics["uptime"]) * 100
                self.metrics["agent_utilization"][agent_id] = min(100, utilization)
        
        return {
            "status": self.status.value,
            "agents": len(self.agents),
            "active_tasks": len(self.active_tasks),
            "active_workflows": len([w for w in self.workflows.values() if w.status == "running"]),
            "queue_sizes": {
                "tasks": self.task_queue.qsize(),
                "workflows": self.workflow_queue.qsize()
            },
            "metrics": self.metrics,
            "config": self.config
        }
    
    async def _task_worker(self, worker_id: str):
        """Worker task for processing individual tasks"""
        logger.info(f"🔄 Task worker {worker_id} started")
        
        while self.is_running:
            try:
                # Get next task from queue
                try:
                    task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Process the task
                await self._process_task(task, worker_id)
                
            except Exception as e:
                logger.error(f"❌ Task worker {worker_id} error: {e}")
                await asyncio.sleep(1)
        
        logger.info(f"🛑 Task worker {worker_id} stopped")
    
    async def _workflow_worker(self, worker_id: str):
        """Worker task for processing workflows"""
        logger.info(f"🔄 Workflow worker {worker_id} started")
        
        while self.is_running:
            try:
                # Get next workflow from queue
                try:
                    workflow = await asyncio.wait_for(self.workflow_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Process the workflow
                await self._process_workflow(workflow, worker_id)
                
            except Exception as e:
                logger.error(f"❌ Workflow worker {worker_id} error: {e}")
                await asyncio.sleep(1)
        
        logger.info(f"🛑 Workflow worker {worker_id} stopped")
    
    async def _process_task(self, task: AgentTask, worker_id: str):
        """Process a single task"""
        start_time = time.time()
        
        try:
            logger.info(f"🚀 Processing task {task.task_id} with {task.agent_id} (worker: {worker_id})")
            
            # Get the agent
            agent = self.agents.get(task.agent_id)
            if not agent:
                raise ValueError(f"Agent {task.agent_id} not found")
            
            # Submit task to agent
            await agent.submit_task(task)
            
            # Wait for completion (with timeout)
            timeout = task.metadata.get("timeout", self.config["task_timeout"])
            start_wait = time.time()
            
            while time.time() - start_wait < timeout:
                agent_task = await agent.get_task_status(task.task_id)
                if agent_task and agent_task.status in ["completed", "failed", "cancelled"]:
                    # Update our task with the result
                    task.status = agent_task.status
                    task.result = agent_task.result
                    task.error = agent_task.error
                    task.completed_at = agent_task.completed_at
                    task.progress = agent_task.progress
                    break
                
                await asyncio.sleep(1)
            else:
                # Task timed out
                await agent.cancel_task(task.task_id)
                task.status = "timeout"
                task.error = f"Task timed out after {timeout} seconds"
                task.completed_at = time.time()
            
            # Update metrics
            execution_time = time.time() - start_time
            self.metrics["total_tasks_processed"] += 1
            
            if self.metrics["total_tasks_processed"] > 0:
                self.metrics["average_task_time"] = (
                    (self.metrics["average_task_time"] * (self.metrics["total_tasks_processed"] - 1) + execution_time) /
                    self.metrics["total_tasks_processed"]
                )
            
            if task.status == "failed":
                self.metrics["error_rate"] = (
                    self.metrics.get("failed_tasks", 0) + 1
                ) / self.metrics["total_tasks_processed"]
                self.metrics["failed_tasks"] = self.metrics.get("failed_tasks", 0) + 1
            
            logger.success(f"✅ Task {task.task_id} completed with status: {task.status}")
            
        except Exception as e:
            task.status = "error"
            task.error = str(e)
            task.completed_at = time.time()
            logger.error(f"❌ Task {task.task_id} processing error: {e}")
        
        finally:
            # Clean up
            if task.task_id in self.active_tasks:
                del self.active_tasks[task.task_id]
    
    async def _process_workflow(self, workflow: Workflow, worker_id: str):
        """Process a complete workflow"""
        logger.info(f"🔄 Processing workflow {workflow.workflow_id} (worker: {worker_id})")
        
        workflow.status = "running"
        workflow.started_at = time.time()
        
        try:
            # Build dependency graph
            dependency_graph = self._build_dependency_graph(workflow.steps)
            
            # Execute steps in dependency order
            completed_steps = set()
            
            while len(completed_steps) < len(workflow.steps):
                # Find steps that can be executed (dependencies satisfied)
                ready_steps = []
                for step in workflow.steps:
                    if (step.step_id not in completed_steps and 
                        step.status == "pending" and
                        all(dep in completed_steps for dep in step.depends_on)):
                        ready_steps.append(step)
                
                if not ready_steps:
                    # Check if we're stuck
                    pending_steps = [s for s in workflow.steps if s.step_id not in completed_steps]
                    if pending_steps:
                        logger.error(f"❌ Workflow {workflow.workflow_id} stuck - circular dependencies or failed steps")
                        workflow.status = "failed"
                        break
                    else:
                        break
                
                # Execute ready steps concurrently
                step_tasks = []
                for step in ready_steps:
                    step_task = asyncio.create_task(self._execute_workflow_step(workflow, step))
                    step_tasks.append(step_task)
                
                # Wait for all steps to complete
                await asyncio.gather(*step_tasks, return_exceptions=True)
                
                # Update completed steps
                for step in ready_steps:
                    if step.status in ["completed", "failed", "cancelled"]:
                        completed_steps.add(step.step_id)
                
                # Update workflow progress
                workflow.progress = (len(completed_steps) / len(workflow.steps)) * 100
            
            # Determine final workflow status
            failed_steps = [s for s in workflow.steps if s.status == "failed"]
            if failed_steps:
                workflow.status = "failed"
            else:
                workflow.status = "completed"
            
            workflow.completed_at = time.time()
            self.metrics["total_workflows_processed"] += 1
            
            logger.success(f"✅ Workflow {workflow.workflow_id} completed with status: {workflow.status}")
            
        except Exception as e:
            workflow.status = "error"
            workflow.completed_at = time.time()
            logger.error(f"❌ Workflow {workflow.workflow_id} processing error: {e}")
    
    async def _execute_workflow_step(self, workflow: Workflow, step: WorkflowStep):
        """Execute a single workflow step"""
        step.status = "running"
        
        try:
            # Create task for this step
            task = AgentTask(
                task_id=f"{workflow.workflow_id}_{step.step_id}",
                agent_id=step.agent_id,
                user_id=workflow.user_id,
                task_type=step.task_type,
                parameters=step.parameters,
                metadata={
                    "workflow_id": workflow.workflow_id,
                    "step_id": step.step_id,
                    "timeout": step.timeout
                }
            )
            
            # Submit task
            await self.submit_task(task)
            
            # Wait for completion
            start_time = time.time()
            while time.time() - start_time < step.timeout:
                task_status = await self.get_task_status(task.task_id)
                if task_status and task_status["status"] in ["completed", "failed", "cancelled", "timeout"]:
                    step.status = task_status["status"]
                    step.result = task_status["result"]
                    step.error = task_status["error"]
                    break
                
                await asyncio.sleep(1)
            else:
                # Step timed out
                await self.cancel_task(task.task_id)
                step.status = "timeout"
                step.error = f"Step timed out after {step.timeout} seconds"
            
        except Exception as e:
            step.status = "failed"
            step.error = str(e)
            logger.error(f"❌ Workflow step {step.step_id} failed: {e}")
    
    def _build_dependency_graph(self, steps: List[WorkflowStep]) -> Dict[str, List[str]]:
        """Build dependency graph for workflow steps"""
        graph = {}
        for step in steps:
            graph[step.step_id] = step.depends_on.copy()
        return graph
    
    async def _validate_task(self, task: AgentTask) -> bool:
        """Validate a task before processing"""
        if not task.task_id or not task.agent_id or not task.task_type:
            return False
        
        # Check if agent supports the task type
        agent = self.agents.get(task.agent_id)
        if not agent:
            return False
        
        return await agent._supports_task_type(task.task_type)
    
    async def _validate_workflow(self, workflow: Workflow) -> bool:
        """Validate a workflow before processing"""
        if not workflow.workflow_id or not workflow.steps:
            return False
        
        # Check for circular dependencies
        if self._has_circular_dependencies(workflow.steps):
            return False
        
        # Validate each step
        for step in workflow.steps:
            if not step.step_id or not step.agent_id or not step.task_type:
                return False
            
            # Check if agent exists and supports task type
            agent = self.agents.get(step.agent_id)
            if not agent:
                return False
            
            if not await agent._supports_task_type(step.task_type):
                return False
        
        return True
    
    def _has_circular_dependencies(self, steps: List[WorkflowStep]) -> bool:
        """Check for circular dependencies in workflow steps"""
        # Simple cycle detection using DFS
        graph = {step.step_id: step.depends_on for step in steps}
        visited = set()
        rec_stack = set()
        
        def has_cycle(node):
            if node in rec_stack:
                return True
            if node in visited:
                return False
            
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in graph.get(node, []):
                if has_cycle(neighbor):
                    return True
            
            rec_stack.remove(node)
            return False
        
        for step_id in graph:
            if step_id not in visited:
                if has_cycle(step_id):
                    return True
        
        return False
    
    # Agent event callbacks
    async def _on_agent_task_start(self, task: AgentTask):
        """Called when an agent starts a task"""
        logger.debug(f"🚀 Agent task started: {task.task_id}")
    
    async def _on_agent_task_complete(self, task: AgentTask):
        """Called when an agent completes a task"""
        logger.debug(f"✅ Agent task completed: {task.task_id}")
    
    async def _on_agent_task_error(self, task: AgentTask, error: Exception):
        """Called when an agent task fails"""
        logger.debug(f"❌ Agent task error: {task.task_id} - {error}")
    
    async def _on_agent_status_change(self, status: AgentStatus):
        """Called when an agent status changes"""
        logger.debug(f"🔄 Agent status changed: {status.value}")
    
    async def create_simple_workflow(self, name: str, user_id: str, tasks: List[Dict[str, Any]]) -> Workflow:
        """Create a simple sequential workflow"""
        workflow_id = str(uuid.uuid4())
        steps = []
        
        for i, task_def in enumerate(tasks):
            step = WorkflowStep(
                step_id=f"step_{i}",
                agent_id=task_def["agent_id"],
                task_type=task_def["task_type"],
                parameters=task_def["parameters"],
                depends_on=[f"step_{i-1}"] if i > 0 else [],
                timeout=task_def.get("timeout", 300)
            )
            steps.append(step)
        
        return Workflow(
            workflow_id=workflow_id,
            name=name,
            description=f"Sequential workflow with {len(tasks)} steps",
            user_id=user_id,
            steps=steps
        )
    
    async def shutdown(self):
        """Shutdown the orchestrator gracefully"""
        logger.info("🛑 Shutting down Agent Orchestrator...")
        
        self.status = OrchestratorStatus.SHUTTING_DOWN
        self.is_running = False
        
        # Cancel all workers
        all_workers = self.task_workers + self.workflow_workers
        for worker in all_workers:
            worker.cancel()
        
        # Wait for workers to finish
        if all_workers:
            await asyncio.gather(*all_workers, return_exceptions=True)
        
        # Shutdown all agents
        for agent_id, agent in self.agents.items():
            try:
                await agent.shutdown()
                logger.info(f"✅ Agent {agent_id} shutdown complete")
            except Exception as e:
                logger.error(f"❌ Error shutting down agent {agent_id}: {e}")
        
        logger.success("✅ Agent Orchestrator shutdown complete")

# Create global instance
orchestrator = AgentOrchestrator()