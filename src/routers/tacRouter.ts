import express from "express";
import TaCController from "@controllers/tacControllers";

const router = express.Router();

router.post("/create", TaCController.create);
router.get("/", TaCController.get);
router.patch("/update", TaCController.update);

export default router;