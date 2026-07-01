import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/features/auth/actions';
import { env } from '@/lib/env';

export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const ok = await verifyEmailToken(token);
  return NextResponse.redirect(
    `${env().NEXT_PUBLIC_BASE_URL}/login?verified=${ok ? '1' : '0'}`,
  );
}
