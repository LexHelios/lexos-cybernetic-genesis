#!/usr/bin/env python3
"""
Mock endpoints to add to the API server for missing functionality
"""

from fastapi import FastAPI
from datetime import datetime

def add_mock_endpoints(app: FastAPI):
    """Add mock endpoints for missing functionality"""
    
    @app.get("/api/notifications")
    async def get_notifications():
        return {
            "notifications": [],
            "unread_count": 0,
            "total": 0
        }
    
    @app.get("/api/notifications/count")
    async def get_notification_count():
        return {
            "count": 0,
            "unread": 0
        }
    
    @app.get("/api/notifications/preferences")
    async def get_notification_preferences():
        return {
            "preferences": {
                "emailEnabled": True,
                "pushEnabled": False,
                "inAppEnabled": True,
                "notificationTypes": ["system", "alert", "info"],
                "quietHoursStart": None,
                "quietHoursEnd": None
            }
        }
    
    @app.get("/api/v1/system/info")
    async def get_system_info(include_sensitive: bool = False):
        return {
            "status": "operational",
            "version": "1.0.0",
            "uptime": 3600,
            "timestamp": datetime.now().isoformat(),
            "system": {
                "os": "Linux",
                "python_version": "3.8.10",
                "cpu_count": 8,
                "memory_total": 32 * 1024 * 1024 * 1024,  # 32GB
                "memory_available": 16 * 1024 * 1024 * 1024  # 16GB
            }
        }
    
    @app.get("/api/v1/gpu/status")
    async def get_gpu_status():
        return {
            "gpus": [
                {
                    "id": 0,
                    "name": "NVIDIA H100",
                    "memory_total": 80 * 1024 * 1024 * 1024,  # 80GB
                    "memory_used": 10 * 1024 * 1024 * 1024,   # 10GB
                    "memory_free": 70 * 1024 * 1024 * 1024,   # 70GB
                    "utilization": 15,
                    "temperature": 45
                }
            ],
            "driver_version": "535.104.05",
            "cuda_version": "12.2"
        }