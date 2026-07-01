import mongoose from 'mongoose';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __mongoose: { promise: Promise<typeof mongoose> | null } | undefined;
}

// Cached across HMR reloads in dev and reused across requests in prod.
const cache = globalThis.__mongoose ?? (globalThis.__mongoose = { promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (!cache.promise) {
    cache.promise = mongoose.connect(env().MONGODB_URI).catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  return cache.promise;
}
