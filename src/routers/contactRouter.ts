import express from "express";
import ContactController from "@controllers/contactController";
import { admin_authorize, authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";


const router = express.Router();

router.get("/", authorize, asyncHandler(ContactController.get));
router.patch("/update", admin_authorize, asyncHandler(ContactController.update));

export default router;