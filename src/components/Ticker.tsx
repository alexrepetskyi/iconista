import { getTranslations } from 'next-intl/server';

/** The marquee bar above the header — mirrors the reference design. */
export async function Ticker({
  dropNumber,
  pieceCount,
}: {
  dropNumber: number | null;
  pieceCount: number;
}) {
  const t = await getTranslations('ticker');
  const number = dropNumber !== null ? String(dropNumber).padStart(3, '0') : null;
  const items = [
    ...(number ? [t('liveNow', { number })] : []),
    ...(pieceCount > 0 ? [t('piecesOnly', { count: pieceCount })] : []),
    t('authentic'),
    t('shipping'),
  ];

  const Star = () => <span style={{ color: 'var(--gold)' }}>✦</span>;
  const Sequence = () => (
    <>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 46, alignItems: 'center' }}>
          <span>{item}</span>
          <Star />
        </span>
      ))}
    </>
  );

  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--cream)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        padding: '11px 0',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          gap: 46,
          alignItems: 'center',
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          animation: 'marquee 32s linear infinite',
          willChange: 'transform',
        }}
      >
        <Sequence />
        <Sequence />
      </div>
    </div>
  );
}
