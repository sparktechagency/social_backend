import { model, Model, Schema } from "mongoose";
import { logger } from "@shared/logger";

export type VersionSchema = {
  text: string;
}

const versionSchema: Schema<VersionSchema> = new Schema<VersionSchema>({
  text: {type: String, required: true},
});

versionSchema.statics.findOrCreate = async function (): Promise<void> {
  const version = await this.findOne();
  if(!version) {
    await this.create({text: "Version"});
    logger.info("Version Information added successfully!");
  } else {
    logger.info("Version Information exists!");
  }
}

type VersionModel = Model<VersionSchema> & {
  findOrCreate(): Promise<void>;
}

const Version = model<VersionSchema, VersionModel>("Version", versionSchema);
export default Version;