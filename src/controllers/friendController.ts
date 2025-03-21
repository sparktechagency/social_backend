import Friend from "@models/friendModel";
import User from "@models/userModel";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

/**
 * Finds potential friends not in current user's network
 * @query page - Pagination page number
 * @query limit - Items per page
 * @returns Paginated list of non-connected users
 */
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

/**
 * Sends a friend request to another user
 * @body receiver - ID of the user to send the request to
 * @returns Created friend request
 */
const sendFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const existingRequest = await Friend.findOne({
    sender: req.user.userId,
    receiver: req.body.receiver,
    status: "pending",
  });
  if (existingRequest) {
    return res.status(StatusCodes.CONFLICT).json({ success: false, message: "Friend request already sent", data: {} });
  }
  const friendRequest = await Friend.create({ sender: req.user.userId, receiver: req.body.receiver });
  res.status(StatusCodes.CREATED).json({ success: true, message: "Success", data: friendRequest });
};

/**
 * Cancels a pending friend request
 * @body id - ID of the friend request to cancel
 * @returns Success message
 */
const cancelFriendRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const friendRequest = await Friend.findOneAndDelete({
    _id: req.body.id,
    sender: req.user.userId,
    status: "pending",
  });
  if (!friendRequest) {
    return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Friend request not found", data: {} });
  }
  res.status(StatusCodes.OK).json({ success: true, message: "Friend request canceled", data: {} });
};

/**
 * Retrieves friend requests for the current user
 * @query type - Type of requests to fetch (sentRequests or receivedRequests)
 * @query page - Pagination page number
 * @query limit - Items per page
 * @returns Paginated list of friend requests
 */
const getFriendRequests = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const type = req.query.type as string;
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  if (type === "sentRequests") {
    const [sentRequests, total] = await Promise.all([
      Friend.find({ sender: req.user.userId, status: "pending" }).populate("receiver").skip(skip).limit(limit).lean(),
      Friend.countDocuments({ sender: req.user.userId, status: "pending" }),
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
  } else if (type === "receivedRequests") {
    const [receivedRequests, total] = await Promise.all([
      Friend.find({ receiver: req.user.userId, status: "pending" }).populate("sender").skip(skip).limit(limit).lean(),
      Friend.countDocuments({ receiver: req.user.userId, status: "pending" }),
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

/**
 * Handles friend request actions (accept or reject)
 * @body id - ID of the friend request to act on
 * @body action - Action to perform (accepted or rejected)
 * @returns Success message
 */
const friendRequestAction = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const friendRequest = await Friend.findByIdAndUpdate(req.body.id, { status: req.body.action }, { new: true });
  if (req.body.action === "accepted") {
    await User.findByIdAndUpdate(friendRequest!.sender, { $addToSet: { friends: friendRequest!.receiver } });
    await User.findByIdAndUpdate(friendRequest!.receiver, { $addToSet: { friends: friendRequest!.sender } });
  }
  res.status(StatusCodes.CREATED).json({ success: true, message: "Friend request " + req.body.action, data: {} });
};

/**
 * Retrieves the current user's friends
 * @returns List of friends
 */
const getFriends = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const user = await User.findById(req.user.userId).select("friends").populate("friends").lean();
  res.status(StatusCodes.OK).json({ success: true, message: "Success", data: user!.friends || [] });
};

/**
 * Removes a friend from the user's friend list
 * @body friendId - ID of the friend to remove
 * @returns Success message
 */
const removeFriend = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const friendId = req.body.friendId;

  await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
  await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

  await Friend.findOneAndDelete({
    $or: [
      { sender: userId, receiver: friendId, status: "accepted" },
      { sender: friendId, receiver: userId, status: "accepted" },
    ],
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Friend removed successfully",
    data: {},
  });
};

/**
 * Retrieves mutual friends between the current user and another user
 * @query targetUserId - ID of the other user
 * @returns List of mutual friends
 */
const getMutualFriends = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const targetUser = await User.findById(req.query.targetUserId).select("friends").lean();

  if (!targetUser) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Target user not found" });

  const mutualFriends = targetUser.friends.filter((friendId) => targetUser.friends.includes(friendId));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Mutual friends retrieved successfully",
    data: mutualFriends,
  });
};

const FriendController = {
  findFriends,
  sendFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
  friendRequestAction,
  getFriends,
  removeFriend,
  getMutualFriends,
};

export default FriendController;
