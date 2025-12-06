import React from "react";

export interface OutcomeTileProps {
  id: string;
  shortName: string;
  fullName: string;
  teamColor?: string;
  oddsLabel: string;
  poolShareLabel: string;
  isFavourite?: boolean;
  isBestPayout?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function OutcomeTile({
  id,
  shortName,
  fullName,
  teamColor,
  oddsLabel,
  poolShareLabel,
  isFavourite,
  isBestPayout,
  isSelected,
  onSelect
}: OutcomeTileProps) {
  const pillBase =
    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(id)}
      className={`group flex h-full flex-col rounded-xl border px-3 py-2 text-left transition ${
        isSelected
          ? "border-amber-400/70 bg-slate-900 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
          : "border-slate-800/80 bg-slate-950/70 hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-slate-900"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-0`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: teamColor ?? "#94a3b8" }}
          />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-200">
            {shortName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isFavourite && (
            <span className={`${pillBase} border-emerald-400/60 bg-emerald-500/10 text-emerald-100`}>
              Fav
            </span>
          )}
          {isBestPayout && (
            <span className={`${pillBase} border-blue-400/60 bg-blue-500/10 text-blue-100`}>
              Best
            </span>
          )}
        </div>
      </div>

      <p
        className="mt-1 text-xs text-slate-200"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}
        title={fullName}
      >
        {fullName}
      </p>

      <div className="mt-auto flex items-center justify-between pt-2 text-sm">
        <span className="font-semibold text-white">{oddsLabel}</span>
        <span className="text-xs text-slate-400">{poolShareLabel}</span>
      </div>
    </button>
  );
}
