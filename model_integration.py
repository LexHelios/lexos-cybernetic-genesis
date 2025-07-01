#!/usr/bin/env python3
"""
Model Integration for LexOS - Ollama Support
"""

import asyncio
import httpx
from typing import Dict, List, Any, Optional
from loguru import logger
import json

class OllamaIntegration:
    """Integrate Ollama models into LexOS"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=300.0)
        
    async def list_models(self) -> List[Dict[str, Any]]:
        """List all available models"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            
            models = []
            for model in data.get("models", []):
                models.append({
                    "id": model["name"],
                    "name": model["name"],
                    "size": f"{model['size'] / 1e9:.1f}GB",
                    "modified": model["modified_at"],
                    "available": True,
                    "type": "ollama",
                    "capabilities": self._get_model_capabilities(model["name"])
                })
            
            return models
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
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
            
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return {
                "success": True,
                "response": result.get("response", ""),
                "model": model,
                "total_duration": result.get("total_duration", 0) / 1e9,  # Convert to seconds
                "prompt_eval_count": result.get("prompt_eval_count", 0),
                "eval_count": result.get("eval_count", 0),
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
            
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return {
                "success": True,
                "message": result.get("message", {}),
                "model": model,
                "total_duration": result.get("total_duration", 0) / 1e9,
                "prompt_eval_count": result.get("prompt_eval_count", 0),
                "eval_count": result.get("eval_count", 0),
            }
            
        except Exception as e:
            logger.error(f"Chat failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": model
            }
    
    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Pull a model from Ollama registry"""
        try:
            response = await self.client.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name}
            )
            response.raise_for_status()
            
            return {
                "success": True,
                "model": model_name,
                "status": "pulled"
            }
            
        except Exception as e:
            logger.error(f"Failed to pull model: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": model_name
            }
    
    async def close(self):
        """Close the client"""
        await self.client.aclose()

# Global instance
ollama = OllamaIntegration()