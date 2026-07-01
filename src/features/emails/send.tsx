import type { ReactElement } from 'react';
import { getResend } from '@/lib/resend';
import { env } from '@/lib/env';
import {
  DropLiveEmail,
  NewsletterConfirmEmail,
  OrderConfirmedEmail,
  OrderRefundedEmail,
  OrderShippedEmail,
  PasswordResetEmail,
  VerificationEmail,
  type OrderEmailProps,
} from '@/emails/templates';

async function send(to: string, subject: string, react: ReactElement): Promise<void> {
  const { error } = await getResend().emails.send({
    from: env().EMAIL_FROM,
    to,
    subject,
    react,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

const base = () => env().NEXT_PUBLIC_BASE_URL;

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  await send(
    to,
    'Confirm your ICONISTA account',
    <VerificationEmail name={name} url={`${base()}/api/verify-email?token=${token}`} />,
  );
}

export async function sendOrderConfirmedEmail(
  to: string,
  props: Omit<OrderEmailProps, 'baseUrl'>,
): Promise<void> {
  await send(
    to,
    `Order ${props.orderNumber} — confirmed`,
    <OrderConfirmedEmail {...props} baseUrl={base()} />,
  );
}

export async function sendOrderShippedEmail(
  to: string,
  orderNumber: string,
  trackingNumber: string,
): Promise<void> {
  await send(
    to,
    `Order ${orderNumber} — shipped`,
    <OrderShippedEmail orderNumber={orderNumber} trackingNumber={trackingNumber} />,
  );
}

export async function sendOrderRefundedEmail(to: string, orderNumber: string): Promise<void> {
  await send(
    to,
    `Order ${orderNumber} — refunded`,
    <OrderRefundedEmail orderNumber={orderNumber} />,
  );
}

export async function sendNewsletterConfirmEmail(to: string, token: string): Promise<void> {
  await send(
    to,
    'Confirm your subscription',
    <NewsletterConfirmEmail url={`${base()}/api/newsletter/confirm?token=${token}`} />,
  );
}

export async function sendDropLiveEmail(
  to: string,
  dropNumber: number,
  dropTitle: string,
  dropSlug: string,
  unsubscribeToken: string,
): Promise<void> {
  const number = String(dropNumber).padStart(3, '0');
  await send(
    to,
    `Drop ${number} is live`,
    <DropLiveEmail
      dropNumber={dropNumber}
      dropTitle={dropTitle}
      url={`${base()}/drop/${dropSlug}`}
      unsubscribeUrl={`${base()}/api/newsletter/unsubscribe?token=${unsubscribeToken}`}
    />,
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  await send(
    to,
    'Reset your ICONISTA password',
    <PasswordResetEmail url={`${base()}/reset-password?token=${token}`} />,
  );
}
