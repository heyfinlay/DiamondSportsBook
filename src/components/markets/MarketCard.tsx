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
    <article className="prismatic-card p-5 lg:p-6">
      <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)] xl:items-stretch">
        <div className="flex h-full flex-col justify-between gap-6 border-b border-white/8 pb-6 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {subtitle ? <p className="prismatic-kicker text-primary-dim">{subtitle}</p> : null}
                <h3 className="mt-3 line-clamp-3 font-headline text-[1.55rem] font-extrabold uppercase tracking-[0.04em] text-white sm:text-[1.7rem]">
                  {name}
                </h3>
                {closeTimeLabel ? (
                  <p className="mt-3 text-[0.72rem] uppercase tracking-[0.16em] text-on-subtle">{closeTimeLabel}</p>
                ) : null}
              </div>

              {status ? (
                <span
                  className={`inline-flex min-h-[2rem] items-center border px-3 text-[0.64rem] font-headline font-bold uppercase tracking-[0.16em] ${statusClasses[status]}`}
                >
                  {status.replace("_", " ")}
                </span>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 border border-white/10 bg-surface px-4 py-3">
                <Wallet2 className="h-4 w-4 text-primary-dim" />
                <div>
                  <p className="prismatic-kicker text-[0.56rem]">Pool Liquidity</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(totalPool)}</p>
                </div>
              </div>
              <div className="border border-white/10 bg-surface px-4 py-3">
                <p className="prismatic-kicker text-[0.56rem]">Commission</p>
                <p className="mt-1 text-lg font-semibold text-white">{commission.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails?.(id)}
              className="prismatic-button prismatic-button-secondary min-h-[2.9rem] w-full px-4 text-[0.62rem] sm:w-auto"
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {outcomes.map((outcome) => (
            <OutcomeTile
              key={outcome.id}
              {...outcome}
              isSelected={selectedOutcomeId === outcome.outcomeId}
              onSelect={outcome.onSelect ?? (() => onSelectOutcome?.(outcome.outcomeId))}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
