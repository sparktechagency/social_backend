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
    if (!paymentHistory[0] || !paymentHistory[0].amount || !paymentHistory[0].currency) {
      throw createError(StatusCodes.BAD_REQUEST, "Payment history is required");
    }
    
    const user = await mongoose.model('User').findById(userId).session(session);
    if (!user) {
      throw createError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user?.isBlocked) {
      throw createError(StatusCodes.FORBIDDEN, "User is blocked");
    }

    const YOUR_DOMAIN = process.env.FRONTEND_URL;
    const sessionStripe = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${YOUR_DOMAIN}payment/cancel`,
      customer_email: req.user.email,
      client_reference_id: userId,
      metadata: {userId, boostType, profile: JSON.stringify(profile), activity: JSON.stringify(activity)},
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount:  Math.round(paymentHistory[0].amount * 100),
            product_data: {
              name: `${boostType.charAt(0).toUpperCase() + boostType.slice(1)} Boost`,
              description: `Boost your ${boostType}`
            }
          },
          quantity: 1
        }
      ]
    });
    if( !sessionStripe || !sessionStripe.id) {
      throw createError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create Stripe session");
    }

    await session.commitTransaction();
    session.endSession();

    // Return clientSecret so frontend can confirm payment
    res.status(StatusCodes.CREATED).json({
      success: true,
     data: {
        sessionId: sessionStripe.id,
        checkout: sessionStripe.url,
      }
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

const updateBoostPlan = async (req: Request, res: Response, next: NextFunction) => {
  const sessionConsistancy = await mongoose.startSession();
  sessionConsistancy.startTransaction();
  const userId = req.user.userId;
  const sessionId = req.query.sessionId as string;
  if(!sessionId) {
    return next(createError(StatusCodes.BAD_REQUEST, "Session ID is required"));
  }
  try {
     const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            return { status: "failed", message: "Session not found." };
        }
 
        if (session.payment_status !== 'paid') {
            return { status: "failed", message: "Payment not approved." };
        }
 
    if (!session.metadata) {
      throw createError(StatusCodes.BAD_REQUEST, "Session metadata is missing");
    }
    const { userId, boostType, profile: profileRaw, activity: activityRaw, } = session.metadata;
    let profile: any = profileRaw;
    let activity: any = activityRaw;

    if (typeof profileRaw === 'string') {
      profile = JSON.parse(profileRaw);
    }
    if (typeof activityRaw === 'string') {
      activity = JSON.parse(activityRaw);
    }

    const amount = Number(session.amount_total) / 100;
    if(session.payment_status !== 'paid') {
      throw createError(StatusCodes.BAD_REQUEST, "Payment is not paid");
    }
     const planData: any = {
      userId,
      boostType,
      profile,
      activity,
      customerEmail: session.customer_email,
      sessionId: session.id,
      paymentHistory: [
        {
          method: 'stripe',
          amount: amount,
          currency: 'usd',
          timestamp: new Date(),
          transactionId: session.payment_intent as string,
          status:  "paid",
          description:     `Boost plan for ${boostType}`
        }
      ],
    };

    if (boostType === BoostType.Profile || boostType === BoostType.Package) {
       profile.endingTime = new Date(new Date(profile.startingTime).getTime() + profile.duration * 60 * 1000);
       profile.status = 'active';
      planData.profile = { ...profile};
    } 
    if (boostType === BoostType.Activity || boostType === BoostType.Package) {
        activity.endingTime = new Date(new Date(activity.startingTime).getTime() + activity.duration * 60 * 1000);
        activity.status = 'active';
      planData.activity = { ...activity};
    }

    const plan = await new BoostPlan(planData).save({ session: sessionConsistancy });
    
    await sessionConsistancy.commitTransaction();
    sessionConsistancy.endSession();
    res.status(StatusCodes.CREATED).json({
      success: true,
      data: plan,
    });
  } catch (err) {
    await sessionConsistancy.abortTransaction(); 
    sessionConsistancy.endSession();
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
  updateBoostPlan,
    getBoostPlans,
};

export default boostPlanController;