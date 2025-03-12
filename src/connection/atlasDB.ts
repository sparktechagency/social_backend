import mongoose from "mongoose";
import "dotenv/config";
import { logger } from "@shared/logger";

const clientOptions = {
  serverApi: { version: "1" as const, strict: true, deprecationErrors: true },
};

export async function connectDB(dbName: string) {
  try {
    const uri = process.env.ATLAS_URI!.replace(/database/, dbName);
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db!.admin().command({ ping: 1 });
    logger.info(`Successfully Connected to MongoDB Atlas with DB: ${dbName}`);
  } catch (error) {
    logger.error(`Failed to connect to MongoDB for DB: ${dbName}`, error);
    process.exit(1);
  }
}
