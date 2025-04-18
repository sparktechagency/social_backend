import { Request, Response, NextFunction } from "express";
import Activity from "@models/activityModel";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import User from "@models/userModel";
import { Types } from "mongoose";

const create = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  req.body.host = req.user.userId;
  const activity = new Activity(req.body);
  await activity.save();
  await User.findByIdAndUpdate(req.user.userId, { $addToSet: { activities: activity._id as Types.ObjectId } });
  return res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Activity created successfully.",
    data: activity,
  });
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const { search } = req.query;

  const baseFilter: any = {};
  if (search) {
    const searchRegex = new RegExp(search as string, "i");
    baseFilter.$or = [{ name: searchRegex }, { activityType: searchRegex }];
  }

  if (req.query.id) {
    const activity = await Activity.findById(new Types.ObjectId(req.query.id as string))
      .populate("host")
      .populate("attendeesIds")
      .lean();
    if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found!");
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Success",
      data: activity,
    });
  }

  const mine = req.query.mine as string;
  const friends = req.query.friends as string;
  const joined = req.query.joined as string;

  console.log(mine);
  console.log(typeof mine);

  if (mine || friends || joined) {
    const userId = req.user.userId;
    const responseData: any = {};
    let activities: any[] = [];
    let total: number = 0;
    let filter: any;

    if (mine === "true") {
      filter = { host: userId };
      [activities, total] = await Promise.all([
        Activity.find(filter).skip(skip).limit(limit).lean(),
        Activity.countDocuments(filter),
      ]);

      responseData.mine = {
        activities,
        metadata: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else if (joined === "true") {
      filter = { attendeesIds: userId };
      [activities, total] = await Promise.all([
        Activity.find(filter).skip(skip).limit(limit).lean(),
        Activity.countDocuments(filter),
      ]);

      responseData.joined = {
        activities,
        metadata: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else if (friends === "true") {
      const user = await User.findById(userId).select("friends").lean();
      //   const friendIds = user?.friends || [];

      //   const [publicActivities, publicTotal, privateActivities, privateTotal] = await Promise.all([
      //     Activity.find({ host: { $in: friendIds }, isPrivateActivity: false })
      //       .skip(skip)
      //       .limit(limit)
      //       .lean(),
      //     Activity.countDocuments({ host: { $in: friendIds }, isPrivateActivity: false }),

      //     Activity.find({ host: { $in: friendIds }, isPrivateActivity: true })
      //       .skip(skip)
      //       .limit(limit)
      //       .lean(),
      //     Activity.countDocuments({ host: { $in: friendIds }, isPrivateActivity: true }),
      //   ]);

      //   responseData.friendsPublic = {
      //     activities: publicActivities,
      //     metadata: { page, limit, total: publicTotal, totalPages: Math.ceil(publicTotal / limit) },
      //   };

      //   responseData.friendsPrivate = {
      //     activities: privateActivities,
      //     metadata: { page, limit, total: privateTotal, totalPages: Math.ceil(privateTotal / limit) },
      //   };
      // }
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Success",
      data: responseData,
    });
  }

  const { lat, lng } = req.query;

  if (!lat && !lng && isNaN(parseFloat(lat as string)) && isNaN(parseFloat(lng as string))) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Valid latitude and longitude parameters are required",
      data: {},
    });
  }

  const parsedLat = parseFloat(lat as string);
  const parsedLng = parseFloat(lng as string);
  const user = await User.findById(req.user.userId)!;

  const popularPublic = await Activity.find({ ...baseFilter, isPrivateActivity: false })
    .sort({ attendees: -1 })
    .limit(10)
    .lean();

  const popularPrivate = await Activity.find({ ...baseFilter, isPrivateActivity: true })
    .sort({ attendees: -1 })
    .limit(10)
    .lean();

  const popularIds = [...popularPublic.map((a) => a._id), ...popularPrivate.map((a) => a._id)];

  const nearbyPublic = await Activity.find({
    ...baseFilter,
    _id: { $nin: popularIds },
    isPrivateActivity: false,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
        $maxDistance: user!.distancePreference,
      },
    },
  })
    .limit(10)
    .lean();

  const nearbyPrivate = await Activity.find({
    ...baseFilter,
    _id: { $nin: popularIds },
    isPrivateActivity: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parsedLng, parsedLat] },
        $maxDistance: user!.distancePreference,
      },
    },
  })
    .limit(10)
    .lean();

  const nearbyIds = [...nearbyPublic.map((a) => a._id), ...nearbyPrivate.map((a) => a._id)];

  const [activitiesPublic, activitiesPublicTotal, activitiesPrivate, activitiesPrivateTotal] = await Promise.all([
    Activity.find({ ...baseFilter, _id: { $nin: [...popularIds, ...nearbyIds] }, isPrivateActivity: false })
      .skip(skip)
      .limit(limit)
      .lean(),
    Activity.countDocuments({ ...baseFilter, _id: { $nin: [...popularIds, ...nearbyIds] }, isPrivateActivity: false }),

    Activity.find({ ...baseFilter, _id: { $nin: [...popularIds, ...nearbyIds] }, isPrivateActivity: true })
      .skip(skip)
      .limit(limit)
      .lean(),
    Activity.countDocuments({ ...baseFilter, _id: { $nin: [...popularIds, ...nearbyIds] }, isPrivateActivity: true }),
  ]);

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Success",
    data: {
      popularPublic,
      popularPrivate,
      nearbyPublic,
      nearbyPrivate,
      activitiesPublic: {
        activities: activitiesPublic,
        metadata: { page, limit, total: activitiesPublicTotal, totalPages: Math.ceil(activitiesPublicTotal / limit) },
      },
      activitiesPrivate: {
        activities: activitiesPrivate,
        metadata: { page, limit, total: activitiesPrivateTotal, totalPages: Math.ceil(activitiesPrivateTotal / limit) },
      },
    },
  });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const activity = await Activity.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found");
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: activity });
};

const remove = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const activity = await Activity.findByIdAndDelete(req.params.id);
  if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found");
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: activity });
};

const ActivityController = {
  create,
  get,
  update,
  remove,
};

export default ActivityController;
