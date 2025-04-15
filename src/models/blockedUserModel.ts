import { Document, model, Schema, Types } from "mongoose";

export type BlockedUserSchema = Document & {
  blocker: Types.ObjectId;
  blocked: Types.ObjectId;
};

const blockedUserSchema: Schema<BlockedUserSchema> = new Schema<BlockedUserSchema>(
  {
    blocker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blocked: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const BlockedUser = model<BlockedUserSchema>("BlockedUser", blockedUserSchema);
export default BlockedUser;
