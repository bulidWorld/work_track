import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Progress extends Model {
  public id!: number;
  public taskId!: number;
  public content!: string;
  public userId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Progress.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  tableName: 'progress',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default Progress;
