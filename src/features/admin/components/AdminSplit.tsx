/**
 * Admin page skeleton: the form pane on the LEFT, the list pane on the RIGHT.
 * Collapses to a single column on narrow screens.
 */
export function AdminSplit({
  form,
  list,
}: {
  form: React.ReactNode;
  list: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 420px) minmax(360px, 1fr)',
        gap: 32,
        alignItems: 'start',
      }}
      className="admin-split"
    >
      <aside style={{ position: 'sticky', top: 24 }}>{form}</aside>
      <section style={{ minWidth: 0 }}>{list}</section>
    </div>
  );
}

export function AdminPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', padding: '26px 24px' }}>
      <h2 style={{ fontWeight: 700, fontSize: 19, marginBottom: subtitle ? 6 : 18 }}>{title}</h2>
      {subtitle ? (
        <p className="label-xs" style={{ color: 'var(--stone)', marginBottom: 18 }}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
