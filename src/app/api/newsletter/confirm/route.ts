import { NextResponse } from 'next/server';
import { confirmSubscription } from '@/features/newsletter/actions';
import { env } from '@/lib/env';

export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const ok = await confirmSubscription(token);
  return NextResponse.redirect(
    `${env().NEXT_PUBLIC_BASE_URL}/?newsletter=${ok ? 'confirmed' : 'invalid'}`,
  );
}
