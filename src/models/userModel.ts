import { calculateAge } from "@utils/calculateAge";
import { Schema, model, Types, Document } from "mongoose";
import Activity from "@models/activityModel";
import Friend from "@models/friendModel";
import FriendRequest from "@models/friendRequestModel";

export type DecodedUser = {
  authId: string;
  userId: string;
  userName: string;
  email: string;
  isVerified: boolean;
};

export type UserSchema = Document & {
  auth: Types.ObjectId;
  name: string;
  userName: string;
  mobileNumber: string;
  dateOfBirth: string;
  age: number;
  location: {
    type: "Point";
    placeName: string;
    coordinates: [number, number];
  };
  gender: string;
  photo: string[];
  distancePreference: number;
  school: {
    name: string;
    year: number | null;
  };
  height: {
    feet: number;
    inch: number;
  };
  expectation: string;
  relationshipStatus: string;
  race: string;
  interests: string[];
  hairColor: string;
  profession: string;
  bio: string;
  isProfileComplete: boolean;
};

const userSchema = new Schema(
  {
    auth: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
    name: { type: String, required: true },
    userName: { type: String },
    mobileNumber: { type: Number, required: true },
    dateOfBirth: { type: String },
    age: { type: Number },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      placeName: {
        type: String,
      },
      coordinates: {
        type: [Number],
      },
    },
    gender: { type: String },
    photo: [{ type: String }],
    distancePreference: { type: Number },
    school: {
      name: { type: String, default: "" },
      year: { type: Number, default: null },
    },
    height: {
      feet: { type: Number },
      inch: { type: Number },
    },
    expectation: { type: String },
    relationshipStatus: { type: String, default: "" },
    race: { type: String, default: "" },
    interests: [{ type: String }],
    hairColor: { type: String, default: "" },
    profession: { type: String, default: "" },
    bio: { type: String, default: "" },
    isProfileComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: "2dsphere" });

userSchema.pre("save", function (next) {
  if (this.isModified("dateOfBirth") && this.dateOfBirth) {
    this.age = calculateAge(this.dateOfBirth);
  }
  next();
});
type UpdateUser = {
  $set?: Partial<UserSchema>;
  $setOnInsert?: Partial<UserSchema>;
};

userSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as UpdateUser;

  const dateOfBirth = update.$set?.dateOfBirth;

  if (dateOfBirth) {
    update.$set!.age = calculateAge(dateOfBirth);
    this.setUpdate(update);
  }
  next();
});

userSchema.post("findOneAndUpdate", async function (doc: UserSchema | null) {
  if (!doc || doc.isProfileComplete) return;

  const requiredFields: (keyof UserSchema)[] = [
    "name",
    "mobileNumber",
    "dateOfBirth",
    "age",
    "location",
    "gender",
    "photo",
    "distancePreference",
    "height",
    "expectation",
    "interests",
  ];

  const isFilled = requiredFields.every((field) => {
    const value = doc[field];
    if (value === undefined || value === null) return false;

    if (Array.isArray(value)) return value.length > 0;

    if (typeof value === "object" && value !== null) {
      return Object.values(value).every((val) => val !== undefined && val !== null && val !== "");
    }

    return value !== "";
  });

  if (isFilled) {
    doc.isProfileComplete = true;
    await doc.save();
  }
});

userSchema.pre("findOneAndDelete", async function (next) {
  const user = await this.findOne(this.getQuery());
  if (!user) return next();
  const userId = this.getQuery()._id;

  await Friend.deleteMany({ $or: [{ user1: userId }, { user2: userId }] });

  await FriendRequest.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });

  await Activity.deleteMany({ host: userId });
});

export const User = model<UserSchema>("User", userSchema);
export default User;
