import express from "express";
import UserController from "@controllers/userController";
import { authorize } from "@middlewares/authorization";
import fileUpload from "express-fileupload";
import fileHandler from "@middlewares/fileHandler";

const router = express.Router();

router.get("/", authorize, UserController.get);
router.patch("/update", fileUpload(), fileHandler, authorize, UserController.update);

export default router;
