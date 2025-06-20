import { Notification, NotificationType } from "@models/notificationModel";
import { Request, Response, NextFunction } from "express";
import { RequestAction, RequestStatus } from "@shared/enums";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import mongoose from "mongoose";
import FriendRequest from "@models/friendRequestModel";
import Activity from "@models/activityModel";
import User from "@models/userModel";


const activityNotification = async(body: any): Promise<any>=> {
    try{
        const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: body.sender, receiver: body.receiver, status: RequestStatus.ACCEPTED },
      { sender: body.receiver, receiver: body.sender, status: RequestStatus.ACCEPTED },
    ],
  });
  if (!existingRequest) throw createError(StatusCodes.CONFLICT, "You must be friends to invite someone to an activity");
  const notification = await Notification.create({
    receiver: body.receiver,
    sender: body.sender,
    type: body.type,
    activityId: body.activityId,
  });
    return notification;
    }
    catch(err) {
        throw createError(StatusCodes.INTERNAL_SERVER_ERROR, "Error while inviting to activity");
    }
};



const addFriends = async (body: any): Promise<any> => {
  try { 
    const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: body.sender, receiver: body.receiver },
      { sender: body.receiver, receiver: body.sender},
    ],
  });
  if (existingRequest) throw createError(StatusCodes.CONFLICT, "Friend request already exists");
    const friendRequest = await Notification.create({
      receiver: body.receiver,
      sender: body.sender,
      type: body.type,
    });  
    return friendRequest;
  } catch (err) {
    throw createError(StatusCodes.INTERNAL_SERVER_ERROR, "Error while creating new activity notification");
  }
};

const create  = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
    const sender = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(sender)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid sender ID");
    }

    if(req.body.type === NotificationType.InviteToActivity) {
      const success = await activityNotification(req.body);
      if (success) {
        return res.status(StatusCodes.CREATED).json({success: true, message: "Invititation notification created successfully", data:success});
      }
    }
    else if(req.body.type === NotificationType.NewActivity) {
      const success = await activityNotification(req.body);  
        if (success) {
            return res.status(StatusCodes.CREATED).json({success: true, message: "New activity notification created successfully", data:success});
        }
    }
    else if(RequestStatus.ACCEPTED === req.body.type || RequestStatus.REJECTED === req.body.type || RequestStatus.PENDING === req.body.type) {
      const success = await addFriends(req.body); 
        if (success) {
            return res.status(StatusCodes.CREATED).json({success: true, message: `Friend status ${req.body.type} notification created successfully`, data:success});
        }
    } 
    return res.status(StatusCodes.BAD_REQUEST).json({success: false, message: "Invalid notification type"});
  } catch (err) {
    next(err);
  }
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try{
  const userId = req.user.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const id = req.query.id as string;
  if(id){
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid notification ID");
    }

    const notification = await Notification.findOne({ _id: id, receiver: userId })
      .populate("sender")
      .lean()
      .exec();

    if (!notification) {
      throw createError(StatusCodes.NOT_FOUND, "Notification not found");
    }
    if(notification.activityId){
        const activity = await Activity.findById(notification.activityId)
            .populate("sender")
            .lean()
            .exec();
        if (!activity) {
            throw createError(StatusCodes.NOT_FOUND, "Activity not found");
        }
        // Attach the activity object directly to the notification for response
        (notification as any).data = activity;
    }
    
    const received = await User.findById(notification.receiver)
    if(received){
        (notification as any).data= received;
    }
    // Mark the notification as read
    notification.read = true;
    await notification.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Notification retrieved successfully",
      data: notification,
    });
  }

  const notifications = await Notification.find({ receiver: userId })
    .populate("sender")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  const total = await Notification.countDocuments({ receiver: userId });
  const totalPages = Math.ceil(total / limit);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Notifications retrieved successfully",
    data: notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  });
    }
    catch (err) {
    next(err);
    }
};

const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
    }

    const result = await Notification.updateMany(
      { receiver: userId, read: false },
      { $set: { read: true } }
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const notificationController = {
  create,
  get,
  markAllAsRead
};

export default notificationController;