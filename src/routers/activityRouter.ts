import express from "express";
import ActivityController from "@controllers/activityController";
import { asyncHandler } from "@shared/asyncHandler";
import { authorize } from "@middlewares/authorization";
const router = express.Router();

router.post("/create", authorize, asyncHandler(ActivityController.create));
// router.get("/:id", asyncHandler(ActivityController.getById));
router.get("/", asyncHandler(ActivityController.get));
router.patch("/update/:id", asyncHandler(ActivityController.update));
router.delete("/delete/:id", asyncHandler(ActivityController.remove));

export default router;