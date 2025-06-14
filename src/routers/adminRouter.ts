import express from "express";
import { asyncHandler } from "@shared/asyncHandler";
import { admin_authorize } from "@middlewares/authorization";
import AdminController from "@controllers/adminController";

const router = express.Router();

router.post("/register", asyncHandler(AdminController.register));
router.post("/login", asyncHandler(AdminController.login));
router.post("/recovery", asyncHandler(AdminController.recovery));
router.post("/recovery-verification", asyncHandler(AdminController.recoveryVerification));
router.post("/reset-password", asyncHandler(AdminController.resetPassword));
router.post("/change-password", admin_authorize, asyncHandler(AdminController.changePassword));

export default router;