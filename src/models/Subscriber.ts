import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    locale: { type: String, default: 'en' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'unsubscribed'],
      default: 'pending',
      index: true,
    },
    confirmToken: { type: String, index: true, sparse: true },
    unsubscribeToken: { type: String, index: true, sparse: true },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

export type SubscriberDoc = InferSchemaType<typeof subscriberSchema> & { _id: string };

export const Subscriber: Model<SubscriberDoc> =
  models.Subscriber ?? model<SubscriberDoc>('Subscriber', subscriberSchema);
