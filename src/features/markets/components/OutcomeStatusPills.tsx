import React from "react";

interface OutcomeStatusPillsProps {
  isFavourite: boolean;
  isBestPayout: boolean;
}

const baseClasses =
  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]";

const variantClasses = {
  favourite: `${baseClasses} border-emerald-500/40 bg-emerald-500/15 text-emerald-100`,
  bestPayout: `${baseClasses} border-sky-500/40 bg-sky-500/15 text-sky-100`
};

export const OutcomeStatusPills: React.FC<OutcomeStatusPillsProps> = ({
  isFavourite,
  isBestPayout
}) => {
  if (!isFavourite && !isBestPayout) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {isFavourite && <span className={variantClasses.favourite}>Favourite</span>}
      {isBestPayout && <span className={variantClasses.bestPayout}>Best payout</span>}
    </div>
  );
};
