#!/usr/bin/env python3
"""
LexOS Admin Dashboard - H100 Production Edition
Advanced admin interface for user management and system control
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import asdict
import aiofiles
from loguru import logger
from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import secrets
import uuid

from .user_manager import UserManager, UserProfile, UserRole, UserStatus
from .content_filter import ContentFilter, FilterRule, ContentType, FilterAction
from .access_control import AccessControl
from .audit_logger import AuditLogger
from .constants import SECURITY_LEVELS, AGENT_ACCESS_LEVELS

# Pydantic models for API
class CreateUserRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str = "family_member"
    security_level: str = "SAFE"
    agent_access_level: str = "BASIC"
    parent_user_id: Optional[str] = None
    supervision_level: str = "none"

class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    security_level: Optional[str] = None
    agent_access_level: Optional[str] = None
    supervision_level: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class ResetPasswordRequest(BaseModel):
    new_password: str

class CreateFilterRuleRequest(BaseModel):
    name: str
    description: str
    content_type: str = "text"
    pattern: str
    action: str = "replace"
    severity: int = 5
    replacement_text: str = "[FILTERED]"

class UpdateFilterRuleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pattern: Optional[str] = None
    action: Optional[str] = None
    severity: Optional[int] = None
    replacement_text: Optional[str] = None
    enabled: Optional[bool] = None

class TestContentRequest(BaseModel):
    content: str
    security_level: str = "SAFE"

class AdminDashboard:
    """Advanced admin dashboard for LexOS"""
    
    def __init__(self, user_manager: UserManager, content_filter: ContentFilter, 
                 access_control: AccessControl, audit_logger: AuditLogger, config: Dict[str, Any] = None):
        self.config = config or {}
        self.user_manager = user_manager
        self.content_filter = content_filter
        self.access_control = access_control
        self.audit_logger = audit_logger
        
        # FastAPI app
        self.app = FastAPI(
            title="LexOS Admin Dashboard",
            description="Advanced administration interface for LexOS",
            version="2.0.0"
        )
        
        # Security
        self.security = HTTPBearer()
        self.admin_sessions: Dict[str, Dict[str, Any]] = {}
        
        # Templates and static files
        self.templates_dir = Path(__file__).parent / "templates"
        self.static_dir = Path(__file__).parent / "static"
        
        # Ensure directories exist
        self.templates_dir.mkdir(exist_ok=True)
        self.static_dir.mkdir(exist_ok=True)
        
        # Setup FastAPI
        self._setup_middleware()
        self._setup_routes()
        self._create_templates()
        
        logger.info("🎛️ AdminDashboard initialized")
    
    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure appropriately for production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Mount static files
        if self.static_dir.exists():
            self.app.mount("/static", StaticFiles(directory=str(self.static_dir)), name="static")
    
    def _setup_routes(self):
        """Setup API routes"""
        
        # Authentication
        @self.app.post("/api/auth/login")
        async def login(request: Request, username: str, password: str):
            """Admin login"""
            try:
                # Authenticate user
                session_id = await self.user_manager.authenticate_user(
                    username, password, 
                    request.client.host, 
                    request.headers.get("user-agent", "")
                )
                
                if not session_id:
                    raise HTTPException(status_code=401, detail="Invalid credentials")
                
                # Verify admin role
                user = await self.user_manager.validate_session(session_id)
                if not user or user.role != UserRole.ADMIN:
                    await self.user_manager.logout_user(session_id)
                    raise HTTPException(status_code=403, detail="Admin access required")
                
                # Create admin session
                admin_token = secrets.token_urlsafe(32)
                self.admin_sessions[admin_token] = {
                    "user_id": user.user_id,
                    "username": user.username,
                    "session_id": session_id,
                    "created_at": time.time(),
                    "last_activity": time.time()
                }
                
                await self.audit_logger.log_event(
                    "admin_login",
                    user.user_id,
                    {"username": username, "ip": request.client.host}
                )
                
                return {
                    "success": True,
                    "token": admin_token,
                    "user": {
                        "username": user.username,
                        "full_name": user.full_name,
                        "role": user.role.value
                    }
                }
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Admin login error: {e}")
                raise HTTPException(status_code=500, detail="Login failed")
        
        @self.app.post("/api/auth/logout")
        async def logout(token: str = Depends(self._get_admin_token)):
            """Admin logout"""
            try:
                admin_session = self.admin_sessions.get(token)
                if admin_session:
                    await self.user_manager.logout_user(admin_session["session_id"])
                    del self.admin_sessions[token]
                    
                    await self.audit_logger.log_event(
                        "admin_logout",
                        admin_session["user_id"],
                        {"username": admin_session["username"]}
                    )
                
                return {"success": True}
                
            except Exception as e:
                logger.error(f"Admin logout error: {e}")
                raise HTTPException(status_code=500, detail="Logout failed")
        
        # User Management
        @self.app.get("/api/users")
        async def list_users(token: str = Depends(self._get_admin_token)):
            """List all users"""
            try:
                await self._verify_admin_session(token)
                users = await self.user_manager.list_users(include_sensitive=True)
                return {"success": True, "users": users}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"List users error: {e}")
                raise HTTPException(status_code=500, detail="Failed to list users")
        
        @self.app.post("/api/users")
        async def create_user(request: CreateUserRequest, token: str = Depends(self._get_admin_token)):
            """Create new user"""
            try:
                admin_session = await self._verify_admin_session(token)
                
                # Create user profile
                user_profile = UserProfile(
                    user_id=str(uuid.uuid4()),
                    username=request.username,
                    email=request.email,
                    full_name=request.full_name,
                    role=UserRole(request.role),
                    status=UserStatus.ACTIVE,
                    security_level=request.security_level,
                    agent_access_level=request.agent_access_level,
                    parent_user_id=request.parent_user_id,
                    supervision_level=request.supervision_level
                )
                
                success = await self.user_manager.create_user(user_profile, request.password)
                
                if success:
                    await self.audit_logger.log_event(
                        "user_created",
                        admin_session["user_id"],
                        {
                            "created_user_id": user_profile.user_id,
                            "username": request.username,
                            "role": request.role
                        }
                    )
                    
                    return {
                        "success": True,
                        "user_id": user_profile.user_id,
                        "message": f"User '{request.username}' created successfully"
                    }
                else:
                    raise HTTPException(status_code=400, detail="Failed to create user")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Create user error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.put("/api/users/{user_id}")
        async def update_user(user_id: str, request: UpdateUserRequest, token: str = Depends(self._get_admin_token)):
            """Update user"""
            try:
                admin_session = await self._verify_admin_session(token)
                
                # Prepare updates
                updates = {}
                for field, value in request.dict(exclude_unset=True).items():
                    if value is not None:
                        updates[field] = value
                
                success = await self.user_manager.update_user(user_id, updates)
                
                if success:
                    await self.audit_logger.log_event(
                        "user_updated",
                        admin_session["user_id"],
                        {"updated_user_id": user_id, "updates": updates}
                    )
                    
                    return {"success": True, "message": "User updated successfully"}
                else:
                    raise HTTPException(status_code=404, detail="User not found")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Update user error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.delete("/api/users/{user_id}")
        async def delete_user(user_id: str, token: str = Depends(self._get_admin_token)):
            """Delete user"""
            try:
                admin_session = await self._verify_admin_session(token)
                
                # Get user info before deletion
                user = self.user_manager.users.get(user_id)
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                
                success = await self.user_manager.delete_user(user_id)
                
                if success:
                    await self.audit_logger.log_event(
                        "user_deleted",
                        admin_session["user_id"],
                        {"deleted_user_id": user_id, "username": user.username}
                    )
                    
                    return {"success": True, "message": f"User '{user.username}' deleted successfully"}
                else:
                    raise HTTPException(status_code=400, detail="Failed to delete user")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Delete user error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/users/{user_id}/reset-password")
        async def reset_user_password(user_id: str, request: ResetPasswordRequest, token: str = Depends(self._get_admin_token)):
            """Reset user password"""
            try:
                admin_session = await self._verify_admin_session(token)
                
                success = await self.user_manager.reset_password(user_id, request.new_password)
                
                if success:
                    await self.audit_logger.log_event(
                        "password_reset",
                        admin_session["user_id"],
                        {"target_user_id": user_id}
                    )
                    
                    return {"success": True, "message": "Password reset successfully"}
                else:
                    raise HTTPException(status_code=404, detail="User not found")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Reset password error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # Content Filtering
        @self.app.get("/api/content-filter/rules")
        async def list_filter_rules(token: str = Depends(self._get_admin_token)):
            """List content filter rules"""
            try:
                await self._verify_admin_session(token)
                
                rules = []
                for rule in self.content_filter.rules.values():
                    rule_dict = {
                        "rule_id": rule.rule_id,
                        "name": rule.name,
                        "description": rule.description,
                        "content_type": rule.content_type.value,
                        "pattern": rule.pattern,
                        "action": rule.action.value,
                        "severity": rule.severity,
                        "replacement_text": rule.replacement_text,
                        "enabled": rule.enabled,
                        "created_at": rule.created_at
                    }
                    rules.append(rule_dict)
                
                return {"success": True, "rules": rules}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"List filter rules error: {e}")
                raise HTTPException(status_code=500, detail="Failed to list filter rules")
        
        @self.app.post("/api/content-filter/rules")
        async def create_filter_rule(request: CreateFilterRuleRequest, token: str = Depends(self._get_admin_token)):
            """Create content filter rule"""
            try:
                admin_session = await self._verify_admin_session(token)
                
                rule = FilterRule(
                    rule_id=str(uuid.uuid4()),
                    name=request.name,
                    description=request.description,
                    content_type=ContentType(request.content_type),
                    pattern=request.pattern,
                    action=FilterAction(request.action),
                    severity=request.severity,
                    replacement_text=request.replacement_text
                )
                
                success = await self.content_filter.add_rule(rule)
                
                if success:
                    await self.audit_logger.log_event(
                        "filter_rule_created",
                        admin_session["user_id"],
                        {"rule_id": rule.rule_id, "name": request.name}
                    )
                    
                    return {"success": True, "rule_id": rule.rule_id, "message": "Filter rule created successfully"}
                else:
                    raise HTTPException(status_code=400, detail="Failed to create filter rule")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Create filter rule error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.put("/api/content-filter/rules/{rule_id}")
        async def update_filter_rule(rule_id: str, request: UpdateFilterRuleRequest, token: str = Depends(self._get_admin_token)):
            """Update content filter rule"""
            try:
                admin_session = await self._verify_admin_session(token)
                
                updates = {}
                for field, value in request.dict(exclude_unset=True).items():
                    if value is not None:
                        updates[field] = value
                
                success = await self.content_filter.update_rule(rule_id, updates)
                
                if success:
                    await self.audit_logger.log_event(
                        "filter_rule_updated",
                        admin_session["user_id"],
                        {"rule_id": rule_id, "updates": updates}
                    )
                    
                    return {"success": True, "message": "Filter rule updated successfully"}
                else:
                    raise HTTPException(status_code=404, detail="Filter rule not found")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Update filter rule error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.delete("/api/content-filter/rules/{rule_id}")
        async def delete_filter_rule(rule_id: str, token: str = Depends(self._get_admin_token)):
            """Delete content filter rule"""
            try:
                admin_session = await self._verify_admin_session(token)
                
                success = await self.content_filter.delete_rule(rule_id)
                
                if success:
                    await self.audit_logger.log_event(
                        "filter_rule_deleted",
                        admin_session["user_id"],
                        {"rule_id": rule_id}
                    )
                    
                    return {"success": True, "message": "Filter rule deleted successfully"}
                else:
                    raise HTTPException(status_code=404, detail="Filter rule not found")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Delete filter rule error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/content-filter/test")
        async def test_content_filter(request: TestContentRequest, token: str = Depends(self._get_admin_token)):
            """Test content against filters"""
            try:
                await self._verify_admin_session(token)
                
                result = await self.content_filter.test_content(request.content, request.security_level)
                
                return {"success": True, "result": result}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Test content filter error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        # System Statistics
        @self.app.get("/api/stats/users")
        async def get_user_stats(token: str = Depends(self._get_admin_token)):
            """Get user statistics"""
            try:
                await self._verify_admin_session(token)
                stats = await self.user_manager.get_user_stats()
                return {"success": True, "stats": stats}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Get user stats error: {e}")
                raise HTTPException(status_code=500, detail="Failed to get user stats")
        
        @self.app.get("/api/stats/content-filter")
        async def get_filter_stats(token: str = Depends(self._get_admin_token)):
            """Get content filter statistics"""
            try:
                await self._verify_admin_session(token)
                stats = await self.content_filter.get_filter_stats()
                return {"success": True, "stats": stats}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Get filter stats error: {e}")
                raise HTTPException(status_code=500, detail="Failed to get filter stats")
        
        @self.app.get("/api/stats/system")
        async def get_system_stats(token: str = Depends(self._get_admin_token)):
            """Get system statistics"""
            try:
                await self._verify_admin_session(token)
                
                import psutil
                
                stats = {
                    "cpu_percent": psutil.cpu_percent(interval=1),
                    "memory_percent": psutil.virtual_memory().percent,
                    "disk_percent": psutil.disk_usage('/').percent,
                    "uptime": time.time() - psutil.boot_time(),
                    "active_admin_sessions": len(self.admin_sessions),
                    "security_levels": SECURITY_LEVELS,
                    "agent_access_levels": AGENT_ACCESS_LEVELS
                }
                
                return {"success": True, "stats": stats}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Get system stats error: {e}")
                raise HTTPException(status_code=500, detail="Failed to get system stats")
        
        # Audit Logs
        @self.app.get("/api/audit/logs")
        async def get_audit_logs(limit: int = 100, offset: int = 0, token: str = Depends(self._get_admin_token)):
            """Get audit logs"""
            try:
                await self._verify_admin_session(token)
                logs = await self.audit_logger.get_logs(limit=limit, offset=offset)
                return {"success": True, "logs": logs}
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Get audit logs error: {e}")
                raise HTTPException(status_code=500, detail="Failed to get audit logs")
        
        # Web Interface
        @self.app.get("/", response_class=HTMLResponse)
        async def dashboard_home():
            """Admin dashboard home page"""
            return self._render_template("dashboard.html", {"title": "LexOS Admin Dashboard"})
        
        @self.app.get("/users", response_class=HTMLResponse)
        async def users_page():
            """Users management page"""
            return self._render_template("users.html", {"title": "User Management"})
        
        @self.app.get("/content-filter", response_class=HTMLResponse)
        async def content_filter_page():
            """Content filter management page"""
            return self._render_template("content_filter.html", {"title": "Content Filter"})
        
        @self.app.get("/audit", response_class=HTMLResponse)
        async def audit_page():
            """Audit logs page"""
            return self._render_template("audit.html", {"title": "Audit Logs"})
    
    async def _get_admin_token(self, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
        """Extract admin token from request"""
        return credentials.credentials
    
    async def _verify_admin_session(self, token: str) -> Dict[str, Any]:
        """Verify admin session"""
        admin_session = self.admin_sessions.get(token)
        if not admin_session:
            raise HTTPException(status_code=401, detail="Invalid admin token")
        
        # Check session expiry (24 hours)
        if time.time() - admin_session["created_at"] > 86400:
            del self.admin_sessions[token]
            raise HTTPException(status_code=401, detail="Admin session expired")
        
        # Update last activity
        admin_session["last_activity"] = time.time()
        
        return admin_session
    
    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render HTML template"""
        template_path = self.templates_dir / template_name
        
        if not template_path.exists():
            return f"<html><body><h1>Template {template_name} not found</h1></body></html>"
        
        try:
            with open(template_path, 'r') as f:
                template_content = f.read()
            
            # Simple template rendering (replace {{variable}} with values)
            for key, value in context.items():
                template_content = template_content.replace(f"{{{{{key}}}}}", str(value))
            
            return template_content
            
        except Exception as e:
            logger.error(f"Template rendering error: {e}")
            return f"<html><body><h1>Template rendering error: {e}</h1></body></html>"
    
    def _create_templates(self):
        """Create HTML templates"""
        
        # Dashboard template
        dashboard_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .nav a { margin-right: 20px; text-decoration: none; color: #3498db; font-weight: bold; }
        .nav a:hover { color: #2980b9; }
        .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-card { background: #3498db; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        .btn { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn:hover { background: #2980b9; }
        .btn-danger { background: #e74c3c; }
        .btn-danger:hover { background: #c0392b; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎛️ LexOS Admin Dashboard</h1>
        <p>Advanced system administration and user management</p>
    </div>
    
    <div class="nav">
        <a href="/">Dashboard</a>
        <a href="/users">User Management</a>
        <a href="/content-filter">Content Filter</a>
        <a href="/audit">Audit Logs</a>
        <a href="#" onclick="logout()">Logout</a>
    </div>
    
    <div class="card">
        <h2>System Overview</h2>
        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-number" id="total-users">-</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="active-users">-</div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="active-sessions">-</div>
                <div class="stat-label">Active Sessions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="filter-rules">-</div>
                <div class="stat-label">Filter Rules</div>
            </div>
        </div>
    </div>
    
    <div class="card">
        <h2>Quick Actions</h2>
        <a href="/users" class="btn">Manage Users</a>
        <a href="/content-filter" class="btn">Configure Filters</a>
        <a href="/audit" class="btn">View Audit Logs</a>
    </div>
    
    <script>
        // Load dashboard data
        async function loadDashboard() {
            try {
                const token = localStorage.getItem('admin_token');
                if (!token) {
                    window.location.href = '/login';
                    return;
                }
                
                // Load user stats
                const userStatsResponse = await fetch('/api/stats/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const userStats = await userStatsResponse.json();
                
                if (userStats.success) {
                    document.getElementById('total-users').textContent = userStats.stats.total_users;
                    document.getElementById('active-users').textContent = userStats.stats.active_users;
                    document.getElementById('active-sessions').textContent = userStats.stats.active_sessions;
                }
                
                // Load filter stats
                const filterStatsResponse = await fetch('/api/stats/content-filter', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const filterStats = await filterStatsResponse.json();
                
                if (filterStats.success) {
                    document.getElementById('filter-rules').textContent = filterStats.stats.total_rules;
                }
                
            } catch (error) {
                console.error('Failed to load dashboard:', error);
            }
        }
        
        function logout() {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
        }
        
        // Load dashboard on page load
        loadDashboard();
        
        // Refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>
        """
        
        # Save dashboard template
        dashboard_file = self.templates_dir / "dashboard.html"
        with open(dashboard_file, 'w') as f:
            f.write(dashboard_template)
        
        # Create other templates (users.html, content_filter.html, audit.html)
        # For brevity, I'll create simplified versions
        
        users_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - LexOS Admin</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .nav a { margin-right: 20px; text-decoration: none; color: #3498db; font-weight: bold; }
        .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .btn { background: #3498db; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin: 2px; }
        .btn-danger { background: #e74c3c; }
        .btn-success { background: #27ae60; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
        .modal-content { background: white; margin: 5% auto; padding: 20px; width: 80%; max-width: 500px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>👥 User Management</h1>
        <p>Manage family members and their access levels</p>
    </div>
    
    <div class="nav">
        <a href="/">Dashboard</a>
        <a href="/users">User Management</a>
        <a href="/content-filter">Content Filter</a>
        <a href="/audit">Audit Logs</a>
    </div>
    
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>Users</h2>
            <button class="btn btn-success" onclick="showCreateUserModal()">Create User</button>
        </div>
        
        <table id="users-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Security Level</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="users-tbody">
                <tr><td colspan="7">Loading users...</td></tr>
            </tbody>
        </table>
    </div>
    
    <!-- Create User Modal -->
    <div id="create-user-modal" class="modal">
        <div class="modal-content">
            <h3>Create New User</h3>
            <form id="create-user-form">
                <div class="form-group">
                    <label>Username:</label>
                    <input type="text" name="username" required>
                </div>
                <div class="form-group">
                    <label>Full Name:</label>
                    <input type="text" name="full_name" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Password:</label>
                    <input type="password" name="password" required>
                </div>
                <div class="form-group">
                    <label>Role:</label>
                    <select name="role">
                        <option value="family_member">Family Member</option>
                        <option value="guest">Guest</option>
                        <option value="restricted">Restricted</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Security Level:</label>
                    <select name="security_level">
                        <option value="SAFE">Safe</option>
                        <option value="RELAXED">Relaxed</option>
                        <option value="UNFILTERED">Unfiltered</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Agent Access Level:</label>
                    <select name="agent_access_level">
                        <option value="BASIC">Basic</option>
                        <option value="ADVANCED">Advanced</option>
                        <option value="UNRESTRICTED">Unrestricted</option>
                    </select>
                </div>
                <div style="text-align: right;">
                    <button type="button" class="btn" onclick="hideCreateUserModal()">Cancel</button>
                    <button type="submit" class="btn btn-success">Create User</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        async function loadUsers() {
            try {
                const token = localStorage.getItem('admin_token');
                const response = await fetch('/api/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                
                if (data.success) {
                    const tbody = document.getElementById('users-tbody');
                    tbody.innerHTML = '';
                    
                    data.users.forEach(user => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${user.username}</td>
                            <td>${user.full_name}</td>
                            <td>${user.email}</td>
                            <td>${user.role}</td>
                            <td>${user.status}</td>
                            <td>${user.security_level}</td>
                            <td>
                                <button class="btn" onclick="editUser('${user.user_id}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteUser('${user.user_id}', '${user.username}')">Delete</button>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });
                }
            } catch (error) {
                console.error('Failed to load users:', error);
            }
        }
        
        function showCreateUserModal() {
            document.getElementById('create-user-modal').style.display = 'block';
        }
        
        function hideCreateUserModal() {
            document.getElementById('create-user-modal').style.display = 'none';
            document.getElementById('create-user-form').reset();
        }
        
        document.getElementById('create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const userData = Object.fromEntries(formData.entries());
            
            try {
                const token = localStorage.getItem('admin_token');
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('User created successfully!');
                    hideCreateUserModal();
                    loadUsers();
                } else {
                    alert('Failed to create user: ' + (result.detail || 'Unknown error'));
                }
            } catch (error) {
                alert('Error creating user: ' + error.message);
            }
        });
        
        async function deleteUser(userId, username) {
            if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
                return;
            }
            
            try {
                const token = localStorage.getItem('admin_token');
                const response = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('User deleted successfully!');
                    loadUsers();
                } else {
                    alert('Failed to delete user: ' + (result.detail || 'Unknown error'));
                }
            } catch (error) {
                alert('Error deleting user: ' + error.message);
            }
        }
        
        // Load users on page load
        loadUsers();
    </script>
</body>
</html>
        """
        
        users_file = self.templates_dir / "users.html"
        with open(users_file, 'w') as f:
            f.write(users_template)
        
        logger.info("📄 Created admin dashboard templates")
    
    async def start_server(self, host: str = "0.0.0.0", port: int = 8080):
        """Start the admin dashboard server"""
        import uvicorn
        
        logger.info(f"🚀 Starting admin dashboard on {host}:{port}")
        
        config = uvicorn.Config(
            app=self.app,
            host=host,
            port=port,
            log_level="info"
        )
        
        server = uvicorn.Server(config)
        await server.serve()
    
    async def cleanup(self):
        """Cleanup resources"""
        # Clear admin sessions
        self.admin_sessions.clear()
        
        logger.info("🎛️ AdminDashboard cleanup completed")