import Friend from "@models/friendModel";
import User from "@models/userModel";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const sendFriendRequest = async(req: Request, res: Response, next: NextFunction): Promise<any> => {
    const existingRequest = await Friend.findOne({ requester: req.user.userId, recipient: req.body.recipient, status: "pending" });
    if (existingRequest) {
        return res.status(StatusCodes.CONFLICT).json({ success: false, message: "Friend request already sent" });
    }
    const friend = await Friend.create({requester: req.user.userId, recipient: req.body.recipient});
    res.status(StatusCodes.CREATED).json({success: true, message: "Success", data: friend});
}

const friendRequestAction = async(req: Request, res: Response, next: NextFunction): Promise<any> => {
    const friend = await Friend.findByIdAndUpdate(req.body.id, { status: req.body.action}, {new: true});
    if (req.body.action === "accepted") {
        await User.findByIdAndUpdate(friend!.requester, { $addToSet: { friends: friend!.recipient } });
        await User.findByIdAndUpdate(friend!.recipient, { $addToSet: { friends: friend!.requester } });
    }
    res.status(StatusCodes.CREATED).json({success: true, message: "Friend reqeust " + req.body.action, data: {}});
}

const getFriends = async(req: Request, res: Response, next: NextFunction): Promise<any> => {
    const user = await User.findById(req.user.userId).select("friends").populate("friends").lean();
    res.status(StatusCodes.CREATED).json({success: true, message: "Success", data: user!.friends || []});
}

const FriendController = {
    sendFriendRequest,
    friendRequestAction,
    getFriends,
}

export default FriendController;