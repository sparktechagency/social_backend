import { Request, Response, NextFunction } from "express";
import User from "@models/userModel";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import to from "await-to-ts";
import Cloudinary from "@shared/cloudinary";

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const user = await User.findById(req.user.userId).populate({ path: "auth", select: "email" });
  return res.status(StatusCodes.OK).json({ success: true, message: "User data retrieved successfully.", data: user });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const user = await User.findByIdAndUpdate(req.user.userId, { $set: req.body }, { new: true });
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: user });
};

const UserController = {
  get,
  update,
};

export default UserController;
