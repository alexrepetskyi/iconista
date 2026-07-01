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
│   │   │   └── admin/                    # drops / products / orders / promocodes (role=admin)
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
│   │   ├── promocodes/                   # generate, validate, hold, consume
│   │   ├── auth/
│   │   ├── newsletter/                   # double opt-in + unsubscribe
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
- **orders** — userId (optional — guest checkout allowed), items with price captured at purchase, subtotal, promoCode + discount amount (if applied), total, currency, status (`pending` → `paid` → `shipped` → `delivered`, or `cancelled` / `refunded`), stripeSessionId, shippingAddress (from Stripe), timeline
- **subscribers** — email + locale for the "next drop" broadcast, double opt-in state (`pending` → `confirmed`), unsubscribe token
- **promocodes** — code (unique, uppercase), discount (`percent` | `fixed` + value), expiresAt, userId (optional — restricts the code to one account), status (`active` | `used` | `expired`), usedBy/usedAt, orderId. Single-use: one successful redemption consumes the code.

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
- Starting checkout reserves every cart item atomically: `SET reserve:product:<id> <ownerId> NX EX 1800` (30 min, matching the Stripe session lifetime).
- **Partial reservation failure:** if some items reserve and others don't, checkout is NOT refused wholesale — the UI names the lost pieces ("Jackie 1961 was just taken") and offers one-click "pay for the rest"; already-taken reservations are kept.
- **Reserved is visible to everyone:** product cards and the product page show an "ON HOLD" state while a reservation key exists (storefront checks Redis alongside Mongo status). No dead-end checkouts for the second buyer.
- A product is available ⇔ Mongo status is `available` **and** no Redis reservation key exists.
- Reservations expire via TTL — no cron.
- Mongo is the source of truth: a product becomes `sold` only via the Stripe webhook.

### Checkout & payment

- Cart → "Pay" (or product page → "Buy now" with a single item) → reserve items → create Stripe Checkout Session (embedded UI mode, 30 min expiry, shipping address collected by Stripe) → embedded payment form on `/checkout`.
- **"Buy now" for an item already in the cart** never duplicates — it starts a single-item checkout for that piece, leaving the cart untouched.
- **Drop close vs. active payments:** an active reservation outlives the drop's countdown — payment completes normally after the timer hits zero. A drop only transitions to `closed` when no live reservations/Stripe sessions remain for its products.
- **Expired checkout page:** returning to `/checkout` after the session expired shows "reservation expired" with a one-click re-reserve + new session (if the items are still available).
- Webhook `checkout.session.completed` → order `paid`, products `sold`, reservation keys deleted, promo code (if any) marked `used`, drop cache invalidated, confirmation email sent.
- Webhook `checkout.session.expired` → reservation keys deleted, promo-code hold released, pending order `cancelled`.
- Webhook handler verifies Stripe signatures and is idempotent (safe on Stripe retries).

### Promo codes

- Admin generates codes in `/admin/promocodes`: discount type (`percent` or `fixed` EUR amount), **expiry date**, optional **account binding** (code works only for that user's email), always **single-use**.
- The checkout page always shows a promo-code input. Applying a valid code immediately updates the order summary — subtotal, discount line ("PROMO −€X"), new total — and the Stripe payment form charges the discounted total. The discount and code are stored on the order.
- Validation on apply: code exists, `active`, not expired, bound account matches the signed-in user (bound codes require sign-in), not already used or held by another live checkout. Invalid → clear inline error ("expired", "already used", "not valid for this account").
- Applying a code places a Redis hold (`SET promo:<code> <ownerId> NX EX 1800`, same lifetime as the reservation) so one code can't ride two concurrent checkouts; the discount is passed to Stripe via an ad-hoc coupon on the Checkout Session.
- The code is consumed (`used`, with usedBy/usedAt/orderId) only on `checkout.session.completed`; an expired session releases the hold and the code stays usable.
- Expiry is checked at validation time; a periodic status flip is unnecessary.

### Refunds / returns (14-day promise in the design)

- MVP: the refund itself is executed in the Stripe dashboard; the webhook (`charge.refunded`) moves the order to `refunded` and sends a confirmation email.
- A refunded 1/1 piece does **not** auto-return to sale (its drop is closed). It stays `sold` with an admin note; the admin decides manually whether to attach it to a future drop.

### Auth

- Auth.js with two providers: Google OAuth and credentials (email + password, argon2).
- JWT sessions in httpOnly cookies; SSR pages read the session server-side.
- Guest cart lives under an anonymous cookie; merged into the user cart on login.
- Guest checkout allowed — the order is linked by the email Stripe collects.
- **Guest orders join the account later:** on registration or login, past guest orders with the same (verified) email are attached to the account and appear in order history.
- **Email verification never blocks buying:** an unverified account can check out normally (Stripe confirms the email in practice); verification is only required for password reset.
- `/account` shows order history; `/admin` requires role `admin`.

### Admin

- Create drop (number, title, release/close dates, hero video) → add products (photos, brand, title, prices; translations auto-generate on save) → publish (`live`; closes on timer or manually).
- Orders list with status transitions; "mark shipped" (with tracking number) sends the shipping email.
- Promo codes page: generate/list codes with discount, expiry, optional account binding, usage status.
- Photo uploads stored in `uploads/` for MVP behind a single storage function — S3/R2 is a drop-in later.

### Newsletter (GDPR)

- "Notify me" signup uses **double opt-in**: signup → confirmation email → `confirmed` only after the click; broadcasts go to confirmed subscribers only.
- Every broadcast includes a one-click unsubscribe link (tokenized, no login needed).

### Emails (Resend + React Email)

Registration confirmation, password reset, order confirmation, order shipped (with tracking), order refunded, newsletter opt-in confirmation, "new drop is live" broadcast to confirmed subscribers.

### Redis usage summary

1. Product reservations (TTL keys, atomic NX).
2. Promo-code holds during checkout (TTL keys, atomic NX).
3. Rate limiting: login attempts, newsletter signups, promo-code validation attempts (anti-bruteforce).
4. Cache of the live drop payload, invalidated on sale/admin edits.

## Error handling

- `lib/env.ts` validates all env vars with zod at boot — missing config fails fast with a clear message.
- Checkout race: reservation failure returns a typed error the UI turns into "this piece was just reserved" with a cart refresh.
- Stripe webhook: signature verification, idempotency by event id, 5xx on transient failures so Stripe retries.
- LLM translation failure on save: content saves in the source language, translation marked pending and retried by the backfill task — admin save never blocks on the LLM.
- Server Actions return typed results (`{ ok } | { error }`) — no exceptions crossing into UI.

## Testing

- **Unit (Vitest):** reservation logic (concurrent NX contention, expiry, partial failure), promo-code validation matrix (expired / used / wrong account / concurrent hold) and discount math, order status transitions, cart merge on login, locale fallback when a translation is missing.
- **Integration:** checkout flow against Stripe test mode with webhook fixtures (completed / expired / refunded), including a discounted session; translation save path with a mocked LLM client.
- **Smoke (Playwright):** home renders drop data, product page → add to cart → checkout page loads the payment form and accepts a promo code.

## Out of scope (MVP)

Search (the design's Search button is not rendered in MVP — no dead buttons), PayPal/Scalapay as separate integrations (Stripe covers cards/Klarna), reviews CMS (static content initially), S3 image storage, inventory >1 per product, refund execution UI (refunds are issued in the Stripe dashboard; the site reflects them via webhook).
