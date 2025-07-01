#!/usr/bin/env python3
"""
LexOS Security Manager - H100 Production Edition
Central security management and orchestration
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional
from pathlib import Path
import aiofiles
from loguru import logger

from .user_manager import UserManager, UserProfile, UserRole
from .content_filter import ContentFilter
from .access_control import AccessControl, ResourceType, Permission
from .audit_logger import AuditLogger
from .admin_dashboard import AdminDashboard

class SecurityManager:
    """Central security management system"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        # Initialize security components
        self.user_manager = UserManager(self.config.get("user_manager", {}))
        self.content_filter = ContentFilter(self.config.get("content_filter", {}))
        self.access_control = AccessControl(self.config.get("access_control", {}))
        self.audit_logger = AuditLogger(self.config.get("audit_logger", {}))
        
        # Admin dashboard (optional)
        self.admin_dashboard = None
        if self.config.get("enable_admin_dashboard", True):
            self.admin_dashboard = AdminDashboard(
                self.user_manager,
                self.content_filter,
                self.access_control,
                self.audit_logger,
                self.config.get("admin_dashboard", {})
            )
        
        # Security settings
        self.security_config = {
            "enforce_content_filtering": self.config.get("enforce_content_filtering", True),
            "enforce_access_control": self.config.get("enforce_access_control", True),
            "audit_all_actions": self.config.get("audit_all_actions", True),
            "auto_lockout_enabled": self.config.get("auto_lockout_enabled", True),
            "session_timeout": self.config.get("session_timeout", 86400),  # 24 hours
            "password_policy": self.config.get("password_policy", {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special_chars": True
            })
        }
        
        logger.info("🛡️ SecurityManager initialized")
    
    async def initialize(self):
        """Initialize all security components"""
        try:
            # Initialize components in order
            await self.audit_logger.initialize()
            await self.user_manager.initialize()
            await self.content_filter.initialize()
            await self.access_control.initialize()
            
            # Log security system startup
            await self.audit_logger.log_event(
                "security_system_startup",
                "system",
                {
                    "components_initialized": [
                        "audit_logger",
                        "user_manager", 
                        "content_filter",
                        "access_control"
                    ],
                    "security_config": self.security_config
                }
            )
            
            logger.success("✅ SecurityManager initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ SecurityManager initialization failed: {e}")
            raise
    
    async def authenticate_user(self, username: str, password: str, 
                               ip_address: str = "", user_agent: str = "") -> Optional[Dict[str, Any]]:
        """Authenticate user and return session info"""
        try:
            # Validate password policy if needed
            if not await self._validate_password_policy(password):
                await self.audit_logger.log_event(
                    "login_failure",
                    username,
                    {"reason": "password_policy_violation"},
                    ip_address=ip_address,
                    user_agent=user_agent,
                    outcome="failure"
                )
                return None
            
            # Attempt authentication
            session_id = await self.user_manager.authenticate_user(
                username, password, ip_address, user_agent
            )
            
            if session_id:
                # Get user profile
                user = await self.user_manager.validate_session(session_id)
                if user:
                    # Log successful login
                    await self.audit_logger.log_event(
                        "login_success",
                        user.user_id,
                        {
                            "username": username,
                            "role": user.role.value,
                            "security_level": user.security_level
                        },
                        ip_address=ip_address,
                        user_agent=user_agent,
                        session_id=session_id
                    )
                    
                    return {
                        "session_id": session_id,
                        "user": {
                            "user_id": user.user_id,
                            "username": user.username,
                            "full_name": user.full_name,
                            "role": user.role.value,
                            "security_level": user.security_level,
                            "agent_access_level": user.agent_access_level
                        }
                    }
            
            # Log failed login
            await self.audit_logger.log_event(
                "login_failure",
                username,
                {"reason": "invalid_credentials"},
                ip_address=ip_address,
                user_agent=user_agent,
                outcome="failure"
            )
            
            return None
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            await self.audit_logger.log_event(
                "login_failure",
                username,
                {"reason": "system_error", "error": str(e)},
                ip_address=ip_address,
                user_agent=user_agent,
                outcome="error"
            )
            return None
    
    async def validate_session(self, session_id: str) -> Optional[UserProfile]:
        """Validate user session"""
        try:
            user = await self.user_manager.validate_session(session_id)
            
            if user and self.security_config["audit_all_actions"]:
                await self.audit_logger.log_event(
                    "session_validated",
                    user.user_id,
                    {"session_id": session_id},
                    session_id=session_id
                )
            
            return user
            
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            return None
    
    async def logout_user(self, session_id: str) -> bool:
        """Logout user"""
        try:
            # Get user info before logout
            user = await self.user_manager.validate_session(session_id)
            
            # Perform logout
            success = await self.user_manager.logout_user(session_id)
            
            if success and user:
                await self.audit_logger.log_event(
                    "logout",
                    user.user_id,
                    {"session_id": session_id},
                    session_id=session_id
                )
            
            return success
            
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    async def check_access(self, session_id: str, resource_type: str, 
                          resource_id: str, permission: str,
                          ip_address: str = "", user_agent: str = "") -> bool:
        """Check if user has access to resource"""
        try:
            if not self.security_config["enforce_access_control"]:
                return True
            
            # Validate session
            user = await self.validate_session(session_id)
            if not user:
                return False
            
            # Check access
            access_granted = await self.access_control.check_access(
                user.user_id,
                user.role.value,
                ResourceType(resource_type),
                resource_id,
                Permission(permission),
                ip_address,
                user_agent
            )
            
            # Log access attempt if auditing is enabled
            if self.security_config["audit_all_actions"]:
                await self.audit_logger.log_event(
                    "access_check",
                    user.user_id,
                    {
                        "resource_type": resource_type,
                        "resource_id": resource_id,
                        "permission": permission,
                        "access_granted": access_granted
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                    session_id=session_id,
                    resource_affected=f"{resource_type}:{resource_id}",
                    outcome="success" if access_granted else "denied"
                )
            
            return access_granted
            
        except Exception as e:
            logger.error(f"Access check error: {e}")
            return False
    
    async def filter_content(self, session_id: str, content: str, 
                            content_type: str = "text") -> Dict[str, Any]:
        """Filter content based on user's security level"""
        try:
            if not self.security_config["enforce_content_filtering"]:
                return {
                    "filtered_content": content,
                    "is_safe": True,
                    "action_taken": "none",
                    "warnings": []
                }
            
            # Validate session
            user = await self.validate_session(session_id)
            if not user:
                return {
                    "filtered_content": "[AUTHENTICATION REQUIRED]",
                    "is_safe": False,
                    "action_taken": "block",
                    "warnings": ["Authentication required"]
                }
            
            # Filter content
            from .content_filter import ContentType
            result = await self.content_filter.filter_content(
                content,
                user.user_id,
                ContentType(content_type),
                user.security_level
            )
            
            # Log content filtering if needed
            if result.rules_triggered and self.security_config["audit_all_actions"]:
                await self.audit_logger.log_event(
                    "content_filtered",
                    user.user_id,
                    {
                        "content_type": content_type,
                        "rules_triggered": result.rules_triggered,
                        "action_taken": result.action_taken.value,
                        "severity_score": result.severity_score
                    },
                    session_id=session_id
                )
            
            return {
                "filtered_content": result.filtered_content,
                "is_safe": result.is_safe,
                "action_taken": result.action_taken.value,
                "warnings": result.warnings,
                "severity_score": result.severity_score
            }
            
        except Exception as e:
            logger.error(f"Content filtering error: {e}")
            return {
                "filtered_content": "[FILTERING ERROR]",
                "is_safe": False,
                "action_taken": "error",
                "warnings": [f"Filtering error: {str(e)}"]
            }
    
    async def create_user(self, admin_session_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new user (admin only)"""
        try:
            # Validate admin session
            admin_user = await self.validate_session(admin_session_id)
            if not admin_user or admin_user.role != UserRole.ADMIN:
                return {"success": False, "error": "Admin access required"}
            
            # Validate password policy
            password = user_data.get("password", "")
            if not await self._validate_password_policy(password):
                return {"success": False, "error": "Password does not meet policy requirements"}
            
            # Create user profile
            from uuid import uuid4
            user_profile = UserProfile(
                user_id=str(uuid4()),
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=UserRole(user_data.get("role", "family_member")),
                status=user_data.get("status", "active"),
                security_level=user_data.get("security_level", "SAFE"),
                agent_access_level=user_data.get("agent_access_level", "BASIC"),
                parent_user_id=user_data.get("parent_user_id"),
                supervision_level=user_data.get("supervision_level", "none")
            )
            
            # Create user
            success = await self.user_manager.create_user(user_profile, password)
            
            if success:
                await self.audit_logger.log_event(
                    "user_created",
                    admin_user.user_id,
                    {
                        "created_user_id": user_profile.user_id,
                        "username": user_profile.username,
                        "role": user_profile.role.value,
                        "security_level": user_profile.security_level
                    },
                    session_id=admin_session_id
                )
                
                return {
                    "success": True,
                    "user_id": user_profile.user_id,
                    "message": f"User '{user_profile.username}' created successfully"
                }
            else:
                return {"success": False, "error": "Failed to create user"}
                
        except Exception as e:
            logger.error(f"User creation error: {e}")
            return {"success": False, "error": str(e)}
    
    async def update_user_security_settings(self, admin_session_id: str, 
                                           user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update user security settings (admin only)"""
        try:
            # Validate admin session
            admin_user = await self.validate_session(admin_session_id)
            if not admin_user or admin_user.role != UserRole.ADMIN:
                return {"success": False, "error": "Admin access required"}
            
            # Update user
            success = await self.user_manager.update_user(user_id, settings)
            
            if success:
                await self.audit_logger.log_event(
                    "user_security_settings_updated",
                    admin_user.user_id,
                    {
                        "target_user_id": user_id,
                        "settings_updated": settings
                    },
                    session_id=admin_session_id
                )
                
                return {"success": True, "message": "Security settings updated successfully"}
            else:
                return {"success": False, "error": "Failed to update user"}
                
        except Exception as e:
            logger.error(f"Security settings update error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user_workspace(self, session_id: str) -> Optional[Path]:
        """Get user's private workspace"""
        try:
            user = await self.validate_session(session_id)
            if not user:
                return None
            
            workspace = await self.user_manager.get_user_workspace(user.user_id)
            
            if workspace and self.security_config["audit_all_actions"]:
                await self.audit_logger.log_event(
                    "workspace_accessed",
                    user.user_id,
                    {"workspace_path": str(workspace)},
                    session_id=session_id
                )
            
            return workspace
            
        except Exception as e:
            logger.error(f"Workspace access error: {e}")
            return None
    
    async def get_security_dashboard_data(self, admin_session_id: str) -> Dict[str, Any]:
        """Get security dashboard data (admin only)"""
        try:
            # Validate admin session
            admin_user = await self.validate_session(admin_session_id)
            if not admin_user or admin_user.role != UserRole.ADMIN:
                return {"error": "Admin access required"}
            
            # Get statistics from all components
            user_stats = await self.user_manager.get_user_stats()
            filter_stats = await self.content_filter.get_filter_stats()
            access_stats = await self.access_control.get_access_stats()
            audit_stats = await self.audit_logger.get_audit_stats()
            
            return {
                "user_stats": user_stats,
                "filter_stats": filter_stats,
                "access_stats": access_stats,
                "audit_stats": audit_stats,
                "security_config": self.security_config
            }
            
        except Exception as e:
            logger.error(f"Dashboard data error: {e}")
            return {"error": str(e)}
    
    async def _validate_password_policy(self, password: str) -> bool:
        """Validate password against policy"""
        try:
            policy = self.security_config["password_policy"]
            
            # Check minimum length
            if len(password) < policy.get("min_length", 8):
                return False
            
            # Check for uppercase
            if policy.get("require_uppercase", True) and not any(c.isupper() for c in password):
                return False
            
            # Check for lowercase
            if policy.get("require_lowercase", True) and not any(c.islower() for c in password):
                return False
            
            # Check for numbers
            if policy.get("require_numbers", True) and not any(c.isdigit() for c in password):
                return False
            
            # Check for special characters
            if policy.get("require_special_chars", True):
                special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
                if not any(c in special_chars for c in password):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Password validation error: {e}")
            return False
    
    async def start_admin_dashboard(self, host: str = "0.0.0.0", port: int = 8080):
        """Start admin dashboard server"""
        if self.admin_dashboard:
            await self.admin_dashboard.start_server(host, port)
        else:
            logger.warning("Admin dashboard is not enabled")
    
    async def cleanup(self):
        """Cleanup all security components"""
        try:
            await self.audit_logger.log_event(
                "security_system_shutdown",
                "system",
                {"timestamp": time.time()}
            )
            
            # Cleanup components
            await self.user_manager.cleanup()
            await self.content_filter.cleanup()
            await self.access_control.cleanup()
            await self.audit_logger.cleanup()
            
            if self.admin_dashboard:
                await self.admin_dashboard.cleanup()
            
            logger.info("🛡️ SecurityManager cleanup completed")
            
        except Exception as e:
            logger.error(f"Security cleanup error: {e}")

# Convenience function for easy initialization
async def create_security_manager(config: Dict[str, Any] = None) -> SecurityManager:
    """Create and initialize security manager"""
    security_manager = SecurityManager(config)
    await security_manager.initialize()
    return security_manager