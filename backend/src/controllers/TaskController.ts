import { Request, Response } from 'express';
import Task from '../models/Task';
import User from '../models/User';

// 递归获取任务路径（带循环检测）
const getTaskPath = async (task: any, path: any[] = [], visitedIds: Set<number> = new Set()): Promise<any[]> => {
  if (task.parentId && !visitedIds.has(task.parentId)) {
    visitedIds.add(task.id);
    const parent = await Task.findByPk(task.parentId, {
      attributes: ['id', 'title', 'parentId']
    });
    if (parent) {
      path.unshift({ id: parent.id, title: parent.title });
      await getTaskPath(parent, path, visitedIds);
    }
  }
  return path;
};

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number; isAdmin: boolean } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let tasks;

    // 只查询独立任务（isIndependent = true），不展示子任务
    if (user.isAdmin) {
      tasks = await Task.findAll({
        where: { isIndependent: true },  // 只显示独立任务
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName']
        }],
        order: [['createdAt', 'DESC']]
      });
    } else {
      tasks = await Task.findAll({
        where: { 
          userId: user.id,
          isIndependent: true  // 只显示独立任务
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName']
        }],
        order: [['createdAt', 'DESC']]
      });
    }

    // 为每个任务添加路径信息
    const tasksWithPath = await Promise.all(
      tasks.map(async (task: any) => {
        const taskData = task.toJSON();
        const path = await getTaskPath(task);
        return {
          ...taskData,
          path: path  // 任务路径数组
        };
      })
    );

    console.log('Tasks fetched successfully:', tasksWithPath.length);
    res.json(tasksWithPath);
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
        as: 'user',
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
