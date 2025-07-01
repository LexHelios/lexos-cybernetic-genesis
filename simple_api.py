#!/usr/bin/env python3
"""
LexOS Simple API Server - Matching Frontend TypeScript Types
"""

import asyncio
import json
import time
import uuid
from typing import Dict, List, Any, Optional
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import psutil
import sys

# Configure logging
from loguru import logger
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | <cyan>{message}</cyan>")

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class TaskRequest(BaseModel):
    task_type: str
    parameters: Dict[str, Any]
    priority: str = "normal"
    timeout: int = 60

class QueryRequest(BaseModel):
    query: str
    parameters: Dict[str, Any] = {}

# FastAPI app
app = FastAPI(
    title="LexOS API",
    description="H100 AI System API",
    version="2.0.0",
    docs_url="/api/docs"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Mock data
mock_agents = {
    "web_agent": {
        "agent_id": "web_agent",
        "name": "Web Research Agent",
        "description": "Advanced web scraping and research",
        "status": "active",
        "capabilities": [{"name": "web_scraping", "description": "Extract data from websites", "version": "2.0.0"}],
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
        "capabilities": [{"name": "code_generation", "description": "Generate code", "version": "2.0.0"}],
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
        "capabilities": [{"name": "market_analysis", "description": "Analyze markets", "version": "2.0.0"}],
        "current_tasks": 1,
        "total_tasks_completed": 2341,
        "average_response_time": 1.8,
        "last_activity": int(time.time()) + 20
    }
}

mock_tasks = {}
websocket_connections = {}

# Routes
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": int(time.time())}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    if request.username == "admin" and request.password == "Admin123!":
        token = f"mock_token_{uuid.uuid4().hex[:16]}"
        return {
            "success": True,
            "token": token,
            "user": {
                "user_id": "admin_user",
                "username": "admin",
                "role": "admin",
                "security_level": "ADMIN",
                "agent_access_level": "FULL"
            },
            "expires_at": int(time.time()) + 86400
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/agents")
async def get_agents(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return {
        "agents": list(mock_agents.values()),
        "total_agents": len(mock_agents),
        "active_agents": len([a for a in mock_agents.values() if a["status"] == "active"]),
        "timestamp": int(time.time())
    }

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if agent_id not in mock_agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = mock_agents[agent_id].copy()
    agent.update({
        "configuration": {"rate_limit": 1.0, "max_concurrent_requests": 10, "timeout": 30},
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

@app.post("/api/agents/{agent_id}/task")
async def submit_task(agent_id: str, task: TaskRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if agent_id not in mock_agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    task_id = f"task_{uuid.uuid4().hex[:8]}"
    estimated_completion = int(time.time()) + task.timeout
    
    mock_tasks[task_id] = {
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
    
    return {
        "success": True,
        "task_id": task_id,
        "agent_id": agent_id,
        "status": "queued",
        "estimated_completion": estimated_completion,
        "queue_position": mock_agents[agent_id]["current_tasks"] + 1
    }

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if task_id not in mock_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = mock_tasks[task_id].copy()
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

@app.get("/api/system/status")
async def get_system_status(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "system": {
                "status": "operational",
                "uptime": int(time.time() - 1703980000),
                "version": "2.0.0"
            },
            "application": {
                "status": "active",
                "active_agents": len([a for a in mock_agents.values() if a["status"] == "active"]),
                "total_tasks": sum(a["total_tasks_completed"] for a in mock_agents.values()),
                "active_tasks": sum(a["current_tasks"] for a in mock_agents.values())
            },
            "devices": {
                "gpu_available": True,
                "gpu_name": "NVIDIA H100",
                "gpu_memory_total": "80GB",
                "gpu_memory_used": "12.5GB",
                "gpu_utilization": 15.7 + (time.time() % 10)
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
        return {
            "system": {"status": "operational", "uptime": 86400, "version": "2.0.0"},
            "application": {"status": "active", "active_agents": 3, "total_tasks": 4780, "active_tasks": 3},
            "devices": {"gpu_available": True, "gpu_name": "NVIDIA H100", "gpu_memory_total": "80GB", "gpu_memory_used": "12.5GB", "gpu_utilization": 15.7},
            "resources": {
                "cpu": {"usage": 23.4, "cores": 32},
                "memory": {"total": "256GB", "used": "45.2GB", "available": "210.8GB", "usage_percent": 17.7},
                "disk": {"total": "20TB", "used": "2.1TB", "free": "17.9TB", "usage_percent": 10.5}
            }
        }

@app.post("/api/query")
async def execute_query(query: QueryRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    query_id = f"query_{uuid.uuid4().hex[:8]}"
    execution_id = f"exec_{uuid.uuid4().hex[:8]}"
    
    return {
        "query_id": query_id,
        "execution_id": execution_id,
        "status": "completed",
        "result": {
            "success": True,
            "data": f"Mock result for query: {query.query}",
            "timestamp": int(time.time())
        }
    }

@app.websocket("/ws/monitoring")
async def websocket_monitoring(websocket: WebSocket, token: str = None):
    await websocket.accept()
    connection_id = f"conn_{uuid.uuid4().hex[:8]}"
    websocket_connections[connection_id] = websocket
    
    try:
        while True:
            await asyncio.sleep(5)
            
            status_data = {
                "type": "system_status",
                "data": {
                    "gpu_utilization": 15.7 + (time.time() % 10),
                    "active_tasks": sum(a["current_tasks"] for a in mock_agents.values()),
                    "agent_status": {aid: a["status"] for aid, a in mock_agents.items()},
                    "timestamp": int(time.time())
                }
            }
            
            await websocket.send_text(json.dumps(status_data))
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if connection_id in websocket_connections:
            del websocket_connections[connection_id]

if __name__ == "__main__":
    logger.info("🚀 Starting LexOS Simple API Server")
    logger.info("🌐 Server: http://localhost:8000")
    logger.info("📚 Docs: http://localhost:8000/api/docs")
    logger.info("🔗 External: http://147.185.40.39:20067")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )