// Quick script to check bookings for a phone number
// Run with: node scripts/check-booking.js

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function checkBookings() {
  const phoneNumber = '08105166722';

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find the user/artisan by phone
    const user = await mongoose.connection.db.collection('users').findOne({
      phone: phoneNumber
    });

    if (!user) {
      console.log(`No user found with phone: ${phoneNumber}`);

      // Try finding in artisan profiles
      const artisanProfile = await mongoose.connection.db.collection('artisanprofiles').findOne({
        $or: [
          { phoneNumber: phoneNumber },
          { whatsappNumber: phoneNumber }
        ]
      });

      if (artisanProfile) {
        console.log('Found artisan profile:', artisanProfile.businessName);
        console.log('Artisan user ID:', artisanProfile.user);

        // Find bookings for this artisan
        const bookings = await mongoose.connection.db.collection('bookings')
          .find({ artisan: artisanProfile.user })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();

        console.log(`\nFound ${bookings.length} bookings:`);
        bookings.forEach((b, i) => {
          console.log(`\n${i + 1}. ${b.jobType}`);
          console.log(`   Status: ${b.status}`);
          console.log(`   Description: ${b.description?.substring(0, 50)}...`);
          console.log(`   Created: ${b.createdAt}`);
          if (b.quotedPrice) console.log(`   Quoted: ₦${b.quotedPrice}`);
        });
      } else {
        console.log('No artisan profile found with this phone number');
      }
    } else {
      console.log('Found user:', user.firstName, user.lastName);
      console.log('Role:', user.role);
      console.log('Email:', user.email);

      // Find bookings
      const bookings = await mongoose.connection.db.collection('bookings')
        .find({ artisan: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      console.log(`\nFound ${bookings.length} bookings as artisan:`);
      bookings.forEach((b, i) => {
        console.log(`\n${i + 1}. ${b.jobType}`);
        console.log(`   Status: ${b.status}`);
        console.log(`   Description: ${b.description?.substring(0, 50)}...`);
        console.log(`   Created: ${b.createdAt}`);
        if (b.quotedPrice) console.log(`   Quoted: ₦${b.quotedPrice}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkBookings();
