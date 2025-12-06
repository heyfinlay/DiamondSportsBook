import React from "react";
import type { PoolStatus } from "../../features/markets/types";

interface RightMeta {
  status?: PoolStatus;
  statusLabel?: string;
  statusClassName?: string;
  badgeContent?: React.ReactNode;
}

interface MarketHeroCardProps {
  label: string;
  title: string;
  description: React.ReactNode;
  rightMeta?: RightMeta;
  subLabel?: string | null;
}

export function MarketHeroCard({ label, title, description, rightMeta, subLabel }: MarketHeroCardProps) {
  return (
    <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.35em] text-amber-200/80">{label}</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          {subLabel ? <p className="text-xs uppercase tracking-[0.25em] text-white/50">{subLabel}</p> : null}
          <div className="text-sm text-white/70">{description}</div>
        </div>
        {rightMeta ? (
          <div className="flex flex-col items-start gap-2 text-sm text-white/70 sm:items-end">
            {rightMeta.status && rightMeta.statusLabel && (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${rightMeta.statusClassName ?? ""}`}
              >
                {rightMeta.statusLabel}
              </span>
            )}
            {rightMeta.badgeContent ? (
              <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
                {rightMeta.badgeContent}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
