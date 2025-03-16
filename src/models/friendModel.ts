import { Document, model, Schema, Types } from "mongoose";

export type FriendSchema = Document & {
    requester: Types.ObjectId;
    recipient: Types.ObjectId;
    status: string;
}

const frinedSchema = new Schema<FriendSchema> ({
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, 
    {timestamps: true}
);

const Friend = model<FriendSchema>("Friend", frinedSchema);
export default Friend;