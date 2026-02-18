import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { User } from './models/User';
import { log } from './utils/logger';

async function createAdmin() {
  await connectDB();

  // Check if admin already exists
  const existingAdmin = await User.findOne({ role: 'admin' });

  if (existingAdmin) {
    log.info('Admin user already exists', {
      email: existingAdmin.email,
      name: `${existingAdmin.firstName} ${existingAdmin.lastName}`
    });
    console.log('\n✅ Admin account already exists:');
    console.log(`   Email: ${existingAdmin.email}`);
    console.log('   Password: (use your existing password)\n');
  } else {
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'KorrectNG',
      email: 'admin@korrectng.com',
      phone: '08000000000',
      password: 'Admin1234',
      role: 'admin',
      isEmailVerified: true,
    });

    log.info('Created admin user', { email: admin.email });
    console.log('\n✅ Admin account created:');
    console.log('   Email: admin@korrectng.com');
    console.log('   Password: Admin1234\n');
  }

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((err) => {
  log.error('Error', { error: err instanceof Error ? err.message : err });
  process.exit(1);
});
