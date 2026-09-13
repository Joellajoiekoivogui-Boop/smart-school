const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  console.log(`[db] Connecte a MongoDB (${env.nodeEnv})`);
}

module.exports = connectDB;
