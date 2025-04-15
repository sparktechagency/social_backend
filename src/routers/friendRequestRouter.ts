import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import FriendRequestController from "@controllers/friendRequestController";
import express from "express";

const router = express.Router();

router.post("/send", authorize, asyncHandler(FriendRequestController.sendFriendRequest));
router.post("/cancel", authorize, asyncHandler(FriendRequestController.cancelFriendRequest));
router.get("/", authorize, asyncHandler(FriendRequestController.getFriendRequests));
router.post("/action", authorize, asyncHandler(FriendRequestController.friendRequestAction));

export default router;
