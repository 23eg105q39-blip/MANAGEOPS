import mongoose from 'mongoose';

export async function connectDatabase(uri: string | undefined): Promise<boolean> {
  if (!uri) {
    console.log('[DATABASE] MONGODB_URI is not configured');
    return false;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[DATABASE] MongoDB connected');
    return true;
  } catch (_error) {
    console.error('[DATABASE] MongoDB connection failed');
    return false;
  }
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
