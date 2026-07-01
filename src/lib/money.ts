/** Formats EUR cents like the design: €6,800 / €1,299.50 */
export function formatEur(cents: number): string {
  const whole = cents % 100 === 0;
  return `€${(cents / 100).toLocaleString('en-IE', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
