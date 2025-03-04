import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import { NextFunction, Request, Response } from "express";
import Admin from "@models/adminModel";
import sendEmail from "@utils/sendEmail";
import Auth from "@models/authModel";

const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password } = req.body;
  let admin = await Admin.findByEmail(email);
  if (!admin) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));

  if (!(await admin.comparePassword(password)))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong password. Please try again"));

  const accessToken = Admin.generateAccessToken(admin._id!.toString());

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { accessToken: accessToken }
  });
};

const recovery = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email } = req.body;

  let admin = await Admin.findByEmail(email);
  if (!admin) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));
  admin.generateRecoveryOTP();

  await sendEmail(email, admin.recoveryOTP);
  await admin.save();
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Success", data: { recoveryOTP: admin.recoveryOTP } });
};

const recoveryVerification = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, recoveryOTP } = req.body;

  let admin = await Admin.findByEmail(email);
  if (!admin) return next(createError(StatusCodes.NOT_FOUND, "User not found"));
  if (admin.isRecoveryOTPExpired()) return next(createError(StatusCodes.UNAUTHORIZED, "Recovery OTP has expired."));
  if (!admin.isCorrectRecoveryOTP(recoveryOTP))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong OTP. Please try again"));
  admin.clearRecoveryOTP();
  await admin.save();

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Email successfully verified.",
    data: {}
  });
};

const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password, confirmPassword } = req.body;

  let admin = await Admin.findByEmail(email);
  if (!admin) throw createError(StatusCodes.NOT_FOUND, "User Not Found");
  if (password !== confirmPassword) throw createError(StatusCodes.BAD_REQUEST, "Passwords don't match");

  admin.password = password;
  await admin.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Password reset successful", data: {} });
};

const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const email = req.admin.email;
  const { password, newPassword, confirmPassword } = req.body;
  const admin = await Admin.findByEmail(email);
  if (!admin) throw createError(StatusCodes.NOT_FOUND, "Admin Not Found");
  if (!(await admin.comparePassword(password)))
    throw createError(StatusCodes.UNAUTHORIZED, "Wrong Password. Please try again.");

  admin.password = newPassword;
  await admin.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Password changed successfully", data: {} });
};

const blockUserToggle = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.params.id;
  const auth = await Auth.findById(id);
  if (!auth) throw createError(StatusCodes.NOT_FOUND, "Auth not found");
  auth.isBlocked = !auth.isBlocked;
  await auth.save();
  return res.status(StatusCodes.OK).json({
    success: true,
    message: auth.isBlocked ? "User blocked successfully" : "User unblocked successfully",
    data: { isBlocked: auth.isBlocked }
  });
};

const AdminControllers = {
  login,
  recovery,
  recoveryVerification,
  resetPassword,
  changePassword,
  blockUserToggle,
};

export default AdminControllers;