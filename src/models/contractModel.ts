import { Schema, Document, model } from "mongoose";

type ContractSchema = Document & {
  text: string;
};

const contractSchema = new Schema<ContractSchema>({
  text: {
    type: String,
  },
});

const Contract = model<ContractSchema>("Contract", contractSchema);
export default Contract;