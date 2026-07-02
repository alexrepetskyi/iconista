import { connectDb } from '@/lib/mongodb';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';
import { Link } from '@/i18n/routing';
import { AdminForm, AdminButton } from '@/features/admin/components/AdminForm';
import { AdminSplit, AdminPanel } from '@/features/admin/components/AdminSplit';
import { Pagination, ADMIN_PAGE_SIZE, parsePage } from '@/features/admin/components/Pagination';
import { createDrop, runTranslationBackfill } from '@/features/admin/actions';
import { countMissingTranslations } from '@/features/translations/backfill';
import { MAX_PIECES_PER_DROP } from '@/features/drops/lifecycle';
import { pickLocalized, defaultLocale, localeCodes } from '@/i18n/locales';

export const dynamic = 'force-dynamic';

export default async function AdminDropsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale }, { page: rawPage }] = await Promise.all([params, searchParams]);
  const page = parsePage(rawPage);

  await connectDb();
  const total = await Drop.countDocuments();
  const drops = await Drop.find()
    .sort({ number: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE);
  const counts = new Map(
    (
      await Product.aggregate<{ _id: unknown; count: number }>([
        { $match: { dropId: { $in: drops.map((d) => d._id) } } },
        { $group: { _id: '$dropId', count: { $sum: 1 } } },
      ])
    ).map((c) => [String(c._id), c.count]),
  );
  const missing =
    localeCodes.length > 1
      ? await countMissingTranslations()
      : { dropsMissing: 0, productsMissing: 0 };
  const missingTotal = missing.dropsMissing + missing.productsMissing;

  return (
    <div>
      <h1 style={{ fontWeight: 800, fontSize: 34, marginBottom: 28 }}>Drops</h1>
      <AdminSplit
        form={
          <AdminPanel
            title="New drop"
            subtitle={`Going live archives the previous drop automatically · up to ${MAX_PIECES_PER_DROP} pieces`}
          >
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
              <input
                name="heroVideoUrl"
                placeholder="Hero video URL (blank = inherited from the latest drop)"
                className="field"
              />
            </AdminForm>
          </AdminPanel>
        }
        list={
          <>
            {missingTotal > 0 ? (
              <div
                style={{
                  background: '#fff',
                  padding: '14px 18px',
                  marginBottom: 14,
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
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
                      Drop {String(drop.number).padStart(3, '0')} —{' '}
                      {pickLocalized(drop.title as never, defaultLocale)}
                    </Link>
                    <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 6 }}>
                      {counts.get(String(drop._id)) ?? 0}/{MAX_PIECES_PER_DROP} pieces · closes{' '}
                      {drop.closesAt.toLocaleString('en-GB')}
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
              {drops.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontWeight: 300 }}>No drops yet.</p>
              ) : null}
            </div>
            <Pagination page={page} total={total} basePath={`/${locale}/admin/drops`} />
          </>
        }
      />
    </div>
  );
}
