import React from "react";
import { ArrowUpRight, Gem } from "lucide-react";

export interface OutcomeTileProps {
  outcomeId: string;
  teamCode: string;
  teamName: string;
  teamColor?: string;
  driverName: string;
  oddsLabel: string;
  poolShareLabel: string;
  poolSharePercent: number;
  isFavourite?: boolean;
  isBestPayout?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function OutcomeTile({
  teamCode,
  teamName,
  teamColor,
  driverName,
  oddsLabel,
  poolShareLabel,
  poolSharePercent,
  isFavourite,
  isBestPayout,
  isSelected,
  onSelect
}: OutcomeTileProps) {
  const teamLine = `${teamCode.toUpperCase()} • ${teamName}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.()}
      style={{ "--team-color": teamColor ?? "#94a3b8" } as React.CSSProperties}
      className={`outcome-tile group flex min-h-[7.1rem] cursor-pointer flex-col justify-between border p-4 text-left transition ${
        isSelected
          ? "border-primary-container/50 bg-surface-high text-white"
          : "border-white/10 bg-surface-low/70 text-white hover:bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-2 w-2 shrink-0"
              style={{ backgroundColor: teamColor ?? "#94a3b8" }}
            />
            <span
              className="truncate font-headline text-[0.74rem] font-bold uppercase tracking-[0.16em] text-on-subtle"
              title={teamLine}
            >
              {teamCode}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 min-h-[3.2rem] font-headline text-base font-extrabold uppercase tracking-[0.05em] text-white sm:text-lg">
            {driverName}
          </p>
          <p className="mt-1 line-clamp-2 min-h-[2rem] text-[0.68rem] uppercase tracking-[0.14em] text-on-subtle">
            {teamName}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-primary-dim">
          {isFavourite ? <Gem className="h-3.5 w-3.5" /> : null}
          {isBestPayout ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <span className="font-headline text-[1.75rem] font-extrabold text-white">{oddsLabel}</span>
          <span className="text-right text-[0.66rem] uppercase tracking-[0.14em] text-on-subtle">{poolShareLabel}</span>
        </div>
        <div className="mt-3 h-1 bg-white/10">
          <div
            className="h-full"
            style={{
              width: `${Math.max(0, Math.min(poolSharePercent, 100))}%`,
              backgroundColor: teamColor ?? "#00f2ff"
            }}
          />
        </div>
      </div>
    </button>
  );
}
