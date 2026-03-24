import { Request, Response } from 'express';
import Task from '../models/Task';
import User from '../models/User';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let tasks;

    // Admin can see all tasks, regular users only see their own
    if (user.isAdmin) {
      tasks = await Task.findAll({
        include: [{
          model: User,
          attributes: ['id', 'username', 'displayName']
        }],
        order: [['createdAt', 'DESC']]
      });
    } else {
      tasks = await Task.findAll({
        where: { userId: user.id },
        include: [{
          model: User,
          attributes: ['id', 'username', 'displayName']
        }],
        order: [['createdAt', 'DESC']]
      });
    }

    console.log('Tasks fetched successfully:', tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const taskId = parseInt(req.params.id as string, 10);
    const task = await Task.findByPk(taskId, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'displayName']
      }]
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permission
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const subTasks = await Task.findAll({
      where: { parentId: task.id }
    });

    res.json({
      ...task.toJSON(),
      subTasks
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { parentId, userId, ...taskData } = req.body;

    // Determine the actual user ID for the task
    let taskUserId = user.id;

    // Admin can create tasks for other users
    if (user.isAdmin && userId) {
      taskUserId = parseInt(userId, 10);
    }

    if (parentId) {
      const parentTask = await Task.findByPk(parentId);
      if (!parentTask) {
        res.status(404).json({ error: 'Parent task not found' });
        return;
      }

      // Check permission for parent task
      if (!user.isAdmin && parentTask.userId !== user.id) {
        res.status(403).json({ error: 'Cannot add subtask to another user task' });
        return;
      }

      if (parentTask.status !== 'in_progress') {
        res.status(400).json({ error: 'Cannot add subtask to completed task' });
        return;
      }

      const subTask = await Task.create({
        ...taskData,
        parentId,
        userId: taskUserId,
        isIndependent: false
      });
      console.log('Created subTask:', subTask);
      res.status(201).json(subTask);
    } else {
      console.log(taskData);
      const task = await Task.create({
        ...taskData,
        userId: taskUserId,
        isIndependent: true
      });
      console.log('Created Task:', task);
      res.status(201).json(task);
    }
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const taskId = parseInt(req.params.id as string, 10);
    const task = await Task.findByPk(taskId);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permission
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await task.update(req.body);
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const taskId = parseInt(req.params.id as string, 10);
    const task = await Task.findByPk(taskId);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permission
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (task.isIndependent) {
      await Task.destroy({
        where: { parentId: task.id }
      });
    }

    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
