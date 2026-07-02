import { connectDb } from '@/lib/mongodb';
import { PromoCode } from '@/models/PromoCode';
import { User } from '@/models/User';
import { AdminForm, AdminButton } from '@/features/admin/components/AdminForm';
import { AdminSplit, AdminPanel } from '@/features/admin/components/AdminSplit';
import { Pagination, ADMIN_PAGE_SIZE, parsePage } from '@/features/admin/components/Pagination';
import { createPromoCode, disablePromoCode } from '@/features/admin/actions';
import { formatEur } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminPromoCodesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale }, { page: rawPage }] = await Promise.all([params, searchParams]);
  const page = parsePage(rawPage);

  await connectDb();
  const total = await PromoCode.countDocuments();
  const codes = await PromoCode.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE);
  const users = await User.find({ _id: { $in: codes.map((c) => c.userId).filter(Boolean) } });
  const emailById = new Map(users.map((u) => [String(u._id), u.email]));

  return (
    <div>
      <h1 style={{ fontWeight: 800, fontSize: 34, marginBottom: 28 }}>Promo codes</h1>
      <AdminSplit
        form={
          <AdminPanel title="New promo code" subtitle="Single-use. Optionally bound to one account by email.">
            <AdminForm action={createPromoCode} submitLabel="Generate code">
              <input name="code" placeholder="Code (blank = auto-generate)" className="field" />
              <div style={{ display: 'flex', gap: 12 }}>
                <select name="discountType" className="field" defaultValue="percent">
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed €</option>
                </select>
                <input name="discountValue" type="number" step="0.01" min="1" placeholder="Value" className="field" required />
              </div>
              <label className="label-xs" style={{ color: 'var(--stone)' }}>
                Valid until
                <input name="expiresAt" type="datetime-local" className="field" required style={{ marginTop: 6 }} />
              </label>
              <input name="email" type="email" placeholder="Bind to account email (optional)" className="field" />
            </AdminForm>
          </AdminPanel>
        }
        list={
          <>
            <div style={{ display: 'grid', gap: 10 }}>
              {codes.map((code) => {
                const expired = code.expiresAt.getTime() < Date.now();
                const state = code.status === 'active' && expired ? 'expired' : code.status;
                return (
                  <div
                    key={String(code._id)}
                    style={{
                      background: '#fff',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      opacity: state === 'active' ? 1 : 0.6,
                    }}
                  >
                    <strong style={{ fontSize: 15, letterSpacing: '0.08em' }}>{code.code}</strong>
                    <span style={{ fontSize: 13 }}>
                      {code.discountType === 'percent'
                        ? `−${code.discountValue}%`
                        : `−${formatEur(code.discountValue)}`}
                    </span>
                    <span className="label-xs" style={{ color: 'var(--stone)' }}>
                      until {code.expiresAt.toLocaleDateString('en-GB')}
                    </span>
                    {code.userId ? (
                      <span className="label-xs" style={{ color: 'var(--bronze)' }}>
                        only {emailById.get(String(code.userId)) ?? 'account'}
                      </span>
                    ) : null}
                    <span className="label-xs" style={{ marginLeft: 'auto' }}>
                      {state}
                      {code.usedAt ? ` · ${code.usedAt.toLocaleDateString('en-GB')}` : ''}
                    </span>
                    {state === 'active' ? (
                      <AdminButton action={disablePromoCode.bind(null, String(code._id))} label="Disable" />
                    ) : null}
                  </div>
                );
              })}
              {codes.length === 0 ? (
                <p style={{ color: 'var(--stone)', fontWeight: 300 }}>No codes yet.</p>
              ) : null}
            </div>
            <Pagination page={page} total={total} basePath={`/${locale}/admin/promocodes`} />
          </>
        }
      />
    </div>
  );
}
