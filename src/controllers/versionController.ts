import { NextFunction, Request, Response } from "express";
import Version from "@models/versionModel";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";

const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "`text` is required" });
    }

    const version = new Version({ text });
    await version.save();

    res.status(StatusCodes.CREATED).json({ success: true, message: "Version created", data: version });
  } catch (err) {
    next(err);
  }
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const version = await Version.findOne();
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Version information retrieved successfully", data: version });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { text } = req.body;
  if (!text) return next(createError(StatusCodes.BAD_REQUEST, "No text provided!"));
  const version = await Version.findOneAndUpdate({}, { text: text }, { new: true });
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Version information updated successfully", data: version });
};

const VersionController = {
  create,
  get,
  update,
};
export default VersionController;
