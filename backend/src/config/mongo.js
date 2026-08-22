import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codex';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected:', uri.split('@').pop() || uri);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}
