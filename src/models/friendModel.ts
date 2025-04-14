import { Document, model, Schema, Types } from "mongoose";

export type FriendSchema = Document & {
  user1: Types.ObjectId;
  user2: Types.ObjectId;
};

const frinedSchema = new Schema<FriendSchema>(
  {
    user1: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Friend = model<FriendSchema>("Friend", frinedSchema);
export default Friend;
