import React from "react";

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
  outcomeId,
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
  const pillBase =
    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]";

  const teamLine = `${teamCode.toUpperCase()} • ${teamName}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.()}
      style={{ "--team-color": teamColor ?? "#94a3b8" } as React.CSSProperties}
      className={`outcome-tile group flex h-full min-h-[112px] cursor-pointer flex-col justify-between rounded-lg border px-4 py-3 text-left transition md:min-h-[128px] ${
        isSelected
          ? "border-gold/70 bg-black/60 shadow-[0_0_0_1px_rgba(245,197,66,0.2)]"
          : "border-white/10 bg-black/40 hover:-translate-y-0.5 hover:bg-black/60"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-0`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: teamColor ?? "#94a3b8" }}
          />
          <span
            className="truncate text-[12px] font-semibold leading-tight text-white md:text-[13px]"
            title={teamLine}
          >
            <span className="uppercase tracking-[0.25em] text-white/80">{teamCode}</span>
            <span className="text-white/60"> • {teamName}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {isFavourite && (
            <span className={`${pillBase} border-emerald-400/60 bg-emerald-500/10 text-emerald-100`}>
              Fav
            </span>
          )}
          {isBestPayout && (
            <span className={`${pillBase} border-gold/60 bg-gold/10 text-gold-soft`}>
              Edge
            </span>
          )}
        </div>
      </div>

      <p
        className="truncate text-[11px] text-white/55 md:text-[12px]"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}
        title={driverName}
      >
        {driverName}
      </p>

      <div className="mt-auto space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-white">{oddsLabel}</span>
          <span className="text-[10px] text-white/45">{poolShareLabel}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(poolSharePercent, 100))}%`,
              backgroundColor: teamColor ?? "#fbbf24"
            }}
          />
        </div>
      </div>
    </button>
  );
}
