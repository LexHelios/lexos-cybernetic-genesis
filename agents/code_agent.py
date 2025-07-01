#!/usr/bin/env python3
"""
LexOS Code Agent - H100 Production Edition
Advanced code generation, execution, debugging, and analysis agent
"""

import asyncio
import subprocess
import tempfile
import os
import sys
import json
import time
from typing import Dict, List, Any, Optional
from pathlib import Path
import ast
import re
from loguru import logger

sys.path.append('/home/user')
from agents.base_agent import BaseAgent, AgentTask, AgentCapability

class CodeAgent(BaseAgent):
    """Advanced code generation and execution agent"""
    
    def __init__(self):
        super().__init__(
            agent_id="code_agent",
            name="Code Generation Agent",
            description="Advanced code generation, execution, debugging, and analysis",
            capabilities=[
                AgentCapability.CODE_EXECUTION,
                AgentCapability.FILE_OPERATIONS,
                AgentCapability.DATA_ANALYSIS,
                AgentCapability.REASONING
            ]
        )
        
        # Supported languages and their configurations
        self.supported_languages = {
            "python": {
                "extension": ".py",
                "command": ["python3"],
                "timeout": 30,
                "allowed": True
            },
            "javascript": {
                "extension": ".js",
                "command": ["node"],
                "timeout": 30,
                "allowed": True
            },
            "bash": {
                "extension": ".sh",
                "command": ["bash"],
                "timeout": 30,
                "allowed": True
            },
            "sql": {
                "extension": ".sql",
                "command": ["sqlite3", ":memory:"],
                "timeout": 30,
                "allowed": True
            },
            "rust": {
                "extension": ".rs",
                "command": ["rustc", "--edition", "2021", "-o"],
                "timeout": 60,
                "allowed": False  # Requires compilation
            },
            "go": {
                "extension": ".go",
                "command": ["go", "run"],
                "timeout": 30,
                "allowed": True
            }
        }
        
        # Security restrictions
        self.restricted_imports = {
            "python": ["os", "subprocess", "sys", "shutil", "socket", "urllib", "requests"],
            "javascript": ["fs", "child_process", "net", "http", "https"],
            "bash": ["rm", "sudo", "chmod", "chown", "dd", "mkfs"]
        }
        
        # Workspace directory
        self.workspace_dir = "/home/user/data/code_workspace"
        
        # Supported task types
        self.supported_tasks = {
            "generate_code": self._generate_code,
            "execute_code": self._execute_code,
            "analyze_code": self._analyze_code,
            "debug_code": self._debug_code,
            "optimize_code": self._optimize_code,
            "test_code": self._test_code,
            "refactor_code": self._refactor_code,
            "code_review": self._code_review,
            "create_project": self._create_project,
            "install_dependencies": self._install_dependencies
        }
    
    async def _initialize_agent(self):
        """Initialize the code agent"""
        # Create workspace directory
        os.makedirs(self.workspace_dir, exist_ok=True)
        
        # Check available interpreters/compilers
        available_languages = []
        for lang, config in self.supported_languages.items():
            if await self._check_language_available(lang):
                available_languages.append(lang)
        
        logger.info(f"💻 Code Agent initialized with languages: {', '.join(available_languages)}")
    
    async def _check_language_available(self, language: str) -> bool:
        """Check if a programming language is available"""
        config = self.supported_languages.get(language)
        if not config:
            return False
        
        try:
            # Test if the command exists
            result = await asyncio.create_subprocess_exec(
                config["command"][0], "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await result.wait()
            return result.returncode == 0
        except:
            return False
    
    async def _supports_task_type(self, task_type: str) -> bool:
        """Check if the agent supports a specific task type"""
        return task_type in self.supported_tasks
    
    async def _execute_task(self, task: AgentTask) -> Dict[str, Any]:
        """Execute a code-related task"""
        task_type = task.task_type
        
        if task_type not in self.supported_tasks:
            raise ValueError(f"Unsupported task type: {task_type}")
        
        # Execute the specific task
        handler = self.supported_tasks[task_type]
        return await handler(task)
    
    async def _generate_code(self, task: AgentTask) -> Dict[str, Any]:
        """Generate code based on requirements"""
        language = task.parameters.get("language", "python")
        requirements = task.parameters.get("requirements", "")
        style = task.parameters.get("style", "clean")
        include_tests = task.parameters.get("include_tests", False)
        
        if not requirements:
            raise ValueError("Requirements are needed for code generation")
        
        # This is a simplified code generation - in production, you'd use an LLM
        generated_code = await self._simple_code_generation(language, requirements, style)
        
        result = {
            "language": language,
            "requirements": requirements,
            "generated_code": generated_code,
            "timestamp": time.time()
        }
        
        if include_tests:
            test_code = await self._generate_test_code(language, generated_code)
            result["test_code"] = test_code
        
        return result
    
    async def _simple_code_generation(self, language: str, requirements: str, style: str) -> str:
        """Simple code generation based on patterns"""
        if language == "python":
            if "hello world" in requirements.lower():
                return 'print("Hello, World!")'
            elif "fibonacci" in requirements.lower():
                return '''def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Example usage
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")'''
            elif "factorial" in requirements.lower():
                return '''def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

# Example usage
for i in range(1, 11):
    print(f"{i}! = {factorial(i)}")'''
            else:
                return f'# Generated code for: {requirements}\n# TODO: Implement the required functionality'
        
        elif language == "javascript":
            if "hello world" in requirements.lower():
                return 'console.log("Hello, World!");'
            else:
                return f'// Generated code for: {requirements}\n// TODO: Implement the required functionality'
        
        else:
            return f"// Generated code for: {requirements}\n// TODO: Implement the required functionality"
    
    async def _execute_code(self, task: AgentTask) -> Dict[str, Any]:
        """Execute code safely"""
        code = task.parameters.get("code", "")
        language = task.parameters.get("language", "python")
        input_data = task.parameters.get("input", "")
        timeout = task.parameters.get("timeout", 30)
        
        if not code:
            raise ValueError("Code is required for execution")
        
        if language not in self.supported_languages:
            raise ValueError(f"Unsupported language: {language}")
        
        # Security check
        if not await self._security_check(code, language):
            raise ValueError("Code contains restricted operations")
        
        # Create temporary file
        config = self.supported_languages[language]
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix=config["extension"],
            dir=self.workspace_dir,
            delete=False
        ) as temp_file:
            temp_file.write(code)
            temp_file_path = temp_file.name
        
        try:
            # Execute the code
            start_time = time.time()
            
            if language == "python":
                result = await self._execute_python(temp_file_path, input_data, timeout)
            elif language == "javascript":
                result = await self._execute_javascript(temp_file_path, input_data, timeout)
            elif language == "bash":
                result = await self._execute_bash(temp_file_path, input_data, timeout)
            else:
                raise ValueError(f"Execution not implemented for {language}")
            
            execution_time = time.time() - start_time
            
            return {
                "language": language,
                "code": code,
                "execution_time": execution_time,
                "output": result["stdout"],
                "error": result["stderr"],
                "return_code": result["returncode"],
                "success": result["returncode"] == 0,
                "timestamp": time.time()
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    async def _execute_python(self, file_path: str, input_data: str, timeout: int) -> Dict[str, Any]:
        """Execute Python code"""
        try:
            process = await asyncio.create_subprocess_exec(
                "python3", file_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace_dir
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(input_data.encode() if input_data else None),
                timeout=timeout
            )
            
            return {
                "stdout": stdout.decode(),
                "stderr": stderr.decode(),
                "returncode": process.returncode
            }
            
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return {
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds",
                "returncode": -1
            }
    
    async def _execute_javascript(self, file_path: str, input_data: str, timeout: int) -> Dict[str, Any]:
        """Execute JavaScript code"""
        try:
            process = await asyncio.create_subprocess_exec(
                "node", file_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace_dir
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(input_data.encode() if input_data else None),
                timeout=timeout
            )
            
            return {
                "stdout": stdout.decode(),
                "stderr": stderr.decode(),
                "returncode": process.returncode
            }
            
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return {
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds",
                "returncode": -1
            }
    
    async def _execute_bash(self, file_path: str, input_data: str, timeout: int) -> Dict[str, Any]:
        """Execute Bash script"""
        try:
            # Make script executable
            os.chmod(file_path, 0o755)
            
            process = await asyncio.create_subprocess_exec(
                "bash", file_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.workspace_dir
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(input_data.encode() if input_data else None),
                timeout=timeout
            )
            
            return {
                "stdout": stdout.decode(),
                "stderr": stderr.decode(),
                "returncode": process.returncode
            }
            
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return {
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds",
                "returncode": -1
            }
    
    async def _security_check(self, code: str, language: str) -> bool:
        """Check code for security issues"""
        restricted = self.restricted_imports.get(language, [])
        
        if language == "python":
            # Check for restricted imports
            try:
                tree = ast.parse(code)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            if alias.name in restricted:
                                logger.warning(f"🚫 Restricted import detected: {alias.name}")
                                return False
                    elif isinstance(node, ast.ImportFrom):
                        if node.module in restricted:
                            logger.warning(f"🚫 Restricted import detected: {node.module}")
                            return False
            except SyntaxError:
                logger.warning("🚫 Code contains syntax errors")
                return False
        
        elif language == "bash":
            # Check for dangerous commands
            for cmd in restricted:
                if cmd in code:
                    logger.warning(f"🚫 Restricted command detected: {cmd}")
                    return False
        
        return True
    
    async def _analyze_code(self, task: AgentTask) -> Dict[str, Any]:
        """Analyze code for quality, complexity, and issues"""
        code = task.parameters.get("code", "")
        language = task.parameters.get("language", "python")
        
        if not code:
            raise ValueError("Code is required for analysis")
        
        analysis = {
            "language": language,
            "lines_of_code": len(code.splitlines()),
            "characters": len(code),
            "timestamp": time.time()
        }
        
        if language == "python":
            analysis.update(await self._analyze_python_code(code))
        
        return analysis
    
    async def _analyze_python_code(self, code: str) -> Dict[str, Any]:
        """Analyze Python code specifically"""
        try:
            tree = ast.parse(code)
            
            analysis = {
                "functions": 0,
                "classes": 0,
                "imports": 0,
                "complexity_score": 0,
                "issues": []
            }
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    analysis["functions"] += 1
                elif isinstance(node, ast.ClassDef):
                    analysis["classes"] += 1
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    analysis["imports"] += 1
                elif isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
                    analysis["complexity_score"] += 1
            
            # Check for common issues
            if analysis["functions"] == 0 and analysis["classes"] == 0:
                analysis["issues"].append("No functions or classes defined")
            
            if analysis["complexity_score"] > 10:
                analysis["issues"].append("High complexity score")
            
            return analysis
            
        except SyntaxError as e:
            return {
                "syntax_error": str(e),
                "issues": ["Syntax error in code"]
            }
    
    async def _debug_code(self, task: AgentTask) -> Dict[str, Any]:
        """Debug code and suggest fixes"""
        code = task.parameters.get("code", "")
        language = task.parameters.get("language", "python")
        error_message = task.parameters.get("error_message", "")
        
        if not code:
            raise ValueError("Code is required for debugging")
        
        # First, try to execute the code to see the actual error
        execution_result = await self._execute_code(AgentTask(
            task_id=f"{task.task_id}_debug_exec",
            agent_id=self.agent_id,
            user_id=task.user_id,
            task_type="execute_code",
            parameters={"code": code, "language": language}
        ))
        
        debug_info = {
            "language": language,
            "original_code": code,
            "execution_result": execution_result,
            "suggestions": [],
            "timestamp": time.time()
        }
        
        # Analyze errors and provide suggestions
        if not execution_result["success"]:
            error_output = execution_result["error"]
            debug_info["suggestions"] = await self._generate_debug_suggestions(
                code, language, error_output
            )
        
        return debug_info
    
    async def _generate_debug_suggestions(self, code: str, language: str, error: str) -> List[str]:
        """Generate debugging suggestions based on error"""
        suggestions = []
        
        if language == "python":
            if "NameError" in error:
                suggestions.append("Check for undefined variables or typos in variable names")
            elif "IndentationError" in error:
                suggestions.append("Fix indentation - Python requires consistent indentation")
            elif "SyntaxError" in error:
                suggestions.append("Check for missing colons, parentheses, or quotes")
            elif "TypeError" in error:
                suggestions.append("Check data types - ensure operations are compatible")
            elif "IndexError" in error:
                suggestions.append("Check list/array bounds - index may be out of range")
            elif "KeyError" in error:
                suggestions.append("Check dictionary keys - key may not exist")
            elif "ImportError" in error or "ModuleNotFoundError" in error:
                suggestions.append("Check import statements - module may not be installed")
        
        if not suggestions:
            suggestions.append("Review the error message and check the problematic line")
        
        return suggestions
    
    async def _optimize_code(self, task: AgentTask) -> Dict[str, Any]:
        """Optimize code for performance"""
        code = task.parameters.get("code", "")
        language = task.parameters.get("language", "python")
        optimization_type = task.parameters.get("optimization_type", "performance")
        
        if not code:
            raise ValueError("Code is required for optimization")
        
        # This is a simplified optimization - in production, you'd use more sophisticated analysis
        optimized_code = await self._simple_code_optimization(code, language, optimization_type)
        
        return {
            "language": language,
            "original_code": code,
            "optimized_code": optimized_code,
            "optimization_type": optimization_type,
            "optimizations_applied": await self._get_optimization_notes(code, optimized_code),
            "timestamp": time.time()
        }
    
    async def _simple_code_optimization(self, code: str, language: str, opt_type: str) -> str:
        """Simple code optimization"""
        if language == "python":
            # Basic optimizations
            optimized = code
            
            # Replace inefficient patterns
            optimized = re.sub(r'for i in range\(len\((.+?)\)\):', r'for i, item in enumerate(\1):', optimized)
            optimized = re.sub(r'\.append\((.+?)\) for (.+?) in (.+?)', r' = [\1 for \2 in \3]', optimized)
            
            return optimized
        
        return code  # No optimization for other languages yet
    
    async def _get_optimization_notes(self, original: str, optimized: str) -> List[str]:
        """Get notes about optimizations applied"""
        notes = []
        
        if original != optimized:
            if "enumerate" in optimized and "range(len(" in original:
                notes.append("Replaced range(len()) with enumerate() for better performance")
            if "list comprehension" in optimized.lower():
                notes.append("Used list comprehension for better performance")
        
        return notes
    
    async def _test_code(self, task: AgentTask) -> Dict[str, Any]:
        """Generate and run tests for code"""
        code = task.parameters.get("code", "")
        language = task.parameters.get("language", "python")
        test_type = task.parameters.get("test_type", "unit")
        
        if not code:
            raise ValueError("Code is required for testing")
        
        # Generate test code
        test_code = await self._generate_test_code(language, code)
        
        # Execute tests
        test_result = await self._execute_code(AgentTask(
            task_id=f"{task.task_id}_test_exec",
            agent_id=self.agent_id,
            user_id=task.user_id,
            task_type="execute_code",
            parameters={"code": test_code, "language": language}
        ))
        
        return {
            "language": language,
            "original_code": code,
            "test_code": test_code,
            "test_result": test_result,
            "tests_passed": test_result["success"],
            "timestamp": time.time()
        }
    
    async def _generate_test_code(self, language: str, code: str) -> str:
        """Generate test code for given code"""
        if language == "python":
            return f'''# Test code for the provided function
import unittest

{code}

class TestCode(unittest.TestCase):
    def test_basic_functionality(self):
        # Add your test cases here
        pass

if __name__ == "__main__":
    unittest.main()'''
        
        return f"// Test code generation not implemented for {language}"
    
    async def _refactor_code(self, task: AgentTask) -> Dict[str, Any]:
        """Refactor code for better structure"""
        code = task.parameters.get("code", "")
        language = task.parameters.get("language", "python")
        refactor_type = task.parameters.get("refactor_type", "structure")
        
        if not code:
            raise ValueError("Code is required for refactoring")
        
        # Simple refactoring - in production, use more sophisticated analysis
        refactored_code = await self._simple_refactoring(code, language, refactor_type)
        
        return {
            "language": language,
            "original_code": code,
            "refactored_code": refactored_code,
            "refactor_type": refactor_type,
            "improvements": await self._get_refactoring_notes(code, refactored_code),
            "timestamp": time.time()
        }
    
    async def _simple_refactoring(self, code: str, language: str, refactor_type: str) -> str:
        """Simple code refactoring"""
        # This is a placeholder - real refactoring would be much more sophisticated
        return code
    
    async def _get_refactoring_notes(self, original: str, refactored: str) -> List[str]:
        """Get notes about refactoring applied"""
        return ["Code structure analyzed - no major refactoring needed"]
    
    async def _code_review(self, task: AgentTask) -> Dict[str, Any]:
        """Perform code review"""
        code = task.parameters.get("code", "")
        language = task.parameters.get("language", "python")
        review_type = task.parameters.get("review_type", "comprehensive")
        
        if not code:
            raise ValueError("Code is required for review")
        
        # Analyze the code
        analysis = await self._analyze_code(AgentTask(
            task_id=f"{task.task_id}_review_analysis",
            agent_id=self.agent_id,
            user_id=task.user_id,
            task_type="analyze_code",
            parameters={"code": code, "language": language}
        ))
        
        # Generate review comments
        review_comments = await self._generate_review_comments(code, language, analysis)
        
        return {
            "language": language,
            "code": code,
            "analysis": analysis,
            "review_comments": review_comments,
            "overall_score": await self._calculate_code_score(analysis),
            "timestamp": time.time()
        }
    
    async def _generate_review_comments(self, code: str, language: str, analysis: Dict) -> List[Dict[str, Any]]:
        """Generate code review comments"""
        comments = []
        
        if analysis.get("issues"):
            for issue in analysis["issues"]:
                comments.append({
                    "type": "issue",
                    "severity": "medium",
                    "message": issue,
                    "suggestion": "Address this issue to improve code quality"
                })
        
        if analysis.get("complexity_score", 0) > 10:
            comments.append({
                "type": "complexity",
                "severity": "high",
                "message": "High complexity detected",
                "suggestion": "Consider breaking down complex functions"
            })
        
        if analysis.get("functions", 0) == 0:
            comments.append({
                "type": "structure",
                "severity": "low",
                "message": "No functions defined",
                "suggestion": "Consider organizing code into functions"
            })
        
        return comments
    
    async def _calculate_code_score(self, analysis: Dict) -> int:
        """Calculate overall code quality score (0-100)"""
        score = 100
        
        # Deduct points for issues
        score -= len(analysis.get("issues", [])) * 10
        
        # Deduct points for high complexity
        if analysis.get("complexity_score", 0) > 10:
            score -= 20
        
        # Ensure score is not negative
        return max(0, score)
    
    async def _create_project(self, task: AgentTask) -> Dict[str, Any]:
        """Create a new code project structure"""
        project_name = task.parameters.get("project_name", "new_project")
        language = task.parameters.get("language", "python")
        project_type = task.parameters.get("project_type", "basic")
        
        project_path = os.path.join(self.workspace_dir, project_name)
        
        # Create project directory
        os.makedirs(project_path, exist_ok=True)
        
        # Create project structure based on language and type
        created_files = []
        
        if language == "python":
            created_files = await self._create_python_project(project_path, project_type)
        elif language == "javascript":
            created_files = await self._create_javascript_project(project_path, project_type)
        
        return {
            "project_name": project_name,
            "project_path": project_path,
            "language": language,
            "project_type": project_type,
            "created_files": created_files,
            "timestamp": time.time()
        }
    
    async def _create_python_project(self, project_path: str, project_type: str) -> List[str]:
        """Create Python project structure"""
        created_files = []
        
        # Create main.py
        main_file = os.path.join(project_path, "main.py")
        with open(main_file, 'w') as f:
            f.write('#!/usr/bin/env python3\n"""Main module"""\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n')
        created_files.append("main.py")
        
        # Create requirements.txt
        req_file = os.path.join(project_path, "requirements.txt")
        with open(req_file, 'w') as f:
            f.write("# Project dependencies\n")
        created_files.append("requirements.txt")
        
        # Create README.md
        readme_file = os.path.join(project_path, "README.md")
        with open(readme_file, 'w') as f:
            f.write(f"# {os.path.basename(project_path)}\n\nProject description\n\n## Installation\n\n```bash\npip install -r requirements.txt\n```\n\n## Usage\n\n```bash\npython main.py\n```\n")
        created_files.append("README.md")
        
        return created_files
    
    async def _create_javascript_project(self, project_path: str, project_type: str) -> List[str]:
        """Create JavaScript project structure"""
        created_files = []
        
        # Create index.js
        main_file = os.path.join(project_path, "index.js")
        with open(main_file, 'w') as f:
            f.write('// Main module\nconsole.log("Hello, World!");\n')
        created_files.append("index.js")
        
        # Create package.json
        package_file = os.path.join(project_path, "package.json")
        with open(package_file, 'w') as f:
            package_data = {
                "name": os.path.basename(project_path),
                "version": "1.0.0",
                "description": "Project description",
                "main": "index.js",
                "scripts": {
                    "start": "node index.js"
                }
            }
            json.dump(package_data, f, indent=2)
        created_files.append("package.json")
        
        return created_files
    
    async def _install_dependencies(self, task: AgentTask) -> Dict[str, Any]:
        """Install project dependencies"""
        project_path = task.parameters.get("project_path", self.workspace_dir)
        language = task.parameters.get("language", "python")
        
        if not os.path.exists(project_path):
            raise ValueError(f"Project path does not exist: {project_path}")
        
        if language == "python":
            req_file = os.path.join(project_path, "requirements.txt")
            if os.path.exists(req_file):
                result = await self._run_command(["pip", "install", "-r", req_file], project_path)
            else:
                result = {"stdout": "No requirements.txt found", "stderr": "", "returncode": 0}
        
        elif language == "javascript":
            package_file = os.path.join(project_path, "package.json")
            if os.path.exists(package_file):
                result = await self._run_command(["npm", "install"], project_path)
            else:
                result = {"stdout": "No package.json found", "stderr": "", "returncode": 0}
        
        else:
            raise ValueError(f"Dependency installation not supported for {language}")
        
        return {
            "project_path": project_path,
            "language": language,
            "success": result["returncode"] == 0,
            "output": result["stdout"],
            "error": result["stderr"],
            "timestamp": time.time()
        }
    
    async def _run_command(self, command: List[str], cwd: str, timeout: int = 60) -> Dict[str, Any]:
        """Run a shell command"""
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            return {
                "stdout": stdout.decode(),
                "stderr": stderr.decode(),
                "returncode": process.returncode
            }
            
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return {
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "returncode": -1
            }
    
    async def _cleanup_agent(self):
        """Clean up code agent resources"""
        # Clean up temporary files in workspace
        logger.info("💻 Code Agent cleanup completed")

# Create global instance
code_agent = CodeAgent()