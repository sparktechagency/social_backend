import notificationController from "@controllers/notificationController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import express from "express";

const router = express.Router();

router.post("/create", authorize, asyncHandler(notificationController.create));
router.get("/", authorize, asyncHandler(notificationController.get));
router.patch("/mark-all-as-read", authorize, asyncHandler(notificationController.markAllAsRead));

export default router;
