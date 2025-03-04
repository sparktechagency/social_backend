import { Request, Response, NextFunction } from "express";
import Activity from "@models/activityModel";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";

const create = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
  const activity = new Activity(req.body);
  await activity.save();
  return res.status(StatusCodes.CREATED).json({success: true, message: 'Activity created successfully.', data: activity});
}

const get = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
  const activities = await Activity.find();
  if(activities.length === 0) return res.status(StatusCodes.OK).json({success: true, message: 'No activity found.', data: []});
  return res.status(StatusCodes.OK).json({success: true, message: 'Success', data: activities});
}

const getById = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
  const activity = await Activity.findById(req.params.id);
  if(!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found");
  return res.status(StatusCodes.OK).json({success: true, message: 'Success', data: activity});
}

const update = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
  const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, {new: true});
  if(!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found");
  return res.status(StatusCodes.OK).json({success: true, message: 'Success', data: activity});
}

const remove = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
  const activity = await Activity.findByIdAndDelete(req.params.id);
  if(!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found");
  return res.status(StatusCodes.OK).json({success: true, message: 'Success', data: activity});
}

const ActivityController = {
  create,
  get,
  getById,
  update,
  remove
};

export default ActivityController;

