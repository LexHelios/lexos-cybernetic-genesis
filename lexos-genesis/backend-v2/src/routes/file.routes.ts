import { Router } from 'express';
import { FileController } from '@/controllers/file.controller';
import { authenticate } from '@/middleware/auth';
import { upload } from '@/middleware/upload';

const router = Router();
const fileController = new FileController();

// All routes require authentication
router.use(authenticate);

// File operations
router.get('/', fileController.getAllFiles);
router.get('/:id', fileController.getFileById);
router.post(
  '/upload',
  upload.single('file'),
  fileController.uploadFile
);
router.post(
  '/upload-multiple',
  upload.array('files', 10),
  fileController.uploadMultipleFiles
);
router.delete('/:id', fileController.deleteFile);

// File serving
router.get('/:id/download', fileController.downloadFile);
router.get('/:id/preview', fileController.previewFile);

export default router;