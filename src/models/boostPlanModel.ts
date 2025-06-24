import mongoose, { Schema, Document, Types } from 'mongoose';

export enum BoostType {
  Profile  = 'profile',
  Activity = 'activity',
  Package  = 'package',  
}

export interface BoostSubDoc {
  reboost: number;
  startingTime: Date;
  duration: number;    // in minutes
  endingTime: Date;
  status: 'active' | 'expired' | 'scheduled';
}

export interface PaymentRecord {
  method: string;
  amount: number;
  currency: string;
  timestamp: Date;
  transactionId: string;
  status: 'paid' | 'requires_action' | 'unpaid' | 'failed';
  receiptUrl?: string;
  description?: string;
}

export interface IBoostPlan extends Document {
  userId: Types.ObjectId;
  boostType: BoostType;
  profile?: BoostSubDoc;
  activity?: BoostSubDoc;
  paymentHistory: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const boostSubSchema = new Schema<BoostSubDoc>(
  {
    reboost:       { type: Number, default: 0 },
    startingTime:  { type: Date, required: true },
    duration:      { type: Number, required: true },
    endingTime:    { type: Date, required: true },
    status:        { type: String, enum: ['active','expired','scheduled'], default: 'scheduled' },
  },
  { _id: false }
);

const paymentSchema = new Schema<PaymentRecord>(
  {
    method:           { type: String, required: true },
    amount:           { type: Number, required: true },
    currency:         { type: String, required: true },
    timestamp:        { type: Date, default: () => new Date() },
    transactionId:    { type: String, required: true },
    status:           { type: String, enum: ['paid','requires_action','unpaid', 'failed'], required: true },
    receiptUrl:       { type: String, default: '' },
    description:      { type: String, default: '' },
  },
  { _id: false }
);

const boostPlanSchema = new Schema<IBoostPlan>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    boostType:      { type: String, enum: Object.values(BoostType), required: true },
    profile:        { type: boostSubSchema },
    activity:       { type: boostSubSchema },
    paymentHistory: { type: [paymentSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IBoostPlan>('BoostPlan', boostPlanSchema);