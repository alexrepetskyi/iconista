import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isLocale, defaultLocale, type Locale } from '@/i18n/locales';
import { getLiveDrop, getArchiveDrops } from '@/features/drops/queries';
import { DropGridSection } from '@/features/drops/components/DropGridSection';
import { NewsletterForm } from '@/features/newsletter/components/NewsletterForm';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);

  const [drop, archive, tHero, tAuth, tAbout, tArchive, tReviews, tFaq, tBenefits, tNews] =
    await Promise.all([
      getLiveDrop(locale),
      getArchiveDrops(locale),
      getTranslations('hero'),
      getTranslations('authenticity'),
      getTranslations('about'),
      getTranslations('archive'),
      getTranslations('reviews'),
      getTranslations('faq'),
      getTranslations('benefits'),
      getTranslations('newsletter'),
    ]);

  const number = drop ? String(drop.number).padStart(3, '0') : null;
  const nextNumber = String((drop?.number ?? 7) + 1).padStart(3, '0');

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section
        style={{
          position: 'relative',
          height: '84vh',
          minHeight: 600,
          overflow: 'hidden',
          background: 'var(--ink)',
        }}
      >
        {drop?.heroVideoUrl ? (
          <video
            src={drop.heroVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(120% 120% at 70% 30%, var(--dark-1) 0%, var(--dark-2) 45%, var(--dark-3) 100%)',
              animation: 'heroPan 18s ease-in-out infinite alternate',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '60%',
            background:
              'linear-gradient(115deg, transparent 30%, rgba(201,168,110,0.18) 50%, transparent 70%)',
            animation: 'sheen 9s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 50%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            padding: '48px 40px',
            color: 'var(--cream)',
            maxWidth: 1100,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              fontWeight: 400,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 22,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: 'rgba(201,168,110,0.25) 0 0 0 4px',
              }}
            />
            {drop ? tHero('liveNow', { count: drop.totalCount }) : 'ICONISTA'}
          </div>
          <h1
            style={{
              fontWeight: 900,
              fontSize: 'clamp(56px, 11vw, 176px)',
              lineHeight: 0.84,
              letterSpacing: '-0.03em',
            }}
          >
            {tHero('drop').toUpperCase()}
            <br />
            <span style={{ fontWeight: 200 }}>{number ?? nextNumber}.</span>
          </h1>
          <p
            style={{
              fontWeight: 300,
              fontSize: 'clamp(15px, 1.4vw, 19px)',
              lineHeight: 1.55,
              maxWidth: 420,
              marginTop: 26,
              color: 'var(--cream-80)',
            }}
          >
            {drop ? drop.description || tHero('description') : tHero('comingSoon')}
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {drop ? (
              <a href="#drop" className="btn btn-light">
                {tHero('shopTheDrop')}
              </a>
            ) : null}
            <a href="#newsletter" className="btn btn-outline-light">
              {tHero('remindMe', { number: nextNumber })}
            </a>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            color: 'var(--cream-60)',
            animation: 'cue 2.4s ease-in-out infinite',
          }}
        >
          <span
            className="label-xs"
            style={{ letterSpacing: '0.24em', writingMode: 'vertical-rl' }}
          >
            {tHero('scroll')}
          </span>
        </div>
      </section>

      {/* ---------- LIVE DROP GRID ---------- */}
      {drop ? <DropGridSection drop={drop} /> : null}

      {/* ---------- 100% AUTHENTIC ---------- */}
      <section
        id="authenticity"
        style={{
          background: 'var(--ink)',
          color: 'var(--cream)',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)',
          gap: 40,
          alignItems: 'center',
          padding: '90px 40px',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 'clamp(80px, 12vw, 170px)', lineHeight: 0.9 }}>
          100%
        </div>
        <div style={{ maxWidth: 480 }}>
          <div
            style={{ fontWeight: 300, fontSize: 'clamp(22px, 2.4vw, 30px)', lineHeight: 1.35 }}
            dangerouslySetInnerHTML={{
              __html: tAuth.raw('headline').replace('<em>', '<strong>').replace('</em>', '</strong>'),
            }}
          />
          <p
            style={{
              marginTop: 22,
              fontSize: 13,
              fontWeight: 300,
              lineHeight: 1.7,
              color: 'var(--cream-60)',
            }}
          >
            {tAuth('body')}
          </p>
        </div>
      </section>

      {/* ---------- ABOUT ---------- */}
      <section
        id="about"
        className="container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1.1fr) minmax(280px, 0.9fr)',
          gap: 56,
          alignItems: 'center',
          padding: '96px 40px',
        }}
      >
        <div>
          <div className="label" style={{ color: 'var(--bronze)', marginBottom: 18 }}>
            {tAbout('label')}
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(34px, 4vw, 54px)', lineHeight: 1.05 }}>
            {tAbout('title')}
            <br />
            <span style={{ fontWeight: 200 }}>{tAbout('subtitle')}</span>
          </h2>
          <p
            style={{
              marginTop: 24,
              fontSize: 14,
              fontWeight: 300,
              lineHeight: 1.75,
              maxWidth: 480,
              color: '#4d463a',
            }}
          >
            {tAbout('body')}
          </p>
          <div style={{ marginTop: 40, display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            {(
              [
                ['2–6', tAbout('piecesPerDrop')],
                ['1/1', tAbout('oneOfEach')],
                ['100%', tAbout('authenticDocumented')],
              ] as const
            ).map(([big, small]) => (
              <div key={small}>
                <div style={{ fontWeight: 800, fontSize: 28 }}>{big}</div>
                <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 8, maxWidth: 140 }}>
                  {small}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div
            style={{
              aspectRatio: '4 / 5',
              background: 'var(--card-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontWeight: 200, fontSize: 14, color: 'var(--ink-32)' }}>
              ICONISTA
            </span>
          </div>
          <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 14 }}>
            {tAbout('photoCaption')}
          </div>
        </div>
      </section>

      {/* ---------- ARCHIVE ---------- */}
      <section id="archive" className="container" style={{ padding: '20px 40px 90px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
            marginBottom: 36,
          }}
        >
          <div>
            <div className="label" style={{ color: 'var(--bronze)', marginBottom: 14 }}>
              {tArchive('label')}
            </div>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 48px)' }}>
              {tArchive('title')}
            </h2>
          </div>
          <p style={{ fontSize: 13, fontWeight: 300, maxWidth: 320, color: 'var(--stone)', lineHeight: 1.6 }}>
            {tArchive('description')}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {archive.slice(0, 3).map((past) => (
            <Link
              key={past.slug}
              href={`/drop/${past.slug}`}
              style={{
                position: 'relative',
                background:
                  'radial-gradient(120% 120% at 70% 20%, var(--dark-1) 0%, var(--dark-2) 55%, var(--dark-3) 100%)',
                color: 'var(--cream)',
                aspectRatio: '16 / 10',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 800, fontSize: 44 }}>
                  {String(past.number).padStart(3, '0')}
                </span>
                <span
                  className="label-xs"
                  style={{ border: '1px solid rgba(243,237,226,0.4)', padding: '5px 10px' }}
                >
                  {tArchive('soldOut')}
                </span>
              </div>
              <div>
                <div className="label-xs" style={{ color: 'var(--cream-55)', marginBottom: 8 }}>
                  {new Date(past.closesAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  · {tArchive('pieces', { count: past.pieceCount })}
                </div>
                <div style={{ fontWeight: 400, fontSize: 17 }}>{past.title}</div>
              </div>
            </Link>
          ))}
        </div>

        {archive.length > 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link href="/archive" className="btn btn-outline-dark">
              {tArchive('viewAll', { count: archive.length })}
            </Link>
          </div>
        ) : null}
      </section>

      {/* ---------- REVIEWS ---------- */}
      <section id="reviews" className="container" style={{ padding: '0 40px 90px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(26px, 3vw, 40px)' }}>{tReviews('title')}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span className="label-sm" style={{ color: 'var(--stone)' }}>
              {tReviews('excellent')}
            </span>
            <span style={{ color: 'var(--gold)' }}>★★★★★</span>
            <span style={{ fontWeight: 700 }}>4.7/5</span>
            <span style={{ fontSize: 12, fontWeight: 300, color: 'var(--stone)' }}>
              · {tReviews('fromPastDrops')}
            </span>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
          }}
        >
          {(
            [
              ['Everything perfect', 'Nothing to say — they were very helpful with my endless hesitation. Highly recommend.', 'GIULIA'],
              ['Beautiful bag', 'Bought a gift for my (very picky) mother. Fast, beautiful, will order again.', 'HECTOR'],
              ['100% original', 'Arrived with authenticity tag, even before Christmas. Impeccable experience.', 'JADE'],
              ['Great experience', 'Very fast shipping and the piece was exactly as described. Very happy.', 'ALEXANDER'],
            ] as const
          ).map(([title, body, author]) => (
            <div key={author} style={{ background: '#fff', padding: '26px 24px' }}>
              <div style={{ color: 'var(--gold)', fontSize: 13 }}>★★★★★</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12 }}>{title}</div>
              <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.6, marginTop: 10, color: '#4d463a' }}>
                {body}
              </p>
              <div className="label-xs" style={{ color: 'var(--stone)', marginTop: 16 }}>
                {author}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section
        id="faq"
        className="container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 0.7fr) minmax(300px, 1.3fr)',
          gap: 48,
          padding: '0 40px 90px',
        }}
      >
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(30px, 3.6vw, 48px)' }}>{tFaq('title')}</h2>
          <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.6, marginTop: 16, color: 'var(--stone)', maxWidth: 280 }}>
            {tFaq('subtitle')}
          </p>
        </div>
        <div>
          {([1, 2, 3, 4] as const).map((i) => (
            <details key={i} style={{ borderTop: '1px solid var(--line)' }}>
              <summary
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '22px 4px',
                  fontSize: 15,
                  fontWeight: 400,
                }}
              >
                {tFaq(`q${i}`)}
                <span
                  className="faq-plus"
                  style={{ fontWeight: 200, fontSize: 22, transition: 'transform 0.2s ease' }}
                >
                  +
                </span>
              </summary>
              <p style={{ padding: '0 4px 22px', fontSize: 13, fontWeight: 300, lineHeight: 1.7, color: '#4d463a', maxWidth: 560 }}>
                {tFaq(`a${i}`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- BENEFITS ---------- */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 1,
          background: 'var(--line)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {(
          [
            [tBenefits('shippingTitle'), tBenefits('shippingBody')],
            [tBenefits('serviceTitle'), tBenefits('serviceBody')],
            [tBenefits('returnsTitle'), tBenefits('returnsBody')],
            [tBenefits('paymentsTitle'), tBenefits('paymentsBody')],
          ] as const
        ).map(([title, body]) => (
          <div key={title} style={{ background: 'var(--cream)', padding: '36px 28px', textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
            <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--stone)', marginTop: 8 }}>{body}</div>
          </div>
        ))}
      </section>

      {/* ---------- NEWSLETTER ---------- */}
      <section
        id="newsletter"
        style={{
          background: 'var(--ink)',
          color: 'var(--cream)',
          textAlign: 'center',
          padding: '90px 24px',
        }}
      >
        <div className="label" style={{ color: 'var(--gold)', marginBottom: 20 }}>
          {tNews('label', { number: nextNumber })}
        </div>
        <h2
          style={{ fontWeight: 300, fontSize: 'clamp(26px, 3.6vw, 44px)', maxWidth: 640, margin: '0 auto' }}
          dangerouslySetInnerHTML={{ __html: tNews.raw('title') }}
        />
        <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--cream-60)', marginTop: 16 }}>
          {tNews('subtitle')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
