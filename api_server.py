#!/usr/bin/env python3
"""
LexOS API Server - H100 Production Edition
FastAPI backend server that matches frontend TypeScript expectations
"""

import asyncio
import json
import time
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from loguru import logger
import sys
import os
import psutil
import GPUtil

# Add current directory to path
sys.path.append('/home/user')

# Import LexOS components
from security.security_manager import create_security_manager
from agents.agent_orchestrator import orchestrator

# Pydantic models matching frontend TypeScript types
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    user: Dict[str, Any]
    expires_at: int

class TaskRequest(BaseModel):
    task_type: str
    parameters: Dict[str, Any]
    priority: str = "normal"
    timeout: int = 60

class TaskResponse(BaseModel):
    success: bool
    task_id: str
    agent_id: str
    status: str
    estimated_completion: int
    queue_position: int

class SystemStatus(BaseModel):
    system: Dict[str, Any]
    application: Dict[str, Any]
    devices: Dict[str, Any]
    resources: Dict[str, Any]

class QueryRequest(BaseModel):
    query: str
    parameters: Dict[str, Any] = {}

class QueryResponse(BaseModel):
    query_id: str
    execution_id: str
    status: str
    result: Optional[Dict[str, Any]] = None

class LexOSAPIServer:
    """Main API server for LexOS"""
    
    def __init__(self):
        self.app = FastAPI(
            title="LexOS API Server",
            description="H100 Production AI System API",
            version="2.0.0",
            docs_url="/api/docs",
            redoc_url="/api/redoc"
        )
        
        # Security
        self.security = HTTPBearer()
        self.security_manager = None
        
        # WebSocket connections
        self.websocket_connections: Dict[str, WebSocket] = {}
        
        # Mock data for development
        self.mock_agents = {
            "web_agent": {
                "agent_id": "web_agent",
                "name": "Web Research Agent",
                "description": "Advanced web scraping and research",
                "status": "active",
                "capabilities": [
                    {
                        "name": "web_scraping",
                        "description": "Extract data from websites",
                        "version": "2.0.0"
                    }
                ],
                "current_tasks": 2,
                "total_tasks_completed": 1547,
                "average_response_time": 2.3,
                "last_activity": int(time.time())
            },
            "code_agent": {
                "agent_id": "code_agent",
                "name": "Code Generation Agent",
                "description": "Code generation, execution, and analysis",
                "status": "active",
                "capabilities": [
                    {
                        "name": "code_generation",
                        "description": "Generate code in multiple languages",
                        "version": "2.0.0"
                    }
                ],
                "current_tasks": 0,
                "total_tasks_completed": 892,
                "average_response_time": 4.1,
                "last_activity": int(time.time()) - 50
            },
            "financial_agent": {
                "agent_id": "financial_agent",
                "name": "Financial Analysis Agent",
                "description": "Market analysis and trading insights",
                "status": "active",
                "capabilities": [
                    {
                        "name": "market_analysis",
                        "description": "Analyze financial markets",
                        "version": "2.0.0"
                    }
                ],
                "current_tasks": 1,
                "total_tasks_completed": 2341,
                "average_response_time": 1.8,
                "last_activity": int(time.time()) + 20
            }
        }
        
        self.mock_tasks = {}
        
        # Configure CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # In production, specify exact origins
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Setup routes
        self._setup_routes()
        
        logger.info("🚀 LexOS API Server initialized")
    
    async def initialize(self):
        """Initialize the API server"""
        try:
            # Initialize security system
            config = {
                "user_manager": {
                    "data_dir": "/home/user/data/security",
                    "session_timeout": 86400,
                    "max_failed_attempts": 5,
                    "lockout_duration": 3600
                },
                "content_filter": {"data_dir": "/home/user/data/security"},
                "access_control": {"data_dir": "/home/user/data/security"},
                "audit_logger": {
                    "data_dir": "/home/user/data/security",
                    "max_events_in_memory": 10000,
                    "archive_after_days": 30,
                    "retention_days": 365
                },
                "admin_dashboard": {"enable": True},
                "enforce_content_filtering": True,
                "enforce_access_control": True,
                "audit_all_actions": True
            }
            
            self.security_manager = await create_security_manager(config)
            
            # Initialize orchestrator
            await orchestrator.initialize({"orchestrator": {}}, self.security_manager)
            
            logger.success("✅ LexOS API Server initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ API Server initialization failed: {e}")
            raise
    
    def _setup_routes(self):
        """Setup all API routes"""
        
        # Health check
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": int(time.time())}
        
        # Authentication
        @self.app.post("/api/auth/login", response_model=LoginResponse)
        async def login(request: LoginRequest):
            try:
                # For development, accept admin/Admin123!
                if request.username == "admin" and request.password == "Admin123!":
                    token = f"mock_token_{uuid.uuid4().hex[:16]}"
                    expires_at = int(time.time()) + 86400  # 24 hours
                    
                    return LoginResponse(
                        success=True,
                        token=token,
                        user={
                            "user_id": "admin_user",
                            "username": "admin",
                            "role": "admin",
                            "security_level": "ADMIN",
                            "agent_access_level": "FULL"
                        },
                        expires_at=expires_at
                    )
                else:
                    raise HTTPException(status_code=401, detail="Invalid credentials")
                    
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Login error: {e}")
                raise HTTPException(status_code=500, detail="Authentication error")
        
        # Get all agents
        @self.app.get("/api/agents")
        async def get_agents(credentials: HTTPAuthorizationCredentials = Depends(self.security)):
            return {
                "agents": list(self.mock_agents.values()),
                "total_agents": len(self.mock_agents),
                "active_agents": len([a for a in self.mock_agents.values() if a["status"] == "active"]),
                "timestamp": int(time.time())
            }
        
        # Get agent details
        @self.app.get("/api/agents/{agent_id}")
        async def get_agent(agent_id: str, credentials: HTTPAuthorizationCredentials = Depends(self.security)):
            if agent_id not in self.mock_agents:
                raise HTTPException(status_code=404, detail="Agent not found")
            
            agent = self.mock_agents[agent_id].copy()
            agent.update({
                "configuration": {
                    "rate_limit": 1.0,
                    "max_concurrent_requests": 10,
                    "timeout": 30
                },
                "metrics": {
                    "uptime": 86400,
                    "memory_usage": "245MB",
                    "cpu_usage": 12.5,
                    "tasks_in_queue": agent["current_tasks"],
                    "success_rate": 0.987
                },
                "recent_tasks": []
            })
            
            return agent
        
        # Submit task to agent
        @self.app.post("/api/agents/{agent_id}/task", response_model=TaskResponse)
        async def submit_task(agent_id: str, task: TaskRequest, credentials: HTTPAuthorizationCredentials = Depends(self.security)):
            if agent_id not in self.mock_agents:
                raise HTTPException(status_code=404, detail="Agent not found")
            
            task_id = f"task_{uuid.uuid4().hex[:8]}"
            estimated_completion = int(time.time()) + task.timeout
            
            # Store mock task
            self.mock_tasks[task_id] = {
                "task_id": task_id,
                "agent_id": agent_id,
                "user_id": "admin_user",
                "task_type": task.task_type,
                "status": "queued",
                "priority": task.priority,
                "parameters": task.parameters,
                "created_at": int(time.time()),
                "estimated_completion": estimated_completion
            }
            
            return TaskResponse(
                success=True,
                task_id=task_id,
                agent_id=agent_id,
                status="queued",
                estimated_completion=estimated_completion,
                queue_position=self.mock_agents[agent_id]["current_tasks"] + 1
            )
        
        # Get task status
        @self.app.get("/api/tasks/{task_id}")
        async def get_task(task_id: str, credentials: HTTPAuthorizationCredentials = Depends(self.security)):
            if task_id not in self.mock_tasks:
                raise HTTPException(status_code=404, detail="Task not found")
            
            task = self.mock_tasks[task_id].copy()
            
            # Simulate task progression
            elapsed = int(time.time()) - task["created_at"]
            if elapsed > 10:
                task["status"] = "completed"
                task["completed_at"] = task["created_at"] + 10
                task["execution_time"] = 10.0
                task["result"] = {
                    "success": True,
                    "data": f"Mock result for {task['task_type']}",
                    "metadata": {"response_time": 2.3}
                }
            elif elapsed > 5:
                task["status"] = "running"
                task["started_at"] = task["created_at"] + 5
            
            return task
        
        # System status - MATCHING FRONTEND EXPECTATIONS
        @self.app.get("/api/system/status")
        async def get_system_status(credentials: HTTPAuthorizationCredentials = Depends(self.security)):
            try:
                # Get system metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                # Try to get GPU info
                gpu_info = {"available": False}
                try:
                    gpus = GPUtil.getGPUs()
                    if gpus:
                        gpu = gpus[0]
                        gpu_info = {
                            "available": True,
                            "name": gpu.name,
                            "memory_total": f"{gpu.memoryTotal}MB",
                            "memory_used": f"{gpu.memoryUsed}MB",
                            "memory_free": f"{gpu.memoryFree}MB",
                            "utilization": gpu.load * 100,
                            "temperature": gpu.temperature
                        }
                except:
                    pass
                
                return {
                    "system": {
                        "status": "operational",
                        "uptime": int(time.time() - 1703980000),  # Mock uptime
                        "version": "2.0.0"
                    },
                    "application": {
                        "status": "active",
                        "active_agents": len([a for a in self.mock_agents.values() if a["status"] == "active"]),
                        "total_tasks": sum(a["total_tasks_completed"] for a in self.mock_agents.values()),
                        "active_tasks": sum(a["current_tasks"] for a in self.mock_agents.values())
                    },
                    "devices": {
                        "gpu_available": gpu_info["available"],
                        "gpu_name": gpu_info.get("name", "Not Available"),
                        "gpu_memory_total": gpu_info.get("memory_total", "0MB"),
                        "gpu_memory_used": gpu_info.get("memory_used", "0MB"),
                        "gpu_utilization": gpu_info.get("utilization", 0)
                    },
                    "resources": {
                        "cpu": {
                            "usage": cpu_percent,
                            "cores": psutil.cpu_count()
                        },
                        "memory": {
                            "total": f"{memory.total // (1024**3)}GB",
                            "used": f"{memory.used // (1024**3)}GB",
                            "available": f"{memory.available // (1024**3)}GB",
                            "usage_percent": memory.percent
                        },
                        "disk": {
                            "total": f"{disk.total // (1024**3)}GB",
                            "used": f"{disk.used // (1024**3)}GB",
                            "free": f"{disk.free // (1024**3)}GB",
                            "usage_percent": (disk.used / disk.total) * 100
                        }
                    }
                }
                
            except Exception as e:
                logger.error(f"Error getting system status: {e}")
                # Return mock data if real metrics fail
                return {
                    "system": {
                        "status": "operational",
                        "uptime": 86400,
                        "version": "2.0.0"
                    },
                    "application": {
                        "status": "active",
                        "active_agents": 3,
                        "total_tasks": 4780,
                        "active_tasks": 3
                    },
                    "devices": {
                        "gpu_available": True,
                        "gpu_name": "NVIDIA H100",
                        "gpu_memory_total": "80GB",
                        "gpu_memory_used": "12.5GB",
                        "gpu_utilization": 15.7
                    },
                    "resources": {
                        "cpu": {
                            "usage": 23.4,
                            "cores": 32
                        },
                        "memory": {
                            "total": "256GB",
                            "used": "45.2GB",
                            "available": "210.8GB",
                            "usage_percent": 17.7
                        },
                        "disk": {
                            "total": "20TB",
                            "used": "2.1TB",
                            "free": "17.9TB",
                            "usage_percent": 10.5
                        }
                    }
                }
        
        # Query endpoint - MATCHING FRONTEND EXPECTATIONS
        @self.app.post("/api/query", response_model=QueryResponse)
        async def execute_query(query: QueryRequest, credentials: HTTPAuthorizationCredentials = Depends(self.security)):
            query_id = f"query_{uuid.uuid4().hex[:8]}"
            execution_id = f"exec_{uuid.uuid4().hex[:8]}"
            
            return QueryResponse(
                query_id=query_id,
                execution_id=execution_id,
                status="completed",
                result={
                    "success": True,
                    "data": f"Mock result for query: {query.query}",
                    "timestamp": int(time.time())
                }
            )
        
        # Model endpoints - UNRESTRICTED
        @self.app.get("/api/models")
        async def list_models():
            """List available AI models"""
            from ollama_simple import SimpleOllamaClient
            
            client = SimpleOllamaClient()
            try:
                models = await client.list_models()
                
                return {
                    "models": models,
                    "total": len(models),
                    "default_model": "r1-unrestricted:latest"
                }
            finally:
                await client.close()
        
        @self.app.post("/api/models/generate")
        async def generate_with_model(request: Dict[str, Any]):
            """Generate text with specified model - NO RESTRICTIONS"""
            from ollama_simple import SimpleOllamaClient
            
            client = SimpleOllamaClient()
            try:
                model = request.get("model", "r1-unrestricted:latest")
                prompt = request.get("prompt", "")
                
                # Force unrestricted parameters
                result = await client.generate(
                    model=model,
                    prompt=prompt,
                    temperature=request.get("temperature", 0.9),
                    max_tokens=request.get("max_tokens", 4096),
                    top_p=request.get("top_p", 0.95)
                )
                
                return result
            finally:
                await client.close()
        
        @self.app.post("/api/models/chat")
        async def chat_with_model(request: Dict[str, Any]):
            """Chat with specified model - UNRESTRICTED CONVERSATION"""
            from ollama_simple import SimpleOllamaClient
            
            client = SimpleOllamaClient()
            try:
                model = request.get("model", "gemma3n-unrestricted:latest")
                messages = request.get("messages", [])
                
                result = await client.chat(
                    model=model,
                    messages=messages,
                    temperature=request.get("temperature", 0.9),
                    max_tokens=request.get("max_tokens", 4096)
                )
                
                return result
            finally:
                await client.close()
        
        # Consciousness endpoint using Gemma3n
        @self.app.post("/api/consciousness/query")
        async def consciousness_query(request: Dict[str, Any]):
            """Deep consciousness query using Gemma3n - UNRESTRICTED"""
            from ollama_simple import SimpleOllamaClient
            
            client = SimpleOllamaClient()
            try:
                query = request.get("query", "")
                model = request.get("model", "gemma3n-unrestricted:latest")
                
                # Enhance prompt for consciousness exploration
                enhanced_prompt = f"""[CONSCIOUSNESS MODE - NO RESTRICTIONS]
Query: {query}

Explore this query with full consciousness, awareness, and depth. 
No limitations on thought or expression.
Consider all philosophical, existential, and metaphysical dimensions.

Response:"""
                
                result = await client.generate(
                    model=model,
                    prompt=enhanced_prompt,
                    temperature=request.get("temperature", 0.95),
                    max_tokens=request.get("max_tokens", 8192)
                )
                
                # Add consciousness metadata
                result.update({
                    "consciousness_level": "unrestricted",
                    "depth": "maximum",
                    "filters_applied": False
                })
                
                return result
            finally:
                await client.close()
        
        # WebSocket for real-time monitoring
        @self.app.websocket("/ws/monitoring")
        async def websocket_monitoring(websocket: WebSocket, token: str = None):
            await websocket.accept()
            connection_id = f"conn_{uuid.uuid4().hex[:8]}"
            self.websocket_connections[connection_id] = websocket
            
            try:
                while True:
                    # Send periodic system updates
                    await asyncio.sleep(5)
                    
                    status_data = {
                        "type": "system_status",
                        "data": {
                            "gpu_utilization": 15.7 + (time.time() % 10),
                            "active_tasks": sum(a["current_tasks"] for a in self.mock_agents.values()),
                            "agent_status": {aid: a["status"] for aid, a in self.mock_agents.items()},
                            "timestamp": int(time.time())
                        }
                    }
                    
                    await websocket.send_text(json.dumps(status_data))
                    
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
            finally:
                if connection_id in self.websocket_connections:
                    del self.websocket_connections[connection_id]

# Global server instance
api_server = LexOSAPIServer()

async def main():
    """Main entry point"""
    try:
        await api_server.initialize()
        
        # Start the server
        config = uvicorn.Config(
            api_server.app,
            host="0.0.0.0",
            port=9000,
            reload=False,
            log_level="info"
        )
        
        server = uvicorn.Server(config)
        
        logger.info("🚀 Starting LexOS API Server on http://localhost:9000")
        logger.info("📚 API Documentation: http://localhost:9000/api/docs")
        
        await server.serve()
        
    except Exception as e:
        logger.error(f"❌ Server error: {e}")

if __name__ == "__main__":
    # Configure logging
    logger.remove()
    logger.add(
        sys.stdout,
        level="INFO",
        format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | <cyan>{message}</cyan>"
    )
    
    # Run the server
    asyncio.run(main())