import express from "express";
import VersionController from "@controllers/versionController";
import { admin_authorize, authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";

const router = express.Router();

router.get("/", authorize, asyncHandler(VersionController.get));
router.patch("/update", admin_authorize, asyncHandler(VersionController.update));

export default router;