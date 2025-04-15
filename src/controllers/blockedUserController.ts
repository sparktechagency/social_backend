import BlockedUser from "@models/blockedUserModel";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const blockToggle = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const targetUserId = req.body.targetUserId;
  const blockedUser = await BlockedUser.findOne({ blocker: req.user.userId, blocked: targetUserId });
  if (!blockedUser) {
    const blockedUser = await BlockedUser.create({ blocker: req.user.userId, blocked: targetUserId });
    return res.status(StatusCodes.OK).json({ success: true, message: "User blocked successfully", data: blockedUser });
  }
  await BlockedUser.findByIdAndDelete(blockedUser._id);
  return res.status(StatusCodes.OK).json({ success: true, message: "User unblocked successfully", data: {} });
};

const getAllBlockedUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const [blockedUsers, total] = await Promise.all([
    BlockedUser.find({ blocker: req.user.userId }).populate("blocked").skip(skip).limit(limit).lean(),
    BlockedUser.countDocuments({ blocker: req.user.userId }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Success",
    data: {
      users: blockedUsers || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: totalPages,
      },
    },
  });
};

const BlockedUserController = {
  blockToggle,
  getAllBlockedUser,
};

export default BlockedUserController;
