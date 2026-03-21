import React from "react";
import { ArrowRight, Wallet2 } from "lucide-react";
import { formatCurrency } from "../../features/markets/utils/format";
import type { PoolStatus } from "../../features/markets/types";
import { OutcomeTile, type OutcomeTileProps } from "./OutcomeTile";

const statusClasses: Record<PoolStatus, string> = {
  open: "bg-primary-container text-on-primary border-primary-container/50",
  closing_soon: "bg-surface-high text-primary-dim border-primary-dim/35",
  closed: "bg-surface-highest text-on-subtle border-white/10",
  settled: "bg-white/5 text-white border-white/10"
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
  actionLabel = "Inspect",
  subtitle
}: MarketCardProps) {
  return (
    <article className="prismatic-card flex h-full flex-col p-5">
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {subtitle ? <p className="prismatic-kicker text-primary-dim">{subtitle}</p> : null}
            <h3 className="mt-3 line-clamp-2 font-headline text-[1.65rem] font-extrabold uppercase tracking-[0.04em] text-white">
              {name}
            </h3>
            {closeTimeLabel ? (
              <p className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] text-on-subtle">{closeTimeLabel}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-3">
            {status ? (
              <span
                className={`inline-flex min-h-[2rem] items-center border px-3 text-[0.64rem] font-headline font-bold uppercase tracking-[0.16em] ${statusClasses[status]}`}
              >
                {status.replace("_", " ")}
              </span>
            ) : null}
            <div className="flex items-center gap-2 border border-white/10 bg-surface px-3 py-2 text-right">
              <Wallet2 className="h-4 w-4 text-primary-dim" />
              <div>
                <p className="text-sm font-semibold text-white">{formatCurrency(totalPool)}</p>
                <p className="text-[0.6rem] uppercase tracking-[0.16em] text-on-subtle">Pool</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {outcomes.map((outcome) => (
            <OutcomeTile
              key={outcome.id}
              {...outcome}
              isSelected={selectedOutcomeId === outcome.outcomeId}
              onSelect={outcome.onSelect ?? (() => onSelectOutcome?.(outcome.outcomeId))}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
          <div>
            <p className="prismatic-kicker text-[0.58rem]">Commission</p>
            <p className="mt-1 text-lg font-semibold text-white">{commission.toFixed(1)}%</p>
          </div>
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails?.(id)}
              className="prismatic-button prismatic-button-secondary min-h-[2.6rem] px-4 text-[0.62rem]"
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
