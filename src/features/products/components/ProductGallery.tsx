'use client';

import { useState } from 'react';

/**
 * Product photo gallery: one large frame + a thumbnail rail.
 * Falls back to a quiet placeholder when the piece has no photos yet.
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
  const current = images[active] ?? null;

  return (
    <div>
      <div
        style={{
          position: 'relative',
          aspectRatio: '4 / 5',
          background: 'var(--card-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt={alt}
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
            }}
          >
            {badge}
          </span>
        ) : null}
        {images.length > 1 ? (
          <span
            className="label-xs"
            style={{
              position: 'absolute',
              right: 14,
              bottom: 12,
              color: 'var(--cream)',
              background: 'rgba(21,17,11,0.55)',
              padding: '4px 9px',
            }}
          >
            {active + 1} / {images.length}
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          className="scrollx"
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 12,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {images.map((image, i) => (
            <button
              key={image}
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
