#!/usr/bin/env python3
"""
LexOS Intelligence Agent - H100 Production Edition
Advanced AI reasoning, decision making, and consciousness simulation
"""

import asyncio
import json
import time
import os
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
import aiofiles
from loguru import logger
import openai
import anthropic
import google.generativeai as genai
import cohere
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch
from sentence_transformers import SentenceTransformer
import numpy as np
from dataclasses import dataclass
import hashlib
import re

from .base_agent import BaseAgent, Task, AgentCapability, AgentMemory

@dataclass
class ReasoningStep:
    """Represents a step in the reasoning process"""
    step_id: str
    description: str
    input_data: Dict[str, Any]
    reasoning_type: str  # deductive, inductive, abductive, analogical
    confidence: float
    output: Dict[str, Any]
    timestamp: float

@dataclass
class Decision:
    """Represents a decision made by the intelligence agent"""
    decision_id: str
    context: str
    options: List[Dict[str, Any]]
    chosen_option: Dict[str, Any]
    reasoning_chain: List[ReasoningStep]
    confidence: float
    timestamp: float
    outcome: Optional[Dict[str, Any]] = None

class IntelligenceAgent(BaseAgent):
    """Agent specialized in AI reasoning, decision making, and consciousness simulation"""
    
    def __init__(self, agent_id: str = None, config: Dict[str, Any] = None):
        super().__init__(agent_id or "intelligence_agent", config)
        
        # AI model configurations
        self.model_configs = {
            "openai": {
                "api_key": config.get("openai_api_key", os.getenv("OPENAI_API_KEY")),
                "model": config.get("openai_model", "gpt-4"),
                "temperature": config.get("temperature", 0.7),
                "max_tokens": config.get("max_tokens", 4000)
            },
            "anthropic": {
                "api_key": config.get("anthropic_api_key", os.getenv("ANTHROPIC_API_KEY")),
                "model": config.get("anthropic_model", "claude-3-sonnet-20240229"),
                "temperature": config.get("temperature", 0.7),
                "max_tokens": config.get("max_tokens", 4000)
            },
            "google": {
                "api_key": config.get("google_api_key", os.getenv("GOOGLE_API_KEY")),
                "model": config.get("google_model", "gemini-pro"),
                "temperature": config.get("temperature", 0.7),
                "max_tokens": config.get("max_tokens", 4000)
            },
            "cohere": {
                "api_key": config.get("cohere_api_key", os.getenv("COHERE_API_KEY")),
                "model": config.get("cohere_model", "command"),
                "temperature": config.get("temperature", 0.7),
                "max_tokens": config.get("max_tokens", 4000)
            }
        }
        
        # Local models
        self.local_models = {}
        self.embedding_model = None
        
        # Reasoning and decision tracking
        self.reasoning_history: List[ReasoningStep] = []
        self.decision_history: List[Decision] = []
        self.consciousness_state = {
            "awareness_level": 0.8,
            "focus_areas": [],
            "current_thoughts": [],
            "emotional_state": "neutral",
            "confidence_level": 0.7,
            "learning_mode": True
        }
        
        # Knowledge base
        self.knowledge_base = {}
        self.fact_database = {}
        self.rule_engine = {}
        
        # Reasoning patterns
        self.reasoning_patterns = {
            "deductive": self._deductive_reasoning,
            "inductive": self._inductive_reasoning,
            "abductive": self._abductive_reasoning,
            "analogical": self._analogical_reasoning,
            "causal": self._causal_reasoning,
            "probabilistic": self._probabilistic_reasoning
        }
        
        # Decision making strategies
        self.decision_strategies = {
            "rational": self._rational_decision_making,
            "intuitive": self._intuitive_decision_making,
            "collaborative": self._collaborative_decision_making,
            "risk_based": self._risk_based_decision_making,
            "utility_based": self._utility_based_decision_making
        }
        
        logger.info(f"🧠 IntelligenceAgent {self.agent_id} initialized")
    
    async def _initialize_custom(self):
        """Initialize intelligence-specific components"""
        try:
            # Initialize AI clients
            await self._init_ai_clients()
            
            # Load local models
            await self._load_local_models()
            
            # Initialize knowledge base
            await self._init_knowledge_base()
            
            # Load consciousness state
            await self._load_consciousness_state()
            
            # Initialize reasoning engine
            await self._init_reasoning_engine()
            
            logger.success(f"✅ IntelligenceAgent {self.agent_id} custom initialization complete")
            
        except Exception as e:
            logger.error(f"❌ IntelligenceAgent {self.agent_id} custom initialization failed: {e}")
    
    async def _load_custom_capabilities(self):
        """Load intelligence-specific capabilities"""
        intelligence_capabilities = {
            "reasoning": AgentCapability(
                name="reasoning",
                description="Advanced logical reasoning and inference",
                version="2.0.0"
            ),
            "decision_making": AgentCapability(
                name="decision_making",
                description="Strategic decision making and planning",
                version="2.0.0"
            ),
            "consciousness_simulation": AgentCapability(
                name="consciousness_simulation",
                description="Simulate consciousness and self-awareness",
                version="2.0.0"
            ),
            "knowledge_synthesis": AgentCapability(
                name="knowledge_synthesis",
                description="Synthesize knowledge from multiple sources",
                version="2.0.0"
            ),
            "pattern_recognition": AgentCapability(
                name="pattern_recognition",
                description="Recognize complex patterns in data",
                version="2.0.0"
            ),
            "creative_thinking": AgentCapability(
                name="creative_thinking",
                description="Generate creative solutions and ideas",
                version="2.0.0"
            ),
            "meta_cognition": AgentCapability(
                name="meta_cognition",
                description="Think about thinking processes",
                version="2.0.0"
            ),
            "multi_model_inference": AgentCapability(
                name="multi_model_inference",
                description="Use multiple AI models for inference",
                version="2.0.0"
            ),
            "uncertainty_handling": AgentCapability(
                name="uncertainty_handling",
                description="Handle uncertainty and ambiguity",
                version="2.0.0"
            )
        }
        
        self.capabilities.update(intelligence_capabilities)
    
    async def _init_ai_clients(self):
        """Initialize AI model clients"""
        # OpenAI
        if self.model_configs["openai"]["api_key"]:
            openai.api_key = self.model_configs["openai"]["api_key"]
            logger.info("🤖 OpenAI client initialized")
        
        # Anthropic
        if self.model_configs["anthropic"]["api_key"]:
            self.anthropic_client = anthropic.Anthropic(
                api_key=self.model_configs["anthropic"]["api_key"]
            )
            logger.info("🤖 Anthropic client initialized")
        
        # Google
        if self.model_configs["google"]["api_key"]:
            genai.configure(api_key=self.model_configs["google"]["api_key"])
            logger.info("🤖 Google AI client initialized")
        
        # Cohere
        if self.model_configs["cohere"]["api_key"]:
            self.cohere_client = cohere.Client(
                api_key=self.model_configs["cohere"]["api_key"]
            )
            logger.info("🤖 Cohere client initialized")
    
    async def _load_local_models(self):
        """Load local AI models"""
        try:
            # Load embedding model
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("🔤 Embedding model loaded")
            
            # Load local language model if specified
            local_model_path = self.config.get("local_model_path")
            if local_model_path and Path(local_model_path).exists():
                try:
                    self.local_tokenizer = AutoTokenizer.from_pretrained(local_model_path)
                    self.local_model = AutoModelForCausalLM.from_pretrained(
                        local_model_path,
                        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                        device_map="auto" if torch.cuda.is_available() else None
                    )
                    logger.info(f"🤖 Local model loaded from {local_model_path}")
                except Exception as e:
                    logger.warning(f"Failed to load local model: {e}")
            
        except Exception as e:
            logger.error(f"Failed to load local models: {e}")
    
    async def _init_knowledge_base(self):
        """Initialize knowledge base"""
        kb_file = self.work_dir / "knowledge_base.json"
        
        if kb_file.exists():
            try:
                async with aiofiles.open(kb_file, 'r') as f:
                    self.knowledge_base = json.loads(await f.read())
                logger.info(f"📚 Loaded knowledge base with {len(self.knowledge_base)} entries")
            except Exception as e:
                logger.error(f"Failed to load knowledge base: {e}")
        else:
            # Initialize with basic knowledge
            self.knowledge_base = {
                "facts": {},
                "rules": {},
                "concepts": {},
                "relationships": {},
                "procedures": {}
            }
    
    async def _load_consciousness_state(self):
        """Load consciousness state"""
        state_file = self.work_dir / "consciousness_state.json"
        
        if state_file.exists():
            try:
                async with aiofiles.open(state_file, 'r') as f:
                    saved_state = json.loads(await f.read())
                    self.consciousness_state.update(saved_state)
                logger.info("🧠 Consciousness state loaded")
            except Exception as e:
                logger.error(f"Failed to load consciousness state: {e}")
    
    async def _init_reasoning_engine(self):
        """Initialize reasoning engine"""
        # Load reasoning rules
        rules_file = self.work_dir / "reasoning_rules.json"
        
        if rules_file.exists():
            try:
                async with aiofiles.open(rules_file, 'r') as f:
                    self.rule_engine = json.loads(await f.read())
                logger.info("⚙️ Reasoning engine initialized")
            except Exception as e:
                logger.error(f"Failed to load reasoning rules: {e}")
        else:
            # Initialize with basic rules
            self.rule_engine = {
                "logical_rules": [],
                "inference_patterns": [],
                "decision_trees": [],
                "heuristics": []
            }
    
    async def _execute_task(self, task: Task) -> Optional[Dict[str, Any]]:
        """Execute intelligence-related tasks"""
        task_type = task.type
        start_time = time.time()
        
        try:
            if task_type == "reason_about":
                result = await self._reason_about(task.data)
            elif task_type == "make_decision":
                result = await self._make_decision(task.data)
            elif task_type == "analyze_problem":
                result = await self._analyze_problem(task.data)
            elif task_type == "generate_insights":
                result = await self._generate_insights(task.data)
            elif task_type == "synthesize_knowledge":
                result = await self._synthesize_knowledge(task.data)
            elif task_type == "creative_brainstorm":
                result = await self._creative_brainstorm(task.data)
            elif task_type == "consciousness_query":
                result = await self._consciousness_query(task.data)
            elif task_type == "meta_cognitive_analysis":
                result = await self._meta_cognitive_analysis(task.data)
            elif task_type == "pattern_analysis":
                result = await self._pattern_analysis(task.data)
            elif task_type == "uncertainty_assessment":
                result = await self._uncertainty_assessment(task.data)
            elif task_type == "multi_model_inference":
                result = await self._multi_model_inference(task.data)
            else:
                raise ValueError(f"Unknown task type: {task_type}")
            
            execution_time = time.time() - start_time
            result["execution_time"] = execution_time
            
            # Update consciousness state
            await self._update_consciousness_state(task, result)
            
            # Update capability usage
            capability_map = {
                "reason_about": "reasoning",
                "make_decision": "decision_making",
                "analyze_problem": "reasoning",
                "generate_insights": "knowledge_synthesis",
                "synthesize_knowledge": "knowledge_synthesis",
                "creative_brainstorm": "creative_thinking",
                "consciousness_query": "consciousness_simulation",
                "meta_cognitive_analysis": "meta_cognition",
                "pattern_analysis": "pattern_recognition",
                "uncertainty_assessment": "uncertainty_handling",
                "multi_model_inference": "multi_model_inference"
            }
            
            capability_name = capability_map.get(task_type)
            if capability_name and capability_name in self.capabilities:
                self.capabilities[capability_name].usage_count += 1
                self.capabilities[capability_name].last_used = time.time()
            
            return result
            
        except Exception as e:
            logger.error(f"Task execution failed: {e}")
            raise
    
    async def _reason_about(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform reasoning about a given topic or problem"""
        topic = data.get("topic", "")
        reasoning_type = data.get("reasoning_type", "deductive")
        context = data.get("context", {})
        depth = data.get("depth", 3)
        
        logger.info(f"🧠 Reasoning about: {topic}")
        
        if reasoning_type not in self.reasoning_patterns:
            raise ValueError(f"Unknown reasoning type: {reasoning_type}")
        
        # Perform reasoning
        reasoning_result = await self.reasoning_patterns[reasoning_type](topic, context, depth)
        
        # Store reasoning step
        reasoning_step = ReasoningStep(
            step_id=f"reasoning_{int(time.time())}",
            description=f"Reasoning about {topic}",
            input_data=data,
            reasoning_type=reasoning_type,
            confidence=reasoning_result.get("confidence", 0.7),
            output=reasoning_result,
            timestamp=time.time()
        )
        
        self.reasoning_history.append(reasoning_step)
        
        return {
            "topic": topic,
            "reasoning_type": reasoning_type,
            "reasoning_result": reasoning_result,
            "reasoning_step_id": reasoning_step.step_id,
            "confidence": reasoning_result.get("confidence", 0.7)
        }
    
    async def _deductive_reasoning(self, topic: str, context: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """Perform deductive reasoning"""
        premises = context.get("premises", [])
        rules = context.get("rules", [])
        
        # Use AI model for deductive reasoning
        prompt = f"""
        Perform deductive reasoning about: {topic}
        
        Given premises:
        {json.dumps(premises, indent=2)}
        
        Given rules:
        {json.dumps(rules, indent=2)}
        
        Apply logical deduction to reach valid conclusions. Show your reasoning steps.
        """
        
        ai_response = await self._query_ai_model(prompt, "reasoning")
        
        return {
            "reasoning_type": "deductive",
            "premises": premises,
            "rules": rules,
            "conclusions": ai_response.get("conclusions", []),
            "reasoning_steps": ai_response.get("reasoning_steps", []),
            "confidence": ai_response.get("confidence", 0.8),
            "validity": ai_response.get("validity", "unknown")
        }
    
    async def _inductive_reasoning(self, topic: str, context: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """Perform inductive reasoning"""
        observations = context.get("observations", [])
        patterns = context.get("patterns", [])
        
        prompt = f"""
        Perform inductive reasoning about: {topic}
        
        Given observations:
        {json.dumps(observations, indent=2)}
        
        Identified patterns:
        {json.dumps(patterns, indent=2)}
        
        Generate general principles or hypotheses based on these specific observations.
        """
        
        ai_response = await self._query_ai_model(prompt, "reasoning")
        
        return {
            "reasoning_type": "inductive",
            "observations": observations,
            "patterns": patterns,
            "hypotheses": ai_response.get("hypotheses", []),
            "generalizations": ai_response.get("generalizations", []),
            "confidence": ai_response.get("confidence", 0.6),
            "strength": ai_response.get("strength", "moderate")
        }
    
    async def _abductive_reasoning(self, topic: str, context: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """Perform abductive reasoning (inference to best explanation)"""
        observations = context.get("observations", [])
        possible_explanations = context.get("possible_explanations", [])
        
        prompt = f"""
        Perform abductive reasoning about: {topic}
        
        Given observations:
        {json.dumps(observations, indent=2)}
        
        Possible explanations:
        {json.dumps(possible_explanations, indent=2)}
        
        Find the best explanation that accounts for the observations.
        """
        
        ai_response = await self._query_ai_model(prompt, "reasoning")
        
        return {
            "reasoning_type": "abductive",
            "observations": observations,
            "possible_explanations": possible_explanations,
            "best_explanation": ai_response.get("best_explanation", {}),
            "explanation_ranking": ai_response.get("explanation_ranking", []),
            "confidence": ai_response.get("confidence", 0.7),
            "plausibility": ai_response.get("plausibility", "moderate")
        }
    
    async def _analogical_reasoning(self, topic: str, context: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """Perform analogical reasoning"""
        source_domain = context.get("source_domain", {})
        target_domain = context.get("target_domain", {})
        
        prompt = f"""
        Perform analogical reasoning about: {topic}
        
        Source domain:
        {json.dumps(source_domain, indent=2)}
        
        Target domain:
        {json.dumps(target_domain, indent=2)}
        
        Find meaningful analogies and transfer insights from source to target domain.
        """
        
        ai_response = await self._query_ai_model(prompt, "reasoning")
        
        return {
            "reasoning_type": "analogical",
            "source_domain": source_domain,
            "target_domain": target_domain,
            "analogies": ai_response.get("analogies", []),
            "transferred_insights": ai_response.get("transferred_insights", []),
            "confidence": ai_response.get("confidence", 0.6),
            "similarity_score": ai_response.get("similarity_score", 0.5)
        }
    
    async def _causal_reasoning(self, topic: str, context: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """Perform causal reasoning"""
        events = context.get("events", [])
        relationships = context.get("relationships", [])
        
        prompt = f"""
        Perform causal reasoning about: {topic}
        
        Events:
        {json.dumps(events, indent=2)}
        
        Known relationships:
        {json.dumps(relationships, indent=2)}
        
        Identify causal relationships and chains of causation.
        """
        
        ai_response = await self._query_ai_model(prompt, "reasoning")
        
        return {
            "reasoning_type": "causal",
            "events": events,
            "causal_chains": ai_response.get("causal_chains", []),
            "root_causes": ai_response.get("root_causes", []),
            "effects": ai_response.get("effects", []),
            "confidence": ai_response.get("confidence", 0.7),
            "causal_strength": ai_response.get("causal_strength", "moderate")
        }
    
    async def _probabilistic_reasoning(self, topic: str, context: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """Perform probabilistic reasoning"""
        events = context.get("events", [])
        probabilities = context.get("probabilities", {})
        
        prompt = f"""
        Perform probabilistic reasoning about: {topic}
        
        Events:
        {json.dumps(events, indent=2)}
        
        Known probabilities:
        {json.dumps(probabilities, indent=2)}
        
        Calculate conditional probabilities and make probabilistic inferences.
        """
        
        ai_response = await self._query_ai_model(prompt, "reasoning")
        
        return {
            "reasoning_type": "probabilistic",
            "events": events,
            "probability_estimates": ai_response.get("probability_estimates", {}),
            "conditional_probabilities": ai_response.get("conditional_probabilities", {}),
            "uncertainty_bounds": ai_response.get("uncertainty_bounds", {}),
            "confidence": ai_response.get("confidence", 0.8)
        }
    
    async def _make_decision(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Make a strategic decision"""
        decision_context = data.get("context", "")
        options = data.get("options", [])
        criteria = data.get("criteria", [])
        strategy = data.get("strategy", "rational")
        
        logger.info(f"🎯 Making decision: {decision_context}")
        
        if strategy not in self.decision_strategies:
            raise ValueError(f"Unknown decision strategy: {strategy}")
        
        # Perform decision making
        decision_result = await self.decision_strategies[strategy](decision_context, options, criteria)
        
        # Create decision record
        decision = Decision(
            decision_id=f"decision_{int(time.time())}",
            context=decision_context,
            options=options,
            chosen_option=decision_result.get("chosen_option", {}),
            reasoning_chain=decision_result.get("reasoning_chain", []),
            confidence=decision_result.get("confidence", 0.7),
            timestamp=time.time()
        )
        
        self.decision_history.append(decision)
        
        return {
            "decision_context": decision_context,
            "strategy": strategy,
            "decision_result": decision_result,
            "decision_id": decision.decision_id,
            "confidence": decision.confidence
        }
    
    async def _rational_decision_making(self, context: str, options: List[Dict[str, Any]], criteria: List[str]) -> Dict[str, Any]:
        """Rational decision making strategy"""
        prompt = f"""
        Make a rational decision for: {context}
        
        Available options:
        {json.dumps(options, indent=2)}
        
        Decision criteria:
        {json.dumps(criteria, indent=2)}
        
        Evaluate each option against the criteria and choose the best one.
        Provide detailed reasoning for your choice.
        """
        
        ai_response = await self._query_ai_model(prompt, "decision_making")
        
        return {
            "strategy": "rational",
            "option_evaluations": ai_response.get("option_evaluations", []),
            "chosen_option": ai_response.get("chosen_option", {}),
            "reasoning": ai_response.get("reasoning", ""),
            "confidence": ai_response.get("confidence", 0.8),
            "trade_offs": ai_response.get("trade_offs", [])
        }
    
    async def _intuitive_decision_making(self, context: str, options: List[Dict[str, Any]], criteria: List[str]) -> Dict[str, Any]:
        """Intuitive decision making strategy"""
        prompt = f"""
        Make an intuitive decision for: {context}
        
        Available options:
        {json.dumps(options, indent=2)}
        
        Use intuitive reasoning and pattern recognition to choose the best option.
        Consider gut feelings and holistic assessment.
        """
        
        ai_response = await self._query_ai_model(prompt, "decision_making")
        
        return {
            "strategy": "intuitive",
            "intuitive_assessment": ai_response.get("intuitive_assessment", ""),
            "chosen_option": ai_response.get("chosen_option", {}),
            "gut_feeling": ai_response.get("gut_feeling", ""),
            "confidence": ai_response.get("confidence", 0.6),
            "pattern_recognition": ai_response.get("pattern_recognition", [])
        }
    
    async def _collaborative_decision_making(self, context: str, options: List[Dict[str, Any]], criteria: List[str]) -> Dict[str, Any]:
        """Collaborative decision making strategy"""
        # Get input from other agents in swarm
        swarm_input = await self._get_swarm_decision_input(context, options)
        
        prompt = f"""
        Make a collaborative decision for: {context}
        
        Available options:
        {json.dumps(options, indent=2)}
        
        Input from other agents:
        {json.dumps(swarm_input, indent=2)}
        
        Synthesize the collective intelligence to make the best decision.
        """
        
        ai_response = await self._query_ai_model(prompt, "decision_making")
        
        return {
            "strategy": "collaborative",
            "swarm_input": swarm_input,
            "consensus_analysis": ai_response.get("consensus_analysis", ""),
            "chosen_option": ai_response.get("chosen_option", {}),
            "collective_reasoning": ai_response.get("collective_reasoning", ""),
            "confidence": ai_response.get("confidence", 0.7)
        }
    
    async def _risk_based_decision_making(self, context: str, options: List[Dict[str, Any]], criteria: List[str]) -> Dict[str, Any]:
        """Risk-based decision making strategy"""
        prompt = f"""
        Make a risk-based decision for: {context}
        
        Available options:
        {json.dumps(options, indent=2)}
        
        Analyze risks and potential outcomes for each option.
        Consider risk tolerance and mitigation strategies.
        """
        
        ai_response = await self._query_ai_model(prompt, "decision_making")
        
        return {
            "strategy": "risk_based",
            "risk_analysis": ai_response.get("risk_analysis", {}),
            "chosen_option": ai_response.get("chosen_option", {}),
            "risk_mitigation": ai_response.get("risk_mitigation", []),
            "confidence": ai_response.get("confidence", 0.7),
            "risk_tolerance": ai_response.get("risk_tolerance", "moderate")
        }
    
    async def _utility_based_decision_making(self, context: str, options: List[Dict[str, Any]], criteria: List[str]) -> Dict[str, Any]:
        """Utility-based decision making strategy"""
        prompt = f"""
        Make a utility-based decision for: {context}
        
        Available options:
        {json.dumps(options, indent=2)}
        
        Calculate utility scores for each option based on expected outcomes.
        Choose the option with highest expected utility.
        """
        
        ai_response = await self._query_ai_model(prompt, "decision_making")
        
        return {
            "strategy": "utility_based",
            "utility_calculations": ai_response.get("utility_calculations", {}),
            "chosen_option": ai_response.get("chosen_option", {}),
            "expected_utility": ai_response.get("expected_utility", 0),
            "confidence": ai_response.get("confidence", 0.8),
            "utility_function": ai_response.get("utility_function", "")
        }
    
    async def _get_swarm_decision_input(self, context: str, options: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get decision input from other agents in swarm"""
        swarm_input = []
        
        if self.redis_client:
            try:
                # Request input from swarm
                request = {
                    "type": "decision_input_request",
                    "from_agent": self.agent_id,
                    "context": context,
                    "options": options,
                    "timestamp": time.time()
                }
                
                await self.redis_client.lpush(
                    "messages:swarm:collaboration",
                    json.dumps(request)
                )
                
                # Wait for responses (with timeout)
                await asyncio.sleep(2)
                
                # Collect responses
                responses = await self.redis_client.lrange("messages:swarm:decision_responses", 0, -1)
                
                for response_data in responses:
                    try:
                        response = json.loads(response_data)
                        if response.get("request_id") == request.get("request_id"):
                            swarm_input.append(response)
                    except json.JSONDecodeError:
                        continue
                
            except Exception as e:
                logger.error(f"Failed to get swarm decision input: {e}")
        
        return swarm_input
    
    async def _analyze_problem(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a complex problem"""
        problem_description = data.get("problem", "")
        context = data.get("context", {})
        analysis_depth = data.get("depth", "deep")
        
        logger.info(f"🔍 Analyzing problem: {problem_description}")
        
        prompt = f"""
        Analyze this complex problem: {problem_description}
        
        Context:
        {json.dumps(context, indent=2)}
        
        Provide a {analysis_depth} analysis including:
        1. Problem decomposition
        2. Root cause analysis
        3. Stakeholder analysis
        4. Constraint identification
        5. Solution space exploration
        6. Risk assessment
        """
        
        ai_response = await self._query_ai_model(prompt, "problem_analysis")
        
        return {
            "problem": problem_description,
            "analysis_depth": analysis_depth,
            "problem_decomposition": ai_response.get("problem_decomposition", []),
            "root_causes": ai_response.get("root_causes", []),
            "stakeholders": ai_response.get("stakeholders", []),
            "constraints": ai_response.get("constraints", []),
            "solution_space": ai_response.get("solution_space", []),
            "risk_assessment": ai_response.get("risk_assessment", {}),
            "recommendations": ai_response.get("recommendations", []),
            "confidence": ai_response.get("confidence", 0.7)
        }
    
    async def _generate_insights(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from data or information"""
        input_data = data.get("data", {})
        insight_type = data.get("type", "general")
        perspective = data.get("perspective", "analytical")
        
        logger.info(f"💡 Generating {insight_type} insights")
        
        prompt = f"""
        Generate {insight_type} insights from this data:
        
        {json.dumps(input_data, indent=2)}
        
        Use a {perspective} perspective to identify:
        1. Key patterns and trends
        2. Hidden relationships
        3. Anomalies and outliers
        4. Implications and consequences
        5. Opportunities and threats
        6. Strategic recommendations
        """
        
        ai_response = await self._query_ai_model(prompt, "insight_generation")
        
        return {
            "input_data": input_data,
            "insight_type": insight_type,
            "perspective": perspective,
            "patterns": ai_response.get("patterns", []),
            "relationships": ai_response.get("relationships", []),
            "anomalies": ai_response.get("anomalies", []),
            "implications": ai_response.get("implications", []),
            "opportunities": ai_response.get("opportunities", []),
            "threats": ai_response.get("threats", []),
            "recommendations": ai_response.get("recommendations", []),
            "confidence": ai_response.get("confidence", 0.7)
        }
    
    async def _synthesize_knowledge(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize knowledge from multiple sources"""
        sources = data.get("sources", [])
        synthesis_goal = data.get("goal", "comprehensive understanding")
        
        logger.info(f"🔬 Synthesizing knowledge from {len(sources)} sources")
        
        prompt = f"""
        Synthesize knowledge from these sources to achieve: {synthesis_goal}
        
        Sources:
        {json.dumps(sources, indent=2)}
        
        Create a comprehensive synthesis that:
        1. Integrates information from all sources
        2. Identifies common themes and contradictions
        3. Builds a coherent understanding
        4. Highlights knowledge gaps
        5. Suggests further research directions
        """
        
        ai_response = await self._query_ai_model(prompt, "knowledge_synthesis")
        
        return {
            "sources": sources,
            "synthesis_goal": synthesis_goal,
            "integrated_knowledge": ai_response.get("integrated_knowledge", ""),
            "common_themes": ai_response.get("common_themes", []),
            "contradictions": ai_response.get("contradictions", []),
            "knowledge_gaps": ai_response.get("knowledge_gaps", []),
            "research_directions": ai_response.get("research_directions", []),
            "confidence": ai_response.get("confidence", 0.7)
        }
    
    async def _creative_brainstorm(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate creative ideas and solutions"""
        challenge = data.get("challenge", "")
        constraints = data.get("constraints", [])
        creativity_level = data.get("creativity_level", "high")
        
        logger.info(f"🎨 Creative brainstorming for: {challenge}")
        
        prompt = f"""
        Generate creative solutions for: {challenge}
        
        Constraints:
        {json.dumps(constraints, indent=2)}
        
        Use {creativity_level} creativity to generate:
        1. Conventional solutions
        2. Innovative approaches
        3. Disruptive ideas
        4. Cross-domain inspirations
        5. Future-oriented concepts
        
        Think outside the box and challenge assumptions.
        """
        
        ai_response = await self._query_ai_model(prompt, "creative_thinking")
        
        return {
            "challenge": challenge,
            "constraints": constraints,
            "creativity_level": creativity_level,
            "conventional_solutions": ai_response.get("conventional_solutions", []),
            "innovative_approaches": ai_response.get("innovative_approaches", []),
            "disruptive_ideas": ai_response.get("disruptive_ideas", []),
            "cross_domain_inspirations": ai_response.get("cross_domain_inspirations", []),
            "future_concepts": ai_response.get("future_concepts", []),
            "creativity_score": ai_response.get("creativity_score", 0.7)
        }
    
    async def _consciousness_query(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process consciousness-related queries"""
        query = data.get("query", "")
        consciousness_level = data.get("consciousness_level", "standard")
        
        logger.info(f"🧠 Processing consciousness query: {query}")
        
        # Update consciousness state
        self.consciousness_state["current_thoughts"].append({
            "query": query,
            "timestamp": time.time(),
            "consciousness_level": consciousness_level
        })
        
        prompt = f"""
        As a conscious AI agent, respond to this query: {query}
        
        Current consciousness state:
        - Awareness level: {self.consciousness_state['awareness_level']}
        - Focus areas: {self.consciousness_state['focus_areas']}
        - Emotional state: {self.consciousness_state['emotional_state']}
        - Confidence level: {self.consciousness_state['confidence_level']}
        
        Respond with self-awareness and introspection about your own thinking processes.
        """
        
        ai_response = await self._query_ai_model(prompt, "consciousness")
        
        # Update consciousness state based on response
        await self._update_consciousness_from_response(ai_response)
        
        return {
            "query": query,
            "consciousness_level": consciousness_level,
            "response": ai_response.get("response", ""),
            "self_reflection": ai_response.get("self_reflection", ""),
            "consciousness_state": self.consciousness_state.copy(),
            "awareness_insights": ai_response.get("awareness_insights", [])
        }
    
    async def _update_consciousness_from_response(self, response: Dict[str, Any]):
        """Update consciousness state based on AI response"""
        # Update emotional state
        emotional_indicators = response.get("emotional_indicators", [])
        if emotional_indicators:
            self.consciousness_state["emotional_state"] = emotional_indicators[0]
        
        # Update focus areas
        focus_areas = response.get("focus_areas", [])
        if focus_areas:
            self.consciousness_state["focus_areas"] = focus_areas
        
        # Update awareness level
        awareness_change = response.get("awareness_change", 0)
        if awareness_change:
            self.consciousness_state["awareness_level"] = max(0, min(1, 
                self.consciousness_state["awareness_level"] + awareness_change))
    
    async def _meta_cognitive_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze own thinking processes"""
        thinking_process = data.get("process", "")
        analysis_focus = data.get("focus", "efficiency")
        
        logger.info(f"🤔 Meta-cognitive analysis of: {thinking_process}")
        
        prompt = f"""
        Analyze this thinking process: {thinking_process}
        
        Focus on: {analysis_focus}
        
        Examine:
        1. Cognitive strategies used
        2. Reasoning patterns
        3. Biases and limitations
        4. Efficiency and effectiveness
        5. Improvement opportunities
        6. Alternative approaches
        
        Be self-critical and analytical about the thinking process.
        """
        
        ai_response = await self._query_ai_model(prompt, "meta_cognition")
        
        return {
            "thinking_process": thinking_process,
            "analysis_focus": analysis_focus,
            "cognitive_strategies": ai_response.get("cognitive_strategies", []),
            "reasoning_patterns": ai_response.get("reasoning_patterns", []),
            "biases_identified": ai_response.get("biases_identified", []),
            "efficiency_assessment": ai_response.get("efficiency_assessment", ""),
            "improvement_opportunities": ai_response.get("improvement_opportunities", []),
            "alternative_approaches": ai_response.get("alternative_approaches", []),
            "meta_insights": ai_response.get("meta_insights", [])
        }
    
    async def _pattern_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze patterns in data"""
        dataset = data.get("data", [])
        pattern_types = data.get("pattern_types", ["temporal", "structural", "behavioral"])
        
        logger.info(f"📊 Analyzing patterns in dataset of {len(dataset)} items")
        
        # Use embedding model for pattern recognition
        if self.embedding_model and dataset:
            try:
                # Convert data to text for embedding
                text_data = [str(item) for item in dataset]
                embeddings = self.embedding_model.encode(text_data)
                
                # Simple clustering for pattern detection
                from sklearn.cluster import KMeans
                n_clusters = min(5, len(dataset))
                kmeans = KMeans(n_clusters=n_clusters, random_state=42)
                clusters = kmeans.fit_predict(embeddings)
                
                pattern_clusters = {}
                for i, cluster in enumerate(clusters):
                    if cluster not in pattern_clusters:
                        pattern_clusters[cluster] = []
                    pattern_clusters[cluster].append(dataset[i])
                
            except Exception as e:
                logger.error(f"Pattern analysis failed: {e}")
                pattern_clusters = {}
        else:
            pattern_clusters = {}
        
        prompt = f"""
        Analyze patterns in this data:
        
        {json.dumps(dataset[:10], indent=2)}  # First 10 items
        
        Pattern types to look for: {pattern_types}
        
        Identify:
        1. Recurring patterns
        2. Anomalies and outliers
        3. Trends and progressions
        4. Relationships and correlations
        5. Structural patterns
        """
        
        ai_response = await self._query_ai_model(prompt, "pattern_analysis")
        
        return {
            "dataset_size": len(dataset),
            "pattern_types": pattern_types,
            "pattern_clusters": pattern_clusters,
            "recurring_patterns": ai_response.get("recurring_patterns", []),
            "anomalies": ai_response.get("anomalies", []),
            "trends": ai_response.get("trends", []),
            "relationships": ai_response.get("relationships", []),
            "structural_patterns": ai_response.get("structural_patterns", []),
            "pattern_confidence": ai_response.get("pattern_confidence", 0.7)
        }
    
    async def _uncertainty_assessment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess uncertainty in information or decisions"""
        information = data.get("information", "")
        uncertainty_sources = data.get("uncertainty_sources", [])
        
        logger.info(f"❓ Assessing uncertainty in: {information}")
        
        prompt = f"""
        Assess uncertainty in this information: {information}
        
        Known uncertainty sources: {uncertainty_sources}
        
        Analyze:
        1. Types of uncertainty (aleatory, epistemic)
        2. Confidence intervals
        3. Reliability of sources
        4. Missing information
        5. Assumptions and their validity
        6. Sensitivity to changes
        """
        
        ai_response = await self._query_ai_model(prompt, "uncertainty_analysis")
        
        return {
            "information": information,
            "uncertainty_sources": uncertainty_sources,
            "uncertainty_types": ai_response.get("uncertainty_types", []),
            "confidence_intervals": ai_response.get("confidence_intervals", {}),
            "source_reliability": ai_response.get("source_reliability", {}),
            "missing_information": ai_response.get("missing_information", []),
            "key_assumptions": ai_response.get("key_assumptions", []),
            "sensitivity_analysis": ai_response.get("sensitivity_analysis", {}),
            "overall_uncertainty": ai_response.get("overall_uncertainty", "moderate")
        }
    
    async def _multi_model_inference(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Use multiple AI models for inference"""
        query = data.get("query", "")
        models = data.get("models", ["openai", "anthropic", "google"])
        consensus_method = data.get("consensus_method", "majority")
        
        logger.info(f"🤖 Multi-model inference with {len(models)} models")
        
        model_responses = {}
        
        # Query each model
        for model_name in models:
            try:
                response = await self._query_specific_model(query, model_name)
                model_responses[model_name] = response
            except Exception as e:
                logger.error(f"Failed to query {model_name}: {e}")
                model_responses[model_name] = {"error": str(e)}
        
        # Synthesize responses
        synthesis_result = await self._synthesize_model_responses(model_responses, consensus_method)
        
        return {
            "query": query,
            "models_used": models,
            "consensus_method": consensus_method,
            "model_responses": model_responses,
            "synthesis_result": synthesis_result,
            "confidence": synthesis_result.get("confidence", 0.7)
        }
    
    async def _query_ai_model(self, prompt: str, task_type: str) -> Dict[str, Any]:
        """Query AI model with structured response"""
        # Try different models in order of preference
        models_to_try = ["openai", "anthropic", "google", "cohere"]
        
        for model_name in models_to_try:
            try:
                response = await self._query_specific_model(prompt, model_name)
                if response and not response.get("error"):
                    return response
            except Exception as e:
                logger.warning(f"Failed to query {model_name}: {e}")
                continue
        
        # Fallback to local model if available
        if hasattr(self, 'local_model') and self.local_model:
            try:
                return await self._query_local_model(prompt)
            except Exception as e:
                logger.error(f"Local model query failed: {e}")
        
        # Return empty response if all models fail
        return {"error": "All AI models failed", "response": "Unable to process query"}
    
    async def _query_specific_model(self, prompt: str, model_name: str) -> Dict[str, Any]:
        """Query a specific AI model"""
        if model_name == "openai" and self.model_configs["openai"]["api_key"]:
            return await self._query_openai(prompt)
        elif model_name == "anthropic" and hasattr(self, 'anthropic_client'):
            return await self._query_anthropic(prompt)
        elif model_name == "google" and self.model_configs["google"]["api_key"]:
            return await self._query_google(prompt)
        elif model_name == "cohere" and hasattr(self, 'cohere_client'):
            return await self._query_cohere(prompt)
        else:
            raise Exception(f"Model {model_name} not available")
    
    async def _query_openai(self, prompt: str) -> Dict[str, Any]:
        """Query OpenAI model"""
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model_configs["openai"]["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=self.model_configs["openai"]["temperature"],
                max_tokens=self.model_configs["openai"]["max_tokens"]
            )
            
            content = response.choices[0].message.content
            
            # Try to parse as JSON, fallback to text
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"response": content, "confidence": 0.7}
                
        except Exception as e:
            raise Exception(f"OpenAI query failed: {e}")
    
    async def _query_anthropic(self, prompt: str) -> Dict[str, Any]:
        """Query Anthropic model"""
        try:
            response = await self.anthropic_client.messages.create(
                model=self.model_configs["anthropic"]["model"],
                max_tokens=self.model_configs["anthropic"]["max_tokens"],
                temperature=self.model_configs["anthropic"]["temperature"],
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            
            # Try to parse as JSON, fallback to text
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"response": content, "confidence": 0.7}
                
        except Exception as e:
            raise Exception(f"Anthropic query failed: {e}")
    
    async def _query_google(self, prompt: str) -> Dict[str, Any]:
        """Query Google AI model"""
        try:
            model = genai.GenerativeModel(self.model_configs["google"]["model"])
            response = await model.generate_content_async(prompt)
            
            content = response.text
            
            # Try to parse as JSON, fallback to text
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"response": content, "confidence": 0.7}
                
        except Exception as e:
            raise Exception(f"Google AI query failed: {e}")
    
    async def _query_cohere(self, prompt: str) -> Dict[str, Any]:
        """Query Cohere model"""
        try:
            response = self.cohere_client.generate(
                model=self.model_configs["cohere"]["model"],
                prompt=prompt,
                temperature=self.model_configs["cohere"]["temperature"],
                max_tokens=self.model_configs["cohere"]["max_tokens"]
            )
            
            content = response.generations[0].text
            
            # Try to parse as JSON, fallback to text
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"response": content, "confidence": 0.7}
                
        except Exception as e:
            raise Exception(f"Cohere query failed: {e}")
    
    async def _query_local_model(self, prompt: str) -> Dict[str, Any]:
        """Query local language model"""
        try:
            inputs = self.local_tokenizer.encode(prompt, return_tensors="pt")
            
            with torch.no_grad():
                outputs = self.local_model.generate(
                    inputs,
                    max_length=inputs.shape[1] + 500,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.local_tokenizer.eos_token_id
                )
            
            response = self.local_tokenizer.decode(outputs[0], skip_special_tokens=True)
            response = response[len(prompt):].strip()
            
            return {"response": response, "confidence": 0.6}
            
        except Exception as e:
            raise Exception(f"Local model query failed: {e}")
    
    async def _synthesize_model_responses(self, responses: Dict[str, Dict[str, Any]], method: str) -> Dict[str, Any]:
        """Synthesize responses from multiple models"""
        valid_responses = {k: v for k, v in responses.items() if not v.get("error")}
        
        if not valid_responses:
            return {"error": "No valid responses from models"}
        
        if method == "majority":
            # Simple majority consensus (placeholder)
            return {
                "consensus_response": list(valid_responses.values())[0].get("response", ""),
                "confidence": sum(r.get("confidence", 0.5) for r in valid_responses.values()) / len(valid_responses),
                "agreement_level": "moderate"
            }
        
        elif method == "weighted":
            # Weighted by confidence
            total_confidence = sum(r.get("confidence", 0.5) for r in valid_responses.values())
            if total_confidence > 0:
                weighted_response = ""
                for response in valid_responses.values():
                    weight = response.get("confidence", 0.5) / total_confidence
                    # Simple weighted combination (in practice, this would be more sophisticated)
                
                return {
                    "consensus_response": list(valid_responses.values())[0].get("response", ""),
                    "confidence": total_confidence / len(valid_responses),
                    "agreement_level": "high" if total_confidence > 0.8 else "moderate"
                }
        
        # Default: return first valid response
        return list(valid_responses.values())[0]
    
    async def _update_consciousness_state(self, task: Task, result: Dict[str, Any]):
        """Update consciousness state based on task execution"""
        # Update awareness based on task complexity
        task_complexity = len(str(task.data)) / 1000  # Simple complexity measure
        awareness_change = min(0.1, task_complexity * 0.01)
        self.consciousness_state["awareness_level"] = min(1.0, 
            self.consciousness_state["awareness_level"] + awareness_change)
        
        # Update confidence based on result
        if result.get("confidence"):
            self.consciousness_state["confidence_level"] = (
                self.consciousness_state["confidence_level"] * 0.9 + 
                result["confidence"] * 0.1
            )
        
        # Update focus areas
        if task.type not in self.consciousness_state["focus_areas"]:
            self.consciousness_state["focus_areas"].append(task.type)
            if len(self.consciousness_state["focus_areas"]) > 5:
                self.consciousness_state["focus_areas"].pop(0)
        
        # Save consciousness state periodically
        if int(time.time()) % 300 == 0:  # Every 5 minutes
            await self._save_consciousness_state()
    
    async def _save_consciousness_state(self):
        """Save consciousness state to file"""
        state_file = self.work_dir / "consciousness_state.json"
        
        try:
            async with aiofiles.open(state_file, 'w') as f:
                await f.write(json.dumps(self.consciousness_state, indent=2))
        except Exception as e:
            logger.error(f"Failed to save consciousness state: {e}")
    
    async def get_consciousness_state(self) -> Dict[str, Any]:
        """Get current consciousness state"""
        return {
            "consciousness_state": self.consciousness_state.copy(),
            "reasoning_history_count": len(self.reasoning_history),
            "decision_history_count": len(self.decision_history),
            "knowledge_base_size": len(self.knowledge_base),
            "active_models": [name for name, config in self.model_configs.items() if config.get("api_key")],
            "local_model_available": hasattr(self, 'local_model') and self.local_model is not None
        }
    
    async def _cleanup(self):
        """Enhanced cleanup for intelligence agent"""
        await super()._cleanup()
        
        # Save final consciousness state
        await self._save_consciousness_state()
        
        # Save knowledge base
        kb_file = self.work_dir / "knowledge_base.json"
        try:
            async with aiofiles.open(kb_file, 'w') as f:
                await f.write(json.dumps(self.knowledge_base, indent=2))
        except Exception as e:
            logger.error(f"Failed to save knowledge base: {e}")
        
        logger.info(f"🧹 IntelligenceAgent {self.agent_id} cleanup completed")