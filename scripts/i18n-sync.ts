/**
 * Generates missing UI dictionaries (src/i18n/<locale>.json) from the default
 * locale via LLM. Run locally after adding a language to src/i18n/locales.ts:
 *
 *   npm run i18n:sync
 *
 * Output is written to disk so it can be reviewed and committed.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { locales, defaultLocale } from '../src/i18n/locales';

const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');
const MODEL = 'claude-haiku-4-5-20251001';

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Set ANTHROPIC_API_KEY to run i18n:sync');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });
  const source = readFileSync(path.join(I18N_DIR, `${defaultLocale}.json`), 'utf8');

  const labels = locales as Record<string, { label: string }>;
  const targets = Object.keys(labels).filter(
    (code) => code !== (defaultLocale as string) && !existsSync(path.join(I18N_DIR, `${code}.json`)),
  );
  if (targets.length === 0) {
    console.log('All UI dictionaries are present.');
    return;
  }

  for (const target of targets) {
    console.log(`Translating UI strings → ${target}...`);
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system:
        'You translate UI strings for a luxury e-commerce site. Keep ICU message ' +
        'placeholders like {count} and tags like <b>...</b> intact. Never translate ' +
        'brand names. Reply with the translated JSON only — same structure, no fences.',
      messages: [
        {
          role: 'user',
          content: `Translate this JSON from "${defaultLocale}" to "${target}" (${labels[target].label}):\n${source}`,
        },
      ],
    });
    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    const parsed = JSON.parse(text); // validate before writing
    writeFileSync(
      path.join(I18N_DIR, `${target}.json`),
      `${JSON.stringify(parsed, null, 2)}\n`,
    );
    console.log(`  wrote src/i18n/${target}.json`);
  }
  console.log('Done. Review the files and commit.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
