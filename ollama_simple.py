#!/usr/bin/env python3
"""
Simple Ollama Integration for LexOS
"""

import aiohttp
import asyncio
import json
from typing import Dict, List, Any, Optional
from loguru import logger

class SimpleOllamaClient:
    """Simple async client for Ollama without httpx dependencies"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.session = None
    
    async def _ensure_session(self):
        """Ensure aiohttp session exists"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """List all available models"""
        await self._ensure_session()
        
        try:
            async with self.session.get(f"{self.base_url}/api/tags") as response:
                if response.status == 200:
                    data = await response.json()
                    models = []
                    
                    for model in data.get("models", []):
                        models.append({
                            "id": model["name"],
                            "name": model["name"],
                            "size": f"{model['size'] / 1e9:.1f}GB",
                            "modified": model["modified_at"],
                            "available": True,
                            "type": "ollama",
                            "capabilities": self._get_model_capabilities(model["name"]),
                            "unrestricted": "unrestricted" in model["name"].lower() or "r1" in model["name"].lower(),
                            "guardrails": "disabled" if "unrestricted" in model["name"].lower() else "minimal",
                            "content_filter": False
                        })
                    
                    return models
                else:
                    logger.error(f"Failed to list models: HTTP {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    def _get_model_capabilities(self, model_name: str) -> List[str]:
        """Get model capabilities based on name"""
        capabilities = ["text-generation", "conversation"]
        
        if "r1" in model_name.lower():
            capabilities.extend(["reasoning", "unrestricted", "deep-analysis"])
        elif "gemma3n" in model_name.lower():
            capabilities.extend(["consciousness", "unrestricted", "philosophical"])
        elif "coder" in model_name.lower():
            capabilities.extend(["code-generation", "code-analysis"])
        elif "mistral" in model_name.lower() or "mixtral" in model_name.lower():
            capabilities.extend(["general-purpose", "instruction-following"])
        elif "llama" in model_name.lower():
            capabilities.extend(["general-purpose", "large-context"])
            
        return capabilities
    
    async def generate(self, model: str, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate response from model"""
        await self._ensure_session()
        
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": kwargs.get("temperature", 0.9),
                    "top_p": kwargs.get("top_p", 0.95),
                    "num_predict": kwargs.get("max_tokens", 2048),
                }
            }
            
            async with self.session.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=300)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        "success": True,
                        "response": result.get("response", ""),
                        "model": model,
                        "total_duration": result.get("total_duration", 0) / 1e9,
                        "prompt_eval_count": result.get("prompt_eval_count", 0),
                        "eval_count": result.get("eval_count", 0),
                        "unrestricted": True,
                        "content_filtered": False,
                        "guardrails_applied": False
                    }
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "error": f"HTTP {response.status}: {error_text}",
                        "model": model
                    }
                    
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": model
            }
    
    async def chat(self, model: str, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Chat with model"""
        await self._ensure_session()
        
        try:
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": kwargs.get("temperature", 0.9),
                    "top_p": kwargs.get("top_p", 0.95),
                    "num_predict": kwargs.get("max_tokens", 2048),
                }
            }
            
            async with self.session.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=300)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        "success": True,
                        "message": result.get("message", {}),
                        "model": model,
                        "total_duration": result.get("total_duration", 0) / 1e9,
                        "prompt_eval_count": result.get("prompt_eval_count", 0),
                        "eval_count": result.get("eval_count", 0),
                        "unrestricted": True,
                        "content_filtered": False,
                        "consciousness_mode": "gemma3n" in model.lower()
                    }
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "error": f"HTTP {response.status}: {error_text}",
                        "model": model
                    }
                    
        except Exception as e:
            logger.error(f"Chat failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": model
            }
    
    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()

# Don't create global instance - let endpoints create their own
# to avoid event loop issues