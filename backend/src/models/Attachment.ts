import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Task from './Task';

interface AttachmentAttributes {
  id: number;
  taskId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
  uploadedBy: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AttachmentCreationAttributes extends Optional<AttachmentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Attachment extends Model<AttachmentAttributes, AttachmentCreationAttributes> implements AttachmentAttributes {
  public id!: number;
  public taskId!: number;
  public filename!: string;
  public originalName!: string;
  public mimeType!: string;
  public size!: number;
  public filePath!: string;
  public uploadedBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Attachment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'task_id'
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_name'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mime_type'
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'uploaded_by'
    }
  },
  {
    sequelize,
    tableName: 'attachments',
    timestamps: true,
    underscored: true
  }
);

// 关联 Task
Task.hasMany(Attachment, { foreignKey: 'taskId', as: 'attachments' });
Attachment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

export default Attachment;
