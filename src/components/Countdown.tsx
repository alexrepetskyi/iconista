'use client';

import { useEffect, useState } from 'react';

function parts(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(total / 86400),
    hrs: Math.floor((total % 86400) / 3600),
    min: Math.floor((total % 3600) / 60),
    sec: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Live countdown to the drop close; renders zeros once expired. */
export function Countdown({
  closesAt,
  labels,
}: {
  closesAt: string;
  labels: { days: string; hrs: string; min: string; sec: string };
}) {
  const target = new Date(closesAt).getTime();
  // Server renders a stable placeholder; ticking starts after hydration.
  const [left, setLeft] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    const tick = () => setLeft(parts(target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells: { value: string; label: string; last?: boolean }[] = [
    { value: left ? pad(left.days) : '--', label: labels.days },
    { value: left ? pad(left.hrs) : '--', label: labels.hrs },
    { value: left ? pad(left.min) : '--', label: labels.min },
    { value: left ? pad(left.sec) : '--', label: labels.sec, last: true },
  ];

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      {cells.map((cell, i) => (
        <span key={cell.label} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          {i > 0 ? (
            <span style={{ fontWeight: 200, fontSize: 30, color: '#c9bda6' }}>:</span>
          ) : null}
          <span style={{ textAlign: 'center', display: 'inline-block' }}>
            <span
              style={{
                display: 'block',
                fontWeight: 800,
                fontSize: 36,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: cell.last ? 'var(--bronze)' : 'inherit',
              }}
            >
              {cell.value}
            </span>
            <span
              className="label-xs"
              style={{ display: 'block', color: 'var(--stone)', marginTop: 5 }}
            >
              {cell.label}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
