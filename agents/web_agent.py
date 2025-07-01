#!/usr/bin/env python3
"""
LexOS Web Agent - H100 Production Edition
Advanced web scraping, research, and data extraction agent
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlparse
import re
from bs4 import BeautifulSoup
from loguru import logger
import sys
import os

sys.path.append('/home/user')
from agents.base_agent import BaseAgent, AgentTask, AgentCapability

class WebAgent(BaseAgent):
    """Advanced web scraping and research agent"""
    
    def __init__(self):
        super().__init__(
            agent_id="web_agent",
            name="Web Research Agent",
            description="Advanced web scraping, research, and data extraction",
            capabilities=[
                AgentCapability.WEB_SCRAPING,
                AgentCapability.DATA_ANALYSIS,
                AgentCapability.API_CALLS
            ]
        )
        
        self.session: Optional[aiohttp.ClientSession] = None
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        ]
        
        # Rate limiting
        self.request_delay = 1.0  # seconds between requests
        self.last_request_time = 0
        
        # Supported task types
        self.supported_tasks = {
            "scrape_url": self._scrape_url,
            "search_web": self._search_web,
            "extract_data": self._extract_data,
            "monitor_website": self._monitor_website,
            "download_file": self._download_file,
            "api_request": self._api_request,
            "batch_scrape": self._batch_scrape
        }
    
    async def _initialize_agent(self):
        """Initialize the web agent"""
        # Create HTTP session with proper headers
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
        
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            headers={
                "User-Agent": self.user_agents[0],
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1"
            }
        )
        
        logger.info("🌐 Web Agent HTTP session initialized")
    
    async def _supports_task_type(self, task_type: str) -> bool:
        """Check if the agent supports a specific task type"""
        return task_type in self.supported_tasks
    
    async def _execute_task(self, task: AgentTask) -> Dict[str, Any]:
        """Execute a web-related task"""
        task_type = task.task_type
        
        if task_type not in self.supported_tasks:
            raise ValueError(f"Unsupported task type: {task_type}")
        
        # Execute the specific task
        handler = self.supported_tasks[task_type]
        return await handler(task)
    
    async def _scrape_url(self, task: AgentTask) -> Dict[str, Any]:
        """Scrape a single URL"""
        url = task.parameters.get("url")
        extract_type = task.parameters.get("extract_type", "text")  # text, links, images, tables
        selectors = task.parameters.get("selectors", {})
        
        if not url:
            raise ValueError("URL is required for scraping")
        
        # Rate limiting
        await self._rate_limit()
        
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {response.reason}")
                
                content = await response.text()
                soup = BeautifulSoup(content, 'html.parser')
                
                result = {
                    "url": url,
                    "status_code": response.status,
                    "title": soup.title.string if soup.title else None,
                    "timestamp": time.time()
                }
                
                # Extract based on type
                if extract_type == "text":
                    result["text"] = soup.get_text(strip=True)
                elif extract_type == "links":
                    links = []
                    for link in soup.find_all('a', href=True):
                        links.append({
                            "text": link.get_text(strip=True),
                            "href": urljoin(url, link['href'])
                        })
                    result["links"] = links
                elif extract_type == "images":
                    images = []
                    for img in soup.find_all('img', src=True):
                        images.append({
                            "alt": img.get('alt', ''),
                            "src": urljoin(url, img['src'])
                        })
                    result["images"] = images
                elif extract_type == "tables":
                    tables = []
                    for table in soup.find_all('table'):
                        table_data = []
                        for row in table.find_all('tr'):
                            row_data = [cell.get_text(strip=True) for cell in row.find_all(['td', 'th'])]
                            if row_data:
                                table_data.append(row_data)
                        if table_data:
                            tables.append(table_data)
                    result["tables"] = tables
                
                # Custom selectors
                if selectors:
                    for key, selector in selectors.items():
                        elements = soup.select(selector)
                        result[key] = [elem.get_text(strip=True) for elem in elements]
                
                return result
                
        except Exception as e:
            logger.error(f"❌ Scraping failed for {url}: {e}")
            raise
    
    async def _search_web(self, task: AgentTask) -> Dict[str, Any]:
        """Perform web search using multiple search engines"""
        query = task.parameters.get("query")
        num_results = task.parameters.get("num_results", 10)
        search_engines = task.parameters.get("search_engines", ["duckduckgo"])
        
        if not query:
            raise ValueError("Query is required for web search")
        
        results = []
        
        for engine in search_engines:
            try:
                if engine == "duckduckgo":
                    engine_results = await self._search_duckduckgo(query, num_results)
                    results.extend(engine_results)
                # Add more search engines here
                
            except Exception as e:
                logger.warning(f"⚠️ Search engine {engine} failed: {e}")
        
        return {
            "query": query,
            "results": results[:num_results],
            "total_found": len(results),
            "timestamp": time.time()
        }
    
    async def _search_duckduckgo(self, query: str, num_results: int) -> List[Dict[str, Any]]:
        """Search using DuckDuckGo"""
        await self._rate_limit()
        
        # DuckDuckGo instant answer API
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_html": "1",
            "skip_disambig": "1"
        }
        
        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    results = []
                    
                    # Abstract
                    if data.get("Abstract"):
                        results.append({
                            "title": data.get("Heading", ""),
                            "snippet": data.get("Abstract", ""),
                            "url": data.get("AbstractURL", ""),
                            "source": "DuckDuckGo Abstract"
                        })
                    
                    # Related topics
                    for topic in data.get("RelatedTopics", []):
                        if isinstance(topic, dict) and topic.get("Text"):
                            results.append({
                                "title": topic.get("Text", "").split(" - ")[0],
                                "snippet": topic.get("Text", ""),
                                "url": topic.get("FirstURL", ""),
                                "source": "DuckDuckGo Related"
                            })
                    
                    return results[:num_results]
        
        except Exception as e:
            logger.error(f"❌ DuckDuckGo search failed: {e}")
        
        return []
    
    async def _extract_data(self, task: AgentTask) -> Dict[str, Any]:
        """Extract structured data from HTML content"""
        content = task.parameters.get("content")
        url = task.parameters.get("url")
        extraction_rules = task.parameters.get("extraction_rules", {})
        
        if not content and not url:
            raise ValueError("Either content or URL is required")
        
        if url and not content:
            # Fetch content first
            scrape_task = AgentTask(
                task_id=f"{task.task_id}_scrape",
                agent_id=self.agent_id,
                user_id=task.user_id,
                task_type="scrape_url",
                parameters={"url": url, "extract_type": "text"}
            )
            scrape_result = await self._scrape_url(scrape_task)
            content = scrape_result.get("text", "")
        
        soup = BeautifulSoup(content, 'html.parser')
        extracted_data = {}
        
        for field_name, rule in extraction_rules.items():
            try:
                if rule["type"] == "css_selector":
                    elements = soup.select(rule["selector"])
                    if rule.get("multiple", False):
                        extracted_data[field_name] = [elem.get_text(strip=True) for elem in elements]
                    else:
                        extracted_data[field_name] = elements[0].get_text(strip=True) if elements else None
                
                elif rule["type"] == "regex":
                    pattern = re.compile(rule["pattern"])
                    matches = pattern.findall(content)
                    extracted_data[field_name] = matches if rule.get("multiple", False) else (matches[0] if matches else None)
                
                elif rule["type"] == "xpath":
                    # Would need lxml for XPath support
                    logger.warning("XPath extraction not implemented yet")
                    extracted_data[field_name] = None
                
            except Exception as e:
                logger.warning(f"⚠️ Extraction failed for {field_name}: {e}")
                extracted_data[field_name] = None
        
        return {
            "extracted_data": extracted_data,
            "timestamp": time.time()
        }
    
    async def _monitor_website(self, task: AgentTask) -> Dict[str, Any]:
        """Monitor a website for changes"""
        url = task.parameters.get("url")
        check_interval = task.parameters.get("check_interval", 300)  # 5 minutes
        max_checks = task.parameters.get("max_checks", 10)
        
        if not url:
            raise ValueError("URL is required for monitoring")
        
        changes_detected = []
        previous_content = None
        
        for check_num in range(max_checks):
            try:
                # Update progress
                task.progress = (check_num / max_checks) * 100
                
                # Scrape current content
                scrape_result = await self._scrape_url(AgentTask(
                    task_id=f"{task.task_id}_check_{check_num}",
                    agent_id=self.agent_id,
                    user_id=task.user_id,
                    task_type="scrape_url",
                    parameters={"url": url, "extract_type": "text"}
                ))
                
                current_content = scrape_result.get("text", "")
                
                if previous_content and current_content != previous_content:
                    changes_detected.append({
                        "check_number": check_num,
                        "timestamp": time.time(),
                        "change_detected": True,
                        "content_length": len(current_content),
                        "previous_length": len(previous_content)
                    })
                    logger.info(f"🔍 Change detected on {url} at check {check_num}")
                
                previous_content = current_content
                
                # Wait before next check (except for last iteration)
                if check_num < max_checks - 1:
                    await asyncio.sleep(check_interval)
                
            except Exception as e:
                logger.error(f"❌ Monitoring check {check_num} failed: {e}")
        
        return {
            "url": url,
            "total_checks": max_checks,
            "changes_detected": len(changes_detected),
            "change_log": changes_detected,
            "timestamp": time.time()
        }
    
    async def _download_file(self, task: AgentTask) -> Dict[str, Any]:
        """Download a file from URL"""
        url = task.parameters.get("url")
        save_path = task.parameters.get("save_path")
        max_size = task.parameters.get("max_size", 100 * 1024 * 1024)  # 100MB default
        
        if not url:
            raise ValueError("URL is required for file download")
        
        if not save_path:
            # Generate save path
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path) or "downloaded_file"
            save_path = f"/home/user/data/downloads/{filename}"
        
        # Ensure download directory exists
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        await self._rate_limit()
        
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {response.reason}")
                
                content_length = int(response.headers.get('content-length', 0))
                if content_length > max_size:
                    raise Exception(f"File too large: {content_length} bytes (max: {max_size})")
                
                downloaded_size = 0
                with open(save_path, 'wb') as file:
                    async for chunk in response.content.iter_chunked(8192):
                        file.write(chunk)
                        downloaded_size += len(chunk)
                        
                        # Update progress
                        if content_length > 0:
                            task.progress = (downloaded_size / content_length) * 100
                
                return {
                    "url": url,
                    "save_path": save_path,
                    "file_size": downloaded_size,
                    "content_type": response.headers.get('content-type'),
                    "timestamp": time.time()
                }
                
        except Exception as e:
            # Clean up partial download
            if os.path.exists(save_path):
                os.remove(save_path)
            raise
    
    async def _api_request(self, task: AgentTask) -> Dict[str, Any]:
        """Make API request"""
        url = task.parameters.get("url")
        method = task.parameters.get("method", "GET").upper()
        headers = task.parameters.get("headers", {})
        params = task.parameters.get("params", {})
        data = task.parameters.get("data")
        json_data = task.parameters.get("json")
        
        if not url:
            raise ValueError("URL is required for API request")
        
        await self._rate_limit()
        
        try:
            kwargs = {
                "headers": headers,
                "params": params
            }
            
            if data:
                kwargs["data"] = data
            if json_data:
                kwargs["json"] = json_data
            
            async with self.session.request(method, url, **kwargs) as response:
                response_data = {
                    "url": url,
                    "method": method,
                    "status_code": response.status,
                    "headers": dict(response.headers),
                    "timestamp": time.time()
                }
                
                # Try to parse JSON response
                try:
                    response_data["json"] = await response.json()
                except:
                    response_data["text"] = await response.text()
                
                return response_data
                
        except Exception as e:
            logger.error(f"❌ API request failed: {e}")
            raise
    
    async def _batch_scrape(self, task: AgentTask) -> Dict[str, Any]:
        """Scrape multiple URLs in batch"""
        urls = task.parameters.get("urls", [])
        extract_type = task.parameters.get("extract_type", "text")
        max_concurrent = task.parameters.get("max_concurrent", 5)
        
        if not urls:
            raise ValueError("URLs list is required for batch scraping")
        
        results = []
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def scrape_single(url, index):
            async with semaphore:
                try:
                    scrape_task = AgentTask(
                        task_id=f"{task.task_id}_batch_{index}",
                        agent_id=self.agent_id,
                        user_id=task.user_id,
                        task_type="scrape_url",
                        parameters={"url": url, "extract_type": extract_type}
                    )
                    result = await self._scrape_url(scrape_task)
                    result["batch_index"] = index
                    return result
                except Exception as e:
                    logger.error(f"❌ Batch scrape failed for {url}: {e}")
                    return {
                        "url": url,
                        "batch_index": index,
                        "error": str(e),
                        "timestamp": time.time()
                    }
        
        # Execute all scraping tasks concurrently
        tasks = [scrape_single(url, i) for i, url in enumerate(urls)]
        results = await asyncio.gather(*tasks)
        
        # Update progress
        task.progress = 100.0
        
        return {
            "total_urls": len(urls),
            "successful_scrapes": len([r for r in results if "error" not in r]),
            "failed_scrapes": len([r for r in results if "error" in r]),
            "results": results,
            "timestamp": time.time()
        }
    
    async def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.request_delay:
            await asyncio.sleep(self.request_delay - time_since_last)
        
        self.last_request_time = time.time()
    
    async def _cleanup_agent(self):
        """Clean up web agent resources"""
        if self.session:
            await self.session.close()
            logger.info("🌐 Web Agent HTTP session closed")

# Create global instance
web_agent = WebAgent()