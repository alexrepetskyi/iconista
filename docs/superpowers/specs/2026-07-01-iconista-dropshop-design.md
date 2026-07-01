# ICONISTA — Drop Shop Design

**Date:** 2026-07-01
**Status:** Approved pending user review

## Overview

ICONISTA is a luxury resale drop shop run by a two-person team (husband and wife). Products are one-of-one (1/1) authenticated luxury pieces (Chanel, LV, Dior, ...) released in small numbered drops (2–6 pieces). When a drop closes, its pieces never return. The site sells directly (cart + instant buy), in EUR, shipping across the EU.

The reference design lives in `design/home.html` (rendered screenshots reviewed 2026-07-01). Home page sections: ticker bar, nav (THIS DROP / ARCHIVE / ABOUT US, search, account, language switcher), hero with drop number + video, live drop grid with countdown and product cards (price, compare-at price, SAVE badge, SOLD OUT state), authenticity section, about section, archive of past drops, reviews, FAQ, benefits strip, "notify me about next drop" email capture, footer.

## Decisions (agreed with user)

| Topic | Decision |
|---|---|
| Framework | Single **Next.js 15 (App Router)** app, one Node process. No separate API server. |
| Database | **MongoDB** via connection string (`MONGODB_URI`), Mongoose. Source of truth. |
| Ephemeral state | **Redis** via connection string (`REDIS_URL`), ioredis — reservations, rate limiting, cache. |
| Payments | **Stripe Embedded Checkout** (payment form on-site): cards, Klarna, Apple/Google Pay. |
| Emails | **Resend** + React Email templates. |
| Auth | **Auth.js (NextAuth v5)**: Google OAuth + email/password (argon2), httpOnly cookie sessions. |
| i18n routing | **next-intl**, `/{locale}/` URL prefix (SEO/hreflang per language). |
| Translations | **LLM-generated**: admin enters content in one language; Claude API translates to all configured locales on save. Adding a language = one config line. |
| Cart | Yes — cart plus a "Buy now" fast path on the product page. |
| Deploy | One container/process on a simple server; Mongo and Redis are external services. |

## Project structure

```
iconista/
├── src/
│   ├── app/                              # routes only — thin layer, no business logic
│   │   ├── [locale]/
│   │   │   ├── (storefront)/             # public storefront, shared layout (ticker/nav/footer)
│   │   │   │   ├── page.tsx              # home: current drop (reference design)
│   │   │   │   ├── drop/[slug]/page.tsx  # drop page: all products as cards
│   │   │   │   ├── product/[slug]/page.tsx # product: gallery, description,
│   │   │   │   │                         #   "Add to cart" + "Buy now"
│   │   │   │   ├── archive/page.tsx      # past drops
│   │   │   │   ├── cart/page.tsx
│   │   │   │   └── checkout/page.tsx     # Stripe Embedded Checkout
│   │   │   ├── (auth)/                   # login, register (own layout)
│   │   │   ├── account/orders/page.tsx   # order history (signed-in only)
│   │   │   └── admin/                    # drops / products / orders (role=admin)
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── webhooks/stripe/route.ts
│   ├── features/                         # business logic by domain
│   │   ├── drops/                        # each domain: actions.ts (Server Actions),
│   │   ├── products/                     #   queries.ts (SSR reads), components/
│   │   ├── cart/                         # + guest-cart merge on login
│   │   ├── checkout/
│   │   │   └── reservation.ts            # 1/1 reservation logic (Redis)
│   │   ├── orders/
│   │   ├── auth/
│   │   ├── newsletter/
│   │   └── translations/
│   │       └── translate.ts              # LLM translation on admin save + backfill
│   ├── components/                       # shared UI: Button, Ticker, Countdown, Badge...
│   ├── models/                           # Mongoose: User, Drop, Product, Order, Cart, Subscriber
│   ├── lib/                              # one file per service:
│   │   ├── mongodb.ts  redis.ts  stripe.ts  resend.ts
│   │   ├── llm.ts                        # Anthropic SDK client for translations
│   │   ├── uploads.ts                    # photo storage (MVP: disk; swappable to S3/R2)
│   │   └── env.ts                        # zod-validated env — fails fast on boot
│   ├── emails/                           # React Email: welcome, order-confirmed,
│   │                                     #   order-shipped, drop-live, reset-password
│   └── i18n/
│       ├── locales.ts                    # THE language config (single source of truth)
│       ├── en.json  [xx.json...]         # UI strings per locale
│       ├── routing.ts  request.ts        # next-intl wiring
├── public/
├── uploads/                              # product photos (server volume)
├── design/                               # reference design
├── .env.example                          # MONGODB_URI, REDIS_URL, STRIPE_SECRET_KEY,
│                                         #   STRIPE_WEBHOOK_SECRET, RESEND_API_KEY,
│                                         #   AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET,
│                                         #   ANTHROPIC_API_KEY
├── Dockerfile
└── docker-compose.yml                    # optional deploy wrapper (next + caddy)
```

## Data model (MongoDB collections)

Content fields (title, description, ...) are per-locale maps: `Map<locale, string>` — adding a language never changes the schema.

