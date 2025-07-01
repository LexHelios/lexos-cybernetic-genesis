#!/usr/bin/env python3
"""
Minimal API Server for Testing
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": int(time.time())}

@app.post("/api/auth/login")
async def login(request: dict):
    if request.get("username") == "admin" and request.get("password") == "Admin123!":
        return {
            "success": True,
            "token": "mock_token_12345",
            "user": {"user_id": "admin", "username": "admin", "role": "admin"},
            "expires_at": int(time.time()) + 86400
        }
    return {"success": False, "error": "Invalid credentials"}

@app.get("/api/system/status")
async def system_status():
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
async def query(request: dict):
    return {
        "query_id": "query_12345",
        "execution_id": "exec_67890",
        "status": "completed",
        "result": {"success": True, "data": f"Result for: {request.get('query', 'test')}"}
    }

if __name__ == "__main__":
    print("🚀 Starting Test API Server on http://localhost:8000")
    print("🔗 External: http://147.185.40.39:20067")
    uvicorn.run(app, host="0.0.0.0", port=8000)