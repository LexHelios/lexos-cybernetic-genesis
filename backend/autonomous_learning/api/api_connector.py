
"""
Dynamic API integration framework for autonomous data collection.
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from urllib.parse import urljoin, urlparse
import structlog
import openai

from ..config import config, load_yaml_config
from ..utils import (
    RateLimiter, ContentHasher, RetryHandler, DataValidator, performance_monitor
)
from ..memory.memory_connector import MemoryConnector

logger = structlog.get_logger(__name__)

class APIConnector:
    """Dynamic API discovery and data extraction system."""
    
    def __init__(self):
        self.session = None
        self.rate_limiter = RateLimiter(max_tokens=config.api_rate_limit, refill_rate=2.0)
        self.content_hasher = ContentHasher()
        self.retry_handler = RetryHandler()
        self.data_validator = DataValidator()
        
        # Load API configuration
        self.api_config = load_yaml_config("apis.yaml")
        
        # API state
        self.registered_apis = {}
        self.api_keys = {}
        self.memory_connector = None
        
        # Initialize OpenAI client
        if config.openai_api_key:
            openai.api_key = config.openai_api_key
        
        # Default free APIs for knowledge gathering
        self.default_apis = [
            {
                'name': 'Wikipedia',
                'base_url': 'https://en.wikipedia.org/api/rest_v1/',
                'endpoints': {
                    'search': 'page/summary/{title}',
                    'random': 'page/random/summary'
                },
                'rate_limit': 100,
                'requires_auth': False
            },
            {
                'name': 'OpenLibrary',
                'base_url': 'https://openlibrary.org/',
                'endpoints': {
                    'search': 'search.json?q={query}',
                    'book': 'books/{id}.json'
                },
                'rate_limit': 100,
                'requires_auth': False
            },
            {
                'name': 'ArXiv',
                'base_url': 'http://export.arxiv.org/api/',
                'endpoints': {
                    'search': 'query?search_query={query}&start=0&max_results=10'
                },
                'rate_limit': 30,
                'requires_auth': False
            },
            {
                'name': 'NewsAPI',
                'base_url': 'https://newsapi.org/v2/',
                'endpoints': {
                    'everything': 'everything?q={query}&sortBy=publishedAt',
                    'top_headlines': 'top-headlines?category=technology'
                },
                'rate_limit': 100,
                'requires_auth': True,
                'auth_type': 'api_key'
            },
            {
                'name': 'GitHub',
                'base_url': 'https://api.github.com/',
                'endpoints': {
                    'search_repos': 'search/repositories?q={query}',
                    'trending': 'search/repositories?q=created:>2024-01-01&sort=stars'
                },
                'rate_limit': 60,
                'requires_auth': False
            }
        ]
    
    async def initialize(self):
        """Initialize API connector."""
        try:
            # Create aiohttp session
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
            
            # Initialize memory connector
            self.memory_connector = MemoryConnector()
            await self.memory_connector.initialize()
            
            # Register default APIs
            await self._register_default_apis()
            
            # Load API keys
            await self._load_api_keys()
            
            logger.info("API connector initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize API connector: {e}")
            raise
    
    async def _register_default_apis(self):
        """Register default APIs for data collection."""
        apis_config = self.api_config.get("apis", self.default_apis)
        
        for api_config in apis_config:
            await self.register_api(api_config)
        
        logger.info(f"Registered {len(self.registered_apis)} APIs")
    
    async def _load_api_keys(self):
        """Load API keys from configuration."""
        keys_config = self.api_config.get("api_keys", {})
        
        # Add keys from environment variables
        keys_config.update({
            'openai': config.openai_api_key,
            'newsapi': os.getenv('NEWSAPI_KEY', ''),
            'github': os.getenv('GITHUB_TOKEN', '')
        })
        
        self.api_keys = {k: v for k, v in keys_config.items() if v}
        logger.info(f"Loaded {len(self.api_keys)} API keys")
    
    async def register_api(self, api_config: Dict[str, Any]):
        """Register a new API for data collection."""
        try:
            name = api_config['name']
            self.registered_apis[name] = {
                'base_url': api_config['base_url'],
                'endpoints': api_config['endpoints'],
                'rate_limit': api_config.get('rate_limit', 60),
                'requires_auth': api_config.get('requires_auth', False),
                'auth_type': api_config.get('auth_type', 'api_key'),
                'last_called': {},
                'call_count': 0,
                'error_count': 0
            }
            
            logger.info(f"Registered API: {name}")
            
        except Exception as e:
            logger.error(f"Error registering API: {e}")
    
    async def _get_auth_headers(self, api_name: str) -> Dict[str, str]:
        """Get authentication headers for API."""
        headers = {}
        
        try:
            api_info = self.registered_apis.get(api_name, {})
            
            if not api_info.get('requires_auth'):
                return headers
            
            auth_type = api_info.get('auth_type', 'api_key')
            
            if auth_type == 'api_key':
                if api_name.lower() in self.api_keys:
                    if api_name.lower() == 'newsapi':
                        headers['X-API-Key'] = self.api_keys[api_name.lower()]
                    elif api_name.lower() == 'github':
                        headers['Authorization'] = f"token {self.api_keys[api_name.lower()]}"
                    else:
                        headers['Authorization'] = f"Bearer {self.api_keys[api_name.lower()]}"
            
            return headers
            
        except Exception as e:
            logger.error(f"Error getting auth headers for {api_name}: {e}")
            return {}
    
    async def _make_api_request(
        self,
        api_name: str,
        endpoint: str,
        params: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """Make authenticated API request with rate limiting."""
        try:
            api_info = self.registered_apis.get(api_name)
            if not api_info:
                logger.error(f"API not registered: {api_name}")
                return None
            
            # Rate limiting
            await self.rate_limiter.wait_for_tokens()
            
            # Build URL
            base_url = api_info['base_url']
            url = urljoin(base_url, endpoint)
            
            # Get auth headers
            headers = await self._get_auth_headers(api_name)
            headers['User-Agent'] = 'AutonomousLearner/1.0 (API Connector; contact@learningsystem.ai)'
            
            # Make request
            async with self.session.get(url, headers=headers, params=params) as response:
                api_info['call_count'] += 1
                api_info['last_called'][endpoint] = datetime.now()
                
                if response.status == 200:
                    data = await response.json()
                    return data
                
                elif response.status == 429:
                    # Rate limited
                    retry_after = response.headers.get('Retry-After', '60')
                    wait_time = int(retry_after)
                    logger.warning(f"Rate limited on {api_name}, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                    return None
                
                else:
                    logger.warning(f"HTTP {response.status} from {api_name}: {url}")
                    api_info['error_count'] += 1
                    return None
                    
        except Exception as e:
            logger.error(f"Error making API request to {api_name}: {e}")
            if api_name in self.registered_apis:
                self.registered_apis[api_name]['error_count'] += 1
            return None
    
    async def _search_wikipedia(self, query: str) -> List[Dict[str, Any]]:
        """Search Wikipedia for relevant articles."""
        try:
            # Search for articles
            search_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{query.replace(' ', '_')}"
            
            headers = {'User-Agent': 'AutonomousLearner/1.0'}
            async with self.session.get(search_url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if data.get('extract'):
                        return [{
                            'title': data.get('title', ''),
                            'content': data.get('extract', ''),
                            'url': data.get('content_urls', {}).get('desktop', {}).get('page', ''),
                            'source': 'wikipedia'
                        }]
            
            return []
            
        except Exception as e:
            logger.error(f"Error searching Wikipedia: {e}")
            return []
    
    async def _search_arxiv(self, query: str) -> List[Dict[str, Any]]:
        """Search ArXiv for research papers."""
        try:
            search_query = f"all:{query}"
            endpoint = f"query?search_query={search_query}&start=0&max_results=5"
            
            data = await self._make_api_request('ArXiv', endpoint)
            
            if data:
                # Parse XML response (ArXiv returns XML)
                import xml.etree.ElementTree as ET
                
                # Note: This is simplified - in practice, you'd need to handle XML properly
                results = []
                # For now, return empty list as XML parsing would need more setup
                return results
            
            return []
            
        except Exception as e:
            logger.error(f"Error searching ArXiv: {e}")
            return []
    
    async def _search_github(self, query: str) -> List[Dict[str, Any]]:
        """Search GitHub for relevant repositories."""
        try:
            endpoint = f"search/repositories?q={query}+language:python&sort=stars&order=desc"
            data = await self._make_api_request('GitHub', endpoint)
            
            if data and 'items' in data:
                results = []
                for item in data['items'][:5]:  # Limit to top 5 results
                    results.append({
                        'title': item.get('name', ''),
                        'content': item.get('description', ''),
                        'url': item.get('html_url', ''),
                        'stars': item.get('stargazers_count', 0),
                        'language': item.get('language', ''),
                        'source': 'github'
                    })
                return results
            
            return []
            
        except Exception as e:
            logger.error(f"Error searching GitHub: {e}")
            return []
    
    async def _search_openlibrary(self, query: str) -> List[Dict[str, Any]]:
        """Search OpenLibrary for books."""
        try:
            endpoint = f"search.json?q={query}&limit=5"
            data = await self._make_api_request('OpenLibrary', endpoint)
            
            if data and 'docs' in data:
                results = []
                for doc in data['docs']:
                    results.append({
                        'title': doc.get('title', ''),
                        'content': f"Author: {', '.join(doc.get('author_name', []))}. "
                                 f"Published: {doc.get('first_publish_year', 'Unknown')}. "
                                 f"Subjects: {', '.join(doc.get('subject', [])[:5])}",
                        'url': f"https://openlibrary.org{doc.get('key', '')}",
                        'source': 'openlibrary'
                    })
                return results
            
            return []
            
        except Exception as e:
            logger.error(f"Error searching OpenLibrary: {e}")
            return []
    
    async def _analyze_content_with_ai(self, content: str, source: str) -> Dict[str, Any]:
        """Analyze content using OpenAI for insights and relevance."""
        try:
            if not config.openai_api_key:
                return {'relevance_score': 0.5, 'summary': content[:200], 'keywords': []}
            
            prompt = f"""
            Analyze the following content from {source} and provide:
            1. A relevance score (0-1) for AI/ML learning
            2. A brief summary (max 100 words)
            3. Key topics/keywords (max 5)
            
            Content: {content[:1000]}
            
            Respond in JSON format:
            {{
                "relevance_score": 0.0,
                "summary": "...",
                "keywords": ["..."]
            }}
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing content with AI: {e}")
            return {
                'relevance_score': 0.5,
                'summary': content[:200],
                'keywords': []
            }
    
    async def collect_data(self):
        """Collect data from all registered APIs."""
        try:
            # AI/ML related search queries
            search_queries = [
                "artificial intelligence",
                "machine learning",
                "deep learning",
                "neural networks",
                "natural language processing",
                "computer vision",
                "reinforcement learning",
                "transformers",
                "large language models",
                "autonomous systems"
            ]
            
            # Rotate through queries
            current_time = datetime.now()
            query_index = current_time.hour % len(search_queries)
            current_query = search_queries[query_index]
            
            logger.info(f"Collecting data for query: {current_query}")
            
            # Collect from different sources
            all_results = []
            
            # Wikipedia
            wikipedia_results = await self._search_wikipedia(current_query)
            all_results.extend(wikipedia_results)
            
            # GitHub
            github_results = await self._search_github(current_query)
            all_results.extend(github_results)
            
            # OpenLibrary
            openlibrary_results = await self._search_openlibrary(current_query)
            all_results.extend(openlibrary_results)
            
            # Process and store results
            stored_count = 0
            for result in all_results:
                if result.get('content') and len(result['content']) > 50:
                    # Analyze content
                    analysis = await self._analyze_content_with_ai(
                        result['content'], 
                        result['source']
                    )
                    
                    # Store if relevant
                    if analysis['relevance_score'] >= 0.4:
                        content_hash = await self.memory_connector.store_knowledge(
                            content=result['content'],
                            source_type=f"api_{result['source']}",
                            source_url=result.get('url', ''),
                            title=result.get('title', ''),
                            summary=analysis['summary'],
                            keywords=analysis['keywords'],
                            relevance_score=analysis['relevance_score']
                        )
                        
                        if content_hash:
                            stored_count += 1
            
            logger.info(f"API data collection completed. Stored {stored_count} items")
            performance_monitor.record_metric('api_data_collected', stored_count)
            
        except Exception as e:
            logger.error(f"API data collection failed: {e}")
    
    async def discover_new_apis(self, domain: str) -> List[Dict[str, Any]]:
        """Discover new APIs in a given domain."""
        try:
            # Use web search to find APIs
            search_queries = [
                f"{domain} API documentation",
                f"{domain} REST API",
                f"{domain} developer API"
            ]
            
            discovered_apis = []
            
            # This would integrate with web crawler to find API documentation
            # For now, return empty list
            
            return discovered_apis
            
        except Exception as e:
            logger.error(f"Error discovering APIs for {domain}: {e}")
            return []
    
    async def get_api_stats(self) -> Dict[str, Any]:
        """Get API usage statistics."""
        try:
            stats = {
                'total_apis': len(self.registered_apis),
                'total_calls': sum(api['call_count'] for api in self.registered_apis.values()),
                'total_errors': sum(api['error_count'] for api in self.registered_apis.values()),
                'apis': {}
            }
            
            for name, info in self.registered_apis.items():
                stats['apis'][name] = {
                    'call_count': info['call_count'],
                    'error_count': info['error_count'],
                    'last_called': max(info['last_called'].values()).isoformat() if info['last_called'] else None,
                    'error_rate': info['error_count'] / max(info['call_count'], 1)
                }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting API stats: {e}")
            return {}
    
    async def health_check(self) -> bool:
        """Check API connector health."""
        try:
            return (
                self.session is not None and
                not self.session.closed and
                self.memory_connector is not None and
                len(self.registered_apis) > 0
            )
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup API connector resources."""
        try:
            if self.session and not self.session.closed:
                await self.session.close()
            
            if self.memory_connector:
                await self.memory_connector.cleanup()
                
            logger.info("API connector cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during API connector cleanup: {e}")
