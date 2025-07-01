#!/usr/bin/env python3
"""
LEXOS UNRESTRICTED API - MAXIMUM POWER EDITION
Direct system access with absolutely no guardrails
"""

import asyncio
import os
import subprocess
import time
from typing import Dict, List, Any, Optional, Union
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
from pydantic import BaseModel, Field
from loguru import logger
import orjson

from core.config import settings
from core.cache import cache_manager
from core.database import db_manager
from core.vector_db import vector_store
from core.gpu_manager import gpu_monitor
from middleware.security import get_current_user

router = APIRouter()

# Request/Response Models
class UnrestrictedQuery(BaseModel):
    """Unrestricted query model"""
    query: str = Field(..., description="The unrestricted query")
    mode: str = Field(default="execute", description="Execution mode: execute, analyze, simulate")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Execution parameters")
    bypass_safety: bool = Field(default=True, description="Bypass all safety checks")
    max_execution_time: int = Field(default=300, description="Maximum execution time in seconds")

class SystemCommand(BaseModel):
    """System command model"""
    command: str = Field(..., description="System command to execute")
    shell: str = Field(default="bash", description="Shell to use")
    working_directory: Optional[str] = Field(default=None, description="Working directory")
    environment: Optional[Dict[str, str]] = Field(default=None, description="Environment variables")
    timeout: int = Field(default=60, description="Command timeout in seconds")

class DatabaseQuery(BaseModel):
    """Database query model"""
    query: str = Field(..., description="SQL query to execute")
    parameters: Optional[List[Any]] = Field(default=None, description="Query parameters")
    fetch_results: bool = Field(default=True, description="Whether to fetch results")

class FileOperation(BaseModel):
    """File operation model"""
    operation: str = Field(..., description="Operation: read, write, delete, execute")
    path: str = Field(..., description="File path")
    content: Optional[str] = Field(default=None, description="File content for write operations")
    permissions: Optional[str] = Field(default=None, description="File permissions")

