const trimTrailingZeros = (input: string) =>
  input.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");

const formatWithSuffix = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${trimTrailingZeros((value / 1_000_000_000).toFixed(1))}b`;
  if (abs >= 1_000_000) return `${trimTrailingZeros((value / 1_000_000).toFixed(1))}m`;
  if (abs >= 1_000) return `${trimTrailingZeros((value / 1_000).toFixed(1))}k`;
  return trimTrailingZeros(value.toFixed(0));
};

export function formatDiamonds(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return formatWithSuffix(value);
}

export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "0%";
  const percent = fraction * 100;
  const precision = percent >= 10 ? 0 : 1;
  return `${trimTrailingZeros(percent.toFixed(precision))}%`;
}

export function formatOdds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "x0.0";
  const precision = value >= 10 ? 0 : 2;
  const formatted = trimTrailingZeros(value.toFixed(precision));
  return `x${formatted}`;
}

export function impliedProbabilityFromOdds(odds: number): string {
  if (!Number.isFinite(odds) || odds <= 0) return "—";
  const probability = 1 / odds;
  return formatPercent(probability);
}
