import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      /*useNewUrlParser: true,
      useUnifiedTopology: true,*/
    });
    console.log(`Mongo connected: ${conn.connection.host}`); // dev log
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1); // exit on fail, add retry in prod
  }
};

export default connectDB;