import type { Locale } from '@/i18n/locales';

/** Per-locale content map stored in Mongo, e.g. { en: "...", it: "..." }. */
export type LocalizedString = Partial<Record<Locale, string>>;

export type DropStatus = 'draft' | 'live' | 'closed';
export type ProductStatus = 'available' | 'sold';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';
export type PromoStatus = 'active' | 'used' | 'disabled';
export type PromoDiscountType = 'percent' | 'fixed';
export type UserRole = 'admin' | 'customer';
export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';
