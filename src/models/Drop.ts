import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const dropSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: { type: Map, of: String, default: {} },
    description: { type: Map, of: String, default: {} },
    status: { type: String, enum: ['draft', 'live', 'closed'], default: 'draft', index: true },
    releaseAt: { type: Date, required: true },
    closesAt: { type: Date, required: true },
    heroVideoUrl: { type: String, default: '' },
    /** Locales whose content translation is pending (LLM failed or locale added later). */
    pendingLocales: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type DropDoc = InferSchemaType<typeof dropSchema> & { _id: string };

export const Drop: Model<DropDoc> = models.Drop ?? model<DropDoc>('Drop', dropSchema);
