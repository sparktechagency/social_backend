import express from "express";
import likesController from "@controllers/likesController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";

const router = express.Router();
router.post("/toggle", authorize, asyncHandler(likesController.toggleLike));
router.get("/get-likes", authorize, asyncHandler(likesController.getLikes));
router.get("/get-received-likes", authorize, asyncHandler(likesController.getReceivedLikes));
export default router;
