
"""
Automated book discovery, reading, and comprehension system.
"""

import asyncio
import logging
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import structlog
import requests
import aiohttp
import PyPDF2
import docx
from ebooklib import epub
import openai

from ..config import config, load_yaml_config
from ..utils import (
    RateLimiter, ContentHasher, RetryHandler, DataValidator, performance_monitor
)
from ..memory.memory_connector import MemoryConnector

logger = structlog.get_logger(__name__)

class BookReader:
    """Automated book discovery, reading, and comprehension system."""
    
    def __init__(self):
        self.session = None
        self.rate_limiter = RateLimiter(max_tokens=10, refill_rate=0.2)
        self.content_hasher = ContentHasher()
        self.retry_handler = RetryHandler()
        self.data_validator = DataValidator()
        
        # Load book reading configuration
        self.book_config = load_yaml_config("books.yaml")
        
        # Reading state
        self.memory_connector = None
        self.reading_queue = asyncio.Queue()
        self.read_books = set()
        self.reading_progress = {}
        
        # Initialize OpenAI client
        if config.openai_api_key:
            openai.api_key = config.openai_api_key
        
        # Book sources and discovery
        self.book_sources = [
            {
                'name': 'Project Gutenberg',
                'base_url': 'https://www.gutenberg.org/',
                'search_url': 'https://www.gutenberg.org/ebooks/search/?query={query}&submit_search=Go%21',
                'type': 'free'
            },
            {
                'name': 'OpenLibrary',
                'base_url': 'https://openlibrary.org/',
                'api_url': 'https://openlibrary.org/search.json?q={query}&limit=10',
                'type': 'free'
            },
            {
                'name': 'Internet Archive',
                'base_url': 'https://archive.org/',
                'search_url': 'https://archive.org/advancedsearch.php?q={query}&fl[]=identifier&fl[]=title&fl[]=creator&rows=10&output=json',
                'type': 'free'
            }
        ]
        
        # Reading preferences
        self.reading_preferences = {
            'ai_ml_topics': [
                'artificial intelligence', 'machine learning', 'deep learning',
                'neural networks', 'data science', 'algorithms', 'programming',
                'computer science', 'mathematics', 'statistics', 'robotics'
            ],
            'max_book_length': 500000,  # Max characters
            'min_relevance_score': 0.4,
            'reading_speed_wpm': 250,  # Words per minute
            'comprehension_depth': 'detailed'  # basic, detailed, comprehensive
        }
    
    async def initialize(self):
        """Initialize book reader."""
        try:
            # Create aiohttp session
            timeout = aiohttp.ClientTimeout(total=60)
            self.session = aiohttp.ClientSession(timeout=timeout)
            
            # Initialize memory connector
            self.memory_connector = MemoryConnector()
            await self.memory_connector.initialize()
            
            # Load reading progress
            await self._load_reading_progress()
            
            # Discover initial books
            await self._discover_books()
            
            logger.info("Book reader initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize book reader: {e}")
            raise
    
    async def _load_reading_progress(self):
        """Load existing reading progress from memory."""
        try:
            # Load from memory system
            progress_data = await self.memory_connector.retrieve_knowledge(
                source_type='book_progress',
                limit=100
            )
            
            for entry in progress_data:
                book_id = entry.get('title', '')
                if book_id:
                    self.reading_progress[book_id] = {
                        'pages_read': entry.get('pages_read', 0),
                        'total_pages': entry.get('total_pages', 0),
                        'last_read': entry.get('last_read', ''),
                        'comprehension_score': entry.get('comprehension_score', 0.0),
                        'notes': entry.get('notes', [])
                    }
            
            logger.info(f"Loaded reading progress for {len(self.reading_progress)} books")
            
        except Exception as e:
            logger.error(f"Error loading reading progress: {e}")
    
    async def _discover_books(self):
        """Discover relevant books for learning."""
        try:
            # Search for books on AI/ML topics
            for topic in self.reading_preferences['ai_ml_topics'][:5]:  # Limit searches
                books = await self._search_books(topic)
                
                for book in books[:3]:  # Limit books per topic
                    await self.reading_queue.put(book)
            
            logger.info("Book discovery completed")
            
        except Exception as e:
            logger.error(f"Error discovering books: {e}")
    
    async def _search_books(self, query: str) -> List[Dict[str, Any]]:
        """Search for books on a specific topic."""
        try:
            all_books = []
            
            # Search OpenLibrary
            openlibrary_books = await self._search_openlibrary(query)
            all_books.extend(openlibrary_books)
            
            # Search Internet Archive
            archive_books = await self._search_internet_archive(query)
            all_books.extend(archive_books)
            
            # Filter and rank books
            relevant_books = await self._filter_and_rank_books(all_books, query)
            
            return relevant_books
            
        except Exception as e:
            logger.error(f"Error searching books for {query}: {e}")
            return []
    
    async def _search_openlibrary(self, query: str) -> List[Dict[str, Any]]:
        """Search OpenLibrary for books."""
        try:
            await self.rate_limiter.wait_for_tokens()
            
            search_url = f"https://openlibrary.org/search.json?q={query}&limit=10"
            
            async with self.session.get(search_url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    books = []
                    for doc in data.get('docs', []):
                        book = {
                            'title': doc.get('title', ''),
                            'author': ', '.join(doc.get('author_name', [])),
                            'publish_year': doc.get('first_publish_year'),
                            'subjects': doc.get('subject', []),
                            'key': doc.get('key', ''),
                            'source': 'openlibrary',
                            'download_url': f"https://openlibrary.org{doc.get('key', '')}.txt" if doc.get('key') else None
                        }
                        
                        if book['title'] and book['author']:
                            books.append(book)
                    
                    return books
            
            return []
            
        except Exception as e:
            logger.error(f"Error searching OpenLibrary: {e}")
            return []
    
    async def _search_internet_archive(self, query: str) -> List[Dict[str, Any]]:
        """Search Internet Archive for books."""
        try:
            await self.rate_limiter.wait_for_tokens()
            
            search_url = f"https://archive.org/advancedsearch.php?q={query}%20AND%20mediatype:texts&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=date&rows=10&output=json"
            
            async with self.session.get(search_url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    books = []
                    for doc in data.get('response', {}).get('docs', []):
                        book = {
                            'title': doc.get('title', ''),
                            'author': doc.get('creator', ''),
                            'publish_year': doc.get('date'),
                            'identifier': doc.get('identifier', ''),
                            'source': 'internet_archive',
                            'download_url': f"https://archive.org/download/{doc.get('identifier', '')}/{doc.get('identifier', '')}.pdf"
                        }
                        
                        if book['title'] and book['identifier']:
                            books.append(book)
                    
                    return books
            
            return []
            
        except Exception as e:
            logger.error(f"Error searching Internet Archive: {e}")
            return []
    
    async def _filter_and_rank_books(self, books: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Filter and rank books by relevance."""
        try:
            relevant_books = []
            
            for book in books:
                # Calculate relevance score
                relevance_score = await self._calculate_book_relevance(book, query)
                
                if relevance_score >= self.reading_preferences['min_relevance_score']:
                    book['relevance_score'] = relevance_score
                    relevant_books.append(book)
            
            # Sort by relevance score
            relevant_books.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return relevant_books
            
        except Exception as e:
            logger.error(f"Error filtering and ranking books: {e}")
            return books
    
    async def _calculate_book_relevance(self, book: Dict[str, Any], query: str) -> float:
        """Calculate relevance score for a book."""
        try:
            score = 0.0
            
            # Title relevance
            title = book.get('title', '').lower()
            if query.lower() in title:
                score += 0.4
            
            # Subject relevance
            subjects = book.get('subjects', [])
            for subject in subjects:
                if any(topic in subject.lower() for topic in self.reading_preferences['ai_ml_topics']):
                    score += 0.3
                    break
            
            # Author relevance (if known AI/ML authors)
            author = book.get('author', '').lower()
            ai_authors = ['russell', 'norvig', 'goodfellow', 'bengio', 'courville', 'bishop', 'murphy']
            if any(name in author for name in ai_authors):
                score += 0.2
            
            # Recency bonus
            publish_year = book.get('publish_year')
            if publish_year and isinstance(publish_year, (int, str)):
                try:
                    year = int(publish_year)
                    if year >= 2010:
                        score += 0.1
                except ValueError:
                    pass
            
            return min(score, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating book relevance: {e}")
            return 0.0
    
    async def _download_book(self, book: Dict[str, Any]) -> Optional[str]:
        """Download book content."""
        try:
            download_url = book.get('download_url')
            if not download_url:
                return None
            
            await self.rate_limiter.wait_for_tokens()
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_path = temp_file.name
            temp_file.close()
            
            # Download book
            async with self.session.get(download_url) as response:
                if response.status == 200:
                    content = await response.read()
                    
                    with open(temp_path, 'wb') as f:
                        f.write(content)
                    
                    return temp_path
                else:
                    os.unlink(temp_path)
                    return None
                    
        except Exception as e:
            logger.error(f"Error downloading book: {e}")
            return None
    
    async def _extract_text_from_file(self, file_path: str) -> Optional[str]:
        """Extract text from various file formats."""
        try:
            file_extension = Path(file_path).suffix.lower()
            
            if file_extension == '.pdf':
                return await self._extract_text_from_pdf(file_path)
            elif file_extension == '.txt':
                return await self._extract_text_from_txt(file_path)
            elif file_extension in ['.docx', '.doc']:
                return await self._extract_text_from_docx(file_path)
            elif file_extension == '.epub':
                return await self._extract_text_from_epub(file_path)
            else:
                logger.warning(f"Unsupported file format: {file_extension}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {e}")
            return None
    
    async def _extract_text_from_pdf(self, file_path: str) -> Optional[str]:
        """Extract text from PDF file."""
        try:
            text = ""
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
            
            return text.strip() if text.strip() else None
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return None
    
    async def _extract_text_from_txt(self, file_path: str) -> Optional[str]:
        """Extract text from TXT file."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                return file.read()
                
        except Exception as e:
            logger.error(f"Error extracting text from TXT: {e}")
            return None
    
    async def _extract_text_from_docx(self, file_path: str) -> Optional[str]:
        """Extract text from DOCX file."""
        try:
            doc = docx.Document(file_path)
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip() if text.strip() else None
            
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {e}")
            return None
    
    async def _extract_text_from_epub(self, file_path: str) -> Optional[str]:
        """Extract text from EPUB file."""
        try:
            book = epub.read_epub(file_path)
            text = ""
            
            for item in book.get_items():
                if item.get_type() == epub.ITEM_DOCUMENT:
                    content = item.get_content().decode('utf-8')
                    # Simple HTML tag removal
                    import re
                    clean_text = re.sub('<[^<]+?>', '', content)
                    text += clean_text + "\n"
            
            return text.strip() if text.strip() else None
            
        except Exception as e:
            logger.error(f"Error extracting text from EPUB: {e}")
            return None
    
    async def _analyze_book_content(self, text: str, book: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze book content for comprehension and insights."""
        try:
            # Basic analysis
            words = text.split()
            word_count = len(words)
            estimated_pages = word_count // 250  # Assume 250 words per page
            
            analysis = {
                'word_count': word_count,
                'estimated_pages': estimated_pages,
                'reading_time_minutes': word_count // self.reading_preferences['reading_speed_wpm'],
                'analyzed_at': datetime.now().isoformat()
            }
            
            # AI-powered analysis if available
            if config.openai_api_key and len(text) > 1000:
                ai_analysis = await self._ai_analyze_content(text[:5000], book)  # Analyze first 5000 chars
                analysis.update(ai_analysis)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing book content: {e}")
            return {}
    
    async def _ai_analyze_content(self, text_sample: str, book: Dict[str, Any]) -> Dict[str, Any]:
        """Use AI to analyze book content."""
        try:
            prompt = f"""
            Analyze this book excerpt and provide:
            1. Main topics covered (max 5)
            2. Difficulty level (beginner/intermediate/advanced)
            3. Key concepts (max 10)
            4. Learning value for AI/ML (0-1 score)
            5. Brief summary (max 100 words)
            
            Book: {book.get('title', 'Unknown')}
            Author: {book.get('author', 'Unknown')}
            
            Excerpt: {text_sample}
            
            Respond in JSON format:
            {{
                "main_topics": ["..."],
                "difficulty_level": "...",
                "key_concepts": ["..."],
                "learning_value": 0.0,
                "summary": "..."
            }}
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3
            )
            
            import json
            analysis = json.loads(response.choices[0].message.content)
            return analysis
            
        except Exception as e:
            logger.error(f"Error in AI content analysis: {e}")
            return {}
    
    async def _create_reading_notes(self, text: str, book: Dict[str, Any]) -> List[str]:
        """Create reading notes and key takeaways."""
        try:
            if not config.openai_api_key:
                return []
            
            # Split text into chunks for processing
            chunk_size = 3000
            chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
            
            all_notes = []
            
            for i, chunk in enumerate(chunks[:5]):  # Limit to first 5 chunks
                prompt = f"""
                Create concise reading notes from this text chunk. Focus on:
                1. Key concepts and definitions
                2. Important insights or findings
                3. Practical applications
                4. Notable quotes or examples
                
                Text chunk {i+1}: {chunk}
                
                Provide 3-5 bullet points of the most important information.
                """
                
                try:
                    response = await openai.ChatCompletion.acreate(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=200,
                        temperature=0.3
                    )
                    
                    notes = response.choices[0].message.content.strip()
                    if notes:
                        all_notes.append(f"Chapter {i+1} Notes:\n{notes}")
                        
                except Exception as e:
                    logger.error(f"Error creating notes for chunk {i}: {e}")
                    continue
            
            return all_notes
            
        except Exception as e:
            logger.error(f"Error creating reading notes: {e}")
            return []
    
    async def read_session(self):
        """Conduct a reading session."""
        try:
            if self.reading_queue.empty():
                await self._discover_books()
            
            processed_count = 0
            max_books = 2  # Limit books per session
            
            while processed_count < max_books and not self.reading_queue.empty():
                try:
                    # Get next book from queue
                    book = await asyncio.wait_for(
                        self.reading_queue.get(), timeout=1.0
                    )
                    
                    # Check if already read
                    book_id = f"{book['title']}_{book['author']}"
                    if book_id in self.read_books:
                        continue
                    
                    # Download and process book
                    success = await self._process_book(book)
                    
                    if success:
                        self.read_books.add(book_id)
                        processed_count += 1
                    
                    # Mark task as done
                    self.reading_queue.task_done()
                    
                except asyncio.TimeoutError:
                    break
                except Exception as e:
                    logger.error(f"Error in reading session: {e}")
                    continue
            
            logger.info(f"Reading session completed. Processed {processed_count} books")
            performance_monitor.record_metric('books_read', processed_count)
            
        except Exception as e:
            logger.error(f"Reading session failed: {e}")
    
    async def _process_book(self, book: Dict[str, Any]) -> bool:
        """Process a single book."""
        try:
            logger.info(f"Processing book: {book['title']}")
            
            # Download book
            file_path = await self._download_book(book)
            if not file_path:
                logger.warning(f"Could not download book: {book['title']}")
                return False
            
            try:
                # Extract text
                text = await self._extract_text_from_file(file_path)
                if not text or len(text) < 1000:
                    logger.warning(f"Insufficient text extracted from: {book['title']}")
                    return False
                
                # Check length limit
                if len(text) > self.reading_preferences['max_book_length']:
                    text = text[:self.reading_preferences['max_book_length']]
                
                # Analyze content
                analysis = await self._analyze_book_content(text, book)
                
                # Create reading notes
                notes = await self._create_reading_notes(text, book)
                
                # Store in memory
                content_hash = await self.memory_connector.store_knowledge(
                    content=text,
                    source_type='book',
                    source_url=book.get('download_url', ''),
                    title=book['title'],
                    summary=analysis.get('summary', f"Book by {book['author']}"),
                    keywords=analysis.get('key_concepts', []),
                    relevance_score=analysis.get('learning_value', book.get('relevance_score', 0.5))
                )
                
                # Store reading progress
                book_id = f"{book['title']}_{book['author']}"
                self.reading_progress[book_id] = {
                    'pages_read': analysis.get('estimated_pages', 0),
                    'total_pages': analysis.get('estimated_pages', 0),
                    'last_read': datetime.now().isoformat(),
                    'comprehension_score': analysis.get('learning_value', 0.5),
                    'notes': notes,
                    'analysis': analysis
                }
                
                logger.info(f"Successfully processed book: {book['title']}")
                return True
                
            finally:
                # Cleanup downloaded file
                if os.path.exists(file_path):
                    os.unlink(file_path)
                    
        except Exception as e:
            logger.error(f"Error processing book {book.get('title', 'Unknown')}: {e}")
            return False
    
    async def get_reading_stats(self) -> Dict[str, Any]:
        """Get reading statistics and progress."""
        try:
            total_books = len(self.reading_progress)
            total_pages = sum(progress['pages_read'] for progress in self.reading_progress.values())
            avg_comprehension = np.mean([
                progress['comprehension_score'] 
                for progress in self.reading_progress.values()
            ]) if self.reading_progress else 0.0
            
            # Recent reading activity
            recent_books = [
                {
                    'title': book_id.split('_')[0],
                    'pages_read': progress['pages_read'],
                    'comprehension_score': progress['comprehension_score'],
                    'last_read': progress['last_read']
                }
                for book_id, progress in self.reading_progress.items()
            ]
            
            # Sort by last read
            recent_books.sort(key=lambda x: x['last_read'], reverse=True)
            
            return {
                'total_books_read': total_books,
                'total_pages_read': total_pages,
                'average_comprehension': float(avg_comprehension),
                'books_in_queue': self.reading_queue.qsize(),
                'recent_books': recent_books[:5],
                'reading_preferences': self.reading_preferences,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting reading stats: {e}")
            return {}
    
    async def health_check(self) -> bool:
        """Check book reader health."""
        try:
            return (
                self.session is not None and
                not self.session.closed and
                self.memory_connector is not None and
                len(self.book_sources) > 0
            )
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup book reader resources."""
        try:
            if self.session and not self.session.closed:
                await self.session.close()
            
            if self.memory_connector:
                await self.memory_connector.cleanup()
                
            logger.info("Book reader cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during book reader cleanup: {e}")
