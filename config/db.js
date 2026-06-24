const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chungducquang2_db_user:mqAJWjaR4I6ZXD12@cluster0.3ejijsi.mongodb.net/checklist-board?appName=Cluster0';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Stop server if connection fails
  }
};

module.exports = connectDB;
