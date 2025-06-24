import BoostPlanController from "@controllers/boostPlanController";
import express from "express";
import { authorize } from "@middlewares/authorization";
import { asyncHandler, asyncSessionHandler } from "@shared/asyncHandler";

const router = express.Router();

router.post("/payment", authorize, asyncHandler(BoostPlanController.createBoostPlan));
router.get("/payment-status", authorize, asyncHandler(BoostPlanController.updateBoostPlan));

export default router;