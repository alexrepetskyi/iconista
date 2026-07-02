'use client';

import { useState } from 'react';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/**
 * One file input per photo: image_0 is the MAIN photo (product card, first
 * slide), the rest follow in order. The server reads image_<n> keys sorted
 * by index, so the admin controls the exact photo order.
 */
export function PhotoInputs({ max = 8 }: { max?: number }) {
  const [count, setCount] = useState(1);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Array.from({ length: count }, (_, i) => (
        <label key={i} className="label-xs" style={{ color: 'var(--stone)', display: 'block' }}>
          {i === 0 ? 'Main photo (shown on the card)' : `Photo ${i + 1}`}
          <input
            type="file"
            name={`image_${i}`}
            accept={ACCEPT}
            className="field"
            style={{ marginTop: 4 }}
          />
        </label>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        {count < max ? (
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="btn btn-outline-dark"
            style={{ padding: '8px 14px', fontSize: 11 }}
          >
            + Add photo
          </button>
        ) : null}
        {count > 1 ? (
          <button
            type="button"
            onClick={() => setCount((c) => c - 1)}
            className="btn btn-outline-dark"
            style={{ padding: '8px 14px', fontSize: 11 }}
          >
            − Remove last
          </button>
        ) : null}
      </div>
    </div>
  );
}
