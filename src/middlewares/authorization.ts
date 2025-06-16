import to from "await-to-ts";
import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import Auth from "@models/authModel";
import User, { DecodedUser } from "@models/userModel";
import { decodeToken } from "@utils/jwt";
import { StatusCodes } from "http-status-codes";
import Admin, { DecodedAdmin } from "@models/adminModel";
import { asyncHandler } from "@shared/asyncHandler";
import { logger } from "@shared/logger";

const getUserInfo = async (authId: string): Promise<DecodedUser | null> => {
  let error, auth, user, data: DecodedUser;
  [error, auth] = await to(Auth.findById(authId).select("email role isVerified isBlocked"));
  if (error || !auth) return null;
  [error, user] = await to(User.findOne({ auth: authId }));
  if (error || !user) return null;
  data = {
    authId: auth._id!.toString(),
    email: auth.email,
    isVerified: auth.isVerified,
    userId: user._id!.toString(),
    userName: user.userName,
  };
  return data;
};

const getAdminInfo = async (id: string): Promise<DecodedAdmin | null> => {
  let error, admin, data: DecodedAdmin;
  [error, admin] = await to(Admin.findById(id));
  if (error || !admin) return null;
  data = {
    id: admin._id!.toString(),
    email: admin.email,
  };
  return data;
};

const authorizeToken = (secret: string, isAdminCheck: boolean = false) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return next(createError(StatusCodes.UNAUTHORIZED, "Not Authorized"));
    }
    const token = authHeader.split(" ")[1];
    if (!secret) {
      return next(createError(StatusCodes.INTERNAL_SERVER_ERROR, "JWT secret is not defined."));
    }
    const decoded = decodeToken(token, secret);
    logger.info("Decoded id : " + decoded.id);
    let data;
    if (isAdminCheck) {
      data = await getAdminInfo(decoded.id);
      if (!data) return next(createError(StatusCodes.FORBIDDEN, "Forbidden"));
      logger.info(data);
      req.admin = data;
    } else {
      data = await getUserInfo(decoded.id);
      console.log("Decoded user data: ", data);
      if (!data) return next(createError(StatusCodes.NOT_FOUND, "Account Not Found"));
      req.user = data;
    }
    return next();
  });
};

export const authorize = authorizeToken(process.env.JWT_ACCESS_SECRET!);
export const admin_authorize = authorizeToken(process.env.JWT_ACCESS_SECRET!, true);
