import express from "express";
import ActivityController from "@controllers/activityController";
import { asyncHandler } from "@shared/asyncHandler";
import { authorize } from "@middlewares/authorization";
import ActivityServices from "@services/activityServices";
const router = express.Router();

router.post("/create", authorize, asyncHandler(ActivityController.create));
router.get("/", authorize, asyncHandler(ActivityController.get));
router.patch("/update/:id", asyncHandler(ActivityController.update));
router.delete("/delete/:id", asyncHandler(ActivityController.remove));

router.post("/attend-activity", authorize, asyncHandler(ActivityServices.attendActivity));
router.post("/cancel-request", authorize, asyncHandler(ActivityServices.cancelRequest));
router.get("/get-activity-requests", authorize, asyncHandler(ActivityServices.getActivityRequests));
router.post("/activity-request-action", authorize, asyncHandler(ActivityServices.activityRequestAction));

export default router;
