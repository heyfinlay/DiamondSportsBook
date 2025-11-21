import React from "react";

type TrendPillProps = {
  delta?: number | null;
};

export const TrendPill: React.FC<TrendPillProps> = ({ delta }) => {
  void delta; // placeholder usage until real data wiring
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/40">
      No trend data
    </span>
  );
};
