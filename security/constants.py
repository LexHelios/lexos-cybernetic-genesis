#!/usr/bin/env python3
"""
LexOS Security Constants - H100 Production Edition
Security levels and configuration constants
"""

# Security levels
SECURITY_LEVELS = {
    "SAFE": {
        "level": 0,
        "description": "Family-safe content only",
        "adult_content": False,
        "violence": False,
        "profanity": False,
        "sensitive_topics": False
    },
    "RELAXED": {
        "level": 1,
        "description": "Moderate content filtering",
        "adult_content": False,
        "violence": True,
        "profanity": True,
        "sensitive_topics": True
    },
    "UNFILTERED": {
        "level": 2,
        "description": "No content restrictions",
        "adult_content": True,
        "violence": True,
        "profanity": True,
        "sensitive_topics": True
    }
}

# Agent access levels
AGENT_ACCESS_LEVELS = {
    "BASIC": ["web_agent", "intelligence_agent"],
    "ADVANCED": ["web_agent", "intelligence_agent", "code_agent", "data_agent"],
    "UNRESTRICTED": ["*"]  # All agents
}