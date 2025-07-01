#!/usr/bin/env python3
"""
LexOS User Manager - H100 Production Edition
Advanced user management with privacy isolation and access control
"""

import asyncio
import json
import time
import hashlib
import secrets
from typing import Dict, List, Any, Optional, Set
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import aiofiles
from loguru import logger
from passlib.context import CryptContext
from datetime import datetime, timedelta
import uuid

from .constants import SECURITY_LEVELS, AGENT_ACCESS_LEVELS

class UserRole(Enum):
    ADMIN = "admin"
    FAMILY_MEMBER = "family_member"
    GUEST = "guest"
    RESTRICTED = "restricted"

class UserStatus(Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    DISABLED = "disabled"

@dataclass
class UserProfile:
    """Complete user profile with security settings"""
    user_id: str
    username: str
    email: str
    full_name: str
    role: UserRole
    status: UserStatus
    security_level: str  # SAFE, RELAXED, UNFILTERED
    agent_access_level: str  # BASIC, ADVANCED, UNRESTRICTED
    
    # Privacy settings
    private_workspace: bool = True
    data_isolation: bool = True
    chat_history_private: bool = True
    file_access_private: bool = True
    
    # Content filtering
    adult_content_blocked: bool = True
    violence_filtered: bool = True
    profanity_filtered: bool = True
    sensitive_topics_filtered: bool = True
    
    # Access controls
    allowed_agents: List[str] = None
    blocked_agents: List[str] = None
    time_restrictions: Dict[str, Any] = None
    ip_whitelist: List[str] = None
    
    # Metadata
    created_at: float = 0
    last_login: float = 0
    last_activity: float = 0
    login_count: int = 0
    failed_login_attempts: int = 0
    
    # Family controls
    parent_user_id: Optional[str] = None
    supervised_by: Optional[str] = None
    supervision_level: str = "none"  # none, basic, strict
    
    def __post_init__(self):
        if self.allowed_agents is None:
            self.allowed_agents = []
        if self.blocked_agents is None:
            self.blocked_agents = []
        if self.time_restrictions is None:
            self.time_restrictions = {}
        if self.ip_whitelist is None:
            self.ip_whitelist = []
        if self.created_at == 0:
            self.created_at = time.time()

@dataclass
class UserSession:
    """User session tracking"""
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    created_at: float
    last_activity: float
    expires_at: float
    is_active: bool = True
    
class UserManager:
    """Advanced user management with privacy isolation"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.users: Dict[str, UserProfile] = {}
        self.sessions: Dict[str, UserSession] = {}
        self.user_workspaces: Dict[str, Path] = {}
        
        # Security
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.password_hashes: Dict[str, str] = {}
        
        # Storage paths
        self.data_dir = Path(self.config.get("data_dir", "/home/user/data/security"))
        self.users_file = self.data_dir / "users.json"
        self.sessions_file = self.data_dir / "sessions.json"
        self.passwords_file = self.data_dir / "passwords.json"
        
        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Session settings
        self.session_timeout = self.config.get("session_timeout", 86400)  # 24 hours
        self.max_failed_attempts = self.config.get("max_failed_attempts", 5)
        self.lockout_duration = self.config.get("lockout_duration", 3600)  # 1 hour
        
        logger.info("👥 UserManager initialized")
    
    async def initialize(self):
        """Initialize user manager"""
        await self._load_users()
        await self._load_sessions()
        await self._load_passwords()
        await self._setup_workspaces()
        
        # Create admin user if none exists
        if not any(user.role == UserRole.ADMIN for user in self.users.values()):
            await self._create_default_admin()
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_expired_sessions())
        
        logger.success("✅ UserManager initialized successfully")
    
    async def _load_users(self):
        """Load users from storage"""
        if self.users_file.exists():
            try:
                async with aiofiles.open(self.users_file, 'r') as f:
                    users_data = json.loads(await f.read())
                
                for user_id, user_data in users_data.items():
                    # Convert role and status back to enums
                    user_data['role'] = UserRole(user_data['role'])
                    user_data['status'] = UserStatus(user_data['status'])
                    self.users[user_id] = UserProfile(**user_data)
                
                logger.info(f"📚 Loaded {len(self.users)} users")
                
            except Exception as e:
                logger.error(f"Failed to load users: {e}")
    
    async def _load_sessions(self):
        """Load active sessions"""
        if self.sessions_file.exists():
            try:
                async with aiofiles.open(self.sessions_file, 'r') as f:
                    sessions_data = json.loads(await f.read())
                
                current_time = time.time()
                for session_id, session_data in sessions_data.items():
                    session = UserSession(**session_data)
                    # Only load non-expired sessions
                    if session.expires_at > current_time:
                        self.sessions[session_id] = session
                
                logger.info(f"🔐 Loaded {len(self.sessions)} active sessions")
                
            except Exception as e:
                logger.error(f"Failed to load sessions: {e}")
    
    async def _load_passwords(self):
        """Load password hashes"""
        if self.passwords_file.exists():
            try:
                async with aiofiles.open(self.passwords_file, 'r') as f:
                    self.password_hashes = json.loads(await f.read())
                
                logger.info(f"🔑 Loaded password hashes for {len(self.password_hashes)} users")
                
            except Exception as e:
                logger.error(f"Failed to load passwords: {e}")
    
    async def _setup_workspaces(self):
        """Setup private workspaces for users"""
        workspaces_dir = Path("/home/user/data/workspaces")
        workspaces_dir.mkdir(parents=True, exist_ok=True)
        
        for user_id, user in self.users.items():
            if user.private_workspace:
                workspace_path = workspaces_dir / user_id
                workspace_path.mkdir(parents=True, exist_ok=True)
                
                # Create subdirectories
                (workspace_path / "chats").mkdir(exist_ok=True)
                (workspace_path / "files").mkdir(exist_ok=True)
                (workspace_path / "agents").mkdir(exist_ok=True)
                (workspace_path / "temp").mkdir(exist_ok=True)
                
                self.user_workspaces[user_id] = workspace_path
        
        logger.info(f"🏠 Setup workspaces for {len(self.user_workspaces)} users")
    
    async def _create_default_admin(self):
        """Create default admin user"""
        admin_id = str(uuid.uuid4())
        admin_password = secrets.token_urlsafe(16)
        
        admin_user = UserProfile(
            user_id=admin_id,
            username="admin",
            email="admin@lexos.local",
            full_name="LexOS Administrator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            security_level="UNFILTERED",
            agent_access_level="UNRESTRICTED",
            private_workspace=True,
            data_isolation=True,
            adult_content_blocked=False,
            violence_filtered=False,
            profanity_filtered=False,
            sensitive_topics_filtered=False
        )
        
        await self.create_user(admin_user, admin_password)
        
        # Save admin credentials to file
        admin_creds_file = self.data_dir / "admin_credentials.txt"
        async with aiofiles.open(admin_creds_file, 'w') as f:
            await f.write(f"Admin Username: admin\nAdmin Password: {admin_password}\n")
        
        logger.warning(f"🔐 Created default admin user - Password saved to {admin_creds_file}")
    
    async def create_user(self, user_profile: UserProfile, password: str) -> bool:
        """Create a new user"""
        try:
            # Check if username already exists
            if any(user.username == user_profile.username for user in self.users.values()):
                raise ValueError(f"Username '{user_profile.username}' already exists")
            
            # Check if email already exists
            if any(user.email == user_profile.email for user in self.users.values()):
                raise ValueError(f"Email '{user_profile.email}' already exists")
            
            # Hash password
            password_hash = self.pwd_context.hash(password)
            
            # Apply security level settings
            await self._apply_security_level(user_profile)
            
            # Store user
            self.users[user_profile.user_id] = user_profile
            self.password_hashes[user_profile.user_id] = password_hash
            
            # Create workspace if needed
            if user_profile.private_workspace:
                await self._create_user_workspace(user_profile.user_id)
            
            # Save to storage
            await self._save_users()
            await self._save_passwords()
            
            logger.info(f"👤 Created user: {user_profile.username} ({user_profile.role.value})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return False
    
    async def _apply_security_level(self, user_profile: UserProfile):
        """Apply security level settings to user profile"""
        if user_profile.security_level in SECURITY_LEVELS:
            level_config = SECURITY_LEVELS[user_profile.security_level]
            
            user_profile.adult_content_blocked = not level_config["adult_content"]
            user_profile.violence_filtered = not level_config["violence"]
            user_profile.profanity_filtered = not level_config["profanity"]
            user_profile.sensitive_topics_filtered = not level_config["sensitive_topics"]
    
    async def _create_user_workspace(self, user_id: str):
        """Create private workspace for user"""
        workspace_path = Path("/home/user/data/workspaces") / user_id
        workspace_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        subdirs = ["chats", "files", "agents", "temp", "uploads", "downloads"]
        for subdir in subdirs:
            (workspace_path / subdir).mkdir(exist_ok=True)
        
        # Set permissions (Linux only)
        try:
            import os
            os.chmod(workspace_path, 0o700)  # Owner only
        except Exception:
            pass
        
        self.user_workspaces[user_id] = workspace_path
        logger.info(f"🏠 Created workspace for user {user_id}")
    
    async def authenticate_user(self, username: str, password: str, ip_address: str = "", user_agent: str = "") -> Optional[str]:
        """Authenticate user and create session"""
        try:
            # Find user by username
            user = None
            for u in self.users.values():
                if u.username == username:
                    user = u
                    break
            
            if not user:
                logger.warning(f"🚫 Authentication failed: User '{username}' not found")
                return None
            
            # Check if user is locked out
            if await self._is_user_locked_out(user.user_id):
                logger.warning(f"🔒 User '{username}' is locked out")
                return None
            
            # Check if user is active
            if user.status != UserStatus.ACTIVE:
                logger.warning(f"🚫 User '{username}' is not active (status: {user.status.value})")
                return None
            
            # Verify password
            if not self.pwd_context.verify(password, self.password_hashes.get(user.user_id, "")):
                await self._record_failed_login(user.user_id)
                logger.warning(f"🚫 Authentication failed: Invalid password for '{username}'")
                return None
            
            # Reset failed attempts on successful login
            user.failed_login_attempts = 0
            user.last_login = time.time()
            user.login_count += 1
            
            # Create session
            session_id = await self._create_session(user.user_id, ip_address, user_agent)
            
            await self._save_users()
            
            logger.info(f"✅ User '{username}' authenticated successfully")
            return session_id
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    async def _is_user_locked_out(self, user_id: str) -> bool:
        """Check if user is locked out due to failed attempts"""
        user = self.users.get(user_id)
        if not user:
            return True
        
        if user.failed_login_attempts >= self.max_failed_attempts:
            # Check if lockout period has expired
            time_since_last_attempt = time.time() - user.last_activity
            if time_since_last_attempt < self.lockout_duration:
                return True
            else:
                # Reset failed attempts after lockout period
                user.failed_login_attempts = 0
                await self._save_users()
        
        return False
    
    async def _record_failed_login(self, user_id: str):
        """Record failed login attempt"""
        user = self.users.get(user_id)
        if user:
            user.failed_login_attempts += 1
            user.last_activity = time.time()
            await self._save_users()
    
    async def _create_session(self, user_id: str, ip_address: str, user_agent: str) -> str:
        """Create user session"""
        session_id = secrets.token_urlsafe(32)
        current_time = time.time()
        
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=current_time,
            last_activity=current_time,
            expires_at=current_time + self.session_timeout
        )
        
        self.sessions[session_id] = session
        await self._save_sessions()
        
        return session_id
    
    async def validate_session(self, session_id: str) -> Optional[UserProfile]:
        """Validate session and return user profile"""
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        current_time = time.time()
        
        # Check if session expired
        if session.expires_at < current_time:
            await self._invalidate_session(session_id)
            return None
        
        # Update last activity
        session.last_activity = current_time
        
        # Get user profile
        user = self.users.get(session.user_id)
        if not user or user.status != UserStatus.ACTIVE:
            await self._invalidate_session(session_id)
            return None
        
        # Update user last activity
        user.last_activity = current_time
        
        return user
    
    async def _invalidate_session(self, session_id: str):
        """Invalidate session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            await self._save_sessions()
    
    async def logout_user(self, session_id: str) -> bool:
        """Logout user by invalidating session"""
        try:
            await self._invalidate_session(session_id)
            logger.info(f"👋 User logged out (session: {session_id[:8]}...)")
            return True
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update user profile"""
        try:
            user = self.users.get(user_id)
            if not user:
                return False
            
            # Apply updates
            for key, value in updates.items():
                if hasattr(user, key):
                    if key == 'role' and isinstance(value, str):
                        value = UserRole(value)
                    elif key == 'status' and isinstance(value, str):
                        value = UserStatus(value)
                    
                    setattr(user, key, value)
            
            # Re-apply security level if changed
            if 'security_level' in updates:
                await self._apply_security_level(user)
            
            await self._save_users()
            
            logger.info(f"📝 Updated user: {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            return False
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user and all associated data"""
        try:
            user = self.users.get(user_id)
            if not user:
                return False
            
            # Don't allow deleting the last admin
            if user.role == UserRole.ADMIN:
                admin_count = sum(1 for u in self.users.values() if u.role == UserRole.ADMIN)
                if admin_count <= 1:
                    raise ValueError("Cannot delete the last admin user")
            
            # Invalidate all user sessions
            user_sessions = [sid for sid, session in self.sessions.items() if session.user_id == user_id]
            for session_id in user_sessions:
                await self._invalidate_session(session_id)
            
            # Delete user workspace
            if user_id in self.user_workspaces:
                workspace_path = self.user_workspaces[user_id]
                try:
                    import shutil
                    shutil.rmtree(workspace_path)
                except Exception as e:
                    logger.warning(f"Failed to delete workspace: {e}")
                
                del self.user_workspaces[user_id]
            
            # Remove user data
            del self.users[user_id]
            if user_id in self.password_hashes:
                del self.password_hashes[user_id]
            
            await self._save_users()
            await self._save_passwords()
            
            logger.info(f"🗑️ Deleted user: {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete user: {e}")
            return False
    
    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """Change user password"""
        try:
            user = self.users.get(user_id)
            if not user:
                return False
            
            # Verify old password
            if not self.pwd_context.verify(old_password, self.password_hashes.get(user_id, "")):
                return False
            
            # Hash new password
            new_hash = self.pwd_context.hash(new_password)
            self.password_hashes[user_id] = new_hash
            
            await self._save_passwords()
            
            logger.info(f"🔑 Password changed for user: {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to change password: {e}")
            return False
    
    async def reset_password(self, user_id: str, new_password: str) -> bool:
        """Reset user password (admin only)"""
        try:
            user = self.users.get(user_id)
            if not user:
                return False
            
            # Hash new password
            new_hash = self.pwd_context.hash(new_password)
            self.password_hashes[user_id] = new_hash
            
            # Reset failed attempts
            user.failed_login_attempts = 0
            
            await self._save_passwords()
            await self._save_users()
            
            logger.info(f"🔄 Password reset for user: {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reset password: {e}")
            return False
    
    async def get_user_workspace(self, user_id: str) -> Optional[Path]:
        """Get user's private workspace path"""
        return self.user_workspaces.get(user_id)
    
    async def list_users(self, include_sensitive: bool = False) -> List[Dict[str, Any]]:
        """List all users"""
        users_list = []
        
        for user in self.users.values():
            user_data = asdict(user)
            
            # Remove sensitive data if not requested
            if not include_sensitive:
                user_data.pop('failed_login_attempts', None)
                user_data.pop('ip_whitelist', None)
            
            # Convert enums to strings
            user_data['role'] = user.role.value
            user_data['status'] = user.status.value
            
            users_list.append(user_data)
        
        return users_list
    
    async def get_user_stats(self) -> Dict[str, Any]:
        """Get user statistics"""
        total_users = len(self.users)
        active_users = sum(1 for u in self.users.values() if u.status == UserStatus.ACTIVE)
        active_sessions = len(self.sessions)
        
        role_counts = {}
        for role in UserRole:
            role_counts[role.value] = sum(1 for u in self.users.values() if u.role == role)
        
        security_level_counts = {}
        for level in SECURITY_LEVELS.keys():
            security_level_counts[level] = sum(1 for u in self.users.values() if u.security_level == level)
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "active_sessions": active_sessions,
            "role_distribution": role_counts,
            "security_level_distribution": security_level_counts,
            "workspaces_created": len(self.user_workspaces)
        }
    
    async def _cleanup_expired_sessions(self):
        """Cleanup expired sessions periodically"""
        while True:
            try:
                current_time = time.time()
                expired_sessions = [
                    sid for sid, session in self.sessions.items()
                    if session.expires_at < current_time
                ]
                
                for session_id in expired_sessions:
                    del self.sessions[session_id]
                
                if expired_sessions:
                    await self._save_sessions()
                    logger.info(f"🧹 Cleaned up {len(expired_sessions)} expired sessions")
                
                # Sleep for 5 minutes
                await asyncio.sleep(300)
                
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")
                await asyncio.sleep(60)
    
    async def _save_users(self):
        """Save users to storage"""
        try:
            users_data = {}
            for user_id, user in self.users.items():
                user_dict = asdict(user)
                user_dict['role'] = user.role.value
                user_dict['status'] = user.status.value
                users_data[user_id] = user_dict
            
            async with aiofiles.open(self.users_file, 'w') as f:
                await f.write(json.dumps(users_data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save users: {e}")
    
    async def _save_sessions(self):
        """Save sessions to storage"""
        try:
            sessions_data = {}
            for session_id, session in self.sessions.items():
                sessions_data[session_id] = asdict(session)
            
            async with aiofiles.open(self.sessions_file, 'w') as f:
                await f.write(json.dumps(sessions_data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save sessions: {e}")
    
    async def _save_passwords(self):
        """Save password hashes to storage"""
        try:
            async with aiofiles.open(self.passwords_file, 'w') as f:
                await f.write(json.dumps(self.password_hashes, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save passwords: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        await self._save_users()
        await self._save_sessions()
        await self._save_passwords()
        
        logger.info("👥 UserManager cleanup completed")