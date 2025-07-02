import { Response, NextFunction } from 'express';
import { prisma } from '@/utils/database';
import { AuthRequest } from '@/middleware/auth';
import { NotFoundError, AppError } from '@/utils/errors';
import path from 'path';
import fs from 'fs/promises';
import { config } from '@/config';

export class FileController {
  async getAllFiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, mimetype } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        uploadedBy: req.user!.id,
      };

      if (mimetype) where.mimetype = { contains: mimetype as string };

      const [files, total] = await Promise.all([
        prisma.file.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.file.count({ where }),
      ]);

      res.json({
        success: true,
        data: files,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getFileById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = await prisma.file.findFirst({
        where: {
          id: req.params.id,
          uploadedBy: req.user!.id,
        },
      });

      if (!file) {
        throw new NotFoundError('File');
      }

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400, 'NO_FILE');
      }

      const file = await prisma.file.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          url: `/api/v1/files/${req.file.filename}/download`,
          uploadedBy: req.user!.id,
        },
      });

      res.status(201).json({
        success: true,
        data: file,
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      next(error);
    }
  }

  async uploadMultipleFiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError('No files uploaded', 400, 'NO_FILES');
      }

      const fileRecords = await Promise.all(
        req.files.map(file =>
          prisma.file.create({
            data: {
              filename: file.filename,
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
              url: `/api/v1/files/${file.filename}/download`,
              uploadedBy: req.user!.id,
            },
          })
        )
      );

      res.status(201).json({
        success: true,
        data: fileRecords,
      });
    } catch (error) {
      // Clean up uploaded files on error
      if (req.files && Array.isArray(req.files)) {
        await Promise.all(
          req.files.map(file => fs.unlink(file.path).catch(() => {}))
        );
      }
      next(error);
    }
  }

  async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = await prisma.file.findFirst({
        where: {
          id: req.params.id,
          uploadedBy: req.user!.id,
        },
      });

      if (!file) {
        throw new NotFoundError('File');
      }

      // Delete physical file
      await fs.unlink(file.path).catch(() => {});

      // Delete database record
      await prisma.file.delete({
        where: { id: file.id },
      });

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Find by ID or filename
      const file = await prisma.file.findFirst({
        where: {
          OR: [
            { id },
            { filename: id },
          ],
          uploadedBy: req.user!.id,
        },
      });

      if (!file) {
        throw new NotFoundError('File');
      }

      // Check if file exists
      await fs.access(file.path);

      // Set headers
      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Length', file.size);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.originalName}"`
      );

      // Stream file
      const fileStream = await import('fs').then(fs => fs.createReadStream(file.path));
      fileStream.pipe(res);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return next(new NotFoundError('File not found on disk'));
      }
      next(error);
    }
  }

  async previewFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const file = await prisma.file.findFirst({
        where: {
          OR: [
            { id },
            { filename: id },
          ],
          uploadedBy: req.user!.id,
        },
      });

      if (!file) {
        throw new NotFoundError('File');
      }

      // Check if file is previewable
      const previewableMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/json',
        'application/pdf',
      ];

      if (!previewableMimeTypes.includes(file.mimetype)) {
        throw new AppError('File type not previewable', 400, 'NOT_PREVIEWABLE');
      }

      // Check if file exists
      await fs.access(file.path);

      // Set headers
      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Length', file.size);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${file.originalName}"`
      );

      // Stream file
      const fileStream = await import('fs').then(fs => fs.createReadStream(file.path));
      fileStream.pipe(res);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return next(new NotFoundError('File not found on disk'));
      }
      next(error);
    }
  }
}