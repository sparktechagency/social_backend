import { Document, model, Schema, Types } from "mongoose";

export type FriendRequestSchema = Document & {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  status: string;
};

const friendRequestSchema = new Schema<FriendRequestSchema>({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled"], default: "pending" },
});

const FriendRequest = model<FriendRequestSchema>("FriendRequest", friendRequestSchema);
export default FriendRequest;
