import { Request, Response } from 'express';
import Attachment from '../models/Attachment';
import Task from '../models/Task';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const taskId = parseInt(req.params.taskId as string, 10);
    const task = await Task.findByPk(taskId);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // 检查权限
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const attachment = await Attachment.create({
      taskId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filePath: req.file.path,
      uploadedBy: user.id
    });

    console.log('Attachment uploaded:', attachment.id);
    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getAttachments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const taskId = parseInt(req.params.taskId as string, 10);
    const task = await Task.findByPk(taskId);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // 检查权限
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const attachments = await Attachment.findAll({
      where: { taskId },
      order: [['createdAt', 'DESC']]
    });

    res.json(attachments);
  } catch (error) {
    console.error('Error getting attachments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const attachment = await Attachment.findByPk(parseInt(req.params.id as string, 10));

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const task = await Task.findByPk(attachment.taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // 检查权限
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!fs.existsSync(attachment.filePath)) {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    res.download(attachment.filePath, attachment.originalName);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const attachment = await Attachment.findByPk(parseInt(req.params.id as string, 10));

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const task = await Task.findByPk(attachment.taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // 检查权限
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // 删除文件
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }

    await attachment.destroy();
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
