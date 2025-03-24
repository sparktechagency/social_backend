import FriendController from "@controllers/friendController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import express from "express";

const router = express.Router();

router.get("/find-friends", authorize, asyncHandler(FriendController.findFriends));
router.post("/send-friend-request", authorize, asyncHandler(FriendController.sendFriendRequest));
router.post("/cancel-friend-request", authorize, asyncHandler(FriendController.cancelFriendRequest));
router.get("/get-friend-requests", authorize, asyncHandler(FriendController.getFriendRequests));
router.post("/friend-request-action", authorize, asyncHandler(FriendController.friendRequestAction));
router.get("/get-friends", authorize, asyncHandler(FriendController.getFriends));
router.delete("/remove-friend", authorize, asyncHandler(FriendController.removeFriend));
router.get("/get-mutual-friends", authorize, asyncHandler(FriendController.getMutualFriends));

export default router;
