import { getFormatter, getTranslations } from 'next-intl/server';
import { Countdown } from '@/components/Countdown';
import { ProductCard } from '@/features/products/components/ProductCard';
import type { DropView } from '@/features/drops/queries';

/** "Drop 007 — Live" heading, countdown, availability rule and the card grid. */
export async function DropGridSection({ drop }: { drop: DropView }) {
  const t = await getTranslations('drop');
  const format = await getFormatter();
  const number = String(drop.number).padStart(3, '0');

  return (
    <section className="container" style={{ padding: '84px 40px 70px' }} id="drop">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 24,
        }}
      >
        <div>
          <div className="label" style={{ color: 'var(--bronze)', marginBottom: 14 }}>
            {t('released', {
              date: format.dateTime(new Date(drop.releaseAt), {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              }),
            })}
          </div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 'clamp(34px, 4.4vw, 62px)',
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
            }}
          >
            Drop {number}{' '}
            <span style={{ fontWeight: 200 }}>
              — {drop.status === 'live' ? t('live') : t('closed')}
            </span>
          </h2>
        </div>

        {drop.status === 'live' ? (
          <div style={{ textAlign: 'right' }}>
            <div className="label-sm" style={{ color: 'var(--stone)', marginBottom: 10 }}>
              {t('closesIn')}
            </div>
            <Countdown
              closesAt={drop.closesAt}
              labels={{ days: t('days'), hrs: t('hrs'), min: t('min'), sec: t('sec') }}
            />
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="label-sm" style={{ color: 'var(--stone)' }}>
          {t('stillAvailable', { available: drop.availableCount, total: drop.totalCount })}
        </span>
      </div>

      <div
        className="scrollx"
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(300px, 1fr)',
          gap: 24,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {drop.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
