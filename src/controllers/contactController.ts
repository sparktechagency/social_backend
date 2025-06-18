import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import Contact from "@models/contactModel";

const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "`text` is required" });
    }

    const contact = new Contact({ text });
    await contact.save();

    return res.status(StatusCodes.CREATED).json({ success: true, message: "Contact created", data: contact });
  } catch (err) {
    next(err);
  }
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const privacy = await Contact.findOne();
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Contract us information retrieved successfully", data: privacy });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { text } = req.body;
  if (!text) return next(createError(StatusCodes.BAD_REQUEST, "No text provided!"));
  const privacy = await Contact.findOneAndUpdate({}, { text: text }, { new: true });
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Contract us information updated successfully", data: privacy });
};

const ContactController = {
  create,
  get,
  update,
};

export default ContactController;
