import { Request, Response, NextFunction } from "express";
import User from "@models/userModel";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import to from "await-to-ts";
import Cloudinary from "@shared/cloudinary";

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  let error, user;
  [error, user] = await to(User.findById(userId).populate({ path: "auth", select: "email" }));
  if (error) return next(error);
  if (!user) return next(createError(StatusCodes.NOT_FOUND, "User not found."));
  return res.status(StatusCodes.OK).json({ success: true, message: "User data retrieved successfully.", data: user });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const updates = req.body;

  if (updates.dateOfBirth && updates.dateOfBirth.day) {
    updates.dateOfBirth.day = Number(updates.dateOfBirth.day);
  }

  if (updates.dateOfBirth && updates.dateOfBirth.month) {
    updates.dateOfBirth.month = Number(updates.dateOfBirth.month);
  }
  
  if (updates.dateOfBirth && updates.dateOfBirth.year) {
    updates.dateOfBirth.year = Number(updates.dateOfBirth.year);
  }

  if (updates.footsize) {
    updates.footsize = Number.parseFloat(updates.footsize);
  }

  if (updates.interests) {
    updates.interests = JSON.parse(updates.interests);
  }

  const [error, user] = await to(User.findByIdAndUpdate(userId, { $set: updates }, { new: true }));
  if (error) return next(error);
  if (!user) return next(createError(StatusCodes.NOT_FOUND, "User not found."));

  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: user });
};

const UserController = {
  get,
  update,
};

export default UserController;
