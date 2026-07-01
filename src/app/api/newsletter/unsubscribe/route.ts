import { NextResponse } from 'next/server';
import { unsubscribe } from '@/features/newsletter/actions';
import { env } from '@/lib/env';

export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  await unsubscribe(token);
  return NextResponse.redirect(`${env().NEXT_PUBLIC_BASE_URL}/?newsletter=unsubscribed`);
}
