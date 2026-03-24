import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('track_work', 'root', 'Zwx199310', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

export default sequelize;