import { notFound } from 'next/navigation';
import { connectDb } from '@/lib/mongodb';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';
import { AdminForm, AdminButton } from '@/features/admin/components/AdminForm';
import { createProduct, deleteProduct, setDropStatus } from '@/features/admin/actions';
import { pickLocalized, defaultLocale } from '@/i18n/locales';
import { formatEur } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function AdminDropDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDb();
  const drop = await Drop.findById(id).catch(() => null);
  if (!drop) notFound();
  const products = await Product.find({ dropId: drop._id }).sort({ createdAt: 1 });

  const publish = setDropStatus.bind(null, id, 'live');
  const close = setDropStatus.bind(null, id, 'closed');
  const unpublish = setDropStatus.bind(null, id, 'draft');
  const boundCreateProduct = async (prev: Awaited<ReturnType<typeof createProduct>>, formData: FormData) => {
    'use server';
    formData.set('dropId', id);
    return createProduct(prev, formData);
  };

  return (
    <div style={{ display: 'grid', gap: 40 }}>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ fontWeight: 800, fontSize: 30 }}>
            Drop {String(drop.number).padStart(3, '0')} — {pickLocalized(drop.title as never, defaultLocale)}
            <span className="label-sm" style={{ color: 'var(--stone)', marginLeft: 14 }}>{drop.status}</span>
          </h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {drop.status !== 'live' ? (
              <AdminButton action={publish} label="Publish (go live)" variant="dark" />
            ) : (
              <>
                <AdminButton action={close} label="Close drop" />
                <AdminButton action={unpublish} label="Back to draft" />
              </>
            )}
          </div>
        </div>
        <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 10 }}>
          Release {drop.releaseAt.toLocaleString('en-GB')} · closes {drop.closesAt.toLocaleString('en-GB')}
        </div>
      </section>

      <section>
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Pieces ({products.length})</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {products.map((product) => (
            <div
              key={String(product._id)}
              style={{
                background: '#fff',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" width={44} height={55} style={{ objectFit: 'cover' }} />
              ) : (
                <span style={{ width: 44, height: 55, background: 'var(--card-bg)', display: 'inline-block' }} />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong>{product.brand}</strong> {pickLocalized(product.title as never, defaultLocale)}
                <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 4 }}>
                  {formatEur(product.price)}
                  {product.compareAtPrice ? ` (was ${formatEur(product.compareAtPrice)})` : ''} · {product.status}
                  {(product.pendingLocales?.length ?? 0) > 0 ? ' · translations pending' : ''}
                </div>
              </div>
              {product.status !== 'sold' ? (
                <AdminButton action={deleteProduct.bind(null, String(product._id))} label="Delete" />
              ) : null}
            </div>
          ))}
          {products.length === 0 ? <p style={{ color: 'var(--stone)', fontWeight: 300 }}>No pieces yet.</p> : null}
        </div>
      </section>

      <section style={{ background: '#fff', padding: '28px 26px', maxWidth: 560 }}>
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>Add piece</h2>
        <AdminForm action={boundCreateProduct} submitLabel="Add piece">
          <input name="brand" placeholder="Brand (e.g. Chanel)" className="field" required />
          <input name="title" placeholder="Title (in English — auto-translated)" className="field" required />
          <textarea name="description" placeholder="Description" className="field" rows={4} />
          <div style={{ display: 'flex', gap: 12 }}>
            <input name="price" type="number" step="0.01" min="1" placeholder="Price €" className="field" required />
            <input name="compareAtPrice" type="number" step="0.01" min="0" placeholder="Compare-at € (for SAVE badge)" className="field" />
          </div>
          <label className="label-xs" style={{ color: 'var(--stone)' }}>
            Photos
            <input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="field" style={{ marginTop: 6 }} />
          </label>
        </AdminForm>
      </section>
    </div>
  );
}
