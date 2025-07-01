#!/usr/bin/env python3
"""
LexOS Access Control - H100 Production Edition
Advanced access control and permission management
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional, Set
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
import aiofiles
from loguru import logger

from .constants import AGENT_ACCESS_LEVELS

class Permission(Enum):
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    DELETE = "delete"
    ADMIN = "admin"

class ResourceType(Enum):
    FILE = "file"
    AGENT = "agent"
    API = "api"
    SYSTEM = "system"
    USER_DATA = "user_data"

@dataclass
class AccessRule:
    """Access control rule"""
    rule_id: str
    user_id: str
    resource_type: ResourceType
    resource_id: str
    permissions: List[Permission]
    conditions: Dict[str, Any]  # Time restrictions, IP restrictions, etc.
    enabled: bool = True
    created_at: float = 0
    expires_at: Optional[float] = None
    
    def __post_init__(self):
        if self.created_at == 0:
            self.created_at = time.time()

@dataclass
class AccessAttempt:
    """Record of access attempt"""
    attempt_id: str
    user_id: str
    resource_type: ResourceType
    resource_id: str
    permission: Permission
    granted: bool
    reason: str
    timestamp: float
    ip_address: str = ""
    user_agent: str = ""

class AccessControl:
    """Advanced access control system"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.access_rules: Dict[str, AccessRule] = {}
        self.access_attempts: List[AccessAttempt] = []
        
        # Storage
        self.data_dir = Path(self.config.get("data_dir", "/home/user/data/security"))
        self.rules_file = self.data_dir / "access_rules.json"
        self.attempts_file = self.data_dir / "access_attempts.json"
        
        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Default permissions by role
        self.default_permissions = {
            "admin": {
                ResourceType.FILE: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
                ResourceType.AGENT: [Permission.READ, Permission.WRITE, Permission.EXECUTE, Permission.ADMIN],
                ResourceType.API: [Permission.READ, Permission.WRITE, Permission.EXECUTE, Permission.ADMIN],
                ResourceType.SYSTEM: [Permission.READ, Permission.WRITE, Permission.ADMIN],
                ResourceType.USER_DATA: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN]
            },
            "family_member": {
                ResourceType.FILE: [Permission.READ, Permission.WRITE],
                ResourceType.AGENT: [Permission.READ, Permission.EXECUTE],
                ResourceType.API: [Permission.READ, Permission.EXECUTE],
                ResourceType.SYSTEM: [Permission.READ],
                ResourceType.USER_DATA: [Permission.READ, Permission.WRITE]
            },
            "guest": {
                ResourceType.FILE: [Permission.READ],
                ResourceType.AGENT: [Permission.READ],
                ResourceType.API: [Permission.READ],
                ResourceType.SYSTEM: [],
                ResourceType.USER_DATA: [Permission.READ]
            },
            "restricted": {
                ResourceType.FILE: [],
                ResourceType.AGENT: [],
                ResourceType.API: [],
                ResourceType.SYSTEM: [],
                ResourceType.USER_DATA: [Permission.READ]
            }
        }
        
        # Agent access restrictions
        self.agent_restrictions = {
            "BASIC": ["web_agent", "intelligence_agent"],
            "ADVANCED": ["web_agent", "intelligence_agent", "code_agent", "data_agent"],
            "UNRESTRICTED": ["*"]  # All agents
        }
        
        # Rate limiting
        self.rate_limits: Dict[str, List[float]] = {}  # user_id -> timestamps
        self.rate_limit_window = 60  # 1 minute
        self.rate_limit_max_attempts = 100  # Max attempts per window
        
        logger.info("🔐 AccessControl initialized")
    
    async def initialize(self):
        """Initialize access control"""
        await self._load_access_rules()
        await self._load_access_attempts()
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_old_attempts())
        
        logger.success("✅ AccessControl initialized successfully")
    
    async def _load_access_rules(self):
        """Load access rules"""
        if self.rules_file.exists():
            try:
                async with aiofiles.open(self.rules_file, 'r') as f:
                    rules_data = json.loads(await f.read())
                
                for rule_id, rule_data in rules_data.items():
                    rule_data['resource_type'] = ResourceType(rule_data['resource_type'])
                    rule_data['permissions'] = [Permission(p) for p in rule_data['permissions']]
                    self.access_rules[rule_id] = AccessRule(**rule_data)
                
                logger.info(f"🔑 Loaded {len(self.access_rules)} access rules")
                
            except Exception as e:
                logger.error(f"Failed to load access rules: {e}")
    
    async def _load_access_attempts(self):
        """Load recent access attempts"""
        if self.attempts_file.exists():
            try:
                async with aiofiles.open(self.attempts_file, 'r') as f:
                    attempts_data = json.loads(await f.read())
                
                # Only load recent attempts (last 24 hours)
                cutoff_time = time.time() - 86400
                
                for attempt_data in attempts_data:
                    if attempt_data['timestamp'] > cutoff_time:
                        attempt_data['resource_type'] = ResourceType(attempt_data['resource_type'])
                        attempt_data['permission'] = Permission(attempt_data['permission'])
                        self.access_attempts.append(AccessAttempt(**attempt_data))
                
                logger.info(f"📊 Loaded {len(self.access_attempts)} recent access attempts")
                
            except Exception as e:
                logger.error(f"Failed to load access attempts: {e}")
    
    async def check_access(self, user_id: str, user_role: str, resource_type: ResourceType, 
                          resource_id: str, permission: Permission, 
                          ip_address: str = "", user_agent: str = "") -> bool:
        """Check if user has access to resource"""
        try:
            # Rate limiting check
            if not await self._check_rate_limit(user_id):
                await self._record_access_attempt(
                    user_id, resource_type, resource_id, permission, 
                    False, "Rate limit exceeded", ip_address, user_agent
                )
                return False
            
            # Check specific access rules first
            access_granted = await self._check_specific_rules(user_id, resource_type, resource_id, permission)
            
            # If no specific rule, check default permissions
            if access_granted is None:
                access_granted = await self._check_default_permissions(user_role, resource_type, permission)
            
            # Additional checks for agents
            if resource_type == ResourceType.AGENT and access_granted:
                access_granted = await self._check_agent_access(user_id, resource_id, permission)
            
            # Record access attempt
            reason = "Access granted" if access_granted else "Access denied"
            await self._record_access_attempt(
                user_id, resource_type, resource_id, permission, 
                access_granted, reason, ip_address, user_agent
            )
            
            return access_granted
            
        except Exception as e:
            logger.error(f"Access check error: {e}")
            await self._record_access_attempt(
                user_id, resource_type, resource_id, permission, 
                False, f"Error: {str(e)}", ip_address, user_agent
            )
            return False
    
    async def _check_rate_limit(self, user_id: str) -> bool:
        """Check rate limiting for user"""
        current_time = time.time()
        
        # Initialize user rate limit tracking
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = []
        
        # Clean old timestamps
        self.rate_limits[user_id] = [
            timestamp for timestamp in self.rate_limits[user_id]
            if current_time - timestamp < self.rate_limit_window
        ]
        
        # Check if under limit
        if len(self.rate_limits[user_id]) >= self.rate_limit_max_attempts:
            return False
        
        # Add current timestamp
        self.rate_limits[user_id].append(current_time)
        return True
    
    async def _check_specific_rules(self, user_id: str, resource_type: ResourceType, 
                                   resource_id: str, permission: Permission) -> Optional[bool]:
        """Check specific access rules for user"""
        current_time = time.time()
        
        for rule in self.access_rules.values():
            if (rule.user_id == user_id and 
                rule.resource_type == resource_type and 
                (rule.resource_id == resource_id or rule.resource_id == "*") and
                rule.enabled):
                
                # Check if rule has expired
                if rule.expires_at and current_time > rule.expires_at:
                    continue
                
                # Check conditions
                if not await self._check_rule_conditions(rule, current_time):
                    continue
                
                # Check if permission is granted
                if permission in rule.permissions or Permission.ADMIN in rule.permissions:
                    return True
                else:
                    return False
        
        return None  # No specific rule found
    
    async def _check_rule_conditions(self, rule: AccessRule, current_time: float) -> bool:
        """Check if rule conditions are met"""
        conditions = rule.conditions
        
        # Time-based restrictions
        if "time_restrictions" in conditions:
            time_restrictions = conditions["time_restrictions"]
            
            # Check allowed hours
            if "allowed_hours" in time_restrictions:
                from datetime import datetime
                current_hour = datetime.fromtimestamp(current_time).hour
                allowed_hours = time_restrictions["allowed_hours"]
                if current_hour not in allowed_hours:
                    return False
            
            # Check allowed days
            if "allowed_days" in time_restrictions:
                from datetime import datetime
                current_day = datetime.fromtimestamp(current_time).weekday()
                allowed_days = time_restrictions["allowed_days"]
                if current_day not in allowed_days:
                    return False
        
        # IP-based restrictions
        if "ip_restrictions" in conditions:
            ip_restrictions = conditions["ip_restrictions"]
            # This would need the actual IP address from the request
            # For now, we'll assume it passes
            pass
        
        return True
    
    async def _check_default_permissions(self, user_role: str, resource_type: ResourceType, 
                                        permission: Permission) -> bool:
        """Check default permissions based on user role"""
        role_permissions = self.default_permissions.get(user_role, {})
        resource_permissions = role_permissions.get(resource_type, [])
        
        return permission in resource_permissions or Permission.ADMIN in resource_permissions
    
    async def _check_agent_access(self, user_id: str, agent_id: str, permission: Permission) -> bool:
        """Check agent-specific access restrictions"""
        # This would integrate with user manager to get user's agent access level
        # For now, we'll implement basic logic
        
        # Get user's agent access level (this would come from user manager)
        # For demonstration, we'll assume BASIC level
        user_agent_level = "BASIC"  # This should be retrieved from user profile
        
        allowed_agents = self.agent_restrictions.get(user_agent_level, [])
        
        # Check if user can access this agent
        if "*" in allowed_agents or agent_id in allowed_agents:
            return True
        
        return False
    
    async def _record_access_attempt(self, user_id: str, resource_type: ResourceType, 
                                    resource_id: str, permission: Permission, 
                                    granted: bool, reason: str, 
                                    ip_address: str = "", user_agent: str = ""):
        """Record access attempt"""
        attempt = AccessAttempt(
            attempt_id=f"attempt_{int(time.time() * 1000)}_{user_id}",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            permission=permission,
            granted=granted,
            reason=reason,
            timestamp=time.time(),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.access_attempts.append(attempt)
        
        # Keep only recent attempts in memory
        cutoff_time = time.time() - 86400  # 24 hours
        self.access_attempts = [
            attempt for attempt in self.access_attempts
            if attempt.timestamp > cutoff_time
        ]
        
        # Log security events
        if not granted:
            logger.warning(f"🚫 Access denied: {user_id} -> {resource_type.value}:{resource_id} ({permission.value}) - {reason}")
        else:
            logger.debug(f"✅ Access granted: {user_id} -> {resource_type.value}:{resource_id} ({permission.value})")
    
    async def add_access_rule(self, rule: AccessRule) -> bool:
        """Add access rule"""
        try:
            self.access_rules[rule.rule_id] = rule
            await self._save_access_rules()
            
            logger.info(f"➕ Added access rule: {rule.rule_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add access rule: {e}")
            return False
    
    async def update_access_rule(self, rule_id: str, updates: Dict[str, Any]) -> bool:
        """Update access rule"""
        try:
            rule = self.access_rules.get(rule_id)
            if not rule:
                return False
            
            # Apply updates
            for key, value in updates.items():
                if hasattr(rule, key):
                    if key == 'resource_type' and isinstance(value, str):
                        value = ResourceType(value)
                    elif key == 'permissions' and isinstance(value, list):
                        value = [Permission(p) if isinstance(p, str) else p for p in value]
                    
                    setattr(rule, key, value)
            
            await self._save_access_rules()
            
            logger.info(f"📝 Updated access rule: {rule_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update access rule: {e}")
            return False
    
    async def delete_access_rule(self, rule_id: str) -> bool:
        """Delete access rule"""
        try:
            if rule_id in self.access_rules:
                del self.access_rules[rule_id]
                await self._save_access_rules()
                
                logger.info(f"🗑️ Deleted access rule: {rule_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete access rule: {e}")
            return False
    
    async def get_user_permissions(self, user_id: str, user_role: str) -> Dict[str, List[str]]:
        """Get all permissions for a user"""
        permissions = {}
        
        # Get default permissions
        role_permissions = self.default_permissions.get(user_role, {})
        for resource_type, perms in role_permissions.items():
            permissions[resource_type.value] = [p.value for p in perms]
        
        # Apply specific rules
        for rule in self.access_rules.values():
            if rule.user_id == user_id and rule.enabled:
                resource_key = rule.resource_type.value
                if resource_key not in permissions:
                    permissions[resource_key] = []
                
                for perm in rule.permissions:
                    if perm.value not in permissions[resource_key]:
                        permissions[resource_key].append(perm.value)
        
        return permissions
    
    async def get_access_stats(self, user_id: Optional[str] = None, 
                              hours: int = 24) -> Dict[str, Any]:
        """Get access statistics"""
        cutoff_time = time.time() - (hours * 3600)
        
        # Filter attempts
        attempts = [
            attempt for attempt in self.access_attempts
            if attempt.timestamp > cutoff_time and 
            (user_id is None or attempt.user_id == user_id)
        ]
        
        total_attempts = len(attempts)
        granted_attempts = sum(1 for attempt in attempts if attempt.granted)
        denied_attempts = total_attempts - granted_attempts
        
        # Resource type breakdown
        resource_breakdown = {}
        for attempt in attempts:
            resource_type = attempt.resource_type.value
            if resource_type not in resource_breakdown:
                resource_breakdown[resource_type] = {"granted": 0, "denied": 0}
            
            if attempt.granted:
                resource_breakdown[resource_type]["granted"] += 1
            else:
                resource_breakdown[resource_type]["denied"] += 1
        
        # Permission breakdown
        permission_breakdown = {}
        for attempt in attempts:
            permission = attempt.permission.value
            if permission not in permission_breakdown:
                permission_breakdown[permission] = {"granted": 0, "denied": 0}
            
            if attempt.granted:
                permission_breakdown[permission]["granted"] += 1
            else:
                permission_breakdown[permission]["denied"] += 1
        
        # Top denied reasons
        denied_reasons = {}
        for attempt in attempts:
            if not attempt.granted:
                reason = attempt.reason
                denied_reasons[reason] = denied_reasons.get(reason, 0) + 1
        
        return {
            "total_attempts": total_attempts,
            "granted_attempts": granted_attempts,
            "denied_attempts": denied_attempts,
            "success_rate": (granted_attempts / max(total_attempts, 1)) * 100,
            "resource_breakdown": resource_breakdown,
            "permission_breakdown": permission_breakdown,
            "top_denied_reasons": sorted(denied_reasons.items(), key=lambda x: x[1], reverse=True)[:10],
            "time_period_hours": hours
        }
    
    async def get_recent_attempts(self, user_id: Optional[str] = None, 
                                 limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent access attempts"""
        attempts = self.access_attempts
        
        if user_id:
            attempts = [attempt for attempt in attempts if attempt.user_id == user_id]
        
        # Sort by timestamp (most recent first)
        attempts = sorted(attempts, key=lambda x: x.timestamp, reverse=True)
        
        # Limit results
        attempts = attempts[:limit]
        
        # Convert to dict format
        result = []
        for attempt in attempts:
            result.append({
                "attempt_id": attempt.attempt_id,
                "user_id": attempt.user_id,
                "resource_type": attempt.resource_type.value,
                "resource_id": attempt.resource_id,
                "permission": attempt.permission.value,
                "granted": attempt.granted,
                "reason": attempt.reason,
                "timestamp": attempt.timestamp,
                "ip_address": attempt.ip_address,
                "user_agent": attempt.user_agent
            })
        
        return result
    
    async def _cleanup_old_attempts(self):
        """Cleanup old access attempts periodically"""
        while True:
            try:
                cutoff_time = time.time() - 86400  # Keep 24 hours
                
                old_count = len(self.access_attempts)
                self.access_attempts = [
                    attempt for attempt in self.access_attempts
                    if attempt.timestamp > cutoff_time
                ]
                new_count = len(self.access_attempts)
                
                if old_count > new_count:
                    logger.info(f"🧹 Cleaned up {old_count - new_count} old access attempts")
                    await self._save_access_attempts()
                
                # Sleep for 1 hour
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Access attempts cleanup error: {e}")
                await asyncio.sleep(300)  # Sleep 5 minutes on error
    
    async def _save_access_rules(self):
        """Save access rules to storage"""
        try:
            rules_data = {}
            for rule_id, rule in self.access_rules.items():
                rule_dict = {
                    "rule_id": rule.rule_id,
                    "user_id": rule.user_id,
                    "resource_type": rule.resource_type.value,
                    "resource_id": rule.resource_id,
                    "permissions": [p.value for p in rule.permissions],
                    "conditions": rule.conditions,
                    "enabled": rule.enabled,
                    "created_at": rule.created_at,
                    "expires_at": rule.expires_at
                }
                rules_data[rule_id] = rule_dict
            
            async with aiofiles.open(self.rules_file, 'w') as f:
                await f.write(json.dumps(rules_data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save access rules: {e}")
    
    async def _save_access_attempts(self):
        """Save access attempts to storage"""
        try:
            attempts_data = []
            for attempt in self.access_attempts:
                attempt_dict = {
                    "attempt_id": attempt.attempt_id,
                    "user_id": attempt.user_id,
                    "resource_type": attempt.resource_type.value,
                    "resource_id": attempt.resource_id,
                    "permission": attempt.permission.value,
                    "granted": attempt.granted,
                    "reason": attempt.reason,
                    "timestamp": attempt.timestamp,
                    "ip_address": attempt.ip_address,
                    "user_agent": attempt.user_agent
                }
                attempts_data.append(attempt_dict)
            
            async with aiofiles.open(self.attempts_file, 'w') as f:
                await f.write(json.dumps(attempts_data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save access attempts: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        await self._save_access_rules()
        await self._save_access_attempts()
        
        logger.info("🔐 AccessControl cleanup completed")