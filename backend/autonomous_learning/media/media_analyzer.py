
"""
Multi-modal media analysis system for video, image, and audio processing.
"""

import asyncio
import cv2
import logging
import numpy as np
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import structlog
import whisper
from PIL import Image
import pytesseract
import requests
import aiohttp

from ..config import config, load_yaml_config
from ..utils import (
    RateLimiter, ContentHasher, RetryHandler, performance_monitor
)
from ..memory.memory_connector import MemoryConnector

logger = structlog.get_logger(__name__)

class MediaAnalyzer:
    """Multi-modal content analysis and understanding system."""
    
    def __init__(self):
        self.session = None
        self.rate_limiter = RateLimiter(max_tokens=20, refill_rate=0.5)
        self.content_hasher = ContentHasher()
        self.retry_handler = RetryHandler()
        
        # Load media configuration
        self.media_config = load_yaml_config("media.yaml")
        
        # Media processing state
        self.processing_queue = asyncio.Queue()
        self.processed_items = set()
        self.memory_connector = None
        
        # Initialize models
        self.whisper_model = None
        self.cv_models = {}
        
        # Supported formats
        self.supported_image_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        self.supported_video_formats = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        self.supported_audio_formats = {'.mp3', '.wav', '.m4a', '.ogg', '.flac'}
    
    async def initialize(self):
        """Initialize media analyzer."""
        try:
            # Create aiohttp session
            timeout = aiohttp.ClientTimeout(total=60)
            self.session = aiohttp.ClientSession(timeout=timeout)
            
            # Initialize memory connector
            self.memory_connector = MemoryConnector()
            await self.memory_connector.initialize()
            
            # Initialize AI models
            await self._initialize_models()
            
            logger.info("Media analyzer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize media analyzer: {e}")
            raise
    
    async def _initialize_models(self):
        """Initialize AI models for media processing."""
        try:
            # Initialize Whisper for audio transcription
            model_size = self.media_config.get("whisper_model", "base")
            self.whisper_model = whisper.load_model(model_size)
            
            # Initialize OpenCV models (if available)
            self._load_cv_models()
            
            logger.info("AI models initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing AI models: {e}")
    
    def _load_cv_models(self):
        """Load OpenCV models for image analysis."""
        try:
            # Face detection model
            face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(face_cascade_path):
                self.cv_models['face_cascade'] = cv2.CascadeClassifier(face_cascade_path)
            
            # Object detection models would go here
            # For now, we'll use basic OpenCV features
            
        except Exception as e:
            logger.error(f"Error loading CV models: {e}")
    
    async def _download_media(self, url: str, media_type: str) -> Optional[str]:
        """Download media file from URL."""
        try:
            await self.rate_limiter.wait_for_tokens()
            
            # Create temporary file
            suffix = self._get_file_extension(url, media_type)
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            temp_path = temp_file.name
            temp_file.close()
            
            # Download file
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.read()
                    
                    with open(temp_path, 'wb') as f:
                        f.write(content)
                    
                    return temp_path
                else:
                    logger.warning(f"Failed to download media: HTTP {response.status}")
                    os.unlink(temp_path)
                    return None
                    
        except Exception as e:
            logger.error(f"Error downloading media from {url}: {e}")
            return None
    
    def _get_file_extension(self, url: str, media_type: str) -> str:
        """Get appropriate file extension based on URL and media type."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            path = parsed.path.lower()
            
            if media_type == 'image':
                for ext in self.supported_image_formats:
                    if path.endswith(ext):
                        return ext
                return '.jpg'  # Default
            
            elif media_type == 'video':
                for ext in self.supported_video_formats:
                    if path.endswith(ext):
                        return ext
                return '.mp4'  # Default
            
            elif media_type == 'audio':
                for ext in self.supported_audio_formats:
                    if path.endswith(ext):
                        return ext
                return '.mp3'  # Default
            
            return ''
            
        except Exception:
            return ''
    
    async def analyze_image(self, image_path: str, source_url: str = "") -> Dict[str, Any]:
        """Analyze image content and extract information."""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Could not load image: {image_path}")
                return {}
            
            pil_image = Image.open(image_path)
            
            analysis_result = {
                'type': 'image',
                'source_url': source_url,
                'dimensions': f"{image.shape[1]}x{image.shape[0]}",
                'channels': image.shape[2] if len(image.shape) > 2 else 1,
                'file_size': os.path.getsize(image_path),
                'analyzed_at': datetime.now().isoformat()
            }
            
            # Extract text using OCR
            try:
                extracted_text = pytesseract.image_to_string(pil_image)
                if extracted_text.strip():
                    analysis_result['extracted_text'] = extracted_text.strip()
            except Exception as e:
                logger.warning(f"OCR failed: {e}")
            
            # Basic image analysis
            analysis_result.update(await self._analyze_image_features(image))
            
            # Face detection
            if 'face_cascade' in self.cv_models:
                faces = await self._detect_faces(image)
                if faces:
                    analysis_result['faces_detected'] = len(faces)
            
            # Color analysis
            analysis_result.update(await self._analyze_colors(image))
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing image {image_path}: {e}")
            return {}
    
    async def _analyze_image_features(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze basic image features."""
        try:
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate basic statistics
            mean_brightness = np.mean(gray)
            std_brightness = np.std(gray)
            
            # Edge detection
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            # Texture analysis using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            return {
                'mean_brightness': float(mean_brightness),
                'brightness_std': float(std_brightness),
                'edge_density': float(edge_density),
                'texture_variance': float(laplacian_var),
                'is_blurry': laplacian_var < 100  # Simple blur detection
            }
            
        except Exception as e:
            logger.error(f"Error analyzing image features: {e}")
            return {}
    
    async def _detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces in image."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.cv_models['face_cascade'].detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )
            return faces.tolist()
            
        except Exception as e:
            logger.error(f"Error detecting faces: {e}")
            return []
    
    async def _analyze_colors(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze color distribution in image."""
        try:
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Calculate dominant colors
            pixels = rgb_image.reshape(-1, 3)
            
            # Use k-means to find dominant colors
            from sklearn.cluster import KMeans
            
            kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            colors = kmeans.cluster_centers_.astype(int)
            percentages = np.bincount(kmeans.labels_) / len(kmeans.labels_)
            
            dominant_colors = []
            for color, percentage in zip(colors, percentages):
                dominant_colors.append({
                    'rgb': color.tolist(),
                    'percentage': float(percentage)
                })
            
            # Sort by percentage
            dominant_colors.sort(key=lambda x: x['percentage'], reverse=True)
            
            return {
                'dominant_colors': dominant_colors[:3],  # Top 3 colors
                'color_diversity': float(np.std(percentages))
            }
            
        except Exception as e:
            logger.error(f"Error analyzing colors: {e}")
            return {}
    
    async def analyze_video(self, video_path: str, source_url: str = "") -> Dict[str, Any]:
        """Analyze video content and extract information."""
        try:
            # Open video
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.error(f"Could not open video: {video_path}")
                return {}
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            analysis_result = {
                'type': 'video',
                'source_url': source_url,
                'duration_seconds': duration,
                'fps': fps,
                'frame_count': frame_count,
                'resolution': f"{width}x{height}",
                'file_size': os.path.getsize(video_path),
                'analyzed_at': datetime.now().isoformat()
            }
            
            # Sample frames for analysis
            sample_frames = await self._sample_video_frames(cap, max_frames=10)
            
            if sample_frames:
                # Analyze sampled frames
                frame_analyses = []
                for i, frame in enumerate(sample_frames):
                    frame_analysis = await self._analyze_image_features(frame)
                    frame_analysis['frame_number'] = i
                    frame_analyses.append(frame_analysis)
                
                analysis_result['frame_analysis'] = frame_analyses
                
                # Calculate video-level statistics
                if frame_analyses:
                    avg_brightness = np.mean([f['mean_brightness'] for f in frame_analyses])
                    avg_edge_density = np.mean([f['edge_density'] for f in frame_analyses])
                    
                    analysis_result['average_brightness'] = float(avg_brightness)
                    analysis_result['average_edge_density'] = float(avg_edge_density)
            
            cap.release()
            
            # Extract audio if present
            audio_analysis = await self._extract_video_audio(video_path)
            if audio_analysis:
                analysis_result['audio_analysis'] = audio_analysis
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing video {video_path}: {e}")
            return {}
    
    async def _sample_video_frames(self, cap: cv2.VideoCapture, max_frames: int = 10) -> List[np.ndarray]:
        """Sample frames from video for analysis."""
        try:
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            if frame_count <= max_frames:
                # Sample all frames
                frame_indices = range(frame_count)
            else:
                # Sample evenly distributed frames
                frame_indices = np.linspace(0, frame_count - 1, max_frames, dtype=int)
            
            frames = []
            for frame_idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if ret:
                    frames.append(frame)
            
            return frames
            
        except Exception as e:
            logger.error(f"Error sampling video frames: {e}")
            return []
    
    async def _extract_video_audio(self, video_path: str) -> Optional[Dict[str, Any]]:
        """Extract and analyze audio from video."""
        try:
            # Create temporary audio file
            audio_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            audio_path = audio_temp.name
            audio_temp.close()
            
            # Extract audio using ffmpeg (if available)
            import subprocess
            
            try:
                subprocess.run([
                    'ffmpeg', '-i', video_path, '-vn', '-acodec', 'pcm_s16le',
                    '-ar', '16000', '-ac', '1', audio_path, '-y'
                ], check=True, capture_output=True)
                
                # Analyze extracted audio
                audio_analysis = await self.analyze_audio(audio_path)
                
                # Cleanup
                os.unlink(audio_path)
                
                return audio_analysis
                
            except subprocess.CalledProcessError:
                logger.warning("ffmpeg not available for audio extraction")
                os.unlink(audio_path)
                return None
                
        except Exception as e:
            logger.error(f"Error extracting video audio: {e}")
            return None
    
    async def analyze_audio(self, audio_path: str, source_url: str = "") -> Dict[str, Any]:
        """Analyze audio content and extract information."""
        try:
            if not self.whisper_model:
                logger.error("Whisper model not initialized")
                return {}
            
            # Get audio file info
            file_size = os.path.getsize(audio_path)
            
            analysis_result = {
                'type': 'audio',
                'source_url': source_url,
                'file_size': file_size,
                'analyzed_at': datetime.now().isoformat()
            }
            
            # Transcribe audio using Whisper
            try:
                result = self.whisper_model.transcribe(audio_path)
                
                analysis_result.update({
                    'transcription': result['text'],
                    'language': result.get('language', 'unknown'),
                    'segments': len(result.get('segments', [])),
                    'duration': result.get('segments', [{}])[-1].get('end', 0) if result.get('segments') else 0
                })
                
                # Analyze transcription content
                if result['text']:
                    text_analysis = await self._analyze_transcription(result['text'])
                    analysis_result.update(text_analysis)
                
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
                analysis_result['transcription_error'] = str(e)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing audio {audio_path}: {e}")
            return {}
    
    async def _analyze_transcription(self, text: str) -> Dict[str, Any]:
        """Analyze transcribed text for insights."""
        try:
            # Basic text analysis
            words = text.split()
            sentences = text.split('.')
            
            # AI/ML keyword detection
            ai_keywords = [
                'artificial intelligence', 'machine learning', 'deep learning',
                'neural network', 'ai', 'ml', 'algorithm', 'model', 'training',
                'data', 'python', 'tensorflow', 'pytorch', 'research'
            ]
            
            text_lower = text.lower()
            keyword_matches = [kw for kw in ai_keywords if kw in text_lower]
            
            return {
                'word_count': len(words),
                'sentence_count': len([s for s in sentences if s.strip()]),
                'ai_keywords_found': keyword_matches,
                'relevance_score': min(len(keyword_matches) / len(ai_keywords), 1.0),
                'text_summary': text[:200] + '...' if len(text) > 200 else text
            }
            
        except Exception as e:
            logger.error(f"Error analyzing transcription: {e}")
            return {}
    
    async def process_media_url(self, url: str, media_type: str) -> Optional[str]:
        """Process media from URL and store analysis."""
        try:
            # Check if already processed
            url_hash = self.content_hasher.hash_url(url)
            if url_hash in self.processed_items:
                return None
            
            self.processed_items.add(url_hash)
            
            # Download media
            media_path = await self._download_media(url, media_type)
            if not media_path:
                return None
            
            try:
                # Analyze based on media type
                if media_type == 'image':
                    analysis = await self.analyze_image(media_path, url)
                elif media_type == 'video':
                    analysis = await self.analyze_video(media_path, url)
                elif media_type == 'audio':
                    analysis = await self.analyze_audio(media_path, url)
                else:
                    logger.error(f"Unsupported media type: {media_type}")
                    return None
                
                if not analysis:
                    return None
                
                # Calculate relevance score
                relevance_score = self._calculate_media_relevance(analysis)
                
                # Store if relevant
                if relevance_score >= 0.3:
                    content_text = self._extract_text_content(analysis)
                    
                    content_hash = await self.memory_connector.store_knowledge(
                        content=content_text,
                        source_type=f'media_{media_type}',
                        source_url=url,
                        title=f"{media_type.title()} Analysis",
                        summary=analysis.get('text_summary', content_text[:200]),
                        keywords=analysis.get('ai_keywords_found', []),
                        relevance_score=relevance_score
                    )
                    
                    logger.info(f"Processed {media_type}: {url}")
                    performance_monitor.record_metric(f'{media_type}_processed', 1)
                    
                    return content_hash
                
                return None
                
            finally:
                # Cleanup downloaded file
                if os.path.exists(media_path):
                    os.unlink(media_path)
                    
        except Exception as e:
            logger.error(f"Error processing media URL {url}: {e}")
            return None
    
    def _calculate_media_relevance(self, analysis: Dict[str, Any]) -> float:
        """Calculate relevance score for media content."""
        try:
            base_score = 0.3
            
            # Text-based relevance
            if 'relevance_score' in analysis:
                base_score += analysis['relevance_score'] * 0.4
            
            # Keyword matches
            if 'ai_keywords_found' in analysis:
                keyword_boost = len(analysis['ai_keywords_found']) * 0.1
                base_score += min(keyword_boost, 0.3)
            
            # Quality indicators
            if analysis.get('type') == 'image':
                if not analysis.get('is_blurry', True):
                    base_score += 0.1
                if analysis.get('extracted_text'):
                    base_score += 0.1
            
            elif analysis.get('type') == 'video':
                if analysis.get('duration_seconds', 0) > 30:  # Prefer longer videos
                    base_score += 0.1
                if analysis.get('audio_analysis'):
                    base_score += 0.1
            
            elif analysis.get('type') == 'audio':
                if analysis.get('transcription'):
                    base_score += 0.2
            
            return min(base_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating media relevance: {e}")
            return 0.3
    
    def _extract_text_content(self, analysis: Dict[str, Any]) -> str:
        """Extract text content from media analysis."""
        try:
            content_parts = []
            
            # Add transcription or extracted text
            if 'transcription' in analysis:
                content_parts.append(f"Transcription: {analysis['transcription']}")
            
            if 'extracted_text' in analysis:
                content_parts.append(f"Extracted Text: {analysis['extracted_text']}")
            
            # Add analysis summary
            if 'text_summary' in analysis:
                content_parts.append(f"Summary: {analysis['text_summary']}")
            
            # Add technical details
            media_type = analysis.get('type', 'unknown')
            content_parts.append(f"Media Type: {media_type}")
            
            if media_type == 'image':
                content_parts.append(f"Dimensions: {analysis.get('dimensions', 'unknown')}")
                if analysis.get('faces_detected'):
                    content_parts.append(f"Faces detected: {analysis['faces_detected']}")
            
            elif media_type == 'video':
                content_parts.append(f"Duration: {analysis.get('duration_seconds', 0):.1f} seconds")
                content_parts.append(f"Resolution: {analysis.get('resolution', 'unknown')}")
            
            elif media_type == 'audio':
                content_parts.append(f"Duration: {analysis.get('duration', 0):.1f} seconds")
                content_parts.append(f"Language: {analysis.get('language', 'unknown')}")
            
            return '\n'.join(content_parts)
            
        except Exception as e:
            logger.error(f"Error extracting text content: {e}")
            return str(analysis)
    
    async def process_queue(self):
        """Process media items from the queue."""
        try:
            processed_count = 0
            max_items = 5  # Limit processing per batch
            
            while processed_count < max_items and not self.processing_queue.empty():
                try:
                    # Get next item from queue
                    media_item = await asyncio.wait_for(
                        self.processing_queue.get(), timeout=1.0
                    )
                    
                    url = media_item['url']
                    media_type = media_item['type']
                    
                    # Process the media
                    content_hash = await self.process_media_url(url, media_type)
                    
                    if content_hash:
                        processed_count += 1
                    
                    # Mark task as done
                    self.processing_queue.task_done()
                    
                except asyncio.TimeoutError:
                    break
                except Exception as e:
                    logger.error(f"Error processing media queue item: {e}")
                    continue
            
            logger.info(f"Media processing completed. Processed {processed_count} items")
            
        except Exception as e:
            logger.error(f"Media queue processing failed: {e}")
    
    async def add_to_queue(self, url: str, media_type: str):
        """Add media URL to processing queue."""
        try:
            await self.processing_queue.put({
                'url': url,
                'type': media_type,
                'added_at': datetime.now()
            })
            
        except Exception as e:
            logger.error(f"Error adding to media queue: {e}")
    
    async def health_check(self) -> bool:
        """Check media analyzer health."""
        try:
            return (
                self.session is not None and
                not self.session.closed and
                self.memory_connector is not None and
                self.whisper_model is not None
            )
        except Exception:
            return False
    
    async def cleanup(self):
        """Cleanup media analyzer resources."""
        try:
            if self.session and not self.session.closed:
                await self.session.close()
            
            if self.memory_connector:
                await self.memory_connector.cleanup()
                
            logger.info("Media analyzer cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during media analyzer cleanup: {e}")
