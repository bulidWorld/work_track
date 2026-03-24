import { Request, Response } from 'express';
import Task from '../models/Task';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching tasks...');
    const tasks = await Task.findAll({
      where: { isIndependent: true }
    });
    console.log('Tasks fetched successfully:', tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
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
    const { parentId, ...taskData } = req.body;
    
    if (parentId) {
      const parentTask = await Task.findByPk(parentId);
      if (!parentTask) {
        res.status(404).json({ error: 'Parent task not found' });
        return;
      }
      
      if (parentTask.status !== 'in_progress') {
        res.status(400).json({ error: 'Cannot add subtask to completed task' });
        return;
      }
      
      const subTask = await Task.create({
        ...taskData,
        parentId,
        isIndependent: false
      });
      console.log('Created subTask:', subTask); 
      res.status(201).json(subTask);
    } else {
      console.log(taskData)
      const task = await Task.create({
        ...taskData,
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
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
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
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
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