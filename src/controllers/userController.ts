import { Request, Response, NextFunction } from "express";
import User from "@models/userModel";
import { StatusCodes } from "http-status-codes";
import Friend from "@models/friendModel";
import { checkFriendship } from "@services/friendServices";
import FriendRequest from "@models/friendRequestModel";
import BlockedUser from "@models/blockedUserModel";
import { Types } from "mongoose";
import { checkFriendRequest } from "@services/friendRequestServices";
import path from "path";
import { unlink } from "fs";

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const isAll = req.query.all;
  const userId = req.query.userId as string;
  if (isAll === "true") {
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find().populate({ path: "auth", select: "email" }).skip(skip).limit(limit).lean(),
      User.countDocuments(),
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
        },
      },
    });
  }
  if (userId) {
    const user = await User.findById(userId).populate({ path: "auth", select: "email" }).lean();
    const isFriend = await checkFriendship(req.user.userId, userId);
    const friendRequestStatus = await checkFriendRequest(req.user.userId, userId);
    const userData = { ...user, isFriend, friendRequestStatus };
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "User data retrieved successfully.", data: userData });
  }
  const user = await User.findById(req.user.userId).populate({ path: "auth", select: "email" }).lean();
  return res.status(StatusCodes.OK).json({ success: true, message: "User data retrieved successfully.", data: user });
};

const findFriends = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const currentUser = await User.findById(userId).select("location distancePreference").lean();
  const maxDistance =  currentUser!.distancePreference? currentUser!.distancePreference*1609.344: 0;

  const friendships = await Friend.find({
    $or: [{ user1: userId }, { user2: userId }],
  }).lean();
  const friendIds = friendships.map((friendship) =>
    friendship.user1.toString() === userId ? friendship.user2 : friendship.user1
  );

  const pendingRequests = await FriendRequest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "pending",
  }).lean();
  const pendingIds = pendingRequests.map((request) =>
    request.sender.toString() === userId ? request.receiver : request.sender
  );

  const blockedUsers = await BlockedUser.find({ blocker: userId }).select("blocked").lean();
  const blockedIds = blockedUsers.map((b) => b.blocked);

  const excludeIds = [...friendIds, ...pendingIds, ...blockedIds, new Types.ObjectId(userId as string)];
  console.log("maxDistance: ", maxDistance);
  // const miles = currentUser.distancePreference ?? 0;  
  // const maxDistance = Math.max(0, miles * 1_609.344);
  
  const users = await User.aggregate([
    {
      $geoNear: {
      near: currentUser!.location,
      distanceField: "distance",
      maxDistance,
      query: { _id: { $nin: excludeIds } },
      spherical: true,
    },
    },
    {
      $lookup: {
        from: "auths",
        localField: "auth",
        foreignField: "_id",
        as: "auth",
      },
    },
    {
      $unwind: {
        path: "$auth",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        _id: 1,
        userName: 1,
        age: 1,
        photo: 1,
        "location.type": 1,
        "location.coordinates": 1,
        "location.placeName": 1,
        "auth.email": 1,
        distanceMiles: { $divide: ["$distance", 1609.344] }, // Meters to miles
      },
    },
    { $skip: skip },
    { $limit: limit },
  ]);

  const total = await User.countDocuments({
    _id: { $nin: excludeIds },
    location: {
      $geoWithin: {
        $centerSphere: [currentUser!.location.coordinates, maxDistance / 6378137],
      },
    },
  });

  const totalPages = Math.ceil(total / limit);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Potential friends retrieved successfully",
    data: {
      users: users.map((user) => ({
        _id: user._id,
        userName: user.userName,
        age: user.age,
        photo: user.photo,
        location: {
          type: user.location.type,
          coordinates: user.location.coordinates,
          placeName: user.location.placeName,
        },
        auth: { email: user.auth.email },
        distanceMiles: user.distanceMiles,
      })),
      pagination: {
        page: page,
        limit: limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    },
  });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  console.log(req.files)
   // if there are uploaded files
    if (Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      // map each file to just its filename (or path)
      
    req.body.photo = files
    .map(f => `uploads\\${f.filename}`)
    .filter(Boolean);

    }

  const user = await User.findByIdAndUpdate(req.user.userId, { $set: req.body }, { new: true });
  // console.log("Updated user: ", user);
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: user });
};

const UserController = {
  get,
  update,
  findFriends,
};

export default UserController;
