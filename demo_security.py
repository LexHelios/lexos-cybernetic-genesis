#!/usr/bin/env python3
"""
LexOS Security System Demo - H100 Production Edition
Demonstration of the advanced security features
"""

import asyncio
import json
from pathlib import Path
from loguru import logger

from security.security_manager import create_security_manager
from security.user_manager import UserProfile, UserRole, UserStatus
from security.content_filter import FilterRule, ContentType, FilterAction
from security.access_control import AccessRule, ResourceType, Permission

async def demo_security_system():
    """Demonstrate the LexOS security system"""
    
    logger.info("🚀 Starting LexOS Security System Demo")
    
    # Configuration for the security system
    security_config = {
        "user_manager": {
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
    
    # Create and initialize security manager
    logger.info("🛡️ Initializing Security Manager...")
    security_manager = await create_security_manager(security_config)
    
    try:
        # Demo 1: User Management
        await demo_user_management(security_manager)
        
        # Demo 2: Content Filtering
        await demo_content_filtering(security_manager)
        
        # Demo 3: Access Control
        await demo_access_control(security_manager)
        
        # Demo 4: Audit Logging
        await demo_audit_logging(security_manager)
        
        # Demo 5: Admin Dashboard (optional)
        # await demo_admin_dashboard(security_manager)
        
        logger.success("✅ Security system demo completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Demo failed: {e}")
        raise
    
    finally:
        # Cleanup
        await security_manager.cleanup()

async def demo_user_management(security_manager):
    """Demonstrate user management features"""
    logger.info("👥 Demo: User Management")
    
    # First, authenticate as admin (default admin should exist)
    admin_auth = await security_manager.authenticate_user(
        "admin", 
        "your_admin_password_here",  # You'll need to check the generated password
        "127.0.0.1",
        "Demo Script"
    )
    
    if not admin_auth:
        logger.warning("⚠️ Admin authentication failed - using system privileges for demo")
        # For demo purposes, we'll create users directly
        
        # Create family members with different security levels
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
            },
            {
                "username": "guest_user",
                "email": "guest@sharma.family",
                "full_name": "Guest User",
                "password": "GuestPass000!",
                "role": "guest",
                "security_level": "SAFE", 
                "agent_access_level": "BASIC"
            }
        ]
        
        # Create users directly through user manager
        for member_data in family_members:
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
            
            success = await security_manager.user_manager.create_user(
                user_profile, 
                member_data["password"]
            )
            
            if success:
                logger.info(f"✅ Created user: {member_data['username']} ({member_data['security_level']})")
            else:
                logger.error(f"❌ Failed to create user: {member_data['username']}")
    
    # Test authentication for different users
    test_users = ["john_sharma", "jane_sharma", "teen_sharma", "guest_user"]
    test_passwords = ["SecurePass123!", "SafePass456!", "TeenPass789!", "GuestPass000!"]
    
    user_sessions = {}
    
    for username, password in zip(test_users, test_passwords):
        auth_result = await security_manager.authenticate_user(
            username, password, "127.0.0.1", "Demo Script"
        )
        
        if auth_result:
            user_sessions[username] = auth_result["session_id"]
            user_info = auth_result["user"]
            logger.info(f"✅ {username} authenticated - Security Level: {user_info['security_level']}")
        else:
            logger.warning(f"❌ {username} authentication failed")
    
    # Get user statistics
    user_stats = await security_manager.user_manager.get_user_stats()
    logger.info(f"📊 User Stats: {json.dumps(user_stats, indent=2)}")
    
    return user_sessions

async def demo_content_filtering(security_manager):
    """Demonstrate content filtering features"""
    logger.info("🛡️ Demo: Content Filtering")
    
    # Test content samples
    test_content = [
        {
            "content": "This is a normal family-friendly message about cooking dinner.",
            "expected": "SAFE"
        },
        {
            "content": "This message contains some damn profanity that should be filtered.",
            "expected": "FILTERED"
        },
        {
            "content": "This is adult content with explicit sexual material that should be blocked.",
            "expected": "BLOCKED"
        },
        {
            "content": "Discussion about violence and weapons in movies.",
            "expected": "DEPENDS_ON_LEVEL"
        },
        {
            "content": "My email is john@example.com and my phone is 555-123-4567.",
            "expected": "PII_FILTERED"
        }
    ]
    
    # Test with different security levels
    security_levels = ["SAFE", "RELAXED", "UNFILTERED"]
    
    for level in security_levels:
        logger.info(f"🔍 Testing content filtering at {level} level:")
        
        for i, test in enumerate(test_content):
            result = await security_manager.content_filter.test_content(
                test["content"], 
                level
            )
            
            logger.info(f"  Test {i+1}: {test['expected']}")
            logger.info(f"    Original: {test['content'][:50]}...")
            logger.info(f"    Filtered: {result['would_be_filtered']}")
            logger.info(f"    Action: {result['action_would_be_taken']}")
            logger.info(f"    Safe: {result['would_be_safe']}")
            if result['warnings']:
                logger.info(f"    Warnings: {result['warnings']}")
            logger.info("")
    
    # Create custom filter rule
    custom_rule = FilterRule(
        rule_id="demo_custom_rule",
        name="Demo Custom Filter",
        description="Custom filter for demo purposes",
        content_type=ContentType.TEXT,
        pattern=r'\b(demo|test)\b',
        action=FilterAction.WARN,
        severity=3,
        replacement_text="[DEMO CONTENT]"
    )
    
    success = await security_manager.content_filter.add_rule(custom_rule)
    if success:
        logger.info("✅ Added custom filter rule")
    
    # Get filter statistics
    filter_stats = await security_manager.content_filter.get_filter_stats()
    logger.info(f"📊 Filter Stats: {json.dumps(filter_stats, indent=2)}")

