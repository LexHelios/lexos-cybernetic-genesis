#!/usr/bin/env python3
"""
🚀 LexOS Simple API Server
A streamlined version for quick deployment
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime
import json
import os

# Initialize FastAPI app
app = FastAPI(
    title="LexOS API",
    description="LexOS Simple API Server",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "🚀 LexOS API Server is running!", "timestamp": datetime.now().isoformat()}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/api/status")
async def get_status():
    return {
        "server": "running",
        "agents": {
            "web_agent": "available",
            "code_agent": "available", 
            "financial_agent": "available"
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/chat")
async def chat_endpoint(request: dict):
    """Simple chat endpoint"""
    message = request.get("message", "")
    
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Simple echo response for now
    response = {
        "response": f"Echo: {message}",
        "timestamp": datetime.now().isoformat(),
        "agent": "simple_responder"
    }
    
    return response

@app.get("/api/agents")
async def list_agents():
    """List available agents"""
    return {
        "agents": [
            {
                "id": "web_agent",
                "name": "Web Research Agent",
                "status": "available",
                "description": "Performs web research and data gathering"
            },
            {
                "id": "code_agent", 
                "name": "Code Generation Agent",
                "status": "available",
                "description": "Generates and analyzes code"
            },
            {
                "id": "financial_agent",
                "name": "Financial Analysis Agent", 
                "status": "available",
                "description": "Provides financial analysis and insights"
            }
        ]
    }

@app.post("/api/agents/{agent_id}/execute")
async def execute_agent_task(agent_id: str, request: dict):
    """Execute a task with a specific agent"""
    task = request.get("task", "")
    
    if not task:
        raise HTTPException(status_code=400, detail="Task is required")
    
    if agent_id not in ["web_agent", "code_agent", "financial_agent"]:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Simple response for now
    response = {
        "agent_id": agent_id,
        "task": task,
        "result": f"Task '{task}' executed by {agent_id}",
        "status": "completed",
        "timestamp": datetime.now().isoformat()
    }
    
    return response

if __name__ == "__main__":
    print("🚀 Starting LexOS Simple API Server...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9000,
        log_level="info"
    )