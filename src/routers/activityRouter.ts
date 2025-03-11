import express from "express";
import ActivityController from "@controllers/activityController";
import { asyncHandler } from "@shared/asyncHandler";
const router = express.Router();

router.post("/create", asyncHandler(ActivityController.create));
// router.get("/:id", asyncHandler(ActivityController.getById));
router.get("/", asyncHandler(ActivityController.get));
router.patch("/update/:id", asyncHandler(ActivityController.update));
router.delete("/delete/:id", asyncHandler(ActivityController.remove));

export default router;