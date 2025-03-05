import { Schema, Document, model, Model } from "mongoose";
import { logger } from "@shared/logger";

type ContactSchema = Document & {
  text: string;
};

const ContactSchema: Schema<ContactSchema> = new Schema<ContactSchema>({
  text: {
    type: String
  }
});

ContactSchema.statics.findOrCreate = async function(): Promise<void> {
  const Contact = await this.findOne();
  if (!Contact) {
   await this.create({text: "Contact us"});
   logger.info("Contact us added successfully!");
  } else {
    logger.info("Contact us exists!");
  }
};

type ContactModel = Model<ContactSchema> & {
  findOrCreate(): Promise<void>;
}
const Contact = model<ContactSchema, ContactModel>("Contact", ContactSchema);
export default Contact;