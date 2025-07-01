# LexOS Security System - H100 Production Edition

## 🛡️ Advanced Family-Safe AI Security Framework

The LexOS Security System is a comprehensive, enterprise-grade security framework designed specifically for family environments with granular control over AI agents, content filtering, and user access management.

## 🔥 Key Features

### 👥 Advanced User Management
- **Multi-Role System**: Admin, Family Member, Guest, Restricted
- **Granular Security Levels**: Safe, Relaxed, Unfiltered
- **Agent Access Control**: Basic, Advanced, Unrestricted
- **Family Supervision**: Parent-child relationships with supervision levels
- **Private Workspaces**: Isolated file systems for each user
- **Session Management**: Secure authentication with configurable timeouts

### 🛡️ Content Filtering Engine
- **Multi-Level Filtering**: Configurable content safety levels
- **Category-Based Rules**: Adult content, violence, profanity, sensitive topics
- **Custom Filter Rules**: Create your own filtering patterns
- **Real-Time Processing**: Filter content as it's generated
- **PII Protection**: Automatically redact personal information
- **User-Specific Rules**: Custom filters per family member

### 🔐 Access Control System
- **Resource-Based Permissions**: Control access to files, agents, APIs, system functions
- **Role-Based Access Control (RBAC)**: Permissions based on user roles
- **Time-Based Restrictions**: Limit access during certain hours/days
- **IP Whitelisting**: Restrict access by location
- **Agent Restrictions**: Control which AI agents users can access
- **Rate Limiting**: Prevent abuse with configurable limits

### 📋 Comprehensive Audit Logging
- **Complete Activity Tracking**: Every action is logged and monitored
- **Security Event Detection**: Automatic detection of suspicious patterns
- **Real-Time Alerts**: Immediate notification of security violations
- **Searchable Logs**: Find specific events quickly
- **Automated Archiving**: Long-term storage with compression
- **Compliance Ready**: Meet audit requirements for family safety

### 🎛️ Admin Dashboard
- **Web-Based Interface**: Modern, responsive admin panel
- **User Management**: Create, edit, delete family members
- **Security Configuration**: Adjust filtering and access rules
- **Real-Time Monitoring**: Live view of system activity
- **Statistics & Reports**: Comprehensive security analytics
- **Quick Actions**: Common administrative tasks

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Initialize security system
python demo_security.py
```

### 2. Basic Configuration

```python
from security.security_manager import create_security_manager

# Configure security system
config = {
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

# Initialize
security_manager = await create_security_manager(config)
```

### 3. Create Family Members

```python
# Create a family member
user_data = {
    "username": "john_sharma",
    "email": "john@sharma.family",
    "full_name": "John Sharma",
    "password": "SecurePass123!",
    "role": "family_member",
    "security_level": "RELAXED",  # SAFE, RELAXED, UNFILTERED
    "agent_access_level": "ADVANCED"  # BASIC, ADVANCED, UNRESTRICTED
}

result = await security_manager.create_user(admin_session_id, user_data)
```

## 🔧 Security Levels Explained

### 🟢 SAFE Level
- **Adult Content**: ❌ Blocked
- **Violence**: ❌ Blocked  
- **Profanity**: ❌ Filtered
- **Sensitive Topics**: ❌ Filtered
- **Agent Access**: Basic agents only
- **Perfect for**: Children, teens, conservative family members

### 🟡 RELAXED Level
- **Adult Content**: ❌ Blocked
- **Violence**: ✅ Allowed (filtered context)
- **Profanity**: ✅ Allowed (mild filtering)
- **Sensitive Topics**: ✅ Allowed
- **Agent Access**: Advanced agents
- **Perfect for**: Adults, mature teens

### 🔴 UNFILTERED Level
- **Adult Content**: ✅ Allowed
- **Violence**: ✅ Allowed
- **Profanity**: ✅ Allowed
- **Sensitive Topics**: ✅ Allowed
- **Agent Access**: All agents
- **Perfect for**: Admin, trusted adults

## 🤖 Agent Access Levels

### 🔵 BASIC Access
- **Available Agents**: Web Agent, Intelligence Agent
- **Capabilities**: Basic web search, simple reasoning
- **Restrictions**: No code execution, no system access
- **Safe for**: All family members

### 🟠 ADVANCED Access  
- **Available Agents**: Web, Intelligence, Code, Data Agents
- **Capabilities**: Code generation, data analysis, advanced reasoning
- **Restrictions**: Limited system access
- **Safe for**: Tech-savvy family members

### 🔴 UNRESTRICTED Access
- **Available Agents**: All agents including custom ones
- **Capabilities**: Full system access, code execution, admin functions
- **Restrictions**: None
- **Safe for**: Admin only

## 📊 Admin Dashboard

### Starting the Dashboard

```python
# Start admin dashboard
await security_manager.start_admin_dashboard(host="0.0.0.0", port=8080)
```

Visit `http://localhost:8080` and login with admin credentials.

### Dashboard Features

- **👥 User Management**: Create, edit, delete family members
- **🛡️ Content Filter Rules**: Manage filtering policies  
- **🔐 Access Control**: Set permissions and restrictions
- **📋 Audit Logs**: View and search security events
- **📊 Statistics**: Real-time security metrics
- **⚙️ System Settings**: Configure security policies

## 🔒 Privacy & Data Isolation

### Private Workspaces
Each user gets their own isolated workspace:
```
/home/user/data/workspaces/
├── user1_id/
│   ├── chats/          # Private chat history
│   ├── files/          # Personal files
│   ├── agents/         # Agent interactions
│   └── temp/           # Temporary files
└── user2_id/
    ├── chats/
    ├── files/
    ├── agents/
    └── temp/
```

### Data Separation
- **Chat History**: Never shared between users
- **File Access**: Users can only access their own files
- **Agent Memory**: Isolated per user
- **Search History**: Private to each user
- **Preferences**: User-specific settings

## 🚨 Security Monitoring

### Automatic Alerts
The system automatically detects and alerts on:
- **Failed Login Attempts**: Multiple failures from same IP
- **Unauthorized Access**: Attempts to access restricted resources
- **Suspicious Activity**: Unusual usage patterns
- **Content Violations**: Attempts to bypass filters
- **System Errors**: Security-related system issues

### Alert Thresholds (Configurable)
- Failed logins per hour: 10
- Unauthorized access per hour: 5  
- Critical events per hour: 3
- High severity events per hour: 20

## 🔧 Configuration Examples

### Family with Young Children
```python
config = {
    "enforce_content_filtering": True,
    "enforce_access_control": True,
    "default_security_level": "SAFE",
    "default_agent_access": "BASIC",
    "password_policy": {
        "min_length": 6,  # Easier for kids
        "require_special_chars": False
    }
}
```

### Tech-Savvy Family
```python
config = {
    "enforce_content_filtering": True,
    "enforce_access_control": True, 
    "default_security_level": "RELAXED",
    "default_agent_access": "ADVANCED",
    "password_policy": {
        "min_length": 12,  # Strong passwords
        "require_special_chars": True
    }
}
```

### Enterprise/Business Use
```python
config = {
    "enforce_content_filtering": True,
    "enforce_access_control": True,
    "audit_all_actions": True,
    "session_timeout": 28800,  # 8 hours
    "password_policy": {
        "min_length": 14,
        "require_uppercase": True,
        "require_lowercase": True, 
        "require_numbers": True,
        "require_special_chars": True
    }
}
```

## 🛠️ API Reference

### Authentication
```python
# Login
auth_result = await security_manager.authenticate_user(
    username="john_sharma",
    password="SecurePass123!",
    ip_address="192.168.1.100",
    user_agent="Mozilla/5.0..."
)

# Validate session
user = await security_manager.validate_session(session_id)

# Logout
await security_manager.logout_user(session_id)
```

### Content Filtering
```python
# Filter content
result = await security_manager.filter_content(
    session_id=session_id,
    content="Some text to filter",
    content_type="text"
)

# Check if content is safe
if result["is_safe"]:
    # Content passed filtering
    filtered_text = result["filtered_content"]
```

### Access Control
```python
# Check access
has_access = await security_manager.check_access(
    session_id=session_id,
    resource_type="agent",
    resource_id="code_agent", 
    permission="execute"
)

if has_access:
    # User can access the resource
    pass
```

## 📁 File Structure

```
security/
├── __init__.py              # Security module exports
├── security_manager.py      # Main security orchestrator
├── user_manager.py          # User authentication & management
├── content_filter.py        # Content filtering engine
├── access_control.py        # Access control system
├── audit_logger.py          # Audit logging & monitoring
├── admin_dashboard.py       # Web-based admin interface
└── templates/               # HTML templates for dashboard
    ├── dashboard.html
    ├── users.html
    ├── content_filter.html
    └── audit.html
```

## 🔐 Security Best Practices

### For Administrators
1. **Use Strong Admin Passwords**: 16+ characters with mixed case, numbers, symbols
2. **Regular Security Reviews**: Check audit logs weekly
3. **Update Filter Rules**: Keep content filters current
4. **Monitor User Activity**: Watch for unusual patterns
5. **Backup Security Data**: Regular backups of user data and logs

### For Family Members
1. **Unique Passwords**: Each family member should have their own strong password
2. **Report Issues**: Tell admin about any security concerns
3. **Respect Restrictions**: Don't try to bypass security measures
4. **Keep Sessions Secure**: Log out when done, especially on shared devices

### For System Security
1. **Regular Updates**: Keep the system and dependencies updated
2. **Network Security**: Use firewalls and secure networks
3. **Access Logging**: Monitor who accesses the admin dashboard
4. **Incident Response**: Have a plan for security incidents

## 🆘 Troubleshooting

### Common Issues

**Q: Can't login as admin**
A: Check `/home/user/data/security/admin_credentials.txt` for the generated admin password.

**Q: Content not being filtered**
A: Verify `enforce_content_filtering` is `True` in config and user has appropriate security level.

**Q: User can't access agent**
A: Check user's `agent_access_level` and verify agent is in allowed list for that level.

**Q: Dashboard won't start**
A: Ensure port 8080 is available and admin dashboard is enabled in config.

**Q: Audit logs not showing**
A: Verify `audit_all_actions` is `True` and check file permissions in data directory.

### Debug Mode
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check security manager status
dashboard_data = await security_manager.get_security_dashboard_data(admin_session_id)
print(json.dumps(dashboard_data, indent=2))
```

## 📞 Support

For issues, questions, or feature requests:
- Check the audit logs for security events
- Review the configuration settings
- Run the demo script to verify functionality
- Check file permissions in the data directory

## 🔄 Updates & Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review audit logs for security events
- **Monthly**: Update content filter rules
- **Quarterly**: Review user access permissions
- **Annually**: Full security audit and password updates

### Backup Strategy
```bash
# Backup security data
tar -czf security_backup_$(date +%Y%m%d).tar.gz /home/user/data/security/

# Restore from backup
tar -xzf security_backup_YYYYMMDD.tar.gz -C /
```

---

**LexOS Security System** - Protecting families in the age of AI 🛡️🤖👨‍👩‍👧‍👦