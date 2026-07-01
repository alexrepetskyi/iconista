import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import {
  expireCheckoutSession,
  fulfillCheckoutSession,
  markOrderRefunded,
} from '@/features/orders/fulfill';

export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      env().STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await fulfillCheckoutSession(event.data.object);
        break;
      case 'checkout.session.expired':
        await expireCheckoutSession(event.data.object);
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (paymentIntentId) await markOrderRefunded(paymentIntentId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`stripe webhook ${event.type} failed`, err);
    // 5xx so Stripe retries transient failures; handlers are idempotent.
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
