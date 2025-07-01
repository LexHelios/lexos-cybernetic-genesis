#!/usr/bin/env python3
"""
LexOS Main Server - H100 Production Edition
The central server that orchestrates all LexOS components
"""

import asyncio
import json
import os
import time
from typing import Dict, List, Any, Optional
from pathlib import Path
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from loguru import logger
import sys

# Add the current directory to Python path
sys.path.append('/home/user')

from security.security_manager import create_security_manager
from security.user_manager import UserProfile, UserRole

class LexOSServer:
    """Main LexOS server orchestrating all components"""
    
    def __init__(self):
        self.app = FastAPI(
            title="LexOS - Sharma Family AI Empire",
            description="Advanced AI orchestration system with family-safe security",
            version="1.0.0",
            docs_url="/api/docs",
            redoc_url="/api/redoc"
        )
        
        # Security manager
        self.security_manager = None
        
        # WebSocket connections
        self.websocket_connections: Dict[str, WebSocket] = {}
        
        # System status
        self.system_status = {
            "status": "initializing",
            "components": {},
            "uptime": 0,
            "start_time": time.time()
        }
        
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
        
        logger.info("🚀 LexOS Server initialized")
    
    async def initialize(self):
        """Initialize all LexOS components"""
        try:
            logger.info("🛡️ Initializing Security Manager...")
            
            # Security configuration
            security_config = {
                "user_manager": {
                    "data_dir": "/home/user/data/security",
                    "session_timeout": 86400,  # 24 hours
                    "max_failed_attempts": 5,
                    "lockout_duration": 3600  # 1 hour
                },
                "content_filter": {
                    "data_dir": "/home/user/data/security"
                },
                "access_control": {
                    "data_dir": "/home/user/data/security"
                },
                "audit_logger": {
                    "data_dir": "/home/user/data/security",
                    "max_events_in_memory": 10000,
                    "archive_after_days": 30,
                    "retention_days": 365
                },
                "admin_dashboard": {
                    "enable": True
                },
                "enforce_content_filtering": True,
                "enforce_access_control": True,
                "audit_all_actions": True,
                "password_policy": {
                    "min_length": 8,
                    "require_uppercase": True,
                    "require_lowercase": True,
                    "require_numbers": True,
                    "require_special_chars": True
                }
            }
            
            # Initialize security manager
            self.security_manager = await create_security_manager(security_config)
            
            # Update system status
            self.system_status["components"]["security"] = "active"
            self.system_status["status"] = "active"
            
            logger.success("✅ LexOS Server fully initialized!")
            
        except Exception as e:
            logger.error(f"❌ LexOS Server initialization failed: {e}")
            self.system_status["status"] = "error"
            self.system_status["error"] = str(e)
            raise
    
    def _setup_routes(self):
        """Setup all API routes"""
        
        # Health check
        @self.app.get("/health")
        async def health_check():
            self.system_status["uptime"] = time.time() - self.system_status["start_time"]
            return self.system_status
        
        # Authentication routes
        @self.app.post("/api/auth/login")
        async def login(request: Request):
            try:
                data = await request.json()
                username = data.get("username")
                password = data.get("password")
                
                if not username or not password:
                    raise HTTPException(status_code=400, detail="Username and password required")
                
                # Get client info
                client_ip = request.client.host
                user_agent = request.headers.get("user-agent", "")
                
                # Authenticate
                auth_result = await self.security_manager.authenticate_user(
                    username, password, client_ip, user_agent
                )
                
                if auth_result:
                    return {
                        "success": True,
                        "session_id": auth_result["session_id"],
                        "user": auth_result["user"]
                    }
                else:
                    raise HTTPException(status_code=401, detail="Invalid credentials")
                    
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Login error: {e}")
                raise HTTPException(status_code=500, detail="Authentication error")
        
        @self.app.post("/api/auth/logout")
        async def logout(request: Request):
            try:
                data = await request.json()
                session_id = data.get("session_id")
                
                if not session_id:
                    raise HTTPException(status_code=400, detail="Session ID required")
                
                success = await self.security_manager.logout_user(session_id)
                
                return {"success": success}
                
            except Exception as e:
                logger.error(f"Logout error: {e}")
                raise HTTPException(status_code=500, detail="Logout error")
        
        @self.app.get("/api/auth/validate")
        async def validate_session(session_id: str):
            try:
                user = await self.security_manager.validate_session(session_id)
                
                if user:
                    return {
                        "valid": True,
                        "user": {
                            "user_id": user.user_id,
                            "username": user.username,
                            "full_name": user.full_name,
                            "role": user.role.value,
                            "security_level": user.security_level,
                            "agent_access_level": user.agent_access_level
                        }
                    }
                else:
                    return {"valid": False}
                    
            except Exception as e:
                logger.error(f"Session validation error: {e}")
                return {"valid": False, "error": str(e)}
        
        # User management routes
        @self.app.post("/api/users/create")
        async def create_user(request: Request):
            try:
                data = await request.json()
                admin_session_id = data.get("admin_session_id")
                user_data = data.get("user_data")
                
                if not admin_session_id or not user_data:
                    raise HTTPException(status_code=400, detail="Admin session and user data required")
                
                result = await self.security_manager.create_user(admin_session_id, user_data)
                
                if result["success"]:
                    return result
                else:
                    raise HTTPException(status_code=400, detail=result["error"])
                    
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"User creation error: {e}")
                raise HTTPException(status_code=500, detail="User creation error")
        
        # Content filtering routes
        @self.app.post("/api/content/filter")
        async def filter_content(request: Request):
            try:
                data = await request.json()
                session_id = data.get("session_id")
                content = data.get("content")
                content_type = data.get("content_type", "text")
                
                if not session_id or not content:
                    raise HTTPException(status_code=400, detail="Session ID and content required")
                
                result = await self.security_manager.filter_content(
                    session_id, content, content_type
                )
                
                return result
                
            except Exception as e:
                logger.error(f"Content filtering error: {e}")
                raise HTTPException(status_code=500, detail="Content filtering error")
        
        # Access control routes
        @self.app.post("/api/access/check")
        async def check_access(request: Request):
            try:
                data = await request.json()
                session_id = data.get("session_id")
                resource_type = data.get("resource_type")
                resource_id = data.get("resource_id")
                permission = data.get("permission")
                
                if not all([session_id, resource_type, resource_id, permission]):
                    raise HTTPException(status_code=400, detail="All access parameters required")
                
                # Get client info
                client_ip = request.client.host
                user_agent = request.headers.get("user-agent", "")
                
                has_access = await self.security_manager.check_access(
                    session_id, resource_type, resource_id, permission, client_ip, user_agent
                )
                
                return {"has_access": has_access}
                
            except Exception as e:
                logger.error(f"Access check error: {e}")
                raise HTTPException(status_code=500, detail="Access check error")
        
        # Admin dashboard routes
        @self.app.get("/api/admin/dashboard")
        async def get_dashboard_data(admin_session_id: str):
            try:
                dashboard_data = await self.security_manager.get_security_dashboard_data(admin_session_id)
                
                if "error" in dashboard_data:
                    raise HTTPException(status_code=403, detail=dashboard_data["error"])
                
                return dashboard_data
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Dashboard data error: {e}")
                raise HTTPException(status_code=500, detail="Dashboard error")
        
        # Audit log routes
        @self.app.get("/api/audit/logs")
        async def get_audit_logs(
            session_id: str,
            limit: int = 100,
            offset: int = 0,
            user_id: Optional[str] = None,
            category: Optional[str] = None,
            severity: Optional[str] = None
        ):
            try:
                # Validate admin session
                user = await self.security_manager.validate_session(session_id)
                if not user or user.role != UserRole.ADMIN:
                    raise HTTPException(status_code=403, detail="Admin access required")
                
                logs = await self.security_manager.audit_logger.get_logs(
                    limit=limit,
                    offset=offset,
                    user_id=user_id,
                    category=category,
                    severity=severity
                )
                
                return {"logs": logs}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Audit logs error: {e}")
                raise HTTPException(status_code=500, detail="Audit logs error")
        
        # WebSocket for real-time updates
        @self.app.websocket("/ws/{session_id}")
        async def websocket_endpoint(websocket: WebSocket, session_id: str):
            try:
                # Validate session
                user = await self.security_manager.validate_session(session_id)
                if not user:
                    await websocket.close(code=4001, reason="Invalid session")
                    return
                
                await websocket.accept()
                self.websocket_connections[session_id] = websocket
                
                logger.info(f"🔌 WebSocket connected: {user.username}")
                
                try:
                    while True:
                        # Keep connection alive and handle messages
                        data = await websocket.receive_text()
                        message = json.loads(data)
                        
                        # Handle different message types
                        if message.get("type") == "ping":
                            await websocket.send_text(json.dumps({"type": "pong"}))
                        
                except WebSocketDisconnect:
                    pass
                
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
            
            finally:
                if session_id in self.websocket_connections:
                    del self.websocket_connections[session_id]
                logger.info(f"🔌 WebSocket disconnected: {session_id}")
        
        # Static file serving (for frontend)
        @self.app.get("/", response_class=HTMLResponse)
        async def serve_frontend():
            return """
            <!DOCTYPE html>
            <html>
            <head>
                <title>LexOS - Sharma Family AI Empire</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center;
                    }
                    .container { 
                        text-align: center; background: rgba(255,255,255,0.1); 
                        padding: 60px; border-radius: 20px; backdrop-filter: blur(10px);
                        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    }
                    h1 { font-size: 3em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
                    .status { 
                        background: rgba(0,255,0,0.2); padding: 20px; border-radius: 10px; 
                        margin: 30px 0; border: 2px solid rgba(0,255,0,0.5);
                    }
                    .api-links { margin-top: 40px; }
                    .api-links a { 
                        display: inline-block; margin: 10px; padding: 15px 30px; 
                        background: rgba(255,255,255,0.2); color: white; text-decoration: none; 
                        border-radius: 10px; transition: all 0.3s;
                    }
                    .api-links a:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
                    .features { 
                        display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                        gap: 20px; margin-top: 40px; text-align: left;
                    }
                    .feature { 
                        background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;
                        border-left: 4px solid #00ff88;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🛡️ LexOS Security System</h1>
                    <p style="font-size: 1.2em; opacity: 0.9;">Sharma Family AI Empire - H100 Production Edition</p>
                    
                    <div class="status">
                        <h3>🟢 System Status: ACTIVE</h3>
                        <p>All security components operational</p>
                    </div>
                    
                    <div class="features">
                        <div class="feature">
                            <h4>👥 User Management</h4>
                            <p>Multi-role family member management with granular permissions</p>
                        </div>
                        <div class="feature">
                            <h4>🛡️ Content Filtering</h4>
                            <p>Advanced content safety with customizable security levels</p>
                        </div>
                        <div class="feature">
                            <h4>🔐 Access Control</h4>
                            <p>Resource-based permissions and agent access restrictions</p>
                        </div>
                        <div class="feature">
                            <h4>📋 Audit Logging</h4>
                            <p>Comprehensive activity tracking and security monitoring</p>
                        </div>
                    </div>
                    
                    <div class="api-links">
                        <a href="/api/docs">📚 API Documentation</a>
                        <a href="/health">💓 System Health</a>
                        <a href="/api/redoc">📖 API Reference</a>
                    </div>
                    
                    <p style="margin-top: 40px; opacity: 0.7;">
                        Ready to connect your frontend application
                    </p>
                </div>
            </body>
            </html>
            """
    
    async def broadcast_to_websockets(self, message: Dict[str, Any], user_filter: Optional[str] = None):
        """Broadcast message to connected WebSocket clients"""
        if not self.websocket_connections:
            return
        
        message_str = json.dumps(message)
        disconnected = []
        
        for session_id, websocket in self.websocket_connections.items():
            try:
                if user_filter:
                    # Check if user matches filter
                    user = await self.security_manager.validate_session(session_id)
                    if not user or user.user_id != user_filter:
                        continue
                
                await websocket.send_text(message_str)
                
            except Exception as e:
                logger.warning(f"WebSocket send failed for {session_id}: {e}")
                disconnected.append(session_id)
        
        # Clean up disconnected clients
        for session_id in disconnected:
            if session_id in self.websocket_connections:
                del self.websocket_connections[session_id]
    
    async def cleanup(self):
        """Cleanup server resources"""
        try:
            if self.security_manager:
                await self.security_manager.cleanup()
            
            # Close WebSocket connections
            for websocket in self.websocket_connections.values():
                try:
                    await websocket.close()
                except:
                    pass
            
            logger.info("🛡️ LexOS Server cleanup completed")
            
        except Exception as e:
            logger.error(f"Server cleanup error: {e}")

