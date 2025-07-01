
"""
Intelligent web crawler with robots.txt compliance and ethical crawling practices.
"""

import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse, robots
from urllib.robotparser import RobotFileParser
import structlog
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from ..config import config, load_yaml_config
from ..utils import (
    RateLimiter, ContentHasher, UserAgentRotator, RetryHandler,
    DataValidator, performance_monitor
)
from ..memory.memory_connector import MemoryConnector

logger = structlog.get_logger(__name__)

class WebCrawler:
    """Intelligent web crawler with ethical practices."""
    
    def __init__(self):
        self.session = None
        self.rate_limiter = RateLimiter(
            max_tokens=config.max_requests_per_minute,
            refill_rate=1.0
        )
        self.content_hasher = ContentHasher()
        self.ua_rotator = UserAgentRotator()
        self.retry_handler = RetryHandler()
        self.data_validator = DataValidator()
        
        # Load crawler configuration
        self.crawler_config = load_yaml_config("crawler.yaml")
        
        # Crawling state
        self.visited_urls = set()
        self.robots_cache = {}
        self.domain_delays = {}
        self.crawl_queue = asyncio.Queue()
        self.memory_connector = None
        
        # Default crawl targets
        self.default_targets = [
            "https://arxiv.org/list/cs.AI/recent",
            "https://news.ycombinator.com/",
            "https://www.reddit.com/r/MachineLearning/",
            "https://ai.googleblog.com/",
            "https://openai.com/blog/",
            "https://www.anthropic.com/news",
            "https://blog.research.google/",
            "https://ai.meta.com/blog/"
        ]
    
    async def initialize(self):
        """Initialize the web crawler."""
        try:
            # Create aiohttp session
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(
                timeout=timeout,
                headers={'User-Agent': self.ua_rotator.get_agent()}
            )
            
            # Initialize memory connector
            self.memory_connector = MemoryConnector()
            await self.memory_connector.initialize()
            
            # Load crawl targets
            await self._load_crawl_targets()
            
            logger.info("Web crawler initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize web crawler: {e}")
            raise
    
    async def _load_crawl_targets(self):
        """Load crawl targets from configuration."""
        targets = self.crawler_config.get("targets", self.default_targets)
        
        for target in targets:
            if self.data_validator.is_valid_url(target):
                await self.crawl_queue.put({
                    'url': target,
                    'depth': 0,
                    'priority': 1.0
                })
        
        logger.info(f"Loaded {len(targets)} crawl targets")
    
    async def _check_robots_txt(self, url: str) -> bool:
        """Check if URL is allowed by robots.txt."""
        try:
            domain = self.data_validator.extract_domain(url)
            
            if domain in self.robots_cache:
                rp = self.robots_cache[domain]
            else:
                robots_url = f"https://{domain}/robots.txt"
                rp = RobotFileParser()
                rp.set_url(robots_url)
                
                try:
                    rp.read()
                    self.robots_cache[domain] = rp
                except Exception:
                    # If robots.txt is not accessible, assume crawling is allowed
                    logger.warning(f"Could not fetch robots.txt for {domain}")
                    return True
            
            user_agent = self.ua_rotator.get_agent()
            return rp.can_fetch(user_agent, url)
            
        except Exception as e:
            logger.warning(f"Error checking robots.txt for {url}: {e}")
            return True  # Default to allowing if check fails
    
    async def _get_crawl_delay(self, url: str) -> float:
        """Get crawl delay for domain from robots.txt or use default."""
        try:
            domain = self.data_validator.extract_domain(url)
            
            if domain in self.domain_delays:
                return self.domain_delays[domain]
            
            if domain in self.robots_cache:
                rp = self.robots_cache[domain]
                user_agent = self.ua_rotator.get_agent()
                delay = rp.crawl_delay(user_agent)
                
                if delay is not None:
                    self.domain_delays[domain] = float(delay)
                    return float(delay)
            
            # Use default delay
            default_delay = config.default_crawl_delay
            self.domain_delays[domain] = default_delay
            return default_delay
            
        except Exception:
            return config.default_crawl_delay
    
    async def _fetch_page(self, url: str) -> Optional[Tuple[str, str]]:
        """Fetch a single page with error handling and rate limiting."""
        try:
            # Check robots.txt
            if not await self._check_robots_txt(url):
                logger.info(f"Robots.txt disallows crawling: {url}")
                return None
            
            # Rate limiting
            await self.rate_limiter.wait_for_tokens()
            
            # Apply domain-specific delay
            delay = await self._get_crawl_delay(url)
            await asyncio.sleep(delay)
            
            # Fetch page
            headers = {'User-Agent': self.ua_rotator.get_agent()}
            
            async with self.session.get(url, headers=headers) as response:
                if response.status == 200:
                    content = await response.text()
                    content_type = response.headers.get('content-type', '')
                    
                    if 'text/html' in content_type:
                        return content, content_type
                    else:
                        logger.info(f"Skipping non-HTML content: {url}")
                        return None
                
                elif response.status == 429:
                    # Rate limited - wait longer
                    retry_after = response.headers.get('Retry-After', '60')
                    wait_time = int(retry_after)
                    logger.warning(f"Rate limited on {url}, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                    return None
                
                else:
                    logger.warning(f"HTTP {response.status} for {url}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    async def _extract_content(self, html: str, url: str) -> Dict[str, any]:
        """Extract meaningful content from HTML."""
        try:
            soup = BeautifulSoup(html, 'lxml')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "aside"]):
                script.decompose()
            
            # Extract title
            title_tag = soup.find('title')
            title = title_tag.get_text().strip() if title_tag else ""
            
            # Extract meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc.get('content', '') if meta_desc else ""
            
            # Extract main content
            content_selectors = [
                'article', 'main', '.content', '.post', '.entry',
                '[role="main"]', '.article-content', '.post-content'
            ]
            
            main_content = ""
            for selector in content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    main_content = content_elem.get_text(separator=' ', strip=True)
                    break
            
            # Fallback to body content
            if not main_content:
                body = soup.find('body')
                if body:
                    main_content = body.get_text(separator=' ', strip=True)
            
            # Extract links
            links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                absolute_url = urljoin(url, href)
                if self.data_validator.is_valid_url(absolute_url):
                    links.append({
                        'url': absolute_url,
                        'text': link.get_text(strip=True)
                    })
            
            # Extract keywords from meta tags
            keywords = []
            meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
            if meta_keywords:
                keywords = [k.strip() for k in meta_keywords.get('content', '').split(',')]
            
            return {
                'title': title,
                'description': description,
                'content': main_content,
                'links': links,
                'keywords': keywords,
                'word_count': len(main_content.split()),
                'extracted_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {e}")
            return {}
    
    async def _analyze_content_relevance(self, content_data: Dict[str, any]) -> float:
        """Analyze content relevance for AI/ML topics."""
        try:
            # AI/ML related keywords
            ai_keywords = [
                'artificial intelligence', 'machine learning', 'deep learning',
                'neural network', 'ai', 'ml', 'nlp', 'computer vision',
                'reinforcement learning', 'transformer', 'gpt', 'llm',
                'autonomous', 'robotics', 'algorithm', 'data science',
                'python', 'tensorflow', 'pytorch', 'research', 'paper'
            ]
            
            text = f"{content_data.get('title', '')} {content_data.get('description', '')} {content_data.get('content', '')}"
            text_lower = text.lower()
            
            # Count keyword matches
            matches = sum(1 for keyword in ai_keywords if keyword in text_lower)
            
            # Calculate relevance score
            relevance = min(matches / len(ai_keywords) * 2, 1.0)
            
            # Boost score for certain domains
            boost_domains = ['arxiv.org', 'ai.googleblog.com', 'openai.com', 'anthropic.com']
            for domain in boost_domains:
                if domain in content_data.get('url', ''):
                    relevance = min(relevance + 0.3, 1.0)
                    break
            
            return relevance
            
        except Exception as e:
            logger.error(f"Error analyzing content relevance: {e}")
            return 0.5
    
    async def _process_page(self, url: str) -> Optional[str]:
        """Process a single page and store relevant content."""
        try:
            # Check if already visited
            url_hash = self.content_hasher.hash_url(url)
            if url_hash in self.visited_urls:
                return None
            
            self.visited_urls.add(url_hash)
            
            # Fetch page content
            result = await self._fetch_page(url)
            if not result:
                return None
            
            html_content, content_type = result
            
            # Extract content
            content_data = await self._extract_content(html_content, url)
            if not content_data.get('content'):
                return None
            
            # Analyze relevance
            relevance_score = await self._analyze_content_relevance(content_data)
            
            # Store if relevant enough
            if relevance_score >= 0.3:
                content_hash = await self.memory_connector.store_knowledge(
                    content=content_data['content'],
                    source_type='web_crawl',
                    source_url=url,
                    title=content_data.get('title', ''),
                    summary=content_data.get('description', ''),
                    keywords=content_data.get('keywords', []),
                    relevance_score=relevance_score
                )
                
                # Add new links to crawl queue
                for link in content_data.get('links', [])[:5]:  # Limit to 5 links per page
                    if self.data_validator.is_valid_url(link['url']):
                        await self.crawl_queue.put({
                            'url': link['url'],
                            'depth': 1,
                            'priority': relevance_score * 0.8
                        })
                
                logger.info(f"Processed page: {content_data.get('title', url)[:50]}...")
                performance_monitor.record_metric('pages_processed', 1)
                
                return content_hash
            
            return None
            
        except Exception as e:
            logger.error(f"Error processing page {url}: {e}")
            return None
    
    async def crawl_batch(self, max_pages: int = 10):
        """Crawl a batch of pages."""
        try:
            processed_count = 0
            
            while processed_count < max_pages and not self.crawl_queue.empty():
                try:
                    # Get next URL from queue
                    crawl_item = await asyncio.wait_for(
                        self.crawl_queue.get(), timeout=1.0
                    )
                    
                    url = crawl_item['url']
                    
                    # Process the page
                    content_hash = await self._process_page(url)
                    
                    if content_hash:
                        processed_count += 1
                    
                    # Mark task as done
                    self.crawl_queue.task_done()
                    
                except asyncio.TimeoutError:
                    break
                except Exception as e:
                    logger.error(f"Error in crawl batch: {e}")
                    continue
            
            logger.info(f"Crawl batch completed. Processed {processed_count} pages")
            
        except Exception as e:
            logger.error(f"Crawl batch failed: {e}")
    
    async def crawl_with_javascript(self, url: str) -> Optional[str]:
        """Crawl JavaScript-heavy pages using Playwright."""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=self.ua_rotator.get_agent()
                )
                page = await context.new_page()
                
                # Navigate to page
                await page.goto(url, wait_until='networkidle')
                
                # Wait for content to load
                await page.wait_for_timeout(3000)
                
                # Get page content
                content = await page.content()
                title = await page.title()
                
                await browser.close()
                
                # Process the content
                content_data = await self._extract_content(content, url)
                content_data['title'] = title
                
                # Analyze and store if relevant
                relevance_score = await self._analyze_content_relevance(content_data)
                
                if relevance_score >= 0.3:
                    content_hash = await self.memory_connector.store_knowledge(
                        content=content_data['content'],
                        source_type='web_crawl_js',
                        source_url=url,
                        title=content_data.get('title', ''),
                        summary=content_data.get('description', ''),
                        keywords=content_data.get('keywords', []),
                        relevance_score=relevance_score
                    )
                    
                    logger.info(f"Processed JS page: {title[:50]}...")
                    return content_hash
                
                return None
                
        except Exception as e:
            logger.error(f"Error crawling JS page {url}: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check crawler health."""
        try:
            return (
                self.session is not None and
                not self.session.closed and
                self.memory_connector is not None
            )
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup crawler resources."""
        try:
            if self.session and not self.session.closed:
                await self.session.close()
            
            if self.memory_connector:
                await self.memory_connector.cleanup()
                
            logger.info("Web crawler cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during crawler cleanup: {e}")
