import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, index: true, sparse: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    emailVerifiedAt: { type: Date },
    verifyToken: { type: String, index: true, sparse: true },
    resetToken: { type: String, index: true, sparse: true },
    resetTokenExpiresAt: { type: Date },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: string };

export const User: Model<UserDoc> = models.User ?? model<UserDoc>('User', userSchema);