# Global server instance
lexos_server = None

async def create_lexos_server():
    """Create and initialize LexOS server"""
    global lexos_server
    lexos_server = LexOSServer()
    await lexos_server.initialize()
    return lexos_server

def get_app():
    """Get FastAPI app instance"""
    if lexos_server is None:
        raise RuntimeError("LexOS server not initialized")
    return lexos_server.app

if __name__ == "__main__":
    # Configure logging
    logger.remove()
    logger.add(
        "/home/user/logs/lexos_server.log",
        rotation="100 MB",
        retention="30 days",
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
    )
    logger.add(
        sys.stdout,
        level="INFO",
        format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | <cyan>{message}</cyan>"
    )
    
    async def startup():
        """Startup event"""
        global lexos_server
        lexos_server = await create_lexos_server()
        logger.success("🚀 LexOS Server is LIVE on H100!")
    
    async def shutdown():
        """Shutdown event"""
        if lexos_server:
            await lexos_server.cleanup()
    
    # Create server instance
    server = LexOSServer()
    
    # Add startup/shutdown events
    server.app.add_event_handler("startup", startup)
    server.app.add_event_handler("shutdown", shutdown)
    
    # Run server
    logger.info("🔥 Starting LexOS Server on H100...")
    uvicorn.run(
        server.app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    )