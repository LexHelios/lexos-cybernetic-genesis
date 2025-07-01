
"""
Self-learning engine for autonomous curriculum development and skill acquisition.
"""

import asyncio
import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import structlog
import openai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..config import config, load_yaml_config
from ..utils import (
    ContentHasher, RetryHandler, performance_monitor
)
from ..memory.memory_connector import MemoryConnector

logger = structlog.get_logger(__name__)

class LearningEngine:
    """Autonomous curriculum development and skill acquisition system."""
    
    def __init__(self):
        self.content_hasher = ContentHasher()
        self.retry_handler = RetryHandler()
        
        # Load learning configuration
        self.learning_config = load_yaml_config("learning.yaml")
        
        # Learning state
        self.memory_connector = None
        self.knowledge_graph = {}
        self.learning_goals = []
        self.skill_assessments = {}
        self.curriculum_plan = {}
        
        # Learning parameters
        self.curiosity_threshold = config.curiosity_factor
        self.retention_threshold = config.knowledge_retention_threshold
        self.skill_development_rate = config.skill_development_rate
        
        # Initialize OpenAI client
        if config.openai_api_key:
            openai.api_key = config.openai_api_key
        
        # Default learning domains
        self.learning_domains = [
            {
                'name': 'Machine Learning',
                'priority': 1.0,
                'subtopics': [
                    'supervised learning', 'unsupervised learning', 'reinforcement learning',
                    'deep learning', 'neural networks', 'transformers', 'computer vision',
                    'natural language processing', 'generative models'
                ]
            },
            {
                'name': 'Artificial Intelligence',
                'priority': 0.9,
                'subtopics': [
                    'ai ethics', 'ai safety', 'autonomous systems', 'robotics',
                    'knowledge representation', 'reasoning', 'planning', 'search algorithms'
                ]
            },
            {
                'name': 'Programming',
                'priority': 0.8,
                'subtopics': [
                    'python', 'algorithms', 'data structures', 'software engineering',
                    'distributed systems', 'databases', 'web development', 'apis'
                ]
            },
            {
                'name': 'Mathematics',
                'priority': 0.7,
                'subtopics': [
                    'linear algebra', 'calculus', 'statistics', 'probability',
                    'optimization', 'information theory', 'graph theory'
                ]
            },
            {
                'name': 'Research Methods',
                'priority': 0.6,
                'subtopics': [
                    'scientific method', 'experimental design', 'data analysis',
                    'academic writing', 'peer review', 'literature review'
                ]
            }
        ]
    
    async def initialize(self):
        """Initialize learning engine."""
        try:
            # Initialize memory connector
            self.memory_connector = MemoryConnector()
            await self.memory_connector.initialize()
            
            # Load existing learning state
            await self._load_learning_state()
            
            # Initialize learning goals
            await self._initialize_learning_goals()
            
            # Build knowledge graph
            await self._build_knowledge_graph()
            
            logger.info("Learning engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize learning engine: {e}")
            raise
    
    async def _load_learning_state(self):
        """Load existing learning progress and assessments."""
        try:
            # Load learning progress from memory
            progress_data = await self.memory_connector.get_learning_progress()
            
            for progress in progress_data:
                topic = progress['topic']
                self.skill_assessments[topic] = {
                    'skill_level': progress['skill_level'],
                    'confidence': progress['confidence'],
                    'last_practiced': progress['last_practiced'],
                    'practice_count': progress['practice_count']
                }
            
            logger.info(f"Loaded learning state for {len(self.skill_assessments)} topics")
            
        except Exception as e:
            logger.error(f"Error loading learning state: {e}")
    
    async def _initialize_learning_goals(self):
        """Initialize learning goals based on current knowledge gaps."""
        try:
            # Analyze current knowledge to identify gaps
            knowledge_gaps = await self._identify_knowledge_gaps()
            
            # Create learning goals for each gap
            for gap in knowledge_gaps:
                goal = {
                    'topic': gap['topic'],
                    'target_skill_level': gap['target_level'],
                    'current_skill_level': gap['current_level'],
                    'priority': gap['priority'],
                    'deadline': datetime.now() + timedelta(days=30),
                    'created_at': datetime.now(),
                    'status': 'active'
                }
                self.learning_goals.append(goal)
            
            logger.info(f"Initialized {len(self.learning_goals)} learning goals")
            
        except Exception as e:
            logger.error(f"Error initializing learning goals: {e}")
    
    async def _identify_knowledge_gaps(self) -> List[Dict[str, Any]]:
        """Identify knowledge gaps based on current understanding."""
        try:
            gaps = []
            
            for domain in self.learning_domains:
                domain_name = domain['name']
                domain_priority = domain['priority']
                
                # Check current skill level for domain
                current_level = self.skill_assessments.get(domain_name, {}).get('skill_level', 0.0)
                target_level = 0.8  # Target 80% proficiency
                
                if current_level < target_level:
                    gaps.append({
                        'topic': domain_name,
                        'current_level': current_level,
                        'target_level': target_level,
                        'priority': domain_priority * (target_level - current_level)
                    })
                
                # Check subtopics
                for subtopic in domain['subtopics']:
                    current_level = self.skill_assessments.get(subtopic, {}).get('skill_level', 0.0)
                    target_level = 0.7  # Target 70% proficiency for subtopics
                    
                    if current_level < target_level:
                        gaps.append({
                            'topic': subtopic,
                            'current_level': current_level,
                            'target_level': target_level,
                            'priority': domain_priority * 0.8 * (target_level - current_level)
                        })
            
            # Sort by priority
            gaps.sort(key=lambda x: x['priority'], reverse=True)
            
            return gaps[:20]  # Limit to top 20 gaps
            
        except Exception as e:
            logger.error(f"Error identifying knowledge gaps: {e}")
            return []
    
    async def _build_knowledge_graph(self):
        """Build knowledge graph from stored information."""
        try:
            # Retrieve all knowledge entries
            knowledge_entries = await self.memory_connector.retrieve_knowledge(
                limit=1000,
                min_relevance=0.3
            )
            
            # Build graph structure
            for entry in knowledge_entries:
                content_hash = entry['content_hash']
                keywords = entry.get('keywords', [])
                
                self.knowledge_graph[content_hash] = {
                    'title': entry.get('title', ''),
                    'keywords': keywords,
                    'relevance_score': entry.get('relevance_score', 0.5),
                    'source_type': entry.get('source_type', ''),
                    'connections': []
                }
            
            # Create connections based on keyword similarity
            await self._create_knowledge_connections()
            
            logger.info(f"Built knowledge graph with {len(self.knowledge_graph)} nodes")
            
        except Exception as e:
            logger.error(f"Error building knowledge graph: {e}")
    
    async def _create_knowledge_connections(self):
        """Create connections between knowledge entries based on similarity."""
        try:
            # Extract text content for similarity analysis
            content_texts = []
            content_hashes = []
            
            for content_hash, node in self.knowledge_graph.items():
                text = f"{node['title']} {' '.join(node['keywords'])}"
                content_texts.append(text)
                content_hashes.append(content_hash)
            
            if len(content_texts) < 2:
                return
            
            # Calculate TF-IDF similarity
            vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(content_texts)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # Create connections for similar content
            for i, hash_i in enumerate(content_hashes):
                for j, hash_j in enumerate(content_hashes):
                    if i != j and similarity_matrix[i][j] > 0.3:
                        self.knowledge_graph[hash_i]['connections'].append({
                            'target': hash_j,
                            'similarity': float(similarity_matrix[i][j]),
                            'type': 'semantic_similarity'
                        })
            
            logger.info("Created knowledge connections based on similarity")
            
        except Exception as e:
            logger.error(f"Error creating knowledge connections: {e}")
    
    async def _assess_current_knowledge(self, topic: str) -> Dict[str, float]:
        """Assess current knowledge level for a topic."""
        try:
            # Retrieve relevant knowledge
            relevant_knowledge = await self.memory_connector.retrieve_knowledge(
                query=topic,
                limit=50,
                min_relevance=0.4
            )
            
            if not relevant_knowledge:
                return {'skill_level': 0.0, 'confidence': 0.0}
            
            # Analyze knowledge depth and breadth
            total_relevance = sum(entry['relevance_score'] for entry in relevant_knowledge)
            avg_relevance = total_relevance / len(relevant_knowledge)
            
            # Calculate skill level based on amount and quality of knowledge
            knowledge_count = len(relevant_knowledge)
            skill_level = min((knowledge_count / 20) * avg_relevance, 1.0)
            
            # Calculate confidence based on knowledge consistency
            relevance_scores = [entry['relevance_score'] for entry in relevant_knowledge]
            confidence = 1.0 - np.std(relevance_scores) if len(relevance_scores) > 1 else avg_relevance
            
            return {
                'skill_level': float(skill_level),
                'confidence': float(confidence)
            }
            
        except Exception as e:
            logger.error(f"Error assessing knowledge for {topic}: {e}")
            return {'skill_level': 0.0, 'confidence': 0.0}
    
    async def _generate_learning_plan(self, topic: str, target_level: float) -> Dict[str, Any]:
        """Generate a learning plan for a specific topic."""
        try:
            if not config.openai_api_key:
                return self._generate_basic_learning_plan(topic, target_level)
            
            # Get current knowledge assessment
            current_assessment = await self._assess_current_knowledge(topic)
            current_level = current_assessment['skill_level']
            
            # Generate AI-powered learning plan
            prompt = f"""
            Create a detailed learning plan for the topic: {topic}
            
            Current skill level: {current_level:.2f}
            Target skill level: {target_level:.2f}
            
            Please provide:
            1. Learning objectives (3-5 specific goals)
            2. Recommended resources (books, papers, courses)
            3. Practice exercises or projects
            4. Assessment criteria
            5. Estimated timeline
            
            Format as JSON:
            {{
                "objectives": ["..."],
                "resources": ["..."],
                "exercises": ["..."],
                "assessment_criteria": ["..."],
                "estimated_weeks": 4
            }}
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7
            )
            
            plan = json.loads(response.choices[0].message.content)
            plan['topic'] = topic
            plan['current_level'] = current_level
            plan['target_level'] = target_level
            plan['created_at'] = datetime.now().isoformat()
            
            return plan
            
        except Exception as e:
            logger.error(f"Error generating learning plan for {topic}: {e}")
            return self._generate_basic_learning_plan(topic, target_level)
    
    def _generate_basic_learning_plan(self, topic: str, target_level: float) -> Dict[str, Any]:
        """Generate a basic learning plan without AI assistance."""
        return {
            'topic': topic,
            'target_level': target_level,
            'objectives': [
                f"Understand fundamental concepts of {topic}",
                f"Apply {topic} knowledge to practical problems",
                f"Analyze advanced {topic} techniques"
            ],
            'resources': [
                f"Search for {topic} tutorials and documentation",
                f"Find {topic} research papers and articles",
                f"Look for {topic} practical examples and case studies"
            ],
            'exercises': [
                f"Practice {topic} basic exercises",
                f"Implement {topic} projects",
                f"Solve {topic} challenges"
            ],
            'assessment_criteria': [
                "Can explain key concepts clearly",
                "Can apply knowledge to new problems",
                "Can identify strengths and weaknesses"
            ],
            'estimated_weeks': 4,
            'created_at': datetime.now().isoformat()
        }
    
    async def _update_skill_assessment(self, topic: str, new_knowledge_count: int):
        """Update skill assessment based on new knowledge acquired."""
        try:
            # Get current assessment
            current_assessment = await self._assess_current_knowledge(topic)
            
            # Calculate improvement based on new knowledge
            improvement_factor = min(new_knowledge_count * 0.1, 0.5)
            
            new_skill_level = min(
                current_assessment['skill_level'] + improvement_factor,
                1.0
            )
            
            new_confidence = min(
                current_assessment['confidence'] + (improvement_factor * 0.5),
                1.0
            )
            
            # Update in memory
            await self.memory_connector.update_learning_progress(
                topic=topic,
                skill_level=new_skill_level,
                confidence=new_confidence
            )
            
            # Update local cache
            self.skill_assessments[topic] = {
                'skill_level': new_skill_level,
                'confidence': new_confidence,
                'last_practiced': datetime.now(),
                'practice_count': self.skill_assessments.get(topic, {}).get('practice_count', 0) + 1
            }
            
            logger.info(f"Updated skill assessment for {topic}: {new_skill_level:.2f}")
            
        except Exception as e:
            logger.error(f"Error updating skill assessment for {topic}: {e}")
    
    async def _identify_learning_opportunities(self) -> List[Dict[str, Any]]:
        """Identify new learning opportunities based on current knowledge."""
        try:
            opportunities = []
            
            # Analyze knowledge graph for unexplored connections
            for content_hash, node in self.knowledge_graph.items():
                for connection in node['connections']:
                    target_node = self.knowledge_graph.get(connection['target'])
                    if target_node and connection['similarity'] > 0.7:
                        # High similarity suggests related learning opportunity
                        opportunities.append({
                            'type': 'related_topic',
                            'source_topic': node['title'],
                            'target_topic': target_node['title'],
                            'similarity': connection['similarity'],
                            'priority': connection['similarity'] * node['relevance_score']
                        })
            
            # Identify trending topics from recent knowledge
            recent_knowledge = await self.memory_connector.retrieve_knowledge(
                limit=100,
                min_relevance=0.5
            )
            
            # Count keyword frequency in recent knowledge
            keyword_counts = {}
            for entry in recent_knowledge:
                for keyword in entry.get('keywords', []):
                    keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
            
            # Identify trending keywords
            trending_keywords = sorted(
                keyword_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            for keyword, count in trending_keywords:
                if keyword not in self.skill_assessments or self.skill_assessments[keyword]['skill_level'] < 0.5:
                    opportunities.append({
                        'type': 'trending_topic',
                        'topic': keyword,
                        'frequency': count,
                        'priority': count * 0.1
                    })
            
            # Sort by priority
            opportunities.sort(key=lambda x: x['priority'], reverse=True)
            
            return opportunities[:10]  # Top 10 opportunities
            
        except Exception as e:
            logger.error(f"Error identifying learning opportunities: {e}")
            return []
    
    async def process_knowledge(self):
        """Process new knowledge and update learning state."""
        try:
            # Analyze recent knowledge additions
            recent_knowledge = await self.memory_connector.retrieve_knowledge(
                limit=50,
                min_relevance=0.4
            )
            
            if not recent_knowledge:
                logger.info("No recent knowledge to process")
                return
            
            # Group knowledge by topics
            topic_knowledge = {}
            for entry in recent_knowledge:
                keywords = entry.get('keywords', [])
                for keyword in keywords:
                    if keyword not in topic_knowledge:
                        topic_knowledge[keyword] = []
                    topic_knowledge[keyword].append(entry)
            
            # Update skill assessments for topics with new knowledge
            for topic, knowledge_list in topic_knowledge.items():
                if len(knowledge_list) >= 2:  # Only update if significant new knowledge
                    await self._update_skill_assessment(topic, len(knowledge_list))
            
            # Identify new learning opportunities
            opportunities = await self._identify_learning_opportunities()
            
            # Create new learning goals for high-priority opportunities
            for opportunity in opportunities[:3]:  # Top 3 opportunities
                if opportunity['type'] == 'trending_topic':
                    topic = opportunity['topic']
                    
                    # Check if we already have a goal for this topic
                    existing_goal = any(goal['topic'] == topic for goal in self.learning_goals)
                    
                    if not existing_goal:
                        new_goal = {
                            'topic': topic,
                            'target_skill_level': 0.7,
                            'current_skill_level': self.skill_assessments.get(topic, {}).get('skill_level', 0.0),
                            'priority': opportunity['priority'],
                            'deadline': datetime.now() + timedelta(days=21),
                            'created_at': datetime.now(),
                            'status': 'active',
                            'source': 'trending_opportunity'
                        }
                        self.learning_goals.append(new_goal)
                        
                        logger.info(f"Created new learning goal for trending topic: {topic}")
            
            # Update curriculum plan
            await self._update_curriculum_plan()
            
            logger.info("Knowledge processing completed")
            performance_monitor.record_metric('knowledge_processing_success', 1)
            
        except Exception as e:
            logger.error(f"Knowledge processing failed: {e}")
            performance_monitor.record_metric('knowledge_processing_error', 1)
    
    async def _update_curriculum_plan(self):
        """Update the overall curriculum plan based on current goals."""
        try:
            # Sort goals by priority and deadline
            active_goals = [goal for goal in self.learning_goals if goal['status'] == 'active']
            active_goals.sort(key=lambda x: (x['priority'], x['deadline']), reverse=True)
            
            # Create weekly curriculum plan
            weekly_plan = {}
            current_week = datetime.now().isocalendar()[1]
            
            for i, goal in enumerate(active_goals[:5]):  # Focus on top 5 goals
                week_offset = i % 4  # Distribute over 4 weeks
                target_week = current_week + week_offset
                
                if target_week not in weekly_plan:
                    weekly_plan[target_week] = []
                
                # Generate learning plan for this goal
                learning_plan = await self._generate_learning_plan(
                    goal['topic'],
                    goal['target_skill_level']
                )
                
                weekly_plan[target_week].append({
                    'goal': goal,
                    'learning_plan': learning_plan
                })
            
            self.curriculum_plan = {
                'updated_at': datetime.now().isoformat(),
                'weekly_plan': weekly_plan,
                'active_goals_count': len(active_goals),
                'total_goals_count': len(self.learning_goals)
            }
            
            logger.info(f"Updated curriculum plan with {len(active_goals)} active goals")
            
        except Exception as e:
            logger.error(f"Error updating curriculum plan: {e}")
    
    async def get_learning_status(self) -> Dict[str, Any]:
        """Get current learning status and progress."""
        try:
            # Calculate overall progress
            total_skill_levels = [assessment['skill_level'] for assessment in self.skill_assessments.values()]
            avg_skill_level = np.mean(total_skill_levels) if total_skill_levels else 0.0
            
            # Count goals by status
            active_goals = len([goal for goal in self.learning_goals if goal['status'] == 'active'])
            completed_goals = len([goal for goal in self.learning_goals if goal['status'] == 'completed'])
            
            # Get top skills
            top_skills = sorted(
                self.skill_assessments.items(),
                key=lambda x: x[1]['skill_level'],
                reverse=True
            )[:5]
            
            return {
                'overall_skill_level': float(avg_skill_level),
                'total_topics': len(self.skill_assessments),
                'active_goals': active_goals,
                'completed_goals': completed_goals,
                'knowledge_graph_size': len(self.knowledge_graph),
                'top_skills': [
                    {
                        'topic': topic,
                        'skill_level': data['skill_level'],
                        'confidence': data['confidence']
                    }
                    for topic, data in top_skills
                ],
                'curriculum_plan': self.curriculum_plan,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting learning status: {e}")
            return {}
    
    async def health_check(self) -> bool:
        """Check learning engine health."""
        try:
            return (
                self.memory_connector is not None and
                len(self.learning_domains) > 0 and
                isinstance(self.knowledge_graph, dict)
            )
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup learning engine resources."""
        try:
            if self.memory_connector:
                await self.memory_connector.cleanup()
                
            logger.info("Learning engine cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during learning engine cleanup: {e}")
