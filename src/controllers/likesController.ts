import { Request, Response, NextFunction } from "express";
import User from "@models/userModel";
import Like from "@models/likeModel";
import { StatusCodes } from "http-status-codes";
import mongoose, { Types } from "mongoose";
import createError from "http-errors";

const toggleLike = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const likeProfile = req.user.userId;
    const { likeReceived } = req.body;
    console.log("likeProfile", likeProfile, "likeReceived", likeReceived);
     if(likeProfile === likeReceived) {
      throw createError(StatusCodes.BAD_REQUEST, "You cannot like yourself");
     }
    // 1) Validate
    if (!mongoose.Types.ObjectId.isValid(likeReceived)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid likeReceived ID");
    }

    if (!(await User.exists({ _id: likeReceived }))) {
      throw createError(StatusCodes.NOT_FOUND, "Like Received user not found");
    }
    if (!(await User.exists({ _id: likeProfile }))) {
      throw createError(StatusCodes.NOT_FOUND, "Like profile user not found");
    }

    // 2) Toggle
    const existing = await Like.findOne({
      likeProfile: likeProfile,
      likeReceived: likeReceived,
      action: "like",
    }).session(session);

    if (existing) {
      const result = await Like.updateOne(
        { likeProfile: likeProfile, likeReceived: likeReceived, action: "like" },
        { $set: { action: "unlike" } }
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Unlike successfully",
        data: result,
      });
    }
    const like = await Like.create(
      [
        {
          likeProfile: likeProfile,
          LikeReceived: likeReceived,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `like successfully`,
      data: like[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// const getLikes = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const userId = req.user.userId;

//     // Validate user ID
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
//     }

//     // Parse pagination params
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const skip = (page - 1) * limit;



//     const filter = { likeProfile: new mongoose.Types.ObjectId(userId), action: "like" };

//     // Total count
//     const total = await Like.countDocuments(filter);

//     // Fetch paginated likes
//     const likes = await Like.find({ likeProfile: new mongoose.Types.ObjectId(userId), action: "like" }
//     )
//       .populate("LikeReceived")
//       .skip(skip)
//       .limit(limit)
//       .lean()
//       .exec();
    
//     // const userInformation = await User.findById(likes[0].LikeReceived).lean();
//     console.log("likes", likes);
//     const totalPages = Math.ceil(total / limit);

//     return res.status(StatusCodes.OK).json({
//       success: true,
//       message: "Likes profile retrieved successfully",
//       data: likes,
//       pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
//     });
//   } catch (err) {
//     next(err);
//   }
// };

export const getLikes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Start a session for consistent reads
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.userId;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
    }

    // Parse pagination
    const page  = Math.max(1, parseInt(req.query.page as string, 10)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip  = (page - 1) * limit;

    const filter = {
      likeProfile: new mongoose.Types.ObjectId(userId),
      action:      "like"
    };

    // Total count
    const total = await Like.countDocuments(filter).session(session);

    // Fetch the page of likes
    const likes = await Like.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .session(session)
      .exec();

    // Extract unique LikeReceived IDs
    const ids = Array.from(
      new Set(
        likes
          .map(l => l.LikeReceived && l.LikeReceived.toString())
          .filter((id): id is string => Boolean(id))
      )
    );

    // Fetch user docs
    const users = await User.find({ _id: { $in: ids } })
      .select("userName photo age location")
      .lean()
      .session(session)
      .exec();

    // Merge back
    const enriched = likes.map(l => ({
      ...l,
      LikeReceived:
        users.find(u => u._id.toString() === l.LikeReceived.toString()) || null
    }));

    const totalPages = Math.ceil(total / limit);

    await session.commitTransaction();
    session.endSession();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Likes retrieved successfully",
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};


const getReceivedLikes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
    }

    // Parse pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter = { LikeReceived: new mongoose.Types.ObjectId(userId), action: "like" };

    // Total count
    const total = await Like.countDocuments(filter);

    // Fetch paginated likes
    const likes = await Like.find(filter)
      .populate("likeProfile")
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const totalPages = Math.ceil(total / limit);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Likes received retrieved successfully",
      data: likes,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  } catch (err) {
    next(err);
  }
};

const likesController = {
  toggleLike,
  getLikes,
  getReceivedLikes
};
export default likesController;