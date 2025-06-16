import express from "express";
import ActivityController from "@controllers/activityController";
import { asyncHandler } from "@shared/asyncHandler";
import { authorize } from "@middlewares/authorization";
import ActivityServices from "@services/activityServices";
import { upload } from "@utils/multerConfig";
const router = express.Router();

router.post("/create", authorize, upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "venue",     maxCount: 1 },
  ]),
 asyncHandler(ActivityController.create));
router.get("/", authorize, asyncHandler(ActivityController.get));
router.patch("/update/:id", upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "venue",     maxCount: 1 },
  ]), asyncHandler(ActivityController.update));
router.delete("/delete/:id", asyncHandler(ActivityController.remove));

router.post("/attend-activity", authorize, asyncHandler(ActivityServices.attendActivity));
router.post("/cancel-attendance", authorize, asyncHandler(ActivityServices.cancelAttendingActivity));
router.post("/cancel-request", authorize, asyncHandler(ActivityServices.cancelRequest));
router.get("/get-activity-requests", authorize, asyncHandler(ActivityServices.getActivityRequests));
router.post("/activity-request-action", authorize, asyncHandler(ActivityServices.activityRequestAction));


export default router;
