import React from "react";
import { formatCurrency } from "../../features/markets/utils/format";
import type { PoolStatus } from "../../features/markets/types";
import { OutcomeTile, type OutcomeTileProps } from "./OutcomeTile";

const statusClasses: Record<PoolStatus, string> = {
  open: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
  closing_soon: "bg-gold/15 text-gold-soft border-gold/40",
  closed: "bg-slate-700/60 text-slate-200 border-slate-600/60",
  settled: "bg-slate-600/60 text-slate-200 border-slate-500/60"
};

export interface MarketCardOutcome extends OutcomeTileProps {
  id: string;
}

export interface MarketCardProps {
  id: string;
  name: string;
  closeTimeLabel?: string;
  status?: PoolStatus;
  totalPool: number;
  commission: number;
  outcomes: MarketCardOutcome[];
  selectedOutcomeId?: string | null;
  onSelectOutcome?: (outcomeId: string) => void;
  onViewDetails?: (marketId: string) => void;
  actionLabel?: string;
  subtitle?: string;
}

export function MarketCard({
  id,
  name,
  closeTimeLabel,
  status,
  totalPool,
  commission,
  outcomes,
  selectedOutcomeId,
  onSelectOutcome,
  onViewDetails,
  actionLabel = "View details",
  subtitle
}: MarketCardProps) {
  const gridCols =
    outcomes.length === 2
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_0_36px_rgba(2,6,23,0.55)] transition hover:border-gold/30 hover:shadow-[0_0_50px_rgba(245,197,66,0.12)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {subtitle ? (
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold-soft">{subtitle}</p>
          ) : null}
          <h3 className="truncate text-base font-semibold leading-tight text-white">{name}</h3>
          {closeTimeLabel ? <p className="text-[11px] text-white/50">{closeTimeLabel}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {status ? (
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${statusClasses[status]}`}
            >
              <span className="live-pulse" aria-hidden="true" />
              {status.replace("_", " ")}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-right text-xs font-semibold text-gold-soft">
            <span className="leading-tight">
              <span className="block text-sm text-amber-50">{formatCurrency(totalPool)}</span>
              <span className="block text-[10px] font-normal uppercase tracking-[0.25em] text-gold-soft/80">
                pool
              </span>
            </span>
          </span>
        </div>
      </div>

      <div className={`grid flex-1 gap-2 ${gridCols}`}>
        {outcomes.map((outcome) => (
          <OutcomeTile
            key={outcome.id}
            {...outcome}
            isSelected={selectedOutcomeId === outcome.outcomeId}
            onSelect={outcome.onSelect ?? (() => onSelectOutcome?.(outcome.outcomeId))}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end text-xs text-slate-400">
        {onViewDetails ? (
          <button
            type="button"
            onClick={() => onViewDetails?.(id)}
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-soft transition hover:text-white"
          >
            {actionLabel} →
          </button>
        ) : null}
      </div>
    </article>
  );
}
