import BlockedUserController from "@controllers/blockedUserController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import express from "express";

const router = express.Router();

router.post("/toggle", authorize, asyncHandler(BlockedUserController.blockToggle));
router.get("/", authorize, asyncHandler(BlockedUserController.getAllBlockedUser));

export default router;
