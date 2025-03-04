import { NextFunction, Request, Response } from "express";
import Privacy from "@models/privacyModel";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const privacy = await Privacy.findOne();
  return res.status(StatusCodes.OK).json({ success: true, message: "Contract us information retrieved successfully", data: privacy });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { text } = req.body;
  if (!text) return next(createError(StatusCodes.BAD_REQUEST, "No text provided!"));
  const privacy = await Privacy.findOneAndUpdate({}, {text: text}, { new : true});
  return res.status(StatusCodes.OK).json({ success: true, message: "Contract us information updated successfully", data: privacy });
};

const ContractController = {
  get,
  update,
}

export default ContractController;