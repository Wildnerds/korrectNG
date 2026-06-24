// Create admin user script
// Run with: node scripts/create-admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

async function createAdmin() {
  // Admin credentials - CHANGE THESE
  const adminData = {
    email: 'admin@korrectng.ng',
    password: 'Admin@123456',  // Change this!
    firstName: 'Admin',
    lastName: 'KorrectNG',
    role: 'admin',
    isEmailVerified: true,
    isProfileComplete: true,
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check if admin already exists
    const existing = await mongoose.connection.db.collection('users').findOne({
      email: adminData.email
    });

    if (existing) {
      console.log('Admin user already exists with this email!');
      console.log('Email:', existing.email);
      console.log('Role:', existing.role);
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Create admin user
    const result = await mongoose.connection.db.collection('users').insertOne({
      ...adminData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('=================================');
    console.log('Email:    ', adminData.email);
    console.log('Password: ', adminData.password);
    console.log('=================================');
    console.log('\n⚠️  Change the password after first login!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createAdmin();
