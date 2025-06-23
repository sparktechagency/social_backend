import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import mongoose from "mongoose";
import Stripe from "stripe";
import BoostPlan, { BoostType } from "@models/boostPlanModel";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST /boost-plans
const createBoostPlan = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.userId;
    const { boostType, profile, activity, paymentHistory } = req.body;

    // Validation
    if (!Object.values(BoostType).includes(boostType)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid boostType");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
    }
    if( boostType === BoostType.Profile || boostType === BoostType.Package) {
      if (!profile || !profile.startingTime || !profile.duration) {
        throw createError(StatusCodes.BAD_REQUEST, "Profile data is required for this boost type");
      }
      if (isNaN(Number(profile.duration)) || Number(profile.duration) <= 0) {
        throw createError(StatusCodes.BAD_REQUEST, "Invalid duration time");
      }
    }
    if( boostType === BoostType.Activity || boostType === BoostType.Package) {
      if (!activity || !activity.startingTime || !activity.duration) {
        throw createError(StatusCodes.BAD_REQUEST, "Activity data is required for this boost type");
      }
      if (isNaN(Number(activity.duration)) || Number(activity.duration) <= 0) {
        throw createError(StatusCodes.BAD_REQUEST, "Invalid duration time");
      }
    }
    if (!paymentHistory || !paymentHistory.amount || !paymentHistory.currency) {
      throw createError(StatusCodes.BAD_REQUEST, "Payment history is required");
    }

    // Create Stripe PaymentIntent
    // const amount = paymentHistory.amount;
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount,
    //   currency: "usd",
    //   metadata: { userId, boostType },
    // });

    const YOUR_DOMAIN = process.env.FRONTEND_URL;
    const sessionStripe = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${YOUR_DOMAIN}payment/cancel`,
      customer_email: req.user.email,
      client_reference_id: userId,
      metadata: {userId, boostType, profile, activity},
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: paymentHistory.amount,
            product_data: {
              name: `${boostType.charAt(0).toUpperCase() + boostType.slice(1)} Boost`,
              description: `Boost your ${boostType}`
            }
          },
          quantity: 1
        }
      ]
    });


    // Build boost record
    const planData: any = {
      userId,
      boostType,
      profile,
      activity,
      paymentHistory: [
        {
          method: 'stripe',
          amount: paymentHistory.amount,
          currency: 'usd',
          timestamp: new Date(),
          transactionId: sessionStripe.payment_intent as string,
        }
      ],
    };
    if (boostType === BoostType.Profile) {
       profile.endingTime = new Date(new Date(activity.startingTime).getTime() + activity.duration * 60 * 1000);
       profile.status = 'active';
      planData.profile = { ...profile};
    } 
    if (boostType === BoostType.Activity) {
        activity.endingTime = new Date(new Date(activity.startingTime).getTime() + activity.duration * 60 * 1000);
        activity.status = 'active';
      planData.activity = { ...activity};
    }

    const plan = await new BoostPlan(planData).save({ session });

    await session.commitTransaction();
    session.endSession();

    // Return clientSecret so frontend can confirm payment
    res.status(StatusCodes.CREATED).json({
      success: true,
     data: {
        plan,
        checkout: sessionStripe,
      }
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// GET /boost-plans
const getBoostPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError(StatusCodes.BAD_REQUEST, "Invalid user ID");
    }
    const plans = await BoostPlan.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    res.status(StatusCodes.OK).json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
};

const boostPlanController = {
  createBoostPlan,
    getBoostPlans,
};

export default boostPlanController;