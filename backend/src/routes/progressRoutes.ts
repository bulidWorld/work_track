import { Router } from 'express';
import {
  getProgressByTaskId,
  createProgress,
  deleteProgress
} from '../controllers/ProgressController';

const router = Router();

router.get('/tasks/:taskId/progress', getProgressByTaskId);
router.post('/tasks/:taskId/progress', createProgress);
router.delete('/progress/:id', deleteProgress);

export default router;
