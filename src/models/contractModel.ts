import { Schema, Document, model, Model } from "mongoose";
import { logger } from "@shared/logger";

type ContractSchema = Document & {
  text: string;
};

const contractSchema: Schema<ContractSchema> = new Schema<ContractSchema>({
  text: {
    type: String
  }
});

contractSchema.statics.findOrCreate = async function(): Promise<void> {
  const contract = await this.findOne();
  if (!contract) {
   await this.create({text: "Contract us"});
   logger.info("Contract us added successfully!");
  } else {
    logger.info("Contract us exists!");
  }
};

type ContractModel = Model<ContractSchema> & {
  findOrCreate(): Promise<void>;
}
const Contract = model<ContractSchema, ContractModel>("Contract", contractSchema);
export default Contract;