- **users** — email, passwordHash (argon2) or googleId, name, role (`admin` | `customer`)
- **drops** — number (007), title*, slug, status (`draft` → `live` → `closed`), releaseAt, closesAt, heroVideoUrl
- **products** — dropId, brand, title*, slug, description*, price, compareAtPrice (SAVE badge), images[], status (`available` | `sold`)
- **carts** — userId or anonymous sessionId (cookie), items[]
- **orders** — userId (optional — guest checkout allowed), items with price captured at purchase, total, currency, status (`pending` → `paid` → `shipped` → `delivered`, or `cancelled`), stripeSessionId, shippingAddress (from Stripe), timeline
- **subscribers** — email + locale for the "next drop" broadcast

(* = per-locale map)

## Key flows

### Languages: add-a-config-line workflow

`src/i18n/locales.ts` is the single source of truth:

```ts
export const locales = {
  en: { label: 'English', default: true },  // admin input language
  it: { label: 'Italiano' },
} as const;
```

Everything derives from it:
1. next-intl routing → `/it/...` works immediately.
2. Language switcher in the nav renders from this list.
3. LLM translation targets on every admin save.
4. **Backfill**: content missing the new locale is auto-translated (startup task + admin "fill missing translations" button with a missing-count). Until filled, pages fall back to the default locale — nothing breaks.
5. UI strings: `npm run i18n:sync` script generates missing `xx.json` dictionaries from `en.json` via LLM; output is committed and human-reviewable.

### LLM content translation

- Admin enters drop/product content once, in the default language.
- On save, one Claude API call (cheap model — Haiku) translates all content fields into every configured locale; results stored in the per-locale maps in Mongo.
- Storefront components just read their locale's field — no translation logic, no LLM calls at render time.
- Admin UI shows generated translations and allows manual edits.
- Prompt includes a brand glossary (Chanel, Neverfull, ... are never translated).

### 1/1 reservation (Redis)

Products are one-of-one; two buyers must never pay for the same piece.

- Adding to cart does **not** reserve.
- Starting checkout reserves every cart item atomically: `SET reserve:product:<id> <ownerId> NX EX 1800` (30 min, matching the Stripe session lifetime). If any item fails to reserve → checkout refused with a clear "just sold/reserved" message and the cart refreshes.
- A product is available ⇔ Mongo status is `available` **and** no Redis reservation key exists.
- Reservations expire via TTL — no cron.
- Mongo is the source of truth: a product becomes `sold` only via the Stripe webhook.

### Checkout & payment

- Cart → "Pay" (or product page → "Buy now" with a single item) → reserve items → create Stripe Checkout Session (embedded UI mode, 30 min expiry, shipping address collected by Stripe) → embedded payment form on `/checkout`.
- Webhook `checkout.session.completed` → order `paid`, products `sold`, reservation keys deleted, drop cache invalidated, confirmation email sent.
- Webhook `checkout.session.expired` → reservation keys deleted, pending order `cancelled`.
- Webhook handler verifies Stripe signatures and is idempotent (safe on Stripe retries).

### Auth

- Auth.js with two providers: Google OAuth and credentials (email + password, argon2).
- JWT sessions in httpOnly cookies; SSR pages read the session server-side.
- Guest cart lives under an anonymous cookie; merged into the user cart on login.
- Guest checkout allowed — the order is linked by the email Stripe collects.
- `/account` shows order history; `/admin` requires role `admin`.

### Admin

- Create drop (number, title, release/close dates, hero video) → add products (photos, brand, title, prices; translations auto-generate on save) → publish (`live`; closes on timer or manually).
- Orders list with status transitions; "mark shipped" (with tracking number) sends the shipping email.
- Photo uploads stored in `uploads/` for MVP behind a single storage function — S3/R2 is a drop-in later.

### Emails (Resend + React Email)

Registration confirmation, password reset, order confirmation, order shipped (with tracking), "new drop is live" broadcast to subscribers.

### Redis usage summary

1. Product reservations (TTL keys, atomic NX).
2. Rate limiting: login attempts and newsletter signups.
3. Cache of the live drop payload, invalidated on sale/admin edits.

## Error handling

- `lib/env.ts` validates all env vars with zod at boot — missing config fails fast with a clear message.
- Checkout race: reservation failure returns a typed error the UI turns into "this piece was just reserved" with a cart refresh.
- Stripe webhook: signature verification, idempotency by event id, 5xx on transient failures so Stripe retries.
- LLM translation failure on save: content saves in the source language, translation marked pending and retried by the backfill task — admin save never blocks on the LLM.
- Server Actions return typed results (`{ ok } | { error }`) — no exceptions crossing into UI.

## Testing

- **Unit (Vitest):** reservation logic (concurrent NX contention, expiry), order status transitions, cart merge on login, locale fallback when a translation is missing.
- **Integration:** checkout flow against Stripe test mode with webhook fixtures (completed / expired); translation save path with a mocked LLM client.
- **Smoke (Playwright):** home renders drop data, product page → add to cart → checkout page loads the payment form.

## Out of scope (MVP)

Search, PayPal/Scalapay as separate integrations (Stripe covers cards/Klarna), reviews CMS (static content initially), S3 image storage, inventory >1 per product, refunds UI (handled in Stripe dashboard).
