import { Request, Response } from 'express';
import Progress from '../models/Progress';
import Task from '../models/Task';
import User from '../models/User';

export const getProgressByTaskId = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const taskId = parseInt(req.params.taskId as string, 10);
    
    // Check task access
    const task = await Task.findByPk(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permission: owner, admin, or public task
    if (!user.isAdmin && task.userId !== user.id && !task.isPublic) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const progress = await Progress.findAll({
      where: { taskId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'displayName']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(progress);
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const taskId = parseInt(req.params.taskId as string, 10);
    const { content } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({ error: 'Progress content is required' });
      return;
    }

    // Check task access
    const task = await Task.findByPk(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permission: owner, admin, or public task (for adding progress)
    if (!user.isAdmin && task.userId !== user.id && !task.isPublic) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const progress = await Progress.create({
      taskId,
      content,
      userId: user.id
    });

    const progressWithUser = await Progress.findByPk(progress.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'displayName']
      }]
    });

    res.status(201).json(progressWithUser);
  } catch (error) {
    console.error('Error creating progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const progressId = parseInt(req.params.id as string, 10);
    const progress = await Progress.findByPk(progressId);

    if (!progress) {
      res.status(404).json({ error: 'Progress not found' });
      return;
    }

    // Check permission: only owner or admin can delete
    if (!user.isAdmin && progress.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await progress.destroy();
    res.json({ message: 'Progress deleted successfully' });
  } catch (error) {
    console.error('Error deleting progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
