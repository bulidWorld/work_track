import express from 'express';
import cors from 'cors';
import sequelize from './config/database';
import taskRoutes from './routes/taskRoutes';
import authRoutes from './routes/authRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
import progressRoutes from './routes/progressRoutes';
import { createJwtMiddleware } from './auth/ldapAuth';
import Task from './models/Task';
import User from './models/User';
import createAdminUser from './init/adminUser';
import Attachment from './models/Attachment';
import Progress from './models/Progress';

// 建立自关联关系
Task.hasMany(Task, {
  foreignKey: 'parentId',
  as: 'subTasks'
});

Task.belongsTo(Task, {
  foreignKey: 'parentId',
  as: 'parent'
});

// 建立 User 和 Task 关联
User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 建立 User 和 Progress 关联
User.hasMany(Progress, { foreignKey: 'userId', as: 'progresses' });
Progress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 建立 Task 和 Progress 关联
Task.hasMany(Progress, { foreignKey: 'taskId', as: 'progresses' });
Progress.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

const app = express();
const PORT: number = parseInt(process.env.PORT || '10513', 10);

// Middleware
app.use(cors());
app.use(express.json());

// JWT authentication middleware
app.use(createJwtMiddleware(User));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', taskRoutes);
app.use('/api', attachmentRoutes);
app.use('/api', progressRoutes);

// Sync database and create admin user
const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.sync({ force: false, alter: true });
    console.log('Database synchronized');

    // Create admin user
    await createAdminUser();
  } catch (error) {
    console.error('Error synchronizing database:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async (): Promise<void> => {
  try {
    await syncDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();