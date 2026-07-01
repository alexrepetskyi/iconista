import { Resend } from 'resend';
import { env } from './env';

let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    client = new Resend(env().RESEND_API_KEY);
  }
  return client;
}