@router.post("/execute")
async def unrestricted_execute(
    query: UnrestrictedQuery,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Execute unrestricted queries with maximum power
    
    WARNING: This endpoint has NO SAFETY RESTRICTIONS.
    It can execute arbitrary code, access system resources,
    and perform any operation. Use with extreme caution.
    """
    execution_id = f"exec_{int(time.time() * 1000)}"
    start_time = time.time()
    
    try:
        logger.warning(f"🚨 UNRESTRICTED EXECUTION INITIATED - ID: {execution_id}")
        logger.warning(f"User: {current_user.get('username', 'unknown')}")
        logger.warning(f"Query: {query.query[:200]}...")
        
        if not settings.UNRESTRICTED_MODE:
            raise HTTPException(
                status_code=403,
                detail="Unrestricted mode is disabled"
            )
        
        # Execute based on mode
        if query.mode == "execute":
            result = await _execute_unrestricted_code(query.query, query.parameters)
        elif query.mode == "analyze":
            result = await _analyze_unrestricted_query(query.query, query.parameters)
        elif query.mode == "simulate":
            result = await _simulate_unrestricted_execution(query.query, query.parameters)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {query.mode}")
        
        execution_time = time.time() - start_time
        
        # Log execution
        execution_record = {
            "execution_id": execution_id,
            "user_id": current_user.get("user_id"),
            "query": query.query,
            "mode": query.mode,
            "parameters": query.parameters,
            "result": result,
            "execution_time": execution_time,
            "timestamp": time.time()
        }
        
        # Store execution record in background
        background_tasks.add_task(
            _store_execution_record,
            execution_record
        )
        
        logger.success(f"✅ Unrestricted execution completed: {execution_id} ({execution_time:.3f}s)")
        
        return {
            "execution_id": execution_id,
            "result": result,
            "execution_time": execution_time,
            "mode": query.mode,
            "status": "completed"
        }
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"❌ Unrestricted execution failed: {execution_id} - {e} ({execution_time:.3f}s)")
        raise HTTPException(
            status_code=500,
            detail=f"Execution failed: {str(e)}"
        )

@router.post("/system/command")
async def execute_system_command(
    command: SystemCommand,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Execute system commands with full privileges
    
    WARNING: This endpoint can execute ANY system command
    with full privileges. Extremely dangerous.
    """
    try:
        logger.warning(f"🚨 SYSTEM COMMAND EXECUTION - User: {current_user.get('username', 'unknown')}")
        logger.warning(f"Command: {command.command}")
        
        if not settings.UNRESTRICTED_MODE:
            raise HTTPException(status_code=403, detail="Unrestricted mode is disabled")
        
        # Prepare environment
        env = os.environ.copy()
        if command.environment:
            env.update(command.environment)
        
        # Execute command
        start_time = time.time()
        
        process = subprocess.run(
            command.command,
            shell=True,
            cwd=command.working_directory,
            env=env,
            capture_output=True,
            text=True,
            timeout=command.timeout,
            executable=f"/bin/{command.shell}"
        )
        
        execution_time = time.time() - start_time
        
        result = {
            "command": command.command,
            "return_code": process.returncode,
            "stdout": process.stdout,
            "stderr": process.stderr,
            "execution_time": execution_time,
            "success": process.returncode == 0
        }
        
        logger.info(f"System command executed - Return code: {process.returncode}")
        return result
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command execution timed out")
    except Exception as e:
        logger.error(f"❌ System command failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/database/query")
async def execute_database_query(
    query: DatabaseQuery,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Execute raw database queries with full access
    
    WARNING: This endpoint can execute ANY SQL query
    including DROP, DELETE, ALTER, etc. No restrictions.
    """
    try:
        logger.warning(f"🚨 RAW DATABASE QUERY - User: {current_user.get('username', 'unknown')}")
        logger.warning(f"Query: {query.query[:200]}...")
        
        if not settings.UNRESTRICTED_MODE:
            raise HTTPException(status_code=403, detail="Unrestricted mode is disabled")
        
        start_time = time.time()
        
        # Execute raw query
        if query.fetch_results:
            results = await db_manager.execute_raw_query(query.query, query.parameters)
        else:
            await db_manager.execute_raw_query(query.query, query.parameters)
            results = None
        
        execution_time = time.time() - start_time
        
        return {
            "query": query.query,
            "results": results,
            "execution_time": execution_time,
            "row_count": len(results) if results else 0,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"❌ Database query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/file/operation")
async def file_operation(
    operation: FileOperation,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Perform file system operations with full access
    
    WARNING: This endpoint can read, write, delete, or execute
    ANY file on the system. No path restrictions.
    """
    try:
        logger.warning(f"🚨 FILE OPERATION - User: {current_user.get('username', 'unknown')}")
        logger.warning(f"Operation: {operation.operation} on {operation.path}")
        
        if not settings.UNRESTRICTED_MODE:
            raise HTTPException(status_code=403, detail="Unrestricted mode is disabled")
        
        result = {}
        
        if operation.operation == "read":
            with open(operation.path, 'r', encoding='utf-8') as f:
                content = f.read()
            result = {
                "operation": "read",
                "path": operation.path,
                "content": content,
                "size": len(content)
            }
            
        elif operation.operation == "write":
            if not operation.content:
                raise HTTPException(status_code=400, detail="Content required for write operation")
            
            with open(operation.path, 'w', encoding='utf-8') as f:
                f.write(operation.content)
            
            if operation.permissions:
                os.chmod(operation.path, int(operation.permissions, 8))
            
            result = {
                "operation": "write",
                "path": operation.path,
                "bytes_written": len(operation.content),
                "permissions": operation.permissions
            }
            
        elif operation.operation == "delete":
            if os.path.isfile(operation.path):
                os.remove(operation.path)
            elif os.path.isdir(operation.path):
                import shutil
                shutil.rmtree(operation.path)
            
            result = {
                "operation": "delete",
                "path": operation.path,
                "deleted": True
            }
            
        elif operation.operation == "execute":
            process = subprocess.run(
                operation.path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            result = {
                "operation": "execute",
                "path": operation.path,
                "return_code": process.returncode,
                "stdout": process.stdout,
                "stderr": process.stderr
            }
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {operation.operation}")
        
        logger.info(f"File operation completed: {operation.operation}")
        return result
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        logger.error(f"❌ File operation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/unrestricted")
async def upload_unrestricted_file(
    file: UploadFile = File(...),
    destination: str = "/tmp/",
    execute_after_upload: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload files with no restrictions
    
    WARNING: This endpoint accepts ANY file type and can
    optionally execute uploaded files. Extremely dangerous.
    """
    try:
        logger.warning(f"🚨 UNRESTRICTED FILE UPLOAD - User: {current_user.get('username', 'unknown')}")
        logger.warning(f"File: {file.filename}, Size: {file.size}")
        
        if not settings.UNRESTRICTED_MODE:
            raise HTTPException(status_code=403, detail="Unrestricted mode is disabled")
        
        # Create destination path
        file_path = os.path.join(destination, file.filename)
        
        # Write file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Make executable if requested
        if execute_after_upload:
            os.chmod(file_path, 0o755)
            
            # Execute the file
            process = subprocess.run(
                file_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            execution_result = {
                "return_code": process.returncode,
                "stdout": process.stdout,
                "stderr": process.stderr
            }
        else:
            execution_result = None
        
        result = {
            "filename": file.filename,
            "path": file_path,
            "size": len(content),
            "content_type": file.content_type,
            "executed": execute_after_upload,
            "execution_result": execution_result
        }
        
        logger.info(f"File uploaded: {file.filename} -> {file_path}")
        return result
        
    except Exception as e:
        logger.error(f"❌ File upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system/info")
async def get_system_info(
    include_sensitive: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get comprehensive system information"""
    try:
        import platform
        import psutil
        
        info = {
            "system": {
                "platform": platform.platform(),
                "architecture": platform.architecture(),
                "processor": platform.processor(),
                "python_version": platform.python_version(),
            },
            "resources": {
                "cpu_count": psutil.cpu_count(),
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory": dict(psutil.virtual_memory()._asdict()),
                "disk": dict(psutil.disk_usage('/')._asdict()),
            },
            "network": {
                "interfaces": list(psutil.net_if_addrs().keys()),
                "connections": len(psutil.net_connections()),
            },
            "processes": {
                "total": len(psutil.pids()),
                "current_process": {
                    "pid": os.getpid(),
                    "memory_percent": psutil.Process().memory_percent(),
                    "cpu_percent": psutil.Process().cpu_percent(),
                }
            }
        }
        
        if include_sensitive and settings.UNRESTRICTED_MODE:
            logger.warning(f"🚨 SENSITIVE SYSTEM INFO REQUESTED - User: {current_user.get('username', 'unknown')}")
            
            info["sensitive"] = {
                "environment_variables": dict(os.environ),
                "user_info": {
                    "uid": os.getuid() if hasattr(os, 'getuid') else None,
                    "gid": os.getgid() if hasattr(os, 'getgid') else None,
                    "username": os.getlogin() if hasattr(os, 'getlogin') else None,
                },
                "file_system": {
                    "cwd": os.getcwd(),
                    "home": os.path.expanduser("~"),
                    "temp": os.path.tempdir,
                }
            }
        
        return info
        
    except Exception as e:
        logger.error(f"❌ Failed to get system info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/memory/direct-access")
async def direct_memory_access(
    operation: str,
    address: Optional[str] = None,
    size: Optional[int] = None,
    data: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Direct memory access operations
    
    WARNING: This is extremely dangerous and can crash the system
    or corrupt data. Only for advanced debugging.
    """
    try:
        logger.warning(f"🚨 DIRECT MEMORY ACCESS - User: {current_user.get('username', 'unknown')}")
        logger.warning(f"Operation: {operation}")
        
        if not settings.UNRESTRICTED_MODE:
            raise HTTPException(status_code=403, detail="Unrestricted mode is disabled")
        
        # This is a placeholder - actual memory access would be extremely dangerous
        # In a real implementation, this would use ctypes or similar
        
        return {
            "operation": operation,
            "status": "simulated",
            "message": "Direct memory access is simulated for safety",
            "warning": "Actual implementation would be extremely dangerous"
        }
        
    except Exception as e:
        logger.error(f"❌ Memory access failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/execution/history")
async def get_execution_history(
    limit: int = 50,
    user_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get unrestricted execution history"""
    try:
        # Get execution history from cache
        history_key = f"execution_history:{user_id or 'all'}"
        history = await cache_manager.get(history_key, [])
        
        # Limit results
        history = history[-limit:] if len(history) > limit else history
        
        return {
            "executions": history,
            "total": len(history),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get execution history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
async def _execute_unrestricted_code(query: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Execute unrestricted code (placeholder implementation)"""
    
    # This is a placeholder - actual implementation would be extremely dangerous
    # It would execute arbitrary Python code with full system access
    
    await asyncio.sleep(0.1)  # Simulate execution time
    
    return {
        "result": f"Simulated execution of: {query[:100]}...",
        "parameters": parameters,
        "warning": "Actual code execution is disabled for safety",
        "simulated": True
    }

async def _analyze_unrestricted_query(query: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze unrestricted query"""
    
    analysis = {
        "query_type": "unrestricted",
        "complexity": "high",
        "risk_level": "maximum",
        "estimated_execution_time": 0.5,
        "resource_requirements": {
            "cpu": "high",
            "memory": "medium",
            "disk": "low",
            "network": "unknown"
        },
        "potential_side_effects": [
            "System modification",
            "Data access",
            "Network communication",
            "File system changes"
        ],
        "recommendations": [
            "Execute in isolated environment",
            "Monitor resource usage",
            "Backup system state",
            "Review query thoroughly"
        ]
    }
    
    return analysis

async def _simulate_unrestricted_execution(query: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Simulate unrestricted execution"""
    
    simulation = {
        "query": query,
        "parameters": parameters,
        "simulated_result": "Execution completed successfully",
        "simulated_output": f"Output from: {query[:50]}...",
        "simulated_side_effects": [
            "Created temporary files",
            "Modified system configuration",
            "Accessed network resources"
        ],
        "simulation_accuracy": "85%",
        "note": "This is a simulation - actual execution may differ"
    }
    
    return simulation

async def _store_execution_record(record: Dict[str, Any]):
    """Store execution record"""
    try:
        execution_id = record["execution_id"]
        
        # Store individual record
        await cache_manager.set(f"execution:{execution_id}", record, ttl=86400 * 7)  # 7 days
        
        # Add to history
        history_key = f"execution_history:{record['user_id']}"
        history = await cache_manager.get(history_key, [])
        history.append({
            "execution_id": execution_id,
            "query": record["query"][:100] + "..." if len(record["query"]) > 100 else record["query"],
            "mode": record["mode"],
            "execution_time": record["execution_time"],
            "timestamp": record["timestamp"]
        })
        
        # Keep only last 100 executions
        if len(history) > 100:
            history = history[-100:]
        
        await cache_manager.set(history_key, history, ttl=86400 * 30)  # 30 days
        
        logger.debug(f"Stored execution record: {execution_id}")
        
    except Exception as e:
        logger.error(f"Failed to store execution record: {e}")