import mongoose from "mongoose";
import "dotenv/config";
import { logger } from "@shared/logger";

const clientOptions = {
  serverApi: { version: "1" as const, strict: true, deprecationErrors: true },
};

export async function connectDB() {
  try {
    await mongoose.connect(process.env.ATLAS_URI!,  clientOptions);
    await mongoose.connection.db!.admin().command({ ping: 1 });
    const dbName = mongoose.connection.db?.databaseName;
   logger.info(`Successfully Connected to MongoDB Atlas`);
   logger.info(`Database name: ${dbName}`);

  } catch (error) {
    logger.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};


