import { Request, Response } from 'express';
import { Op } from 'sequelize';
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

    // 分页参数
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // 用户筛选参数
    const filterUserId = req.query.userId ? parseInt(req.query.userId as string) : null;

    let whereClause: any = { isIndependent: true };

    // 管理员可以查看所有任务，或按用户筛选
    if (user.isAdmin) {
      if (filterUserId) {
        whereClause.userId = filterUserId;
      }
    } else {
      // 普通用户：查看自己的任务 + 公共任务
      if (filterUserId && filterUserId === user.id) {
        // 筛选自己
        whereClause.userId = user.id;
      } else if (filterUserId && filterUserId !== user.id) {
        // 筛选其他用户：只能查看公共任务
        whereClause = {
          isIndependent: true,
          userId: filterUserId,
          isPublic: true
        };
      } else {
        // 无筛选：查看自己的任务 + 所有公共任务
        whereClause = {
          isIndependent: true,
          [require('sequelize').Op.or]: [
            { userId: user.id },
            { isPublic: true }
          ]
        };
      }
    }

    const { count, rows } = await Task.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'displayName']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // 为每个任务添加路径信息
    const tasksWithPath = await Promise.all(
      rows.map(async (task: any) => {
        const taskData = task.toJSON();
        const path = await getTaskPath(task);
        return {
          ...taskData,
          path: path
        };
      })
    );

    console.log('Tasks fetched successfully:', tasksWithPath.length);
    res.json({
      tasks: tasksWithPath,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
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

    // Check permission: owner, admin, or public task
    const canView = user.isAdmin || task.userId === user.id || task.isPublic;
    if (!canView) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const subTasks = await Task.findAll({
      where: { parentId: task.id }
    });

    res.json({
      ...task.toJSON(),
      subTasks,
      canEdit: user.isAdmin || task.userId === user.id  // 标记是否可以编辑
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

    const { parentId, userId, isPublic, ...taskData } = req.body;

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
        isIndependent: false,
        isPublic: parentTask.isPublic  // 子任务继承父任务的公共属性
      });
      console.log('Created subTask:', subTask);
      res.status(201).json(subTask);
    } else {
      console.log(taskData);
      const task = await Task.create({
        ...taskData,
        userId: taskUserId,
        isIndependent: true,
        isPublic: isPublic || false
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

    // Check permission: only owner or admin can edit
    if (!user.isAdmin && task.userId !== user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only allow updating specific fields
    const allowedFields = ['title', 'description', 'status', 'dueDate', 'assignee', 'isPublic'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    await task.update(updateData);
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
