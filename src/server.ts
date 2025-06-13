import http from "http";
import app from "./app";
import { connectDB } from "@connection/atlasDB";
// import { connectDB } from "@connection/db";
import { logger } from "@shared/logger";
import initializeSocket from "./socket";
import Admin from "@models/adminModel";
import Privacy from "@models/privacyModel";
import TaC from "@models/tacModel";
import Contract from "@models/contactModel";
import Version from "@models/versionModel";
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // await connectDB(process.env.ATLAS_URI as string);
    await connectDB();

    const server = http.createServer(app);
    initializeSocket(server);

    // await Admin.findOrCreate();
    // await Privacy.findOrCreate();
    // await TaC.findOrCreate();
    // await Contract.findOrCreate();
    // await Version.findOrCreate();

    const shutdown = () => {
      logger.info("Shutting down server...");
      server.close((err) => {
        if (err) {
          logger.error("Error during server close:", err);
          process.exit(1);
        }
        logger.info("Server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    server.listen(PORT, () => {
      logger.info(`Server is running at PORT: ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
