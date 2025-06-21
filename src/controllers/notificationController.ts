import { Notification, NotificationType } from "@models/notificationModel";
import { Request, Response, NextFunction } from "express";
import { RequestAction, RequestStatus } from "@shared/enums";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import mongoose from "mongoose";
import FriendRequest from "@models/friendRequestModel";
import Activity from "@models/activityModel";
import User from "@models/userModel";

const activityNotification = async (body: any): Promise<any> => {
  if (!body.sender || !body.receiver || !body.activityId) {
    throw createError(StatusCodes.BAD_REQUEST, "Sender, receiver and activityId are required");
  }
  if (body.sender === body.receiver) {
    throw createError(StatusCodes.BAD_REQUEST, "Cannot send a friend request to yourself");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1) Check friendship (inlined via a lookup pipeline)
    const friend = await FriendRequest.findOne({
      $or: [
        { sender: body.sender, receiver: body.receiver, status: RequestStatus.ACCEPTED },
        { sender: body.receiver, receiver: body.sender, status: RequestStatus.ACCEPTED },
      ],
    }).session(session);
    if (!friend) {
      throw createError(409, "You must be friends to invite.");
    }

    // 2) Ensure activity exists and receiver isn't host
    const activity = await Activity.findOne({ _id: body.activityId }).session(session);
    if (!activity) throw createError(404, "Activity not found");
    if (activity.host.equals(body.receiver)) {
      throw createError(409, "Host cannot be invited");
    }

    const exiastingNotification = await Notification.findOne({
      receiver: body.receiver,
      sender: body.sender,
      activityId: body.activityId,
    }).session(session);
    console.log("exiastingNotification", exiastingNotification);
    if (exiastingNotification) {
      throw createError(StatusCodes.CONFLICT, "You have already invited this user to this activity");
    }

    // 3) Create notification, rely on unique index to prevent dups
    const note = await Notification.create(
      [
        {
          receiver: body.receiver,
          sender: body.sender,
          type: body.type,
          activityId: body.activityId,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return note[0];
  } catch (err) {
    await session.abortTransaction();
    throw createError(StatusCodes.INTERNAL_SERVER_ERROR, " Error creating invite activity notification");
  } finally {
    session.endSession();
  }
};

const addFriends = async (body: any): Promise<any> => {
  if (body.sender === body.receiver) {
    throw createError(StatusCodes.BAD_REQUEST, "Cannot send a friend request to yourself");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existingRequest = await FriendRequest.findOne({
      receiver: body.receiver,
      sender: body.sender,
      type: body.type,
    }).session(session);
    if (existingRequest) throw createError(StatusCodes.CONFLICT, "Friend request notification already exists");
    
    const exiastingNotification = await Notification.findOne({
      receiver: body.receiver,
      sender: body.sender,
    }).session(session);
   if(exiastingNotification?.receiver.equals(body.receiver) && exiastingNotification?.sender.equals(body.sender) && exiastingNotification.type === NotificationType.PENDING) {
      throw createError(StatusCodes.CONFLICT, "Notification already exists for this user"); 
  }
    console.log("exiastingNotification", exiastingNotification);

    const notification = await Notification.create(
      [
        {
          receiver: body.receiver,
          sender: body.sender,
          type: body.type,
        },
      ],
      { session }
    );
  // 3) Save it *in* the session
  await session.commitTransaction();
  return notification[0];
 
} catch (err) {
    await session.abortTransaction();
    throw createError(StatusCodes.INTERNAL_SERVER_ERROR, "Error while creating new activity notification");
  } finally {
    session.endSession();
  }
};

const create = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const sender = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(sender)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid sender ID");
    }

    if (req.body.type === NotificationType.InviteToActivity) {
      req.body.sender = sender;
      const success = await activityNotification(req.body);
      if (success) {
        return res
          .status(StatusCodes.CREATED)
          .json({ success: true, message: "Invititation notification created successfully", data: success });
      }
    } else if (req.body.type === NotificationType.NewActivity) {
      req.body.sender = sender;
      const success = await activityNotification(req.body);
      if (success) {
        return res
          .status(StatusCodes.CREATED)
          .json({ success: true, message: "New activity notification created successfully", data: success });
      }
    } else if (
      NotificationType.ACCEPTED === req.body.type ||
      NotificationType.REJECTED === req.body.type ||
      NotificationType.PENDING === req.body.type
    ) {
      req.body.sender = sender;
      const success = await addFriends(req.body);
      if (success) {
        return res
          .status(StatusCodes.CREATED)
          .json({
            success: true,
            message: `Friend status ${req.body.type} notification created successfully`,
            data: success,
          });
      }
    }
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Invalid notification type" });
  } catch (err) {
    next(err);
  }
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req?.user?.userId !== undefined? req.user.userId : req.admin.id;
    console.log("userId", userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const id = req.query.id as string;
    const admin = req.query.isAdmin as string === "true"? true : false;
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createError(StatusCodes.BAD_REQUEST, "Invalid notification ID");
      }

      const notification = await Notification.findOne({ _id: id, receiver: userId }).lean().session(session);

      if (!notification) {
        throw createError(StatusCodes.NOT_FOUND, "Notification not found");
      }
      if (notification.activityId) {
        const activity = await Activity.findById(notification.activityId).lean().session(session);
        if (!activity) {
          throw createError(StatusCodes.NOT_FOUND, "Activity not found");
        }
        // Attach the activity object directly to the notification for response
        (notification as any).data = activity;
      }

      const received = await User.findById(notification.receiver).session(session).lean();
      if (received) {
        (notification as any).data = received;
      }
      // Mark the notification as read
      await Notification.updateOne({ _id: id }, { $set: { read: true } }).session(session);
      // notification.read = true;
      // await notification.save();
      
      await session.commitTransaction();
      session.endSession();

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Notification retrieved successfully",
        data: notification,
      });
    }
    if(admin){
      const notifications = await Notification.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .session(session);
     console.log("notifications", notifications);
      const total = await Notification.countDocuments({}).session(session);
      const totalPages = Math.ceil(total / limit);

      await session.commitTransaction();
      session.endSession();

      return res.status(StatusCodes.OK).json({
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

    const notifications = await Notification.find({ receiver: userId })
      .populate("sender")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .session(session);

    const total = await Notification.countDocuments({ receiver: userId }).session(session);
    const totalPages = Math.ceil(total / limit);

    await session.commitTransaction();
    session.endSession();

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
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
    }

    const result = await Notification.updateMany({ receiver: userId, read: false }, { $set: { read: true } });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const notificationController = {
  create,
  get,
  markAllAsRead,
};

export default notificationController;
