import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL as string);
    console.log("DB connected (seed)");
  } catch (error) {
    console.error("DB connection failed", error);
    process.exit(1);
  }
};
