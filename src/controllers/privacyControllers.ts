import Privacy from "@models/privacyModel";
import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";

const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "`text` is required and must be a string" });
    }

    const policy = new Privacy({ text });
    await policy.save();

    return res.status(StatusCodes.CREATED).json({ success: true, message: "Policy created", data: policy });
  } catch (err) {
    next(err);
  }
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const privacy = await Privacy.findOne();
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Privacy policy retrieved successfully", data: privacy });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { text } = req.body;
  if (!text) return next(createError(StatusCodes.BAD_REQUEST, "No text provided!"));
  const privacy = await Privacy.findOneAndUpdate({}, { text: text }, { new: true });
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Privacy policy updated successfully", data: privacy });
};

const PrivacyController = {
  create,
  get,
  update,
};

export default PrivacyController;
