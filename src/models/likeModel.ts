import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILike extends Document {
  likeProfile:     Types.ObjectId;   
  LikeReceived: Types.ObjectId;
  action: String;   
  createdAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    likeProfile: { type: Schema.Types.ObjectId, ref: "User", required: true },
    LikeReceived: { type: Schema.Types.ObjectId, required: true },
    action:{ type: String, default: "like", required: true, },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// prevent duplicates
likeSchema.index({ likeProfile: 1, LikeReceived: 1 }, { unique: true });

export default mongoose.model<ILike>("Like", likeSchema);
