/**
 * Migration script to add v2 fields to existing data
 *
 * This script:
 * 1. Adds bookingVersion: 'v1' to all existing bookings
 * 2. Adds escrowVersion: 'v1' to all existing escrow payments
 *
 * Run with: npx ts-node src/scripts/migrate-to-v2.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import Booking from '../models/Booking';
import EscrowPayment from '../models/EscrowPayment';

async function migrate() {
  console.log('Starting V2 migration...\n');

  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database.\n');

    // 1. Migrate Bookings
    console.log('Migrating bookings...');
    const bookingsWithoutVersion = await Booking.countDocuments({
      bookingVersion: { $exists: false },
    });
    console.log(`  Found ${bookingsWithoutVersion} bookings without version`);

    if (bookingsWithoutVersion > 0) {
      const bookingResult = await Booking.updateMany(
        { bookingVersion: { $exists: false } },
        { $set: { bookingVersion: 'v1' } }
      );
      console.log(`  Updated ${bookingResult.modifiedCount} bookings to v1`);
    }

    // Also update any bookings that have null bookingVersion
    const bookingsWithNullVersion = await Booking.countDocuments({
      bookingVersion: null,
    });
    if (bookingsWithNullVersion > 0) {
      const nullResult = await Booking.updateMany(
        { bookingVersion: null },
        { $set: { bookingVersion: 'v1' } }
      );
      console.log(`  Updated ${nullResult.modifiedCount} bookings with null version`);
    }

    // 2. Migrate Escrow Payments
    console.log('\nMigrating escrow payments...');
    const escrowsWithoutVersion = await EscrowPayment.countDocuments({
      escrowVersion: { $exists: false },
    });
    console.log(`  Found ${escrowsWithoutVersion} escrows without version`);

    if (escrowsWithoutVersion > 0) {
      const escrowResult = await EscrowPayment.updateMany(
        { escrowVersion: { $exists: false } },
        { $set: { escrowVersion: 'v1' } }
      );
      console.log(`  Updated ${escrowResult.modifiedCount} escrows to v1`);
    }

    // Also update any escrows that have null escrowVersion
    const escrowsWithNullVersion = await EscrowPayment.countDocuments({
      escrowVersion: null,
    });
    if (escrowsWithNullVersion > 0) {
      const nullResult = await EscrowPayment.updateMany(
        { escrowVersion: null },
        { $set: { escrowVersion: 'v1' } }
      );
      console.log(`  Updated ${nullResult.modifiedCount} escrows with null version`);
    }

    // 3. Print summary
    console.log('\n--- Migration Summary ---');

    const bookingStats = await Booking.aggregate([
      { $group: { _id: '$bookingVersion', count: { $sum: 1 } } },
    ]);
    console.log('Booking versions:');
    bookingStats.forEach((s) => console.log(`  ${s._id}: ${s.count}`));

    const escrowStats = await EscrowPayment.aggregate([
      { $group: { _id: '$escrowVersion', count: { $sum: 1 } } },
    ]);
    console.log('Escrow versions:');
    escrowStats.forEach((s) => console.log(`  ${s._id}: ${s.count}`));

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database.');
  }
}

// Run migration
migrate();
