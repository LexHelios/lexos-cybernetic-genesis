#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import asyncio
import json
from datetime import datetime

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    user: dict

# Simple credentials (in production, use proper hashing and database)
USERS = {
    "admin": {
        "password": "admin123",
        "full_name": "System Administrator",
        "role": "admin",
        "permissions": ["all"]
    },
    "operator": {
        "password": "operator123",
        "full_name": "System Operator", 
        "role": "operator",
        "permissions": ["read", "execute"]
    }
}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # Check if user exists and password matches
    user = USERS.get(request.username)
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Return success response
    return {
        "success": True,
        "token": f"mock-token-{request.username}",
        "user": {
            "username": request.username,
            "full_name": user["full_name"],
            "role": user["role"],
            "permissions": user["permissions"]
        }
    }

@app.get("/api/auth/validate")
async def validate():
    # Mock validation - always return valid for now
    return {
        "valid": True,
        "user": {
            "username": "admin",
            "full_name": "System Administrator",
            "role": "admin"
        }
    }

@app.get("/api/auth/me")
async def get_current_user():
    # Mock current user - in production, validate token
    return {
        "id": "user-admin-001",
        "username": "admin",
        "email": "admin@sharma-legacy.com",
        "full_name": "System Administrator",
        "role": "admin",
        "permissions": ["all"],
        "avatar": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

@app.get("/api/notifications")
async def get_notifications():
    return []

@app.get("/api/notifications/count")
async def get_notification_count():
    return {"count": 0}

@app.get("/api/notifications/preferences")
async def get_preferences():
    return {
        "emailEnabled": True,
        "pushEnabled": True,
        "inAppEnabled": True,
        "notificationTypes": []
    }

@app.get("/api/system/status")
async def get_system_status():
    return {
        "hardware": {
            "cpu": {"usage": 45, "cores": 32, "load_average": [2.5, 2.1, 1.8]},
            "memory": {"used": "12.4GB", "total": "32GB", "percentage": 38.75, "usage_percent": 38.75},
            "gpu": {
                "model": "NVIDIA H100 80GB HBM3",
                "usage": 78,
                "memory": 85,
                "temperature": 72,
                "utilization": 78,
                "memory_used": "68GB",
                "memory_total": "80GB"
            },
            "disk": {
                "used": "45.6GB",
                "total": "100GB",
                "usage_percent": 45.6
            }
        },
        "orchestrator": {
            "active_agents": 4,
            "active_tasks": 12,
            "queued_tasks": 3,
            "completed_tasks": 847,
            "failed_tasks": 23,
            "total_tasks": 870
        },
        "system": {
            "uptime": 86400
        }
    }

# Mock endpoints for other services
@app.get("/api/agents")
async def get_agents():
    return {
        "agents": [
            {
                "agent_id": "agent-001",
                "name": "LEX-Alpha-001",
                "description": "General Purpose AI Agent",
                "type": "general",
                "status": "active",
                "current_tasks": 2,
                "total_tasks_completed": 1247,
                "average_response_time": 1.2,
                "last_activity": 1751256000000,
                "capabilities": [
                    {"name": "NLP", "enabled": True},
                    {"name": "Code Generation", "enabled": True},
                    {"name": "Analysis", "enabled": True}
                ],
                "created_at": 1751000000000
            },
            {
                "agent_id": "agent-002",
                "name": "LEX-Beta-002",
                "description": "Research Assistant Agent",
                "type": "research",
                "status": "idle",
                "current_tasks": 0,
                "total_tasks_completed": 892,
                "average_response_time": 2.1,
                "last_activity": 1751250000000,
                "capabilities": [
                    {"name": "Research", "enabled": True},
                    {"name": "Data Mining", "enabled": True},
                    {"name": "Synthesis", "enabled": True}
                ],
                "created_at": 1751000000000
            }
        ],
        "total_agents": 2,
        "active_agents": 1
    }

@app.get("/api/system/metrics")
async def get_metrics():
    return {
        "cpu": {"usage": 45, "cores": 32},
        "memory": {"used": "12.4GB", "total": "32GB", "percentage": 38.75},
        "gpu": {"usage": 78, "memory": 85, "temperature": 72},
        "network": {"in": 125.4, "out": 89.2},
        "storage": {"used": "45.6GB", "total": "100GB", "percentage": 45.6}
    }

@app.websocket("/ws/monitoring")
async def websocket_monitoring(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json({
                "type": "metrics",
                "data": {
                    "cpu": 45,
                    "memory": 38,
                    "timestamp": 1234567890
                }
            })
            await asyncio.sleep(2)
    except Exception:
        pass

@app.websocket("/ws")
async def websocket_main(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(30)
    except Exception:
        pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)