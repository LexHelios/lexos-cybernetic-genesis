import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config';
import { AppError } from '@/utils/errors';
import fs from 'fs/promises';

// Ensure upload directory exists
const ensureUploadDir = async () => {
  const uploadPath = path.join(process.cwd(), config.upload.dir);
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, path.join(process.cwd(), config.upload.dir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed file types
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/gzip',
    // Code
    'text/x-python',
    'text/x-java-source',
    'text/x-c',
    'text/x-c++',
    'text/x-typescript',
    'application/javascript',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} not allowed`, 400, 'INVALID_FILE_TYPE') as any);
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
    files: 10, // Max 10 files per request
  },
});

// Error handling middleware for multer
export function handleUploadError(error: any, req: any, res: any, next: any) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        error: {
          message: `File too large. Maximum size is ${config.upload.maxSize / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE',
        },
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Too many files. Maximum 10 files per request',
          code: 'TOO_MANY_FILES',
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    });
  }
  next(error);
}