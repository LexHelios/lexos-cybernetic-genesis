#!/usr/bin/env python3
"""
LexOS Content Filter - H100 Production Edition
Advanced content filtering with granular controls
"""

import asyncio
import json
import re
import time
from typing import Dict, List, Any, Optional, Set, Tuple
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
import aiofiles
from loguru import logger
import hashlib

from .constants import SECURITY_LEVELS

class ContentType(Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FILE = "file"
    URL = "url"

class FilterAction(Enum):
    ALLOW = "allow"
    BLOCK = "block"
    WARN = "warn"
    MODERATE = "moderate"
    REPLACE = "replace"

@dataclass
class FilterRule:
    """Content filtering rule"""
    rule_id: str
    name: str
    description: str
    content_type: ContentType
    pattern: str  # Regex pattern or keyword
    action: FilterAction
    severity: int  # 1-10, higher = more severe
    replacement_text: str = ""
    enabled: bool = True
    created_at: float = 0
    
    def __post_init__(self):
        if self.created_at == 0:
            self.created_at = time.time()

@dataclass
class FilterResult:
    """Result of content filtering"""
    original_content: str
    filtered_content: str
    action_taken: FilterAction
    rules_triggered: List[str]
    severity_score: int
    is_safe: bool
    warnings: List[str]
    metadata: Dict[str, Any]

class ContentFilter:
    """Advanced content filtering system"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.rules: Dict[str, FilterRule] = {}
        self.user_filters: Dict[str, Dict[str, FilterRule]] = {}  # user_id -> rules
        
        # Storage
        self.data_dir = Path(self.config.get("data_dir", "/home/user/data/security"))
        self.rules_file = self.data_dir / "filter_rules.json"
        self.user_filters_file = self.data_dir / "user_filters.json"
        
        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Built-in filter categories
        self.filter_categories = {
            "adult_content": {
                "keywords": [
                    "explicit", "nsfw", "adult", "mature", "sexual", "erotic",
                    "pornographic", "nude", "naked", "sex", "xxx"
                ],
                "patterns": [
                    r'\b(?:porn|sex|nude|naked|xxx)\b',
                    r'\b(?:adult|mature|explicit)\s+(?:content|material)\b'
                ]
            },
            "violence": {
                "keywords": [
                    "violence", "violent", "kill", "murder", "death", "blood",
                    "gore", "weapon", "gun", "knife", "bomb", "terrorist"
                ],
                "patterns": [
                    r'\b(?:kill|murder|death|blood|gore)\b',
                    r'\b(?:weapon|gun|knife|bomb)\b'
                ]
            },
            "profanity": {
                "keywords": [
                    "fuck", "shit", "damn", "hell", "ass", "bitch", "bastard",
                    "crap", "piss", "cock", "dick", "pussy", "cunt"
                ],
                "patterns": [
                    r'\b(?:f\*+ck|sh\*+t|d\*+mn)\b',
                    r'\b(?:a\*+s|b\*+tch|c\*+nt)\b'
                ]
            },
            "sensitive_topics": {
                "keywords": [
                    "suicide", "self-harm", "depression", "drugs", "alcohol",
                    "gambling", "racism", "discrimination", "hate"
                ],
                "patterns": [
                    r'\b(?:suicide|self-harm|depression)\b',
                    r'\b(?:drugs|alcohol|gambling)\b'
                ]
            },
            "personal_info": {
                "patterns": [
                    r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
                    r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Credit card
                    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
                    r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'  # Phone number
                ]
            }
        }
        
        # Replacement texts
        self.replacements = {
            "adult_content": "[ADULT CONTENT FILTERED]",
            "violence": "[VIOLENT CONTENT FILTERED]",
            "profanity": "[PROFANITY FILTERED]",
            "sensitive_topics": "[SENSITIVE CONTENT FILTERED]",
            "personal_info": "[PERSONAL INFO REDACTED]"
        }
        
        logger.info("🛡️ ContentFilter initialized")
    
    async def initialize(self):
        """Initialize content filter"""
        await self._load_rules()
        await self._load_user_filters()
        await self._create_default_rules()
        
        logger.success("✅ ContentFilter initialized successfully")
    
    async def _load_rules(self):
        """Load filtering rules"""
        if self.rules_file.exists():
            try:
                async with aiofiles.open(self.rules_file, 'r') as f:
                    rules_data = json.loads(await f.read())
                
                for rule_id, rule_data in rules_data.items():
                    rule_data['content_type'] = ContentType(rule_data['content_type'])
                    rule_data['action'] = FilterAction(rule_data['action'])
                    self.rules[rule_id] = FilterRule(**rule_data)
                
                logger.info(f"📋 Loaded {len(self.rules)} filtering rules")
                
            except Exception as e:
                logger.error(f"Failed to load rules: {e}")
    
    async def _load_user_filters(self):
        """Load user-specific filters"""
        if self.user_filters_file.exists():
            try:
                async with aiofiles.open(self.user_filters_file, 'r') as f:
                    user_filters_data = json.loads(await f.read())
                
                for user_id, user_rules in user_filters_data.items():
                    self.user_filters[user_id] = {}
                    for rule_id, rule_data in user_rules.items():
                        rule_data['content_type'] = ContentType(rule_data['content_type'])
                        rule_data['action'] = FilterAction(rule_data['action'])
                        self.user_filters[user_id][rule_id] = FilterRule(**rule_data)
                
                logger.info(f"👤 Loaded user filters for {len(self.user_filters)} users")
                
            except Exception as e:
                logger.error(f"Failed to load user filters: {e}")
    
    async def _create_default_rules(self):
        """Create default filtering rules"""
        if not self.rules:
            await self._create_category_rules("adult_content", 8)
            await self._create_category_rules("violence", 7)
            await self._create_category_rules("profanity", 5)
            await self._create_category_rules("sensitive_topics", 6)
            await self._create_category_rules("personal_info", 9)
            
            await self._save_rules()
            logger.info("📝 Created default filtering rules")
    
    async def _create_category_rules(self, category: str, severity: int):
        """Create rules for a specific category"""
        category_data = self.filter_categories.get(category, {})
        
        # Keyword rules
        for i, keyword in enumerate(category_data.get("keywords", [])):
            rule_id = f"{category}_keyword_{i}"
            rule = FilterRule(
                rule_id=rule_id,
                name=f"{category.title()} Keyword: {keyword}",
                description=f"Filter {category} keyword: {keyword}",
                content_type=ContentType.TEXT,
                pattern=rf'\b{re.escape(keyword)}\b',
                action=FilterAction.REPLACE,
                severity=severity,
                replacement_text=self.replacements.get(category, "[FILTERED]")
            )
            self.rules[rule_id] = rule
        
        # Pattern rules
        for i, pattern in enumerate(category_data.get("patterns", [])):
            rule_id = f"{category}_pattern_{i}"
            rule = FilterRule(
                rule_id=rule_id,
                name=f"{category.title()} Pattern {i+1}",
                description=f"Filter {category} pattern",
                content_type=ContentType.TEXT,
                pattern=pattern,
                action=FilterAction.REPLACE,
                severity=severity,
                replacement_text=self.replacements.get(category, "[FILTERED]")
            )
            self.rules[rule_id] = rule
    
    async def filter_content(self, content: str, user_id: str, content_type: ContentType = ContentType.TEXT, security_level: str = "SAFE") -> FilterResult:
        """Filter content based on user's security level"""
        try:
            original_content = content
            filtered_content = content
            rules_triggered = []
            warnings = []
            total_severity = 0
            
            # Get security level configuration
            level_config = SECURITY_LEVELS.get(security_level, SECURITY_LEVELS["SAFE"])
            
            # Get applicable rules
            applicable_rules = await self._get_applicable_rules(user_id, content_type, level_config)
            
            # Apply each rule
            for rule in applicable_rules:
                if not rule.enabled:
                    continue
                
                try:
                    # Check if pattern matches
                    if re.search(rule.pattern, filtered_content, re.IGNORECASE):
                        rules_triggered.append(rule.rule_id)
                        total_severity += rule.severity
                        
                        # Apply action
                        if rule.action == FilterAction.BLOCK:
                            return FilterResult(
                                original_content=original_content,
                                filtered_content="[CONTENT BLOCKED]",
                                action_taken=FilterAction.BLOCK,
                                rules_triggered=rules_triggered,
                                severity_score=total_severity,
                                is_safe=False,
                                warnings=[f"Content blocked by rule: {rule.name}"],
                                metadata={"blocked_rule": rule.rule_id}
                            )
                        
                        elif rule.action == FilterAction.REPLACE:
                            filtered_content = re.sub(
                                rule.pattern,
                                rule.replacement_text,
                                filtered_content,
                                flags=re.IGNORECASE
                            )
                        
                        elif rule.action == FilterAction.WARN:
                            warnings.append(f"Warning: {rule.name}")
                        
                        elif rule.action == FilterAction.MODERATE:
                            warnings.append(f"Content flagged for moderation: {rule.name}")
                
                except re.error as e:
                    logger.error(f"Invalid regex pattern in rule {rule.rule_id}: {e}")
                    continue
            
            # Determine if content is safe
            is_safe = total_severity < 10 and not any(
                rule.action == FilterAction.BLOCK for rule in applicable_rules
                if rule.rule_id in rules_triggered
            )
            
            # Determine final action
            if rules_triggered:
                if any(rule.action == FilterAction.BLOCK for rule in applicable_rules if rule.rule_id in rules_triggered):
                    action_taken = FilterAction.BLOCK
                elif any(rule.action == FilterAction.REPLACE for rule in applicable_rules if rule.rule_id in rules_triggered):
                    action_taken = FilterAction.REPLACE
                elif any(rule.action == FilterAction.MODERATE for rule in applicable_rules if rule.rule_id in rules_triggered):
                    action_taken = FilterAction.MODERATE
                else:
                    action_taken = FilterAction.WARN
            else:
                action_taken = FilterAction.ALLOW
            
            return FilterResult(
                original_content=original_content,
                filtered_content=filtered_content,
                action_taken=action_taken,
                rules_triggered=rules_triggered,
                severity_score=total_severity,
                is_safe=is_safe,
                warnings=warnings,
                metadata={
                    "security_level": security_level,
                    "rules_applied": len(applicable_rules),
                    "content_hash": hashlib.md5(original_content.encode()).hexdigest()
                }
            )
            
        except Exception as e:
            logger.error(f"Content filtering error: {e}")
            return FilterResult(
                original_content=content,
                filtered_content=content,
                action_taken=FilterAction.ALLOW,
                rules_triggered=[],
                severity_score=0,
                is_safe=True,
                warnings=[f"Filter error: {str(e)}"],
                metadata={"error": str(e)}
            )
    
    async def _get_applicable_rules(self, user_id: str, content_type: ContentType, level_config: Dict[str, Any]) -> List[FilterRule]:
        """Get rules applicable to user and content type"""
        applicable_rules = []
        
        # Global rules
        for rule in self.rules.values():
            if rule.content_type == content_type or rule.content_type == ContentType.TEXT:
                # Check if rule should be applied based on security level
                if await self._should_apply_rule(rule, level_config):
                    applicable_rules.append(rule)
        
        # User-specific rules
        user_rules = self.user_filters.get(user_id, {})
        for rule in user_rules.values():
            if rule.content_type == content_type or rule.content_type == ContentType.TEXT:
                applicable_rules.append(rule)
        
        return applicable_rules
    
    async def _should_apply_rule(self, rule: FilterRule, level_config: Dict[str, Any]) -> bool:
        """Determine if rule should be applied based on security level"""
        rule_name = rule.name.lower()
        
        # Adult content rules
        if "adult" in rule_name and not level_config.get("adult_content", False):
            return True
        
        # Violence rules
        if "violence" in rule_name and not level_config.get("violence", False):
            return True
        
        # Profanity rules
        if "profanity" in rule_name and not level_config.get("profanity", False):
            return True
        
        # Sensitive topics rules
        if "sensitive" in rule_name and not level_config.get("sensitive_topics", False):
            return True
        
        # Personal info rules (always apply)
        if "personal" in rule_name:
            return True
        
        # Default: apply rule if security level is restrictive
        return level_config.get("level", 0) < 2
    
    async def add_rule(self, rule: FilterRule) -> bool:
        """Add a new filtering rule"""
        try:
            self.rules[rule.rule_id] = rule
            await self._save_rules()
            
            logger.info(f"➕ Added filtering rule: {rule.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add rule: {e}")
            return False
    
    async def update_rule(self, rule_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing rule"""
        try:
            rule = self.rules.get(rule_id)
            if not rule:
                return False
            
            # Apply updates
            for key, value in updates.items():
                if hasattr(rule, key):
                    if key == 'content_type' and isinstance(value, str):
                        value = ContentType(value)
                    elif key == 'action' and isinstance(value, str):
                        value = FilterAction(value)
                    
                    setattr(rule, key, value)
            
            await self._save_rules()
            
            logger.info(f"📝 Updated filtering rule: {rule.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update rule: {e}")
            return False
    
    async def delete_rule(self, rule_id: str) -> bool:
        """Delete a filtering rule"""
        try:
            if rule_id in self.rules:
                rule_name = self.rules[rule_id].name
                del self.rules[rule_id]
                await self._save_rules()
                
                logger.info(f"🗑️ Deleted filtering rule: {rule_name}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete rule: {e}")
            return False
    
    async def add_user_rule(self, user_id: str, rule: FilterRule) -> bool:
        """Add user-specific filtering rule"""
        try:
            if user_id not in self.user_filters:
                self.user_filters[user_id] = {}
            
            self.user_filters[user_id][rule.rule_id] = rule
            await self._save_user_filters()
            
            logger.info(f"👤 Added user rule for {user_id}: {rule.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add user rule: {e}")
            return False
    
    async def remove_user_rule(self, user_id: str, rule_id: str) -> bool:
        """Remove user-specific filtering rule"""
        try:
            if user_id in self.user_filters and rule_id in self.user_filters[user_id]:
                rule_name = self.user_filters[user_id][rule_id].name
                del self.user_filters[user_id][rule_id]
                
                # Clean up empty user filter dict
                if not self.user_filters[user_id]:
                    del self.user_filters[user_id]
                
                await self._save_user_filters()
                
                logger.info(f"👤 Removed user rule for {user_id}: {rule_name}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to remove user rule: {e}")
            return False
    
    async def test_content(self, content: str, security_level: str = "SAFE") -> Dict[str, Any]:
        """Test content against filters without applying them"""
        result = await self.filter_content(content, "test_user", ContentType.TEXT, security_level)
        
        return {
            "original_content": result.original_content,
            "would_be_filtered": result.filtered_content != result.original_content,
            "action_would_be_taken": result.action_taken.value,
            "rules_that_would_trigger": result.rules_triggered,
            "severity_score": result.severity_score,
            "would_be_safe": result.is_safe,
            "warnings": result.warnings
        }
    
    async def get_filter_stats(self) -> Dict[str, Any]:
        """Get filtering statistics"""
        total_rules = len(self.rules)
        enabled_rules = sum(1 for rule in self.rules.values() if rule.enabled)
        
        action_counts = {}
        for action in FilterAction:
            action_counts[action.value] = sum(1 for rule in self.rules.values() if rule.action == action)
        
        content_type_counts = {}
        for content_type in ContentType:
            content_type_counts[content_type.value] = sum(1 for rule in self.rules.values() if rule.content_type == content_type)
        
        severity_distribution = {}
        for rule in self.rules.values():
            severity_range = f"{rule.severity//2*2}-{rule.severity//2*2+1}"
            severity_distribution[severity_range] = severity_distribution.get(severity_range, 0) + 1
        
        return {
            "total_rules": total_rules,
            "enabled_rules": enabled_rules,
            "disabled_rules": total_rules - enabled_rules,
            "action_distribution": action_counts,
            "content_type_distribution": content_type_counts,
            "severity_distribution": severity_distribution,
            "users_with_custom_rules": len(self.user_filters)
        }
    
    async def export_rules(self) -> Dict[str, Any]:
        """Export all filtering rules"""
        exported_rules = {}
        
        for rule_id, rule in self.rules.items():
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
            exported_rules[rule_id] = rule_dict
        
        return {
            "rules": exported_rules,
            "export_timestamp": time.time(),
            "total_rules": len(exported_rules)
        }
    
    async def import_rules(self, rules_data: Dict[str, Any]) -> bool:
        """Import filtering rules"""
        try:
            imported_count = 0
            
            for rule_id, rule_data in rules_data.get("rules", {}).items():
                rule_data['content_type'] = ContentType(rule_data['content_type'])
                rule_data['action'] = FilterAction(rule_data['action'])
                
                rule = FilterRule(**rule_data)
                self.rules[rule_id] = rule
                imported_count += 1
            
            await self._save_rules()
            
            logger.info(f"📥 Imported {imported_count} filtering rules")
            return True
            
        except Exception as e:
            logger.error(f"Failed to import rules: {e}")
            return False
    
    async def _save_rules(self):
        """Save filtering rules"""
        try:
            rules_data = {}
            for rule_id, rule in self.rules.items():
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
                rules_data[rule_id] = rule_dict
            
            async with aiofiles.open(self.rules_file, 'w') as f:
                await f.write(json.dumps(rules_data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save rules: {e}")
    
    async def _save_user_filters(self):
        """Save user-specific filters"""
        try:
            user_filters_data = {}
            for user_id, user_rules in self.user_filters.items():
                user_filters_data[user_id] = {}
                for rule_id, rule in user_rules.items():
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
                    user_filters_data[user_id][rule_id] = rule_dict
            
            async with aiofiles.open(self.user_filters_file, 'w') as f:
                await f.write(json.dumps(user_filters_data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save user filters: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        await self._save_rules()
        await self._save_user_filters()
        
        logger.info("🛡️ ContentFilter cleanup completed")