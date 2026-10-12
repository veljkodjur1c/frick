const numberFormat = new Intl.NumberFormat("sr-Latn-RS");

/** Serbian number format: 1240 -> "1.240". Use for points, HP and LP. */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}
