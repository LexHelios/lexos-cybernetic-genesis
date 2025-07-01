#!/usr/bin/env python3
"""
LexOS Base Agent - H100 Production Edition
Foundation class for all AI agents in the LexOS ecosystem
"""

import asyncio
import json
import time
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import uuid
from loguru import logger
import sys

class AgentStatus(Enum):
    IDLE = "idle"
    WORKING = "working"
    ERROR = "error"
    DISABLED = "disabled"

class AgentCapability(Enum):
    WEB_SCRAPING = "web_scraping"
    DATA_ANALYSIS = "data_analysis"
    CODE_EXECUTION = "code_execution"
    FILE_OPERATIONS = "file_operations"
    API_CALLS = "api_calls"
    REASONING = "reasoning"
    CREATIVE_WRITING = "creative_writing"
    FINANCIAL_ANALYSIS = "financial_analysis"
    MEDICAL_RESEARCH = "medical_research"
    LEGAL_ANALYSIS = "legal_analysis"
    GIS_OPERATIONS = "gis_operations"

@dataclass
class AgentTask:
    task_id: str
    agent_id: str
    user_id: str
    task_type: str
    parameters: Dict[str, Any]
    priority: int = 5  # 1-10, 10 is highest
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentMetrics:
    tasks_completed: int = 0
    tasks_failed: int = 0
    total_execution_time: float = 0.0
    average_execution_time: float = 0.0
    last_activity: Optional[float] = None
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    gpu_usage: float = 0.0

