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
  return res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Activity created successfully.",
    data: activity
  });
};


const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { lat, lng } = req.query;
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;

  if(req.query.id) {
    const id = new Types.ObjectId(req.query.id as string);
    const activity = await Activity.findById(id).lean();
    return res.status(StatusCodes.OK).json({success: true, message: "Success", data: activity});
  }

  const skip = (page - 1) * limit;
  const user = await User.findById(req.user.userId);

  const popularActivities = await Activity.find().sort({ attendees: -1 }).limit(10);
  const popularIds = popularActivities.map((activity) => activity.id);

  const nearbyActivities = await Activity.find({
    _id: { $nin: popularIds },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lat as string), parseFloat(lng as string)]
        },
        $maxDistance: user!.distancePreference
      }
    }
  }).limit(10);
  const nearbyIds = nearbyActivities.map((activity) => activity.id);

  const activities = await Activity.find({ _id: { $nin: [...popularIds, ...nearbyIds] } }).skip(skip).limit(limit).lean();
  const total = await Activity.countDocuments({
    _id: { $nin: [...popularIds, ...nearbyIds] }
  });
  const totalPages = Math.ceil(total / limit);

  return res.status(StatusCodes.OK).json({
    success: true, message: "Success", data: {
      popularActivities, nearbyActivities, activities, pagination: {
        page, limit, total, totalPages
      }
    }
  });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
  remove
};

export default ActivityController;

