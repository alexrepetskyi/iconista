import { connectDb } from '@/lib/mongodb';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';
import { Link } from '@/i18n/routing';
import { AdminForm, AdminButton } from '@/features/admin/components/AdminForm';
import { createDrop, runTranslationBackfill } from '@/features/admin/actions';
import { countMissingTranslations } from '@/features/translations/backfill';
import { pickLocalized, defaultLocale, localeCodes } from '@/i18n/locales';

export const dynamic = 'force-dynamic';

export default async function AdminDropsPage() {
  await connectDb();
  const drops = await Drop.find().sort({ number: -1 });
  const counts = new Map(
    (
      await Product.aggregate<{ _id: unknown; count: number }>([
        { $group: { _id: '$dropId', count: { $sum: 1 } } },
      ])
    ).map((c) => [String(c._id), c.count]),
  );
  const missing =
    localeCodes.length > 1 ? await countMissingTranslations() : { dropsMissing: 0, productsMissing: 0 };
  const missingTotal = missing.dropsMissing + missing.productsMissing;

  return (
    <div style={{ display: 'grid', gap: 48 }}>
      <section>
        <h1 style={{ fontWeight: 800, fontSize: 34, marginBottom: 24 }}>Drops</h1>
        {missingTotal > 0 ? (
          <div style={{ background: '#fff', padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13 }}>
              Missing translations: {missing.dropsMissing} drops, {missing.productsMissing} products
            </span>
            <AdminButton action={runTranslationBackfill} label="Fill missing translations" variant="dark" />
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 12 }}>
          {drops.map((drop) => (
            <div
              key={String(drop._id)}
              style={{
                background: '#fff',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <Link href={`/admin/drops/${String(drop._id)}`} style={{ fontWeight: 700 }}>
                  Drop {String(drop.number).padStart(3, '0')} — {pickLocalized(drop.title as never, defaultLocale)}
                </Link>
                <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 6 }}>
                  {counts.get(String(drop._id)) ?? 0} pieces · closes {drop.closesAt.toLocaleString('en-GB')}
                </div>
              </div>
              <span
                className="label-xs"
                style={{
                  padding: '5px 10px',
                  background: drop.status === 'live' ? 'var(--ink)' : 'transparent',
                  color: drop.status === 'live' ? 'var(--cream)' : 'var(--stone)',
                  border: drop.status === 'live' ? 'none' : '1px solid var(--line)',
                }}
              >
                {drop.status}
              </span>
            </div>
          ))}
          {drops.length === 0 ? <p style={{ color: 'var(--stone)', fontWeight: 300 }}>No drops yet.</p> : null}
        </div>
      </section>

      <section style={{ background: '#fff', padding: '28px 26px', maxWidth: 560 }}>
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>New drop</h2>
        <AdminForm action={createDrop} submitLabel="Create drop">
          <input name="number" type="number" placeholder="Number (e.g. 8)" className="field" required />
          <input name="title" placeholder="Title (in English — auto-translated)" className="field" required />
          <textarea name="description" placeholder="Description" className="field" rows={3} />
          <label className="label-xs" style={{ color: 'var(--stone)' }}>
            Release date
            <input name="releaseAt" type="datetime-local" className="field" required style={{ marginTop: 6 }} />
          </label>
          <label className="label-xs" style={{ color: 'var(--stone)' }}>
            Closes date
            <input name="closesAt" type="datetime-local" className="field" required style={{ marginTop: 6 }} />
          </label>
          <input name="heroVideoUrl" placeholder="Hero video URL (optional)" className="field" />
        </AdminForm>
      </section>
    </div>
  );
}
