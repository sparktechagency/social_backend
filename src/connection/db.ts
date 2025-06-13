import mongoose from "mongoose";
import to from "await-to-ts";

export const connectDB = async (uri: string) => {
  const [error] = await to(mongoose.connect(uri));
  if (error) {
    console.error(error);
    return;
  }
  console.log("Database connected successfully");
  console.log("database name: ", mongoose.connection.db?.databaseName)
};

export default connectDB;
