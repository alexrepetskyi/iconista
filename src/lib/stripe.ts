import Stripe from 'stripe';
import { env } from './env';

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(env().STRIPE_SECRET_KEY);
  }
  return client;
}
