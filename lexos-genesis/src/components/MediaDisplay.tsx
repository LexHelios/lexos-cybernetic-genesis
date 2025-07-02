import React, { useState } from 'react';
import { X, Download, Maximize2, Volume2, VolumeX } from 'lucide-react';

interface MediaDisplayProps {
  type: 'image' | 'video' | 'audio';
  url: string;
  alt?: string;
  className?: string;
}

export function MediaDisplay({ type, url, alt, className = '' }: MediaDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = url.split('/').pop() || 'download';
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-400">Failed to load {type}</p>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <>
        <div className={`relative group inline-block ${className}`}>
          <img
            src={url}
            alt={alt || 'Image'}
            className="max-w-full h-auto rounded-lg cursor-pointer"
            onClick={() => setIsFullscreen(true)}
            onError={() => setError(true)}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button
              onClick={handleDownload}
              className="p-2 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fullscreen Modal */}
        {isFullscreen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={url}
              alt={alt || 'Image'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  if (type === 'video') {
    return (
      <>
        <div className={`relative group ${className}`}>
          <video
            src={url}
            controls
            muted={isMuted}
            className="max-w-full h-auto rounded-lg"
            onError={() => setError(true)}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fullscreen Modal */}
        {isFullscreen && (
          <div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <video
              src={url}
              controls
              autoPlay
              muted={isMuted}
              className="w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  if (type === 'audio') {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <audio src={url} controls className="w-full" onError={() => setError(true)}>
          Your browser does not support the audio element.
        </audio>
        <button
          onClick={handleDownload}
          className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
    );
  }

  return null;
}