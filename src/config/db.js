const mongoose = require('mongoose');

const connectDB = async (uri) => {
  const dbUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/policy_assessment_db';
  try {
    const conn = await mongoose.connect(dbUri, {
      autoIndex: true
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error(`[MongoDB] Disconnection error: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
