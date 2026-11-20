// How much cheaper the yearly plan is than twelve monthly payments, as a whole percent. Worked out from the
// store's own prices, so it follows any price change. 0 when it cannot be worked out or there is no saving.
export function savingsPercent(annualPrice?: number | null, monthlyPrice?: number | null): number {
  if (!annualPrice || !monthlyPrice || annualPrice <= 0 || monthlyPrice <= 0) return 0;
  const pct = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
  return pct > 0 && pct < 100 ? pct : 0;
}
