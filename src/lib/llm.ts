import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';

let client: Anthropic | null = null;

export function getLlm(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env().ANTHROPIC_API_KEY });
  }
  return client;
}

/** Cheap, fast model — content translation is short-form and low-stakes. */
export const TRANSLATION_MODEL = 'claude-haiku-4-5-20251001';
