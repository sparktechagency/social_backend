import Friend from "@models/friendModel";
import FriendRequest from "@models/friendRequestModel";
import User from "@models/userModel";
import { RequestAction, RequestStatus } from "@shared/enums";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import mongoose from "mongoose";
import BlockedUser from "@models/blockedUserModel";

const sendFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: req.user.userId, receiver: req.body.receiver, status: RequestStatus.PENDING },
      { sender: req.body.receiver, receiver: req.user.userId, status: RequestStatus.PENDING },
    ],
  });
  if (existingRequest) throw createError(StatusCodes.CONFLICT, "Friend request already exists");

  const friendRequest = await FriendRequest.create({ sender: req.user.userId, receiver: req.body.receiver });
  res.status(StatusCodes.CREATED).json({ success: true, message: "Success", data: friendRequest });
};

// const cancelFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
//   const friendRequest = await FriendRequest.findOneAndDelete({
//     sender: req.user.userId,
//     receiver: req.body.userId,
//   });
//   console.log("sender", req.user.userId, " reveiver", req.body.userId, "friendRequest", friendRequest);
//   if (!friendRequest) {
//     return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Friend request not found", data: {} });
//   }
//   res.status(StatusCodes.OK).json({ success: true, message: "Friend request canceled", data: {} });
// };

const cancelFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const { senderId } = req.body; 
  // validate
  if (!mongoose.Types.ObjectId.isValid(senderId)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid senderId" });
  }

  // delete the request where *you* were the receiver
  const fr = await FriendRequest.findOneAndDelete({
    sender: senderId,
    receiver: userId,
  });

  if (!fr) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Friend request not found" });
  }

  return res.status(StatusCodes.OK).json({ success: true, message: "Friend request canceled", data: {} });
};

const getFriendRequests = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const type = req.query.type as string;
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  if (type === "sent") {
    const [sentRequests, total] = await Promise.all([
      FriendRequest.find({ sender: req.user.userId, status: RequestStatus.PENDING })
        .populate("receiver")
        .skip(skip)
        .limit(limit)
        .lean(),
      FriendRequest.countDocuments({ sender: req.user.userId, status: RequestStatus.PENDING }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Success",
      data: {
        sentRequests: sentRequests || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } else if (type === "received") {
    const [receivedRequests, total] = await Promise.all([
      FriendRequest.find({ receiver: req.user.userId, status: RequestStatus.PENDING })
        .populate("sender")
        .skip(skip)
        .limit(limit)
        .lean(),
      FriendRequest.countDocuments({ receiver: req.user.userId, status: RequestStatus.PENDING }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Success",
      data: {
        receivedRequests: receivedRequests || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  }
};

const friendRequestAction = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { senderId, action } = req.body;
  const userId = req.user.userId;
  console.log("senderId", senderId, " userId", userId, "action", action);

  if (!mongoose.Types.ObjectId.isValid(senderId)) throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");

  if (![RequestAction.ACCEPTED, RequestAction.REJECTED].includes(action))
    throw createError(StatusCodes.BAD_REQUEST, "Invalid action");

  const session = req.session;
  console.log("session", session);
  const existingRequest = await FriendRequest.findOne({ sender: senderId, receiver: userId }).session(session);
  if (!existingRequest) throw createError(StatusCodes.NOT_FOUND, "Friend request not found");

  const existingFriendship = await Friend.findOne({
    $or: [
      { user1: userId, user2: senderId },
      { user1: senderId, user2: userId },
    ],
  }).session(session);
  if (existingFriendship) throw createError(StatusCodes.CONFLICT, "Friendship already exists.");

  // existingRequest.status = action;
  // await existingRequest.save({ session });

  // let friendship = null;
  // if (action === RequestAction.ACCEPTED)
  //   friendship = await Friend.create({ user1: userId, user2: senderId }, { session });

  // res.status(action === RequestAction.ACCEPTED ? StatusCodes.CREATED : StatusCodes.OK).json({
  //   success: true,
  //   message: `Friend request ${action} successfully`,
  //   data: action === RequestAction.ACCEPTED ? friendship : existingRequest,
  // });

  existingRequest.status = action;
  await existingRequest.save({ session });

  let friendship = null;
  if (action === RequestAction.ACCEPTED) {
    // instantiate a doc and save with the session
    friendship = await new Friend({
      user1: userId,
      user2: senderId,
    }).save({ session });
  }

  return res.status(action === RequestAction.ACCEPTED ? StatusCodes.CREATED : StatusCodes.OK).json({
    success: true,
    message: `Friend request ${action} successfully`,
    data: action === RequestAction.ACCEPTED ? friendship : existingRequest,
  });
};

const FriendRequestController = {
  sendFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
  friendRequestAction,
};

export default FriendRequestController;
