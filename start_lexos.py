#!/usr/bin/env python3
"""
LexOS Startup Script - H100 Production Edition
Initialize and start the complete LexOS system
"""

import asyncio
import sys
import os
from pathlib import Path
from loguru import logger

# Add current directory to path
sys.path.append('/home/user')

from security.security_manager import create_security_manager
from security.user_manager import UserProfile, UserRole, UserStatus

async def initialize_lexos():
    """Initialize the complete LexOS system"""
    
    logger.info("🚀 NEXUS AWAKENING - LexOS H100 Initialization")
    logger.info("=" * 60)
    
    # Create data directories
    logger.info("📁 Creating data directories...")
    data_dirs = [
        "/home/user/data/security",
        "/home/user/data/security/audit",
        "/home/user/data/workspaces",
        "/home/user/logs"
    ]
    
    for dir_path in data_dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        logger.info(f"   ✅ {dir_path}")
    
    # Security configuration
    logger.info("🛡️ Configuring security system...")
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
    logger.info("🔐 Initializing security manager...")
    security_manager = await create_security_manager(security_config)
    logger.success("   ✅ Security manager initialized")
    
    # Create default family members
    logger.info("👥 Creating default family members...")
    
    # Check if admin already exists
    admin_exists = False
    try:
        admin_session = await security_manager.authenticate_user("admin", "Admin123!", "127.0.0.1", "Setup")
        if admin_session:
            admin_exists = True
            logger.info("   ✅ Admin user already exists")
    except:
        pass
    
    if not admin_exists:
        # Create admin user directly
        from uuid import uuid4
        admin_profile = UserProfile(
            user_id=str(uuid4()),
            username="admin",
            email="admin@sharma.family",
            full_name="System Administrator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            security_level="UNFILTERED",
            agent_access_level="UNRESTRICTED"
        )
        
        admin_created = await security_manager.user_manager.create_user(admin_profile, "Admin123!")
        if admin_created:
            logger.success("   ✅ Admin user created - Username: admin, Password: Admin123!")
        else:
            logger.error("   ❌ Failed to create admin user")
    
    # Create sample family members
    family_members = [
        {
            "username": "john_sharma",
            "email": "john@sharma.family",
            "full_name": "John Sharma",
            "password": "SecurePass123!",
            "role": "family_member",
            "security_level": "RELAXED",
            "agent_access_level": "ADVANCED"
        },
        {
            "username": "jane_sharma",
            "email": "jane@sharma.family",
            "full_name": "Jane Sharma",
            "password": "SafePass456!",
            "role": "family_member",
            "security_level": "SAFE",
            "agent_access_level": "BASIC"
        },
        {
            "username": "teen_sharma",
            "email": "teen@sharma.family",
            "full_name": "Teen Sharma",
            "password": "TeenPass789!",
            "role": "family_member",
            "security_level": "SAFE",
            "agent_access_level": "BASIC",
            "supervision_level": "basic"
        }
    ]
    
    for member_data in family_members:
        try:
            # Check if user already exists
            existing_user = await security_manager.user_manager.get_user_by_username(member_data["username"])
            if existing_user:
                logger.info(f"   ✅ {member_data['username']} already exists")
                continue
            
            from uuid import uuid4
            user_profile = UserProfile(
                user_id=str(uuid4()),
                username=member_data["username"],
                email=member_data["email"],
                full_name=member_data["full_name"],
                role=UserRole(member_data["role"]),
                status=UserStatus.ACTIVE,
                security_level=member_data["security_level"],
                agent_access_level=member_data["agent_access_level"],
                supervision_level=member_data.get("supervision_level", "none")
            )
            
            success = await security_manager.user_manager.create_user(user_profile, member_data["password"])
            if success:
                logger.success(f"   ✅ Created {member_data['username']} ({member_data['security_level']})")
            else:
                logger.error(f"   ❌ Failed to create {member_data['username']}")
                
        except Exception as e:
            logger.error(f"   ❌ Error creating {member_data['username']}: {e}")
    
    # Test the system
    logger.info("🧪 Testing system functionality...")
    
    # Test authentication
    try:
        auth_result = await security_manager.authenticate_user("john_sharma", "SecurePass123!", "127.0.0.1", "Test")
        if auth_result:
            logger.success("   ✅ Authentication test passed")
            
            # Test content filtering
            filter_result = await security_manager.filter_content(
                auth_result["session_id"],
                "This is a test message for content filtering.",
                "text"
            )
            if filter_result["is_safe"]:
                logger.success("   ✅ Content filtering test passed")
            
            # Test access control
            access_result = await security_manager.check_access(
                auth_result["session_id"],
                "agent",
                "web_agent",
                "execute"
            )
            if access_result:
                logger.success("   ✅ Access control test passed")
            
            # Logout
            await security_manager.logout_user(auth_result["session_id"])
            
        else:
            logger.error("   ❌ Authentication test failed")
            
    except Exception as e:
        logger.error(f"   ❌ System test error: {e}")
    
    # Get system statistics
    logger.info("📊 System statistics:")
    try:
        user_stats = await security_manager.user_manager.get_user_stats()
        logger.info(f"   👥 Users: {user_stats.get('total_users', 0)}")
        logger.info(f"   🔐 Active sessions: {user_stats.get('active_sessions', 0)}")
        
        audit_stats = await security_manager.audit_logger.get_audit_stats()
        logger.info(f"   📋 Audit events (24h): {audit_stats.get('total_events', 0)}")
        
    except Exception as e:
        logger.warning(f"   ⚠️ Could not get statistics: {e}")
    
    # Cleanup
    await security_manager.cleanup()
    
    logger.info("=" * 60)
    logger.success("🎉 LexOS INITIALIZATION COMPLETE!")
    logger.info("🔥 System is ready for deployment")
    logger.info("")
    logger.info("📋 Default Credentials:")
    logger.info("   Admin: admin / Admin123!")
    logger.info("   John:  john_sharma / SecurePass123!")
    logger.info("   Jane:  jane_sharma / SafePass456!")
    logger.info("   Teen:  teen_sharma / TeenPass789!")
    logger.info("")
    logger.info("🚀 To start the server:")
    logger.info("   python3 lexos_server.py")
    logger.info("")
    logger.info("🌐 Server will be available at:")
    logger.info("   http://localhost:8000")
    logger.info("   http://0.0.0.0:8000")

if __name__ == "__main__":
    # Configure logging
    logger.remove()
    logger.add(
        sys.stdout,
        level="INFO",
        format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | <cyan>{message}</cyan>"
    )
    
    # Run initialization
    asyncio.run(initialize_lexos())