import { currencySymbol } from "@lib/currency";
const trimTrailingZeros = (input) => input.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
const formatWithSuffix = (value) => {
    const abs = Math.abs(value);
    if (abs >= 1000000000)
        return `${trimTrailingZeros((value / 1000000000).toFixed(1))}b`;
    if (abs >= 1000000)
        return `${trimTrailingZeros((value / 1000000).toFixed(1))}m`;
    if (abs >= 1000)
        return `${trimTrailingZeros((value / 1000).toFixed(1))}k`;
    return trimTrailingZeros(value.toFixed(0));
};
export function formatDiamonds(value) {
    if (!Number.isFinite(value))
        return "0";
    return formatWithSuffix(value);
}
export function formatCurrency(value) {
    return `${currencySymbol}${formatDiamonds(value)}`;
}
export function formatPercent(fraction) {
    if (!Number.isFinite(fraction))
        return "0%";
    const percent = fraction * 100;
    const precision = percent >= 10 ? 0 : 1;
    return `${trimTrailingZeros(percent.toFixed(precision))}%`;
}
export function formatOdds(value) {
    if (!Number.isFinite(value) || value <= 0)
        return "x0.0";
    const precision = value >= 10 ? 0 : 2;
    const formatted = trimTrailingZeros(value.toFixed(precision));
    return `x${formatted}`;
}
export function impliedProbabilityFromOdds(odds) {
    if (!Number.isFinite(odds) || odds <= 0)
        return "—";
    const probability = 1 / odds;
    return formatPercent(probability);
}
