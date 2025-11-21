import React from "react";

interface TrendPillProps {
  delta: number;
}

export function TrendPill({ delta }: TrendPillProps) {
  const isUp = delta > 0;
  const isDown = delta < 0;

  let symbol = "•";
  let label = "0.0";
  let className =
    "inline-flex items-center gap-1 rounded-full border border-slate-600/40 bg-slate-700/40 px-2 py-0.5 text-[11px] text-slate-300";

  if (isUp) {
    symbol = "▲";
    label = `+${delta.toFixed(1)}`;
    className =
      "inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400";
  } else if (isDown) {
    symbol = "▼";
    label = delta.toFixed(1);
    className =
      "inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-400";
  }

  return (
    <span className={className}>
      <span>{symbol}</span>
      <span>{label}</span>
    </span>
  );
}
