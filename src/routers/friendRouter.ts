import FriendController from "@controllers/friendController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import express from "express";

const router = express.Router();

router.post("/send-friend-request", authorize, asyncHandler(FriendController.sendFriendRequest));
router.post("/friend-request-action", authorize, asyncHandler(FriendController.friendRequestAction));
router.get("/get-friends", authorize, asyncHandler(FriendController.getFriends));

export default router;