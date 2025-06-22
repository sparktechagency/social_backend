import mongoose, { Schema, Document, Types } from "mongoose";

export enum NotificationType {
  InviteToActivity  = "InviteToActivity",
  NewActivity       = "NewActivity",
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface INotification extends Document {
  receiver: Types.ObjectId;   
  sender:     Types.ObjectId;   
  type:      NotificationType;
  activityId:  Types.ObjectId; 
  read:      boolean;
  adminRead: boolean;
  data: Object[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:      { type: String, enum: Object.values(NotificationType), required: true },
    activityId:  { type: Schema.Types.ObjectId},
    read:    { type: Boolean, default: false },
    adminRead:    { type: Boolean, default: false },
    data:    { type: [Object], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// index to query unread quickly
notificationSchema.index({ receiver: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
