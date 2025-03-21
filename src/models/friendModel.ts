import { Document, model, Schema, Types } from "mongoose";

export type FriendSchema = Document & {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    status: string;
}

const frinedSchema = new Schema<FriendSchema> ({
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, 
    {timestamps: true}
);

const Friend = model<FriendSchema>("Friend", frinedSchema);
export default Friend;