async def demo_access_control(security_manager):
    """Demonstrate access control features"""
    logger.info("🔐 Demo: Access Control")
    
    # Create test user session
    auth_result = await security_manager.authenticate_user(
        "john_sharma", "SecurePass123!", "127.0.0.1", "Demo Script"
    )
    
    if not auth_result:
        logger.warning("⚠️ Could not authenticate test user for access control demo")
        return
    
    session_id = auth_result["session_id"]
    
    # Test different access scenarios
    access_tests = [
        {
            "resource_type": "file",
            "resource_id": "user_documents",
            "permission": "read",
            "expected": True
        },
        {
            "resource_type": "file", 
            "resource_id": "system_config",
            "permission": "write",
            "expected": False
        },
        {
            "resource_type": "agent",
            "resource_id": "web_agent",
            "permission": "execute", 
            "expected": True
        },
        {
            "resource_type": "agent",
            "resource_id": "admin_agent",
            "permission": "execute",
            "expected": False
        },
        {
            "resource_type": "system",
            "resource_id": "user_management",
            "permission": "admin",
            "expected": False
        }
    ]
    
    logger.info("🧪 Testing access control scenarios:")
    
    for test in access_tests:
        access_granted = await security_manager.check_access(
            session_id,
            test["resource_type"],
            test["resource_id"], 
            test["permission"],
            "127.0.0.1",
            "Demo Script"
        )
        
        status = "✅" if access_granted == test["expected"] else "❌"
        logger.info(f"  {status} {test['resource_type']}:{test['resource_id']} ({test['permission']}) -> {access_granted}")
    
    # Get access statistics
    access_stats = await security_manager.access_control.get_access_stats()
    logger.info(f"📊 Access Stats: {json.dumps(access_stats, indent=2)}")

async def demo_audit_logging(security_manager):
    """Demonstrate audit logging features"""
    logger.info("📋 Demo: Audit Logging")
    
    # Generate some test audit events
    test_events = [
        ("user_action", "john_sharma", {"action": "file_upload", "file": "document.pdf"}),
        ("agent_interaction", "jane_sharma", {"agent": "web_agent", "query": "search for recipes"}),
        ("system_access", "teen_sharma", {"resource": "settings", "action": "view"}),
        ("security_event", "guest_user", {"event": "unauthorized_access_attempt", "resource": "admin_panel"})
    ]
    
    for event_type, user_id, details in test_events:
        await security_manager.audit_logger.log_event(
            event_type,
            user_id,
            details,
            ip_address="127.0.0.1",
            user_agent="Demo Script"
        )
    
    # Get recent audit logs
    recent_logs = await security_manager.audit_logger.get_logs(limit=20)
    logger.info(f"📜 Recent audit logs ({len(recent_logs)} entries):")
    
    for log in recent_logs[:5]:  # Show first 5
        logger.info(f"  {log['event_type']} - {log['user_id']} - {log['description']}")
    
    # Get audit statistics
    audit_stats = await security_manager.audit_logger.get_audit_stats()
    logger.info(f"📊 Audit Stats: {json.dumps(audit_stats, indent=2)}")
    
    # Search logs
    search_results = await security_manager.audit_logger.search_logs("john_sharma")
    logger.info(f"🔍 Search results for 'john_sharma': {len(search_results)} entries")

async def demo_admin_dashboard(security_manager):
    """Demonstrate admin dashboard (optional)"""
    logger.info("🎛️ Demo: Admin Dashboard")
    
    # This would start the web-based admin dashboard
    # For demo purposes, we'll just show that it's available
    
    if security_manager.admin_dashboard:
        logger.info("🌐 Admin dashboard is available and can be started with:")
        logger.info("   await security_manager.start_admin_dashboard(host='0.0.0.0', port=8080)")
        logger.info("   Then visit: http://localhost:8080")
        
        # Get dashboard data
        dashboard_data = await security_manager.get_security_dashboard_data("admin_session_id")
        if "error" not in dashboard_data:
            logger.info("📊 Dashboard data is available with comprehensive statistics")
        else:
            logger.info("⚠️ Dashboard data requires admin authentication")
    else:
        logger.info("⚠️ Admin dashboard is not enabled")

if __name__ == "__main__":
    # Run the demo
    asyncio.run(demo_security_system())