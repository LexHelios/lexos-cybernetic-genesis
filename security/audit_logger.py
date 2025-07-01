#!/usr/bin/env python3
"""
LexOS Audit Logger - H100 Production Edition
Comprehensive audit logging and security monitoring
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import aiofiles
from loguru import logger
import hashlib
import gzip
from datetime import datetime, timedelta

class EventSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class EventCategory(Enum):
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    USER_MANAGEMENT = "user_management"
    CONTENT_FILTERING = "content_filtering"
    SYSTEM_ACCESS = "system_access"
    DATA_ACCESS = "data_access"
    CONFIGURATION = "configuration"
    SECURITY = "security"
    ERROR = "error"

@dataclass
class AuditEvent:
    """Audit event record"""
    event_id: str
    event_type: str
    category: EventCategory
    severity: EventSeverity
    user_id: str
    description: str
    details: Dict[str, Any]
    timestamp: float
    ip_address: str = ""
    user_agent: str = ""
    session_id: str = ""
    resource_affected: str = ""
    outcome: str = "success"  # success, failure, error
    
    def __post_init__(self):
        if not self.event_id:
            self.event_id = f"audit_{int(time.time() * 1000)}_{hashlib.md5(f'{self.user_id}{self.event_type}{self.timestamp}'.encode()).hexdigest()[:8]}"

class AuditLogger:
    """Comprehensive audit logging system"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.events: List[AuditEvent] = []
        
        # Storage configuration
        self.data_dir = Path(self.config.get("data_dir", "/home/user/data/security/audit"))
        self.current_log_file = self.data_dir / "current_audit.json"
        self.archived_logs_dir = self.data_dir / "archived"
        
        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.archived_logs_dir.mkdir(parents=True, exist_ok=True)
        
        # Configuration
        self.max_events_in_memory = self.config.get("max_events_in_memory", 10000)
        self.archive_after_days = self.config.get("archive_after_days", 30)
        self.compress_archives = self.config.get("compress_archives", True)
        self.retention_days = self.config.get("retention_days", 365)
        
        # Event type mappings
        self.event_severity_map = {
            # Authentication events
            "login_success": EventSeverity.LOW,
            "login_failure": EventSeverity.MEDIUM,
            "logout": EventSeverity.LOW,
            "password_change": EventSeverity.MEDIUM,
            "password_reset": EventSeverity.HIGH,
            "account_locked": EventSeverity.HIGH,
            
            # User management
            "user_created": EventSeverity.MEDIUM,
            "user_updated": EventSeverity.MEDIUM,
            "user_deleted": EventSeverity.HIGH,
            "role_changed": EventSeverity.HIGH,
            "permissions_changed": EventSeverity.HIGH,
            
            # Content filtering
            "content_blocked": EventSeverity.MEDIUM,
            "filter_rule_created": EventSeverity.MEDIUM,
            "filter_rule_updated": EventSeverity.MEDIUM,
            "filter_rule_deleted": EventSeverity.HIGH,
            
            # System access
            "admin_login": EventSeverity.HIGH,
            "admin_logout": EventSeverity.MEDIUM,
            "system_configuration_changed": EventSeverity.HIGH,
            "agent_accessed": EventSeverity.LOW,
            "api_access": EventSeverity.LOW,
            
            # Security events
            "unauthorized_access_attempt": EventSeverity.HIGH,
            "suspicious_activity": EventSeverity.HIGH,
            "security_violation": EventSeverity.CRITICAL,
            "data_breach_attempt": EventSeverity.CRITICAL,
            
            # Errors
            "system_error": EventSeverity.MEDIUM,
            "security_error": EventSeverity.HIGH,
            "critical_error": EventSeverity.CRITICAL
        }
        
        self.event_category_map = {
            # Authentication
            "login_success": EventCategory.AUTHENTICATION,
            "login_failure": EventCategory.AUTHENTICATION,
            "logout": EventCategory.AUTHENTICATION,
            "password_change": EventCategory.AUTHENTICATION,
            "password_reset": EventCategory.AUTHENTICATION,
            "account_locked": EventCategory.AUTHENTICATION,
            
            # User management
            "user_created": EventCategory.USER_MANAGEMENT,
            "user_updated": EventCategory.USER_MANAGEMENT,
            "user_deleted": EventCategory.USER_MANAGEMENT,
            "role_changed": EventCategory.USER_MANAGEMENT,
            "permissions_changed": EventCategory.AUTHORIZATION,
            
            # Content filtering
            "content_blocked": EventCategory.CONTENT_FILTERING,
            "filter_rule_created": EventCategory.CONTENT_FILTERING,
            "filter_rule_updated": EventCategory.CONTENT_FILTERING,
            "filter_rule_deleted": EventCategory.CONTENT_FILTERING,
            
            # System access
            "admin_login": EventCategory.SYSTEM_ACCESS,
            "admin_logout": EventCategory.SYSTEM_ACCESS,
            "system_configuration_changed": EventCategory.CONFIGURATION,
            "agent_accessed": EventCategory.SYSTEM_ACCESS,
            "api_access": EventCategory.SYSTEM_ACCESS,
            
            # Security
            "unauthorized_access_attempt": EventCategory.SECURITY,
            "suspicious_activity": EventCategory.SECURITY,
            "security_violation": EventCategory.SECURITY,
            "data_breach_attempt": EventCategory.SECURITY
        }
        
        # Alert thresholds
        self.alert_thresholds = {
            "failed_logins_per_hour": 10,
            "unauthorized_access_per_hour": 5,
            "critical_events_per_hour": 3,
            "high_severity_events_per_hour": 20
        }
        
        logger.info("📋 AuditLogger initialized")
    
    async def initialize(self):
        """Initialize audit logger"""
        await self._load_current_events()
        
        # Start background tasks
        asyncio.create_task(self._periodic_archive())
        asyncio.create_task(self._periodic_cleanup())
        asyncio.create_task(self._security_monitoring())
        
        logger.success("✅ AuditLogger initialized successfully")
    
    async def _load_current_events(self):
        """Load current events from storage"""
        if self.current_log_file.exists():
            try:
                async with aiofiles.open(self.current_log_file, 'r') as f:
                    events_data = json.loads(await f.read())
                
                for event_data in events_data:
                    event_data['category'] = EventCategory(event_data['category'])
                    event_data['severity'] = EventSeverity(event_data['severity'])
                    self.events.append(AuditEvent(**event_data))
                
                logger.info(f"📚 Loaded {len(self.events)} audit events")
                
            except Exception as e:
                logger.error(f"Failed to load audit events: {e}")
    
    async def log_event(self, event_type: str, user_id: str, details: Dict[str, Any] = None,
                       ip_address: str = "", user_agent: str = "", session_id: str = "",
                       resource_affected: str = "", outcome: str = "success") -> str:
        """Log an audit event"""
        try:
            # Determine category and severity
            category = self.event_category_map.get(event_type, EventCategory.SYSTEM_ACCESS)
            severity = self.event_severity_map.get(event_type, EventSeverity.LOW)
            
            # Create event
            event = AuditEvent(
                event_id="",  # Will be generated in __post_init__
                event_type=event_type,
                category=category,
                severity=severity,
                user_id=user_id,
                description=self._generate_description(event_type, details or {}),
                details=details or {},
                timestamp=time.time(),
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id,
                resource_affected=resource_affected,
                outcome=outcome
            )
            
            # Add to events list
            self.events.append(event)
            
            # Log to system logger based on severity
            log_message = f"[{event.category.value.upper()}] {event.description}"
            if severity == EventSeverity.CRITICAL:
                logger.critical(log_message)
            elif severity == EventSeverity.HIGH:
                logger.error(log_message)
            elif severity == EventSeverity.MEDIUM:
                logger.warning(log_message)
            else:
                logger.info(log_message)
            
            # Save to storage periodically
            if len(self.events) % 100 == 0:  # Save every 100 events
                await self._save_current_events()
            
            # Check for alerts
            await self._check_alerts(event)
            
            return event.event_id
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            return ""
    
    def _generate_description(self, event_type: str, details: Dict[str, Any]) -> str:
        """Generate human-readable description for event"""
        descriptions = {
            "login_success": f"User successfully logged in",
            "login_failure": f"Failed login attempt",
            "logout": f"User logged out",
            "password_change": f"User changed password",
            "password_reset": f"Password was reset",
            "account_locked": f"Account was locked due to failed attempts",
            
            "user_created": f"New user created: {details.get('username', 'unknown')}",
            "user_updated": f"User profile updated: {details.get('username', 'unknown')}",
            "user_deleted": f"User deleted: {details.get('username', 'unknown')}",
            "role_changed": f"User role changed to {details.get('new_role', 'unknown')}",
            "permissions_changed": f"User permissions modified",
            
            "content_blocked": f"Content blocked by filter: {details.get('filter_rule', 'unknown')}",
            "filter_rule_created": f"Content filter rule created: {details.get('rule_name', 'unknown')}",
            "filter_rule_updated": f"Content filter rule updated: {details.get('rule_name', 'unknown')}",
            "filter_rule_deleted": f"Content filter rule deleted: {details.get('rule_name', 'unknown')}",
            
            "admin_login": f"Administrator logged in",
            "admin_logout": f"Administrator logged out",
            "system_configuration_changed": f"System configuration modified",
            "agent_accessed": f"AI agent accessed: {details.get('agent_id', 'unknown')}",
            "api_access": f"API endpoint accessed: {details.get('endpoint', 'unknown')}",
            
            "unauthorized_access_attempt": f"Unauthorized access attempt to {details.get('resource', 'unknown')}",
            "suspicious_activity": f"Suspicious activity detected: {details.get('activity', 'unknown')}",
            "security_violation": f"Security policy violation: {details.get('violation', 'unknown')}",
            "data_breach_attempt": f"Potential data breach attempt detected",
            
            "system_error": f"System error occurred: {details.get('error', 'unknown')}",
            "security_error": f"Security-related error: {details.get('error', 'unknown')}",
            "critical_error": f"Critical system error: {details.get('error', 'unknown')}"
        }
        
        return descriptions.get(event_type, f"Event: {event_type}")
    
    async def _check_alerts(self, event: AuditEvent):
        """Check if event triggers any alerts"""
        try:
            current_time = time.time()
            hour_ago = current_time - 3600
            
            # Get recent events
            recent_events = [e for e in self.events if e.timestamp > hour_ago]
            
            # Check failed login threshold
            if event.event_type == "login_failure":
                failed_logins = len([e for e in recent_events if e.event_type == "login_failure"])
                if failed_logins >= self.alert_thresholds["failed_logins_per_hour"]:
                    await self._trigger_alert("high_failed_login_rate", {
                        "count": failed_logins,
                        "threshold": self.alert_thresholds["failed_logins_per_hour"],
                        "time_window": "1 hour"
                    })
            
            # Check unauthorized access threshold
            if event.event_type == "unauthorized_access_attempt":
                unauthorized_attempts = len([e for e in recent_events if e.event_type == "unauthorized_access_attempt"])
                if unauthorized_attempts >= self.alert_thresholds["unauthorized_access_per_hour"]:
                    await self._trigger_alert("high_unauthorized_access_rate", {
                        "count": unauthorized_attempts,
                        "threshold": self.alert_thresholds["unauthorized_access_per_hour"],
                        "time_window": "1 hour"
                    })
            
            # Check critical events threshold
            if event.severity == EventSeverity.CRITICAL:
                critical_events = len([e for e in recent_events if e.severity == EventSeverity.CRITICAL])
                if critical_events >= self.alert_thresholds["critical_events_per_hour"]:
                    await self._trigger_alert("high_critical_event_rate", {
                        "count": critical_events,
                        "threshold": self.alert_thresholds["critical_events_per_hour"],
                        "time_window": "1 hour"
                    })
            
            # Check high severity events threshold
            if event.severity == EventSeverity.HIGH:
                high_severity_events = len([e for e in recent_events if e.severity == EventSeverity.HIGH])
                if high_severity_events >= self.alert_thresholds["high_severity_events_per_hour"]:
                    await self._trigger_alert("high_severity_event_rate", {
                        "count": high_severity_events,
                        "threshold": self.alert_thresholds["high_severity_events_per_hour"],
                        "time_window": "1 hour"
                    })
            
        except Exception as e:
            logger.error(f"Alert checking error: {e}")
    
    async def _trigger_alert(self, alert_type: str, details: Dict[str, Any]):
        """Trigger security alert"""
        alert_event = AuditEvent(
            event_id="",
            event_type=f"security_alert_{alert_type}",
            category=EventCategory.SECURITY,
            severity=EventSeverity.CRITICAL,
            user_id="system",
            description=f"Security alert triggered: {alert_type}",
            details=details,
            timestamp=time.time(),
            outcome="alert"
        )
        
        self.events.append(alert_event)
        
        logger.critical(f"🚨 SECURITY ALERT: {alert_type} - {details}")
        
        # Here you could integrate with external alerting systems
        # (email, Slack, PagerDuty, etc.)
    
    async def get_logs(self, limit: int = 100, offset: int = 0, 
                      user_id: Optional[str] = None, 
                      category: Optional[str] = None,
                      severity: Optional[str] = None,
                      start_time: Optional[float] = None,
                      end_time: Optional[float] = None) -> List[Dict[str, Any]]:
        """Get audit logs with filtering"""
        try:
            # Filter events
            filtered_events = self.events.copy()
            
            if user_id:
                filtered_events = [e for e in filtered_events if e.user_id == user_id]
            
            if category:
                filtered_events = [e for e in filtered_events if e.category.value == category]
            
            if severity:
                filtered_events = [e for e in filtered_events if e.severity.value == severity]
            
            if start_time:
                filtered_events = [e for e in filtered_events if e.timestamp >= start_time]
            
            if end_time:
                filtered_events = [e for e in filtered_events if e.timestamp <= end_time]
            
            # Sort by timestamp (most recent first)
            filtered_events.sort(key=lambda x: x.timestamp, reverse=True)
            
            # Apply pagination
            paginated_events = filtered_events[offset:offset + limit]
            
            # Convert to dict format
            result = []
            for event in paginated_events:
                event_dict = asdict(event)
                event_dict['category'] = event.category.value
                event_dict['severity'] = event.severity.value
                result.append(event_dict)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get logs: {e}")
            return []
    
    async def get_audit_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get audit statistics"""
        try:
            cutoff_time = time.time() - (hours * 3600)
            recent_events = [e for e in self.events if e.timestamp > cutoff_time]
            
            total_events = len(recent_events)
            
            # Category breakdown
            category_counts = {}
            for category in EventCategory:
                category_counts[category.value] = len([e for e in recent_events if e.category == category])
            
            # Severity breakdown
            severity_counts = {}
            for severity in EventSeverity:
                severity_counts[severity.value] = len([e for e in recent_events if e.severity == severity])
            
            # Outcome breakdown
            outcome_counts = {}
            for event in recent_events:
                outcome = event.outcome
                outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1
            
            # Top event types
            event_type_counts = {}
            for event in recent_events:
                event_type = event.event_type
                event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1
            
            top_event_types = sorted(event_type_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            
            # Top users by activity
            user_activity = {}
            for event in recent_events:
                user_id = event.user_id
                user_activity[user_id] = user_activity.get(user_id, 0) + 1
            
            top_users = sorted(user_activity.items(), key=lambda x: x[1], reverse=True)[:10]
            
            # Security metrics
            security_events = [e for e in recent_events if e.category == EventCategory.SECURITY]
            failed_logins = len([e for e in recent_events if e.event_type == "login_failure"])
            unauthorized_attempts = len([e for e in recent_events if e.event_type == "unauthorized_access_attempt"])
            
            return {
                "total_events": total_events,
                "time_period_hours": hours,
                "category_breakdown": category_counts,
                "severity_breakdown": severity_counts,
                "outcome_breakdown": outcome_counts,
                "top_event_types": top_event_types,
                "top_users_by_activity": top_users,
                "security_metrics": {
                    "security_events": len(security_events),
                    "failed_logins": failed_logins,
                    "unauthorized_attempts": unauthorized_attempts
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get audit stats: {e}")
            return {}
    
    async def search_logs(self, query: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Search audit logs"""
        try:
            query_lower = query.lower()
            matching_events = []
            
            for event in self.events:
                # Search in description
                if query_lower in event.description.lower():
                    matching_events.append(event)
                    continue
                
                # Search in event type
                if query_lower in event.event_type.lower():
                    matching_events.append(event)
                    continue
                
                # Search in details
                details_str = json.dumps(event.details).lower()
                if query_lower in details_str:
                    matching_events.append(event)
                    continue
                
                # Search in user ID
                if query_lower in event.user_id.lower():
                    matching_events.append(event)
                    continue
            
            # Sort by timestamp (most recent first)
            matching_events.sort(key=lambda x: x.timestamp, reverse=True)
            
            # Limit results
            matching_events = matching_events[:limit]
            
            # Convert to dict format
            result = []
            for event in matching_events:
                event_dict = asdict(event)
                event_dict['category'] = event.category.value
                event_dict['severity'] = event.severity.value
                result.append(event_dict)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to search logs: {e}")
            return []
    
    async def export_logs(self, start_time: Optional[float] = None, 
                         end_time: Optional[float] = None,
                         format: str = "json") -> str:
        """Export audit logs"""
        try:
            # Filter events by time range
            events_to_export = self.events.copy()
            
            if start_time:
                events_to_export = [e for e in events_to_export if e.timestamp >= start_time]
            
            if end_time:
                events_to_export = [e for e in events_to_export if e.timestamp <= end_time]
            
            # Sort by timestamp
            events_to_export.sort(key=lambda x: x.timestamp)
            
            if format.lower() == "json":
                # Convert to dict format
                export_data = []
                for event in events_to_export:
                    event_dict = asdict(event)
                    event_dict['category'] = event.category.value
                    event_dict['severity'] = event.severity.value
                    export_data.append(event_dict)
                
                return json.dumps(export_data, indent=2)
            
            elif format.lower() == "csv":
                import csv
                import io
                
                output = io.StringIO()
                writer = csv.writer(output)
                
                # Write header
                writer.writerow([
                    "Event ID", "Event Type", "Category", "Severity", "User ID",
                    "Description", "Timestamp", "IP Address", "Outcome", "Details"
                ])
                
                # Write events
                for event in events_to_export:
                    writer.writerow([
                        event.event_id, event.event_type, event.category.value,
                        event.severity.value, event.user_id, event.description,
                        event.timestamp, event.ip_address, event.outcome,
                        json.dumps(event.details)
                    ])
                
                return output.getvalue()
            
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            logger.error(f"Failed to export logs: {e}")
            return ""
    
    async def _periodic_archive(self):
        """Periodically archive old events"""
        while True:
            try:
                cutoff_time = time.time() - (self.archive_after_days * 86400)
                
                # Find events to archive
                events_to_archive = [e for e in self.events if e.timestamp < cutoff_time]
                
                if events_to_archive:
                    # Create archive file
                    archive_date = datetime.fromtimestamp(cutoff_time).strftime("%Y%m%d")
                    archive_filename = f"audit_archive_{archive_date}.json"
                    
                    if self.compress_archives:
                        archive_filename += ".gz"
                    
                    archive_path = self.archived_logs_dir / archive_filename
                    
                    # Prepare archive data
                    archive_data = []
                    for event in events_to_archive:
                        event_dict = asdict(event)
                        event_dict['category'] = event.category.value
                        event_dict['severity'] = event.severity.value
                        archive_data.append(event_dict)
                    
                    # Write archive
                    if self.compress_archives:
                        with gzip.open(archive_path, 'wt') as f:
                            json.dump(archive_data, f, indent=2)
                    else:
                        async with aiofiles.open(archive_path, 'w') as f:
                            await f.write(json.dumps(archive_data, indent=2))
                    
                    # Remove archived events from memory
                    self.events = [e for e in self.events if e.timestamp >= cutoff_time]
                    
                    logger.info(f"📦 Archived {len(events_to_archive)} audit events to {archive_filename}")
                
                # Sleep for 24 hours
                await asyncio.sleep(86400)
                
            except Exception as e:
                logger.error(f"Archive process error: {e}")
                await asyncio.sleep(3600)  # Sleep 1 hour on error
    
    async def _periodic_cleanup(self):
        """Periodically clean up old archived files"""
        while True:
            try:
                cutoff_time = time.time() - (self.retention_days * 86400)
                
                # Find old archive files
                for archive_file in self.archived_logs_dir.glob("audit_archive_*.json*"):
                    if archive_file.stat().st_mtime < cutoff_time:
                        archive_file.unlink()
                        logger.info(f"🗑️ Deleted old audit archive: {archive_file.name}")
                
                # Sleep for 24 hours
                await asyncio.sleep(86400)
                
            except Exception as e:
                logger.error(f"Cleanup process error: {e}")
                await asyncio.sleep(3600)  # Sleep 1 hour on error
    
    async def _security_monitoring(self):
        """Continuous security monitoring"""
        while True:
            try:
                current_time = time.time()
                hour_ago = current_time - 3600
                
                # Get recent events
                recent_events = [e for e in self.events if e.timestamp > hour_ago]
                
                # Check for suspicious patterns
                await self._detect_suspicious_patterns(recent_events)
                
                # Sleep for 5 minutes
                await asyncio.sleep(300)
                
            except Exception as e:
                logger.error(f"Security monitoring error: {e}")
                await asyncio.sleep(60)  # Sleep 1 minute on error
    
    async def _detect_suspicious_patterns(self, events: List[AuditEvent]):
        """Detect suspicious activity patterns"""
        try:
            # Pattern 1: Multiple failed logins from same IP
            ip_failed_logins = {}
            for event in events:
                if event.event_type == "login_failure" and event.ip_address:
                    ip = event.ip_address
                    ip_failed_logins[ip] = ip_failed_logins.get(ip, 0) + 1
            
            for ip, count in ip_failed_logins.items():
                if count >= 5:  # 5 or more failed logins from same IP
                    await self.log_event(
                        "suspicious_activity",
                        "system",
                        {
                            "pattern": "multiple_failed_logins_same_ip",
                            "ip_address": ip,
                            "failed_login_count": count,
                            "time_window": "1 hour"
                        },
                        outcome="detected"
                    )
            
            # Pattern 2: Rapid user creation
            user_creation_events = [e for e in events if e.event_type == "user_created"]
            if len(user_creation_events) >= 5:  # 5 or more users created in 1 hour
                await self.log_event(
                    "suspicious_activity",
                    "system",
                    {
                        "pattern": "rapid_user_creation",
                        "user_creation_count": len(user_creation_events),
                        "time_window": "1 hour"
                    },
                    outcome="detected"
                )
            
            # Pattern 3: Multiple unauthorized access attempts
            unauthorized_events = [e for e in events if e.event_type == "unauthorized_access_attempt"]
            if len(unauthorized_events) >= 3:  # 3 or more unauthorized attempts
                await self.log_event(
                    "suspicious_activity",
                    "system",
                    {
                        "pattern": "multiple_unauthorized_access",
                        "unauthorized_attempt_count": len(unauthorized_events),
                        "time_window": "1 hour"
                    },
                    outcome="detected"
                )
            
        except Exception as e:
            logger.error(f"Suspicious pattern detection error: {e}")
    
    async def _save_current_events(self):
        """Save current events to storage"""
        try:
            # Keep only recent events in current log
            cutoff_time = time.time() - 86400  # 24 hours
            current_events = [e for e in self.events if e.timestamp > cutoff_time]
            
            # Convert to dict format
            events_data = []
            for event in current_events:
                event_dict = asdict(event)
                event_dict['category'] = event.category.value
                event_dict['severity'] = event.severity.value
                events_data.append(event_dict)
            
            async with aiofiles.open(self.current_log_file, 'w') as f:
                await f.write(json.dumps(events_data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save current events: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        await self._save_current_events()
        
        logger.info("📋 AuditLogger cleanup completed")