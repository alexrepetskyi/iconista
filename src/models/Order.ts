import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    brand: { type: String, required: true },
    title: { type: String, required: true },
    image: { type: String, default: '' },
    /** EUR cents, captured at purchase time. */
    price: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    items: { type: [orderItemSchema], required: true },
    /** All amounts in EUR cents. */
    subtotal: { type: Number, required: true },
    promoCode: { type: String },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'eur' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    stripeSessionId: { type: String, unique: true, sparse: true },
    shippingAddress: { type: Schema.Types.Mixed },
    trackingNumber: { type: String },
    timeline: {
      type: [
        new Schema(
          { status: String, at: Date },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: string };

export const Order: Model<OrderDoc> = models.Order ?? model<OrderDoc>('Order', orderSchema);
