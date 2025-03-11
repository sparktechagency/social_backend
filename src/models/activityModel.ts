import { Document, model, Schema } from "mongoose";

export type ActivitySchema = Document & {
  thumbnail: string;
  venue: string;
  name: string;
  theme: string;
  startTime: string;
  endTime: string;
  activityType: string;
  date: string;
  maximumGuest: number;
  location: {
    type: "Point";
    coordinates: [number, number];
    address: string;
  };
  distanceRange: number;
  ageRange: {
    low: number;
    high: number;
  };
  note: string;
  isGuestsAllowed: boolean;
  numberOfGuests: number;
  isPrivateActivity: boolean;
  isGroupChatEnabled: boolean;
  isPaid: boolean;
  fee: number;
  attendees: number;
};

const activitySchema: Schema<ActivitySchema> = new Schema<ActivitySchema>({
  thumbnail: { type: String, required: true },
  venue: { type: String, default: "" },
  name: { type: String, required: true },
  theme: { type: String, default: "" },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  activityType: { type: String, required: true },
  date: { type: String, required: true },
  maximumGuest: { type: Number, required: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      index: "2dsphere"
    },
    address: { type: String, required: true }
  },
  distanceRange: { type: Number, required: true },
  ageRange: {
    low: { type: Number, required: true },
    high: { type: Number, required: true }
  },
  note: { type: String, required: true },
  isGuestsAllowed: { type: Boolean, default: false },
  numberOfGuests: { type: Number, default: 0 },
  isPrivateActivity: { type: Boolean, default: false },
  isGroupChatEnabled: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: false },
  fee: { type: Number, default: 0 },
  attendees: { type: Number, default: 0},
});

activitySchema.index({ location: "2dsphere" });

const Activity = model<ActivitySchema>("Activity", activitySchema);
export default Activity;
