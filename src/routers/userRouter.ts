import express from "express";
import UserController from "@controllers/userController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";

const router = express.Router();

router.get("/", authorize, asyncHandler(UserController.get));
router.patch("/update", authorize, asyncHandler(UserController.update));

export default router;
