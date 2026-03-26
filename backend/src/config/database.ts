import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('track_work', 'naze', 'Naze666666', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

export default sequelize;