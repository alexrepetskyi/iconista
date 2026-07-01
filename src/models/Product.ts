import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const productSchema = new Schema(
  {
    dropId: { type: Schema.Types.ObjectId, ref: 'Drop', required: true, index: true },
    brand: { type: String, required: true },
    title: { type: Map, of: String, default: {} },
    description: { type: Map, of: String, default: {} },
    slug: { type: String, required: true, unique: true },
    /** Prices in EUR cents to avoid floating point. */
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    images: { type: [String], default: [] },
    status: { type: String, enum: ['available', 'sold'], default: 'available', index: true },
    pendingLocales: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: string };

export const Product: Model<ProductDoc> =
  models.Product ?? model<ProductDoc>('Product', productSchema);
