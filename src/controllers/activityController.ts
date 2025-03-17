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
    data: activity
  });
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const page = Number.parseInt(req.query.page as string) || 1;
  const limit = Number.parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const { search } = req.query;

  const baseFilter: any = {};
  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    baseFilter.$or = [
      { name: searchRegex },
      { activityType: searchRegex }
    ];
  }

  if (req.query.id) {
    const activity = await Activity.findById(new Types.ObjectId(req.query.id as string)).lean();
    if(!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found!");
    return res.status(StatusCodes.OK).json({ 
      success: true, 
      message: "Success", 
      data: activity 
    });
  }

  const mine = req.query.mine as string;
  const friends = req.query.friends as string;
  if (mine || friends) {
    const user = await User.findById(req.user.userId).select("friends").lean()!;
    const responseData: any = {};

    if (mine === "true") {
      const filter = { ...baseFilter, host: user!._id };
      const [activities, total] = await Promise.all([
        Activity.find(filter).skip(skip).limit(limit).lean(),
        Activity.countDocuments(filter)
      ]);
      
      responseData.mine = {
        activities,
        metadata: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    if (friends === "true") {
      const filter = { ...baseFilter, host: { $in: user!.friends } };
      const [activities, total] = await Promise.all([
        Activity.find(filter).skip(skip).limit(limit).lean(),
        Activity.countDocuments(filter)
      ]);

      responseData.friends = {
        activities,
        metadata: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Success",
      data: responseData
    });
  }

  const { lat, lng } = req.query;
  
  if (!lat || !lng || isNaN(parseFloat(lat as string)) || isNaN(parseFloat(lng as string))) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Valid latitude and longitude parameters are required"
    });
  }

  const parsedLat = parseFloat(lat as string);
  const parsedLng = parseFloat(lng as string);
  const user = await User.findById(req.user.userId)!;

  const popularFilter = { ...baseFilter };
  const popularActivities = await Activity.find(popularFilter)
    .sort({ attendees: -1 })
    .limit(10)
    .lean();
  const popularIds = popularActivities.map(a => a._id);

  const nearbyFilter = {
    ...baseFilter,
    _id: { $nin: popularIds },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parsedLng, parsedLat]
        },
        $maxDistance: user!.distancePreference
      }
    }
  };
  
  const nearbyActivities = await Activity.find(nearbyFilter)
    .limit(10)
    .lean();
  const nearbyIds = nearbyActivities.map(a => a._id);

  const remainingFilter = {
    ...baseFilter,
    _id: { $nin: [...popularIds, ...nearbyIds] }
  };

  const [activities, total] = await Promise.all([
    Activity.find(remainingFilter).skip(skip).limit(limit).lean(),
    Activity.countDocuments(remainingFilter)
  ]);

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Success",
    data: {
      popularActivities,
      nearbyActivities,
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
};

// const getFriendsActivity = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
//   const mine = req.query.mine as string;
//   const friends = req.query.friends as string;
//   const page = Number.parseInt(req.query.page as string) || 1;
//   const limit = Number.parseInt(req.query.limit as string) || 10;
//   const skip = (page - 1) * limit;

//   const user = await User.findById(req.user.userId).select("friends").lean();
  
//   const responseData: any = {};
  
//   if (mine && mine === "true") {
//     const [myActivities, total] = await Promise.all([ 
//       Activity.find({ host: user!._id }).skip(skip).limit(limit).lean(),
//       Activity.countDocuments({ host: user!._id })
//     ]);
//     const totalPages = Math.ceil(total / limit);
//     responseData.mine = { activities: myActivities || [], metadata: { page, limit, total: total, totalPages: totalPages }};
//   }

//   if (friends && friends === "true") {
//     const [friendsActivities, total] = await Promise.all([
//       Activity.find({ host: { $in: user!.friends } }).skip(skip).limit(limit).lean(),
//       Activity.countDocuments({ host: { $in: user!.friends } })
//     ]);
//     const totalPages = Math.ceil(total / limit);
//     responseData.friends = {activities: friendsActivities || [], metadata: { page, limit, total: total, totalPages: totalPages}};
//   }

//   return res.status(StatusCodes.OK).json({
//     success: true,
//     message: "Success",
//     data: responseData
//   });
// };

// const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
//   const { lat, lng } = req.query;
//   const page = Number.parseInt(req.query.page as string) || 1;
//   const limit = Number.parseInt(req.query.limit as string) || 10;

//   if(req.query.id) {
//     const id = new Types.ObjectId(req.query.id as string);
//     const activity = await Activity.findById(id).lean();
//     return res.status(StatusCodes.OK).json({success: true, message: "Success", data: activity});
//   }

//   const skip = (page - 1) * limit;
//   const user = await User.findById(req.user.userId);

//   const popularActivities = await Activity.find().sort({ attendees: -1 }).limit(10);
//   const popularIds = popularActivities.map((activity) => activity.id);

//   const nearbyActivities = await Activity.find({
//     _id: { $nin: popularIds },
//     location: {
//       $near: {
//         $geometry: {
//           type: "Point",
//           coordinates: [parseFloat(lat as string), parseFloat(lng as string)]
//         },
//         $maxDistance: user!.distancePreference
//       }
//     }
//   }).limit(10);
//   const nearbyIds = nearbyActivities.map((activity) => activity.id);

//   const activities = await Activity.find({ _id: { $nin: [...popularIds, ...nearbyIds] } }).skip(skip).limit(limit).lean();
//   const total = await Activity.countDocuments({
//     _id: { $nin: [...popularIds, ...nearbyIds] }
//   });
//   const totalPages = Math.ceil(total / limit);

//   return res.status(StatusCodes.OK).json({
//     success: true, message: "Success", data: {
//       popularActivities, nearbyActivities, activities, pagination: {
//         page, limit, total, totalPages
//       }
//     }
//   });
// };

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const activity = await Activity.findByIdAndUpdate(req.params.id, { $set: req.body}, { new: true });
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

