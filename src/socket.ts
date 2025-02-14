import { Socket, Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "@shared/logger";

const onlineUsers = new Map<string, string>();

const initializeSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });
  io.on("connection", (socket: Socket) => {
    logger.info("⚡ User connected: ${socket.id}");

    socket.on("user-online", (userId: string) => {
      onlineUsers.set(userId, socket.id);
      logger.info("✅ User ${userId} is online");
    });

    socket.on("disconnect", () => {
      onlineUsers.forEach((value: string, key: string) => {
        if (value == socket.id) {
          onlineUsers.delete(key);
          logger.info(`❌ User ${key} went offline`);
        }
      });
    });
  });
};

export default initializeSocket;
