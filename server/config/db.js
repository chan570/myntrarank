import mongoose from 'mongoose';

export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trustrank';
  
  try {
    console.log(`📡 Connecting to MongoDB Database (${mongoURI.includes('mongodb+srv') ? 'MongoDB Atlas Cloud' : 'Local Instance'})...`);
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000 // Timeout after 3s if local MongoDB is not running
    });
    
    console.log(`✅ Database Connected Successfully: ${mongoose.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB Connection Failed: ${error.message}`);
    console.log(`⚡ Falling back to In-Memory Cloud Database Engine for local execution...`);
    return false;
  }
}
