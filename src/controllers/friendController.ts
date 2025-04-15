import Friend from "@models/friendModel";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import createError from "http-errors";

const getAllFriends = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  if (!Types.ObjectId.isValid(userId)) {
    throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
  }

  const friends = await Friend.find({
    $or: [{ user1: userId }, { user2: userId }],
  })
    .populate([
      { path: "user1", select: "userName photo" },
      { path: "user2", select: "userName photo" },
    ])
    .select("user1 user2 createdAt")
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  const friendData = friends.map((friend) => {
    const isUser1 = friend.user1._id.toString() === userId;
    return isUser1 ? friend.user2 : friend.user1;
  });

  const total = await Friend.countDocuments({
    $or: [{ user1: userId }, { user2: userId }],
  });
  const totalPages = Math.ceil(total / limit);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Friends retrieved successfully",
    data: friendData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  });
};

const unfriend = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const friendUserId = req.body.friendUserId;
  const userId = req.user.userId;
  const friendShip = await Friend.findOne({
    $or: [
      { user1: userId, user2: friendUserId },
      { user1: friendUserId, user2: userId },
    ],
  });
  if (!friendShip) throw createError(StatusCodes.NOT_FOUND, "No friendship found");
  await Friend.findByIdAndDelete(friendShip._id);
  return res.status(StatusCodes.OK).json({ success: true, message: "User successfully unfriended", data: {} });
};

const FriendController = {
  getAllFriends,
  unfriend,
};

export default FriendController;
