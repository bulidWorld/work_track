import sequelize from '../config/database';
import User from '../models/User';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('admin', 10);

    await User.create({
      username: 'admin',
      passwordHash,
      displayName: 'Administrator',
      email: 'admin@localhost',
      isAdmin: true,
      ldapDn: null
    });

    console.log('Admin user created successfully (username: admin, password: admin)');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

export default createAdminUser;
