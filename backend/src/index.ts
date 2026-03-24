import express from 'express';
import cors from 'cors';
import sequelize from './config/database';
import taskRoutes from './routes/taskRoutes';
import Task from './models/Task';

// 建立自关联关系
Task.hasMany(Task, {
  foreignKey: 'parentId',
  as: 'subTasks'
});

Task.belongsTo(Task, {
  foreignKey: 'parentId',
  as: 'parent'
});

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', taskRoutes);

// Sync database
const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async (): Promise<void> => {
  try {
    await syncDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();