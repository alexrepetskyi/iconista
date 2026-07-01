'use server';

import { z } from 'zod';
import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { connectDb } from '@/lib/mongodb';
import { Subscriber } from '@/models/Subscriber';
import { rateLimit } from '@/lib/ratelimit';
import { sendNewsletterConfirmEmail } from '@/features/emails/send';
import type { Locale } from '@/i18n/locales';

export type NewsletterResult = { ok: true } | { ok: false; error: 'invalidEmail' | 'tooMany' };

/** Double opt-in step 1: store as pending, send the confirmation email. */
export async function subscribe(email: string, locale: Locale): Promise<NewsletterResult> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: 'invalidEmail' };

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!(await rateLimit('newsletter', ip, 5, 60))) return { ok: false, error: 'tooMany' };

  await connectDb();
  const existing = await Subscriber.findOne({ email: parsed.data });
  if (existing?.status === 'confirmed') return { ok: true }; // no-op, don't leak status

  const confirmToken = crypto.randomBytes(24).toString('hex');
  const unsubscribeToken = crypto.randomBytes(24).toString('hex');
  await Subscriber.findOneAndUpdate(
    { email: parsed.data },
    {
      $set: { locale, status: 'pending', confirmToken },
      $setOnInsert: { unsubscribeToken },
    },
    { upsert: true },
  );
  try {
    await sendNewsletterConfirmEmail(parsed.data, confirmToken);
  } catch (err) {
    console.error('newsletter confirm email failed', err);
  }
  return { ok: true };
}

export async function confirmSubscription(token: string): Promise<boolean> {
  if (!token) return false;
  await connectDb();
  const sub = await Subscriber.findOneAndUpdate(
    { confirmToken: token },
    { $set: { status: 'confirmed', confirmedAt: new Date() }, $unset: { confirmToken: 1 } },
  );
  return sub !== null;
}

export async function unsubscribe(token: string): Promise<boolean> {
  if (!token) return false;
  await connectDb();
  const sub = await Subscriber.findOneAndUpdate(
    { unsubscribeToken: token },
    { $set: { status: 'unsubscribed' } },
  );
  return sub !== null;
}
