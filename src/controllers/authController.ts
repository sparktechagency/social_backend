import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import { Request, Response, NextFunction } from "express";
import Auth from "@models/authModel";
import User from "@models/userModel";
import sendEmail from "@utils/sendEmail";
import { logger } from "@shared/logger";
import mongoose from "mongoose";

// const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
//   logger.info(`data: ", ${req.body}`);
//   const { name, email, mobileNumber, password, confirmPassword } = req.body;
//   let auth = await Auth.findByEmail(email);
//   if (auth) {
//     const message = auth.isVerified
//       ? "Email already exists! Please login."
//       : "Email already exists! Please verify your account";
//     return res
//       .status(StatusCodes.CONFLICT)
//       .json({ success: false, message: message, data: { isVerified: auth.isVerified } });
//   }

//   // const session = req.session;
//   auth = new Auth({
//     email,
//     password,
//   });
//   auth.generateVerificationOTP();
//   logger.info(auth.verificationOTP);
//   // await auth.save({ session });
//   await auth.save();

//   const user = new User({
//     auth: auth._id,
//     name,
//     mobileNumber,
//   });
//   // await user.save({ session });
//   await user.save();
//   await sendEmail(email, auth.verificationOTP);

//   return res.status(StatusCodes.CREATED).json({
//     success: true,
//     message: "Registration successful",
//     data: { isVerified: auth.isVerified, otp: auth.verificationOTP },
//   });
// };

const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // 1) Check existing email
    const { name, email, mobileNumber, password, confirmPassword } = req.body;
    let auth = await Auth.findByEmail(email);
    if (auth) {
      const message = auth.isVerified
        ? "Email already exists! Please login."
        : "Email already exists! Please verify your account";
      return res
        .status(StatusCodes.CONFLICT)
        .json({
          success: false,
          message,
          data: { isVerified: auth.isVerified },
        });
    }

    // 2) Start a session & transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 3) Create the Auth doc
      auth = new Auth({ email, password });
      auth.generateVerificationOTP();
      logger.info("Generated OTP:", auth.verificationOTP);

      // 4) Save Auth within the transaction
      await auth.save({ session });

      // 5) Create & save User within the same transaction
      const user = new User({
        auth: auth._id,
        name,
        mobileNumber,
      });
      await user.save({ session });

      // 6) Optionally, send your verification email *after* the docs are in place
      await sendEmail(email, auth.verificationOTP);

      // 7) Commit the transaction once *all* operations succeeded
      await session.commitTransaction();
      session.endSession();

      // 8) Send success response
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Registration successful",
        data: { isVerified: auth.isVerified, otp: auth.verificationOTP },
      });
    } catch (txError) {
      // Something went wrong in the transaction
      await session.abortTransaction();
      session.endSession();
      throw txError; // will be caught by outer catch
    }

  } catch (err: any) {
    // Any validation or Mongo errors bubble here
    logger.error("Registration failed:", err);
    return next(err);
  }
};

const activate = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, otp } = req.body;
  let auth;
  auth = await Auth.findByEmail(email);
  if (!auth) throw createError(StatusCodes.NOT_FOUND, "User not found");

  if (!auth.isCorrectVerificationOTP(otp))
    throw createError(StatusCodes.UNAUTHORIZED, "Wrong OTP. Please enter the correct code");

  if (auth.isVerificationOTPExpired()) throw createError(StatusCodes.UNAUTHORIZED, "Verification OTP has expired.");

  auth.clearVerificationOTP();
  auth.isVerified = true;
  await auth.save();
  const accessToken = Auth.generateAccessToken(auth._id!.toString());

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Account successfully verified.",
    data: { accessToken: accessToken },
  });
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password } = req.body;
  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));

  if (!(await auth.comparePassword(password)))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong password. Please try again"));

  if (!auth.isVerified) return next(createError(StatusCodes.UNAUTHORIZED, "Verify your email first"));
  const accessToken = Auth.generateAccessToken(auth._id!.toString());

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { accessToken: accessToken },
  });
};

const signInWithGoogle = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { googleId, name, email, avatar } = req.body;
  let auth;
  auth = await Auth.findOne({ googleId: googleId });
  if (!auth) {
    auth = await Auth.create({ googleId, email });
    const user = await User.create({ auth: auth._id, userName: name, avatar });
  }
  const accessToken = Auth.generateAccessToken(auth._id!.toString());
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { accessToken: accessToken },
  });
};

const resendOTP = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, status } = req.body;
  let auth = await Auth.findOne({ email: email });
  if (!auth) throw createError(StatusCodes.NOT_FOUND, "Account not found");

  if (status === "activate" && auth.isVerified)
    return res
      .status(StatusCodes.CONFLICT)
      .json({ success: true, message: "Your account is already verified. Please login.", data: {} });

  if (status === "activate" && !auth.isVerified) {
    auth.generateVerificationOTP();
    await auth.save();
    // await sendEmail(email, auth.verificationOTP);
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "OTP resend successful", data: { otp: auth.verificationOTP } });
  }

  if (status === "recovery") {
    auth.generateRecoveryOTP();
    await auth.save();
    await sendEmail(email, auth.recoveryOTP);
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "OTP resend successful", data: { otp: auth.recoveryOTP } });
  }
};

const recovery = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email } = req.body;

  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));
  auth.generateRecoveryOTP();

  await sendEmail(email, auth.recoveryOTP);
  await auth.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: { otp: auth.recoveryOTP } });
};

const recoveryVerification = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, otp } = req.body;

  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "User not found"));
  if (auth.isRecoveryOTPExpired()) return next(createError(StatusCodes.UNAUTHORIZED, "Recovery OTP has expired."));
  if (!auth.isCorrectRecoveryOTP(otp))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong OTP. Please try again"));

  auth.clearRecoveryOTP();
  await auth.save();

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Email successfully verified.",
    data: {},
  });
};

const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password, confirmPassword } = req.body;

  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "User Not Found"));
  if (password !== confirmPassword) return next(createError(StatusCodes.BAD_REQUEST, "Passwords don't match"));

  auth.password = password;
  await auth.save();

  const accessToken = Auth.generateAccessToken(auth._id!.toString());

  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Password reset successful", data: { accessToken: accessToken } });
};

const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const user = req.user;
  const { password, newPassword, confirmPassword } = req.body;

  let auth = await Auth.findByEmail(user.email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "User Not Found"));
  if (!(await auth.comparePassword(password)))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong Password. Please try again."));

  auth.password = newPassword;
  await auth.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Password changed successfully", data: {} });
};

const remove = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const authId = req.user.authId;
  console.log("userID: ", userId, " authId: ", authId)
  await Promise.all([Auth.findByIdAndDelete(authId), User.findByIdAndDelete(userId)]);
  return res.status(StatusCodes.OK).json({ success: true, message: "User Removed successfully", data: {} });
};

const AuthController = {
  register,
  activate,
  login,
  signInWithGoogle,
  resendOTP,
  recovery,
  recoveryVerification,
  resetPassword,
  changePassword,
  remove,
};

export default AuthController;
