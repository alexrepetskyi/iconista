# ICONISTA

Luxury drop shop: small numbered drops of one-of-one authenticated pieces.
Single Next.js 15 app (App Router) — storefront, admin, payments, emails in one process.
MongoDB and Redis connect via URLs; deploy is one container.

Design spec: `docs/superpowers/specs/2026-07-01-iconista-dropshop-design.md`

## Stack

- **Next.js 15** — SSR + SPA, Server Actions, one process
- **MongoDB (Mongoose)** — source of truth: users, drops, products, orders, carts, promo codes, subscribers
- **Redis (ioredis)** — 30-min 1/1 reservations, promo-code holds, rate limits, live-drop cache
- **Stripe Embedded Checkout** — cards/Klarna/Apple/Google Pay on-site; webhooks decide order fate
- **Auth.js v5** — Google OAuth + email/password (argon2), guest cart merge on login
- **Resend + React Email** — order/shipping/refund emails, double opt-in newsletter
- **next-intl + Claude API** — UI dictionaries per locale; product content translated by LLM on admin save
- **S3** — product photos are streamed to S3 (`src/lib/s3.ts`) and served back through `/uploads/<key>`; the bucket stays private

## Run locally

```bash
cp .env.example .env    # fill in MONGODB_URI, REDIS_URL, Stripe, Resend, Auth, Anthropic keys
npm install
npm run dev             # http://localhost:3000
```

### Payments in dev

Two modes via `PAYMENT_MODE`:

- `mock` — no Stripe at all: "Pay" runs the exact same fulfillment code the webhook
  uses (order `paid`, piece `sold`, promo consumed, cart cleared) against a synthetic
  session. Ideal for day-to-day local work. **Never in production.**
- `stripe` (default) — real Stripe test mode; forward webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Before going live, always run the full flow once in `stripe` mode with test cards
(4242 4242 4242 4242) — mock mode cannot catch Stripe-side issues.

## Admin access

Register an account on the site, then:

```bash
MONGODB_URI=... npx tsx scripts/make-admin.ts your@email.com
```

Sign out and back in — the role is baked into the session token.

Admin lives at `/admin`: create a drop → add pieces (photos, prices, rich-text description) → publish.
Drop rules: going live automatically archives the previous drop and its pieces; a drop holds
at most 10 pieces; unsold pieces of an archived drop can be moved into the next one; a drop
published without a hero video inherits the latest one. Publishing emails all confirmed
newsletter subscribers.

## Adding a language

1. Add one line to `src/i18n/locales.ts` (e.g. `it: { label: 'Italiano' }`).
2. `npm run i18n:sync` — generates `src/i18n/it.json` via LLM; review and commit.
3. In `/admin` press **Fill missing translations** — existing drops/products get translated content.

Routing (`/it/...`), the language switcher and translation targets all derive from that one config line.

## Tests

```bash
npm test          # vitest: reservations, promo validation/discounts, cart merge, locale fallback
npm run typecheck
```

## Deploy (one server)

```bash
docker build -t iconista .
docker run -d --env-file .env -p 3000:3000 iconista
```

Put Caddy/nginx with TLS in front. Point the Stripe webhook at `https://<domain>/api/webhooks/stripe`
(events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`).
