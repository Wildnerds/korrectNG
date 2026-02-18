import mongoose from 'mongoose';
import { log } from '../utils/logger';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/korrectng';
  try {
    const conn = await mongoose.connect(uri);
    log.info('MongoDB connected', { host: conn.connection.host });
  } catch (error) {
    log.error('MongoDB connection error', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
}