class BaseAgent(ABC):
    """Base class for all LexOS AI agents"""
    
    def __init__(self, agent_id: str, name: str, description: str, capabilities: List[AgentCapability]):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.capabilities = capabilities
        self.status = AgentStatus.IDLE
        self.metrics = AgentMetrics()
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.active_tasks: Dict[str, AgentTask] = {}
        self.config: Dict[str, Any] = {}
        self.security_manager = None
        self.is_running = False
        self.worker_task: Optional[asyncio.Task] = None
        
        # Event callbacks
        self.on_task_start: Optional[Callable] = None
        self.on_task_complete: Optional[Callable] = None
        self.on_task_error: Optional[Callable] = None
        self.on_status_change: Optional[Callable] = None
        
        logger.info(f"🤖 Agent {self.name} ({self.agent_id}) initialized")
    
    async def initialize(self, config: Dict[str, Any], security_manager=None):
        """Initialize the agent with configuration and security manager"""
        self.config = config
        self.security_manager = security_manager
        
        # Start the worker task
        self.is_running = True
        self.worker_task = asyncio.create_task(self._worker_loop())
        
        await self._initialize_agent()
        logger.success(f"✅ Agent {self.name} initialized successfully")
    
    @abstractmethod
    async def _initialize_agent(self):
        """Agent-specific initialization logic"""
        pass
    
    @abstractmethod
    async def _execute_task(self, task: AgentTask) -> Dict[str, Any]:
        """Execute a specific task - must be implemented by subclasses"""
        pass
    
    async def submit_task(self, task: AgentTask) -> str:
        """Submit a task to the agent's queue"""
        # Validate task
        if not await self._validate_task(task):
            raise ValueError(f"Invalid task: {task.task_id}")
        
        # Check security permissions
        if self.security_manager:
            has_access = await self.security_manager.check_agent_access(
                task.user_id, self.agent_id, task.task_type
            )
            if not has_access:
                raise PermissionError(f"User {task.user_id} does not have access to {self.agent_id}")
        
        # Add to queue
        await self.task_queue.put(task)
        logger.info(f"📋 Task {task.task_id} submitted to {self.name}")
        
        return task.task_id
    
    async def get_task_status(self, task_id: str) -> Optional[AgentTask]:
        """Get the status of a specific task"""
        return self.active_tasks.get(task_id)
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a running task"""
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            task.status = "cancelled"
            task.completed_at = time.time()
            del self.active_tasks[task_id]
            logger.info(f"❌ Task {task_id} cancelled")
            return True
        return False
    
    async def get_metrics(self) -> AgentMetrics:
        """Get current agent metrics"""
        return self.metrics
    
    async def get_status(self) -> Dict[str, Any]:
        """Get comprehensive agent status"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "status": self.status.value,
            "capabilities": [cap.value for cap in self.capabilities],
            "active_tasks": len(self.active_tasks),
            "queue_size": self.task_queue.qsize(),
            "metrics": {
                "tasks_completed": self.metrics.tasks_completed,
                "tasks_failed": self.metrics.tasks_failed,
                "average_execution_time": self.metrics.average_execution_time,
                "last_activity": self.metrics.last_activity
            }
        }
    
    async def _worker_loop(self):
        """Main worker loop that processes tasks"""
        logger.info(f"🔄 Worker loop started for {self.name}")
        
        while self.is_running:
            try:
                # Get next task from queue (with timeout)
                try:
                    task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Process the task
                await self._process_task(task)
                
            except Exception as e:
                logger.error(f"❌ Worker loop error in {self.name}: {e}")
                await asyncio.sleep(1)
        
        logger.info(f"🛑 Worker loop stopped for {self.name}")
    
    async def _process_task(self, task: AgentTask):
        """Process a single task"""
        task.started_at = time.time()
        task.status = "running"
        self.active_tasks[task.task_id] = task
        self.status = AgentStatus.WORKING
        
        # Trigger callback
        if self.on_task_start:
            await self.on_task_start(task)
        
        # Trigger status change callback
        if self.on_status_change:
            await self.on_status_change(self.status)
        
        try:
            logger.info(f"🚀 Starting task {task.task_id} on {self.name}")
            
            # Execute the task
            result = await self._execute_task(task)
            
            # Mark as completed
            task.completed_at = time.time()
            task.status = "completed"
            task.result = result
            task.progress = 100.0
            
            # Update metrics
            execution_time = task.completed_at - task.started_at
            self.metrics.tasks_completed += 1
            self.metrics.total_execution_time += execution_time
            self.metrics.average_execution_time = (
                self.metrics.total_execution_time / self.metrics.tasks_completed
            )
            self.metrics.last_activity = time.time()
            
            logger.success(f"✅ Task {task.task_id} completed in {execution_time:.2f}s")
            
            # Trigger callback
            if self.on_task_complete:
                await self.on_task_complete(task)
            
        except Exception as e:
            # Mark as failed
            task.completed_at = time.time()
            task.status = "failed"
            task.error = str(e)
            
            # Update metrics
            self.metrics.tasks_failed += 1
            self.metrics.last_activity = time.time()
            
            logger.error(f"❌ Task {task.task_id} failed: {e}")
            
            # Trigger callback
            if self.on_task_error:
                await self.on_task_error(task, e)
        
        finally:
            # Clean up
            if task.task_id in self.active_tasks:
                del self.active_tasks[task.task_id]
            
            # Update status
            if not self.active_tasks:
                self.status = AgentStatus.IDLE
                if self.on_status_change:
                    await self.on_status_change(self.status)
    
    async def _validate_task(self, task: AgentTask) -> bool:
        """Validate a task before execution"""
        # Basic validation
        if not task.task_id or not task.task_type:
            return False
        
        # Check if agent supports this task type
        return await self._supports_task_type(task.task_type)
    
    @abstractmethod
    async def _supports_task_type(self, task_type: str) -> bool:
        """Check if the agent supports a specific task type"""
        pass
    
    async def shutdown(self):
        """Shutdown the agent gracefully"""
        logger.info(f"🛑 Shutting down agent {self.name}")
        
        self.is_running = False
        
        # Cancel worker task
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        
        # Cancel active tasks
        for task_id in list(self.active_tasks.keys()):
            await self.cancel_task(task_id)
        
        # Agent-specific cleanup
        await self._cleanup_agent()
        
        logger.info(f"✅ Agent {self.name} shutdown complete")
    
    @abstractmethod
    async def _cleanup_agent(self):
        """Agent-specific cleanup logic"""
        pass
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.agent_id}, name={self.name}, status={self.status.value})>"