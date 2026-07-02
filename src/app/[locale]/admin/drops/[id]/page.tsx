import { notFound } from 'next/navigation';
import { connectDb } from '@/lib/mongodb';
import { Drop } from '@/models/Drop';
import { Product } from '@/models/Product';
import { AdminForm, AdminButton } from '@/features/admin/components/AdminForm';
import { AdminSplit, AdminPanel } from '@/features/admin/components/AdminSplit';
import { RichTextEditor } from '@/features/admin/components/RichTextEditor';
import {
  createProduct,
  deleteProduct,
  movePieceToDrop,
  setDropStatus,
} from '@/features/admin/actions';
import { MAX_PIECES_PER_DROP } from '@/features/drops/lifecycle';
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
  // Move targets: any other drop still taking pieces (draft or live).
  const openDrops = await Drop.find({ _id: { $ne: drop._id }, status: { $ne: 'closed' } }).sort({
    number: -1,
  });
  const capacityLeft = MAX_PIECES_PER_DROP - products.length;

  const publish = setDropStatus.bind(null, id, 'live');
  const close = setDropStatus.bind(null, id, 'closed');
  const unpublish = setDropStatus.bind(null, id, 'draft');
  const boundCreateProduct = async (
    prev: Awaited<ReturnType<typeof createProduct>>,
    formData: FormData,
  ) => {
    'use server';
    formData.set('dropId', id);
    return createProduct(prev, formData);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontWeight: 800, fontSize: 30 }}>
          Drop {String(drop.number).padStart(3, '0')} —{' '}
          {pickLocalized(drop.title as never, defaultLocale)}
          <span className="label-sm" style={{ color: 'var(--stone)', marginLeft: 14 }}>
            {drop.status}
          </span>
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
      <div className="label-xs" style={{ color: 'var(--stone)', marginBottom: 28 }}>
        Release {drop.releaseAt.toLocaleString('en-GB')} · closes{' '}
        {drop.closesAt.toLocaleString('en-GB')}
        {!drop.heroVideoUrl ? ' · hero video inherited from the latest drop on publish' : ''}
      </div>

      <AdminSplit
        form={
          <AdminPanel
            title="Add piece"
            subtitle={`${capacityLeft} of ${MAX_PIECES_PER_DROP} slots left · content is written in English and auto-translated`}
          >
            {capacityLeft > 0 ? (
              <AdminForm action={boundCreateProduct} submitLabel="Add piece">
                <input name="brand" placeholder="Brand (e.g. Chanel)" className="field" required />
                <input name="title" placeholder="Title" className="field" required />
                {/* not a <label>: a label forwards clicks to its form control
                    and steals focus from the contentEditable editor */}
                <div>
                  <div className="label-xs" style={{ color: 'var(--stone)' }}>Description</div>
                  <div style={{ marginTop: 6 }}>
                    <RichTextEditor
                      name="description"
                      placeholder="Condition, materials, hardware, what's included…"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input name="price" type="number" step="0.01" min="1" placeholder="Price €" className="field" required />
                  <input name="compareAtPrice" type="number" step="0.01" min="0" placeholder="Compare-at €" className="field" />
                </div>
                <label className="label-xs" style={{ color: 'var(--stone)' }}>
                  Photos (stored on S3)
                  <input
                    name="images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="field"
                    style={{ marginTop: 6 }}
                  />
                </label>
              </AdminForm>
            ) : (
              <p className="form-error">This drop is full ({MAX_PIECES_PER_DROP} pieces).</p>
            )}
          </AdminPanel>
        }
        list={
          <div style={{ display: 'grid', gap: 10 }}>
            <h2 style={{ fontWeight: 700, fontSize: 19, marginBottom: 6 }}>
              Pieces ({products.length}/{MAX_PIECES_PER_DROP})
            </h2>
            {products.map((product) => {
              const moveAction = async (
                _prev: Awaited<ReturnType<typeof movePieceToDrop>>,
                formData: FormData,
              ) => {
                'use server';
                return movePieceToDrop(String(product._id), String(formData.get('target')));
              };
              return (
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
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <strong>{product.brand}</strong>{' '}
                    {pickLocalized(product.title as never, defaultLocale)}
                    <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 4 }}>
                      {formatEur(product.price)}
                      {product.compareAtPrice ? ` (was ${formatEur(product.compareAtPrice)})` : ''} ·{' '}
                      {product.status}
                      {(product.pendingLocales?.length ?? 0) > 0 ? ' · translations pending' : ''}
                    </div>
                  </div>
                  {product.status !== 'sold' ? (
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        marginLeft: 'auto',
                      }}
                    >
                      {openDrops.length > 0 ? (
                        <AdminForm action={moveAction} submitLabel="Move" resetOnSuccess={false} inline>
                          <select
                            name="target"
                            className="field"
                            style={{ padding: '9px 10px', fontSize: 12, width: 'auto', minWidth: 150 }}
                          >
                            {openDrops.map((target) => (
                              <option key={String(target._id)} value={String(target._id)}>
                                → Drop {String(target.number).padStart(3, '0')} ({target.status})
                              </option>
                            ))}
                          </select>
                        </AdminForm>
                      ) : null}
                      <AdminButton action={deleteProduct.bind(null, String(product._id))} label="Delete" />
                    </div>
                  ) : null}
                </div>
              );
            })}
            {products.length === 0 ? (
              <p style={{ color: 'var(--stone)', fontWeight: 300 }}>No pieces yet.</p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
