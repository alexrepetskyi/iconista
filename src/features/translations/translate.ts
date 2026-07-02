import { getLlm, TRANSLATION_MODEL } from '@/lib/llm';
import { localeCodes, defaultLocale, locales, type Locale } from '@/i18n/locales';

/** Brand vocabulary the model must never translate. */
const GLOSSARY =
  'Chanel, Louis Vuitton, LV, Dior, Gucci, Saint Laurent, YSL, Hermès, Prada, Bottega Veneta, ' +
  'Neverfull, Jackie, Lady Dior, Classic Flap, Uptown, ICONISTA';

export interface TranslationOutcome {
  /** field -> locale -> text (includes the source locale). */
  maps: Record<string, Partial<Record<Locale, string>>>;
  /** Locales that could not be translated and should be marked pending. */
  failedLocales: Locale[];
}

export const targetLocales = (): Locale[] => localeCodes.filter((l) => l !== defaultLocale);

/**
 * Translates admin-entered content (in the default locale) into every other
 * configured locale with one LLM call. Never throws: failures surface as
 * `failedLocales` so the admin save is never blocked.
 */
export async function translateContent(
  fields: Record<string, string>,
): Promise<TranslationOutcome> {
  const maps: TranslationOutcome['maps'] = {};
  for (const [field, text] of Object.entries(fields)) {
    maps[field] = { [defaultLocale]: text };
  }
  const targets = targetLocales();
  if (targets.length === 0 || Object.values(fields).every((t) => !t.trim())) {
    return { maps, failedLocales: [] };
  }

  try {
    const response = await getLlm().messages.create({
      model: TRANSLATION_MODEL,
      max_tokens: 2000,
      system:
        'You translate luxury e-commerce product copy. Keep the tone refined and concise. ' +
        `Never translate brand or model names: ${GLOSSARY}. ` +
        'Field values may contain HTML — keep every tag and attribute exactly as-is and ' +
        'translate only the human-readable text. ' +
        'Reply with JSON only, no code fences, no commentary.',
      messages: [
        {
          role: 'user',
          content:
            `Translate the following fields from "${defaultLocale}" into these locales: ` +
            `${targets.map((t) => `"${t}" (${locales[t].label})`).join(', ')}.\n` +
            `Fields JSON:\n${JSON.stringify(fields)}\n\n` +
            'Reply with JSON of the shape {"<locale>": {"<field>": "<translated text>"}}.',
        },
      ],
    });
    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    const parsed = JSON.parse(text) as Record<string, Record<string, string>>;

    const failed: Locale[] = [];
    for (const target of targets) {
      const perField = parsed[target];
      if (!perField) {
        failed.push(target);
        continue;
      }
      for (const field of Object.keys(fields)) {
        if (perField[field]) maps[field][target] = perField[field];
      }
    }
    return { maps, failedLocales: failed };
  } catch (err) {
    console.error('translateContent failed', err);
    return { maps, failedLocales: targets };
  }
}
