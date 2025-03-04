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
    latitude: number;
    longitude: number;
    address: string;
  };
  distanceRange: number;
  ageRange: {
    low: number;
    high: number;
  };
  note: string;
  isGuestAllowed: boolean;
  numberOfGuests: number;
  isPrivateActivity: boolean;
  groupChatEnabled: boolean;
}

const activitySchema : Schema<ActivitySchema> = new Schema<ActivitySchema>({
  thumbnail: {type: String, required: true},
  venue: {type: String, default: ""},
  name: {type: String, required: true},
  theme: {type: String, default: ""},
  startTime: {type: String, required: true},
  endTime: {type: String, required: true},
  activityType: {type: String, required: true},
  date: {type: String, required: true},
  maximumGuest: {type: Number, required: true},
  location: {
    latitude: {type: Number, required: true},
    longitude: {type: Number, required: true},
    address: {type: String, required: true},
  },
  distanceRange: {type: Number, required: true},
  ageRange: {
    low: {type: Number, required: true},
    high: {type: Number, required: true},
  },
  note: {type: String, required: true},
  isGuestAllowed: {type: Boolean, default: false},
  numberOfGuests: {type: Number, default: 0},
  isPrivateActivity: {type: Boolean, default: false},
  groupChatEnabled: {type: Boolean, default: false},
});

const Activity = model<ActivitySchema>("Activity", activitySchema);
export default Activity;