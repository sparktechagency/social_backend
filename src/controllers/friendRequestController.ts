import FriendRequest from "@models/friendRequestModel";
import User from "@models/userModel";
import { RequestStatus } from "@shared/enums";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const findFriends = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user.userId)
    .select("friends")
    .populate({ path: "friends", select: "_id" })
    .lean();
  const friendIds = (user!.friends || []).map((friend: any) => friend._id);
  const [users, total] = await Promise.all([
    User.find({ _id: { $ne: req.user.userId, $nin: friendIds } })
      .populate({ path: "auth", select: "email", match: { auth: { $exists: true } } })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ _id: { $ne: req.user.userId, $nin: friendIds } }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Success",
    data: {
      users: users || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: totalPages,
        hasMore: page < totalPages,
      },
    },
  });
};

const sendFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: req.user.userId, receiver: req.body.receiver, status: RequestStatus.PENDING },
      { sender: req.body.receiver, receiver: req.user.userId, status: RequestStatus.PENDING },
    ],
  });
  if (existingRequest) {
    return res
      .status(StatusCodes.CONFLICT)
      .json({ success: false, message: "Friend request already exists", data: {} });
  }
  const friendRequest = await FriendRequest.create({ sender: req.user.userId, receiver: req.body.receiver });
  res.status(StatusCodes.CREATED).json({ success: true, message: "Success", data: friendRequest });
};

const cancelFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const friendRequest = await FriendRequest.findOneAndDelete({
    sender: req.user.userId,
    receiver: req.body.receiverId,
  });
  if (!friendRequest) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Friend request not found", data: {} });
  }
  res.status(StatusCodes.OK).json({ success: true, message: "Friend request canceled", data: {} });
};
