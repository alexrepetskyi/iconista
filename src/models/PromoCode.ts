import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const promoCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    /** percent: 1–100; fixed: EUR cents. */
    discountValue: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true },
    /** When set, only this account may redeem the code. */
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'used', 'disabled'], default: 'active', index: true },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true },
);

export type PromoCodeDoc = InferSchemaType<typeof promoCodeSchema> & { _id: string };

export const PromoCode: Model<PromoCodeDoc> =
  models.PromoCode ?? model<PromoCodeDoc>('PromoCode', promoCodeSchema);
