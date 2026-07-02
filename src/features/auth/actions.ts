'use server';

import { z } from 'zod';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { connectDb } from '@/lib/mongodb';
import { User } from '@/models/User';
import { rateLimit } from '@/lib/ratelimit';
import { signIn } from './auth';
import { sendVerificationEmail } from '@/features/emails/send';

const registerSchema = z.object({
  name: z.string().trim().max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export type AuthActionResult = { ok: true } | { ok: false; error: string } | null;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

/** useActionState signature — the form POSTs even before hydration. */
export async function registerAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === 'password' ? 'weakPassword' : 'invalidCredentials' };
  }
  if (!(await rateLimit('register', await clientIp(), 5, 60))) {
    return { ok: false, error: 'tooMany' };
  }

  const { name, email, password } = parsed.data;
  await connectDb();
  if (await User.exists({ email })) {
    return { ok: false, error: 'emailTaken' };
  }

  const verifyToken = crypto.randomBytes(24).toString('hex');
  await User.create({
    name,
    email,
    passwordHash: await argon2.hash(password),
    verifyToken,
  });
  // Best effort — registration must not fail if the email provider is down.
  sendVerificationEmail(email, name, verifyToken).catch((err) =>
    console.error('verification email failed', err),
  );

  await signIn('credentials', { email, password, redirect: false });
  return { ok: true };
}

export async function loginAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get('email') ?? '').toLowerCase().trim();
  const password = String(formData.get('password') ?? '');
  if (!(await rateLimit('login', `${await clientIp()}:${email}`, 10, 60))) {
    return { ok: false, error: 'tooMany' };
  }
  try {
    await signIn('credentials', { email, password, redirect: false });
    return { ok: true };
  } catch {
    return { ok: false, error: 'invalidCredentials' };
  }
}

/** Marks the email verified and claims matching guest orders. */
export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!token) return false;
  await connectDb();
  const user = await User.findOneAndUpdate(
    { verifyToken: token },
    { $set: { emailVerifiedAt: new Date() }, $unset: { verifyToken: 1 } },
    { new: true },
  );
  if (!user) return false;
  const { Order } = await import('@/models/Order');
  await Order.updateMany(
    { email: user.email, userId: { $exists: false } },
    { $set: { userId: user._id } },
  );
  return true;
}
