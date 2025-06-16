import express from "express";
import UserController from "@controllers/userController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import { upload } from "@utils/multerConfig";

const router = express.Router();

router.get("/find-friends", authorize, asyncHandler(UserController.findFriends));
router.get("/", authorize, asyncHandler(UserController.get));
router.patch("/update", authorize, upload.array("photo", 10), asyncHandler(UserController.update));
export default router;
