import Link from 'next/link';

export const ADMIN_PAGE_SIZE = 20;

export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Prev / next pager for admin lists; hidden when everything fits one page. */
export function Pagination({
  page,
  total,
  basePath,
  pageSize = ADMIN_PAGE_SIZE,
}: {
  page: number;
  total: number;
  basePath: string;
  pageSize?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages === 1) return null;

  const linkStyle = {
    padding: '8px 14px',
    border: '1px solid var(--line)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  } as const;

  return (
    <nav
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 18,
      }}
    >
      <span className="label-xs" style={{ color: 'var(--stone)', marginRight: 'auto' }}>
        {total} total · page {page} / {totalPages}
      </span>
      {page > 1 ? (
        <Link href={`${basePath}?page=${page - 1}`} style={linkStyle}>
          ← Prev
        </Link>
      ) : null}
      {page < totalPages ? (
        <Link href={`${basePath}?page=${page + 1}`} style={linkStyle}>
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
