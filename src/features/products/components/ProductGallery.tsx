'use client';

import { useRef, useState } from 'react';

/**
 * Product photo slider: main frame with prev/next arrows, swipe and
 * keyboard support, plus a thumbnail rail. image[0] is the main photo.
 */
export function ProductGallery({
  images,
  alt,
  badge,
}: {
  images: string[];
  alt: string;
  badge?: string | null;
}) {
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = images.length;
  const current = images[active] ?? null;

  const go = (delta: number) => {
    if (count < 2) return;
    setActive((i) => (i + delta + count) % count);
  };

  const arrowStyle = (side: 'left' | 'right') =>
    ({
      position: 'absolute',
      [side]: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: 'rgba(243,237,226,0.9)',
      color: 'var(--ink)',
      fontSize: 18,
      lineHeight: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    }) as const;

  return (
    <div>
      <div
        tabIndex={count > 1 ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
        style={{
          position: 'relative',
          aspectRatio: '4 / 5',
          background: 'var(--card-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          outline: 'none',
          touchAction: 'pan-y',
        }}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active}
            src={current}
            alt={`${alt} — ${active + 1}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontWeight: 200, fontSize: 14, color: 'var(--ink-32)' }}>{alt}</span>
        )}

        {badge ? (
          <span
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: 'var(--ink)',
              color: 'var(--cream)',
              padding: '6px 11px',
              zIndex: 2,
            }}
          >
            {badge}
          </span>
        ) : null}

        {count > 1 ? (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(-1)} style={arrowStyle('left')}>
              ‹
            </button>
            <button type="button" aria-label="Next photo" onClick={() => go(1)} style={arrowStyle('right')}>
              ›
            </button>
            <span
              className="label-xs"
              style={{
                position: 'absolute',
                right: 14,
                bottom: 12,
                color: 'var(--cream)',
                background: 'rgba(21,17,11,0.55)',
                padding: '4px 9px',
                zIndex: 2,
              }}
            >
              {active + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div
          className="scrollx"
          style={{ display: 'flex', gap: 10, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}
        >
          {images.map((image, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt} — photo ${i + 1}`}
              style={{
                width: 72,
                aspectRatio: '4 / 5',
                flexShrink: 0,
                overflow: 'hidden',
                padding: 0,
                border: i === active ? '2px solid var(--ink)' : '2px solid transparent',
                opacity: i === active ? 1 : 0.7,
                transition: 'opacity 0.15s ease',
                background: 'var(--card-bg)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
