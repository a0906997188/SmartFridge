import { Ingredient } from '../types/fridge';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days considered "expiring soon". */
export const EXPIRING_SOON_DAYS = 3;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** ISO date string `days` days from today. */
export function expiryDateFromDays(days: number): string {
  return new Date(startOfToday() + Math.round(days) * DAY_MS).toISOString();
}

/** Ensure the ingredient has an absolute expiresAt so the countdown advances day by day. */
export function withExpiry(item: Ingredient): Ingredient {
  if (item.expiresAt) return item;
  return { ...item, expiresAt: expiryDateFromDays(item.expiryDays ?? 7) };
}

/** Whole days left until expiry (0 = expires today, negative = already expired). */
export function getDaysLeft(item: Pick<Ingredient, 'expiresAt' | 'expiryDays'>): number {
  if (!item.expiresAt) return item.expiryDays ?? 7;
  const expires = new Date(item.expiresAt);
  expires.setHours(0, 0, 0, 0);
  return Math.round((expires.getTime() - startOfToday()) / DAY_MS);
}

export function isExpiringSoon(item: Ingredient): boolean {
  return item.status !== 'depleted' && getDaysLeft(item) <= EXPIRING_SOON_DAYS;
}

/** Short Chinese label for badges, e.g. "已過期 2 天" / "今天到期" / "剩 3 天". */
export function getExpiryLabel(item: Ingredient): string {
  const days = getDaysLeft(item);
  if (days < 0) return `已過期 ${-days} 天`;
  if (days === 0) return '今天到期';
  return `剩 ${days} 天`;
}
