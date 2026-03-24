import { Router, Request, Response } from 'express';
import { authenticateUser } from '../auth/ldapAuth';
import User from '../models/User';
import Task from '../models/Task';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const result = await authenticateUser(username, password, User);

    if (result.success && result.user && result.token) {
      res.json({
        success: true,
        user: result.user,
        token: result.token
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'work-track-jwt-secret-change-in-production';

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'displayName', 'email', 'isAdmin']
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get all users (admin only)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'work-track-jwt-secret-change-in-production';

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'displayName', 'email', 'isAdmin', 'createdAt']
    });

    res.json({ users });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
