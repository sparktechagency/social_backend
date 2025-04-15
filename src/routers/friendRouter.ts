import FriendController from "@controllers/friendController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import express from "express";

const router = express.Router();

router.get("/", authorize, asyncHandler(FriendController.getAllFriends));
router.delete("/unfriend", authorize, asyncHandler(FriendController.unfriend));

export default router;
