import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  uploadAttachment,
  getAttachments,
  downloadAttachment,
  deleteAttachment
} from '../controllers/AttachmentController';
import { createJwtMiddleware } from '../auth/ldapAuth';
import User from '../models/User';

const router = express.Router();

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型 - 更宽松的策略
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed',
      'application/octet-stream'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type: ' + file.mimetype));
  }
});

// JWT middleware
const authMiddleware = createJwtMiddleware(User);

// Routes
router.use(authMiddleware);

// Upload attachment
router.post('/tasks/:taskId/attachments', upload.single('file'), uploadAttachment);

// Get attachments
router.get('/tasks/:taskId/attachments', getAttachments);

// Download attachment
router.get('/attachments/:id', downloadAttachment);

// Delete attachment
router.delete('/attachments/:id', deleteAttachment);

export default router;
