import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const cartSchema = new Schema(
  {
    /** Exactly one of userId / sessionId identifies the cart owner. */
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    sessionId: { type: String, index: true, sparse: true },
    productIds: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
  },
  { timestamps: true },
);

export type CartDoc = InferSchemaType<typeof cartSchema> & { _id: string };

export const Cart: Model<CartDoc> = models.Cart ?? model<CartDoc>('Cart', cartSchema);
