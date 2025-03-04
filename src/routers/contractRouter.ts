import express from "express";
import ContractController from "@controllers/contractController";
import { admin_authorize, authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";


const router = express.Router();

router.get("/", authorize, asyncHandler(ContractController.get));
router.patch("/update", admin_authorize, asyncHandler(ContractController.update));

export default router;