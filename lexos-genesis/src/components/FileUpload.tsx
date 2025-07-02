import React, { useCallback, useState } from 'react';
import { Upload, X, Image, Film, Music, File } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File, preview?: string) => void;
  onRemove?: () => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUpload({ 
  onFileSelect, 
  onRemove,
  accept = 'image/*,video/*,audio/*',
  maxSize = 50,
  className = ''
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (type.startsWith('video/')) return <Film className="w-6 h-6" />;
    if (type.startsWith('audio/')) return <Music className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const handleFile = useCallback((file: File) => {
    setError(null);

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Create preview for images and videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setPreview({ url, type: file.type });
        onFileSelect(file, url);
      };
      reader.readAsDataURL(file);
    } else {
      onFileSelect(file);
      setPreview({ url: '', type: file.type });
    }
  }, [maxSize, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (onRemove) {
      onRemove();
    }
  };

  if (preview) {
    return (
      <div className={`relative inline-block ${className}`}>
        {preview.type.startsWith('image/') && preview.url && (
          <img
            src={preview.url}
            alt="Upload preview"
            className="max-h-32 rounded-lg"
          />
        )}
        {preview.type.startsWith('video/') && preview.url && (
          <video
            src={preview.url}
            className="max-h-32 rounded-lg"
            muted
          />
        )}
        {!preview.url && (
          <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
            {getFileIcon(preview.type)}
            <span className="text-sm text-gray-300">File selected</span>
          </div>
        )}
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-colors
          ${isDragging 
            ? 'border-blue-400 bg-blue-400/10' 
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
          }
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-400">
          Drop file here or click to upload
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Max size: {maxSize}MB
        </p>
      </div>
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}