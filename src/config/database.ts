import mongoose from 'mongoose';

// Register connection lifecycle listeners once
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection runtime error:', err);
});

export const connectDB = async (): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production';
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    if (isProd) {
      throw new Error('MONGO_URI is missing in production environment variables.');
    }
    console.warn('MONGO_URI not specified. Falling back to mongodb://localhost:27017/test for development.');
  }

  const uri = mongoUri || 'mongodb://localhost:27017/test';
  const conn = await mongoose.connect(uri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected successfully.');
  }
};
