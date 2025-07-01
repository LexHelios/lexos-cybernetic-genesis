
"""
Main scheduler and orchestrator for the autonomous learning system.
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
import structlog

from ..config import config
from ..utils import performance_monitor, setup_logging

logger = structlog.get_logger(__name__)

class LearningScheduler:
    """Main scheduler for coordinating all learning activities."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler(
            jobstores={'default': MemoryJobStore()},
            executors={'default': AsyncIOExecutor()},
            job_defaults={'coalesce': False, 'max_instances': 3}
        )
        self.modules = {}
        self.running = False
        self.health_status = {}
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def register_module(self, name: str, module_instance: Any):
        """Register a learning module with the scheduler."""
        self.modules[name] = module_instance
        logger.info(f"Registered module: {name}")
    
    async def start(self):
        """Start the learning scheduler."""
        logger.info("Starting Autonomous Learning System...")
        
        # Setup logging
        setup_logging(
            log_level=config.log_level,
            log_file=f"{config.base_path}/{config.logs_path}/system.log"
        )
        
        # Initialize modules
        await self._initialize_modules()
        
        # Schedule learning tasks
        self._schedule_tasks()
        
        # Start scheduler
        self.scheduler.start()
        self.running = True
        
        logger.info("Autonomous Learning System started successfully")
        
        # Keep running
        try:
            while self.running:
                await asyncio.sleep(1)
                await self._health_check()
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        finally:
            await self.stop()
    
    async def stop(self):
        """Stop the learning scheduler gracefully."""
        logger.info("Stopping Autonomous Learning System...")
        
        self.running = False
        self.scheduler.shutdown(wait=True)
        
        # Cleanup modules
        for name, module in self.modules.items():
            if hasattr(module, 'cleanup'):
                try:
                    await module.cleanup()
                    logger.info(f"Cleaned up module: {name}")
                except Exception as e:
                    logger.error(f"Error cleaning up {name}: {e}")
        
        logger.info("Autonomous Learning System stopped")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}")
        self.running = False
    
    async def _initialize_modules(self):
        """Initialize all learning modules."""
        from ..crawler.crawler import WebCrawler
        from ..rss.rss_monitor import RSSMonitor
        from ..api.api_connector import APIConnector
        from ..media.media_analyzer import MediaAnalyzer
        from ..learning.learning_engine import LearningEngine
        from ..books.book_reader import BookReader
        from ..upgrade.upgrade_scanner import UpgradeScanner
        from ..comms.twilio_agent import TwilioAgent
        from ..memory.memory_connector import MemoryConnector
        
        # Initialize modules
        modules_to_init = [
            ("memory", MemoryConnector),
            ("crawler", WebCrawler),
            ("rss", RSSMonitor),
            ("api", APIConnector),
            ("media", MediaAnalyzer),
            ("learning", LearningEngine),
            ("books", BookReader),
            ("upgrade", UpgradeScanner),
            ("comms", TwilioAgent)
        ]
        
        for name, module_class in modules_to_init:
            try:
                instance = module_class()
                if hasattr(instance, 'initialize'):
                    await instance.initialize()
                self.register_module(name, instance)
                self.health_status[name] = "healthy"
            except Exception as e:
                logger.error(f"Failed to initialize {name}: {e}")
                self.health_status[name] = "failed"
    
    def _schedule_tasks(self):
        """Schedule all learning tasks."""
        
        # Continuous web crawling (every 5 minutes)
        self.scheduler.add_job(
            self._run_web_crawling,
            IntervalTrigger(minutes=5),
            id='web_crawling',
            name='Web Crawling',
            max_instances=1
        )
        
        # RSS feed monitoring (every 2 minutes)
        self.scheduler.add_job(
            self._run_rss_monitoring,
            IntervalTrigger(minutes=2),
            id='rss_monitoring',
            name='RSS Monitoring',
            max_instances=1
        )
        
        # API data collection (every 10 minutes)
        self.scheduler.add_job(
            self._run_api_collection,
            IntervalTrigger(minutes=10),
            id='api_collection',
            name='API Data Collection',
            max_instances=1
        )
        
        # Media analysis (every 15 minutes)
        self.scheduler.add_job(
            self._run_media_analysis,
            IntervalTrigger(minutes=15),
            id='media_analysis',
            name='Media Analysis',
            max_instances=1
        )
        
        # Learning engine processing (every 30 minutes)
        self.scheduler.add_job(
            self._run_learning_processing,
            IntervalTrigger(minutes=30),
            id='learning_processing',
            name='Learning Processing',
            max_instances=1
        )
        
        # Book reading (every hour)
        self.scheduler.add_job(
            self._run_book_reading,
            IntervalTrigger(hours=1),
            id='book_reading',
            name='Book Reading',
            max_instances=1
        )
        
        # Self-improvement research (daily at 2 AM)
        self.scheduler.add_job(
            self._run_upgrade_research,
            CronTrigger(hour=2, minute=0),
            id='upgrade_research',
            name='Upgrade Research',
            max_instances=1
        )
        
        # Communication updates (every 6 hours)
        self.scheduler.add_job(
            self._run_communication,
            IntervalTrigger(hours=6),
            id='communication',
            name='Communication Updates',
            max_instances=1
        )
        
        # Memory optimization (daily at 3 AM)
        self.scheduler.add_job(
            self._run_memory_optimization,
            CronTrigger(hour=3, minute=0),
            id='memory_optimization',
            name='Memory Optimization',
            max_instances=1
        )
        
        # Health monitoring (every minute)
        self.scheduler.add_job(
            self._health_check,
            IntervalTrigger(minutes=1),
            id='health_check',
            name='Health Check',
            max_instances=1
        )
    
    async def _run_web_crawling(self):
        """Execute web crawling tasks."""
        try:
            if 'crawler' in self.modules:
                await self.modules['crawler'].crawl_batch()
                performance_monitor.record_metric('web_crawling_success', 1)
        except Exception as e:
            logger.error(f"Web crawling failed: {e}")
            performance_monitor.record_metric('web_crawling_error', 1)
    
    async def _run_rss_monitoring(self):
        """Execute RSS monitoring tasks."""
        try:
            if 'rss' in self.modules:
                await self.modules['rss'].check_feeds()
                performance_monitor.record_metric('rss_monitoring_success', 1)
        except Exception as e:
            logger.error(f"RSS monitoring failed: {e}")
            performance_monitor.record_metric('rss_monitoring_error', 1)
    
    async def _run_api_collection(self):
        """Execute API data collection tasks."""
        try:
            if 'api' in self.modules:
                await self.modules['api'].collect_data()
                performance_monitor.record_metric('api_collection_success', 1)
        except Exception as e:
            logger.error(f"API collection failed: {e}")
            performance_monitor.record_metric('api_collection_error', 1)
    
    async def _run_media_analysis(self):
        """Execute media analysis tasks."""
        try:
            if 'media' in self.modules:
                await self.modules['media'].process_queue()
                performance_monitor.record_metric('media_analysis_success', 1)
        except Exception as e:
            logger.error(f"Media analysis failed: {e}")
            performance_monitor.record_metric('media_analysis_error', 1)
    
    async def _run_learning_processing(self):
        """Execute learning engine processing."""
        try:
            if 'learning' in self.modules:
                await self.modules['learning'].process_knowledge()
                performance_monitor.record_metric('learning_processing_success', 1)
        except Exception as e:
            logger.error(f"Learning processing failed: {e}")
            performance_monitor.record_metric('learning_processing_error', 1)
    
    async def _run_book_reading(self):
        """Execute book reading tasks."""
        try:
            if 'books' in self.modules:
                await self.modules['books'].read_session()
                performance_monitor.record_metric('book_reading_success', 1)
        except Exception as e:
            logger.error(f"Book reading failed: {e}")
            performance_monitor.record_metric('book_reading_error', 1)
    
    async def _run_upgrade_research(self):
        """Execute upgrade research tasks."""
        try:
            if 'upgrade' in self.modules:
                await self.modules['upgrade'].research_improvements()
                performance_monitor.record_metric('upgrade_research_success', 1)
        except Exception as e:
            logger.error(f"Upgrade research failed: {e}")
            performance_monitor.record_metric('upgrade_research_error', 1)
    
    async def _run_communication(self):
        """Execute communication tasks."""
        try:
            if 'comms' in self.modules:
                await self.modules['comms'].send_updates()
                performance_monitor.record_metric('communication_success', 1)
        except Exception as e:
            logger.error(f"Communication failed: {e}")
            performance_monitor.record_metric('communication_error', 1)
    
    async def _run_memory_optimization(self):
        """Execute memory optimization tasks."""
        try:
            if 'memory' in self.modules:
                await self.modules['memory'].optimize()
                performance_monitor.record_metric('memory_optimization_success', 1)
        except Exception as e:
            logger.error(f"Memory optimization failed: {e}")
            performance_monitor.record_metric('memory_optimization_error', 1)
    
    async def _health_check(self):
        """Perform system health check."""
        try:
            # Check module health
            for name, module in self.modules.items():
                if hasattr(module, 'health_check'):
                    is_healthy = await module.health_check()
                    self.health_status[name] = "healthy" if is_healthy else "unhealthy"
                else:
                    self.health_status[name] = "unknown"
            
            # Log health status
            unhealthy_modules = [
                name for name, status in self.health_status.items()
                if status != "healthy"
            ]
            
            if unhealthy_modules:
                logger.warning(f"Unhealthy modules: {unhealthy_modules}")
            
            performance_monitor.record_metric('health_check_success', 1)
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            performance_monitor.record_metric('health_check_error', 1)

# Global scheduler instance
scheduler = LearningScheduler()
