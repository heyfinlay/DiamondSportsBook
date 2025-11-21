import React, { useEffect, useMemo, useRef, useState } from "react";
import { currencyLabel } from "@lib/currency";
import {
  formatCurrency,
  formatOdds,
  formatPercent,
  impliedProbabilityFromOdds
} from "./utils/format";
import type { Outcome, Pool } from "./types";

interface BetSlipDrawerProps {
  isOpen: boolean;
  pool: Pool | null;
  outcomes: Outcome[];
  selectedOutcomeId: string | null;
  onClose: () => void;
  onSelectOutcome: (outcomeId: string) => void;
  onPlaceBet?: (params: { poolId: string; outcomeId: string; stake: number }) => void;
}

const MIN_STAKE = 25_000;
const QUICK_STAKES = [
  { label: "25K", value: 25_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "250K", value: 250_000 },
  { label: "1M", value: 1_000_000 }
];

export function BetSlipDrawer({
  isOpen,
  pool,
  outcomes,
  selectedOutcomeId,
  onClose,
  onSelectOutcome,
  onPlaceBet
}: BetSlipDrawerProps) {
  const [stakeInput, setStakeInput] = useState<string>("");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStakeInput((prev) => (prev ? prev : MIN_STAKE.toString()));
    } else {
      setStakeInput("");
    }
  }, [isOpen]);

  const selectedOutcome = useMemo(
    () => outcomes.find((o) => o.id === selectedOutcomeId) ?? null,
    [outcomes, selectedOutcomeId]
  );

  const stakeValue = Number(stakeInput.replace(/[^\d.]/g, "")) || 0;
  const stakeValid = stakeValue >= MIN_STAKE;
  const poolClosed = pool?.status === "closed" || pool?.status === "settled";

  const estimatedPayout =
    selectedOutcome && stakeValue > 0 ? Math.round(stakeValue * selectedOutcome.baselineOdds) : 0;

  const handlePlaceBet = () => {
    if (!pool || !selectedOutcomeId || !stakeValid || poolClosed) return;
    onPlaceBet?.({
      poolId: pool.id,
      outcomeId: selectedOutcomeId,
      stake: stakeValue
    });
  };

  const drawerClasses = `fixed inset-y-0 right-0 z-50 w-full max-w-md transform border-l border-white/10 bg-[#05070F] shadow-[0_0_35px_rgba(0,0,0,0.65)] transition-transform duration-300 ${
    isOpen ? "translate-x-0" : "translate-x-full"
  }`;

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.body.style.setProperty("overflow", "hidden");
    } else {
      document.body.style.removeProperty("overflow");
    }
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isOpen]);

  if (!pool) {
    return null;
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={drawerClasses}
        aria-hidden={isOpen ? undefined : true}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col overflow-hidden px-5 py-4 text-slate-50">
          <header className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bet Slip</p>
              <p className="text-lg font-semibold text-white">{pool.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              ref={closeButtonRef}
              className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-500"
            >
              X
            </button>
          </header>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {selectedOutcome ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Pool Size</span>
                    <span className="font-semibold text-white">{formatCurrency(pool.totalStake)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Closes</span>
                    <span className="font-semibold text-white">{pool.timeRemainingLabel}</span>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Selected Outcome</p>
                    <p className="mt-1 text-base font-semibold leading-tight text-white">
                      {selectedOutcome.teamName}
                    </p>
                    <p className="text-xs text-slate-400">{selectedOutcome.driverName}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-200">
                      <div>
                        <p className="text-xs text-slate-400">Odds</p>
                        <p className="font-semibold text-white">
                          {formatOdds(selectedOutcome.baselineOdds)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Pool Share</p>
                        <p className="font-semibold text-white">
                          {formatPercent(selectedOutcome.marketShare)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Implied probability: {impliedProbabilityFromOdds(selectedOutcome.baselineOdds)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Choose Outcome</p>
                  <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {outcomes.map((outcome) => {
                      const isActive = outcome.id === selectedOutcomeId;
                      return (
                        <button
                          key={outcome.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? "border-emerald-400/70 bg-emerald-500/10 text-white"
                              : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700"
                          }`}
                          onClick={() => onSelectOutcome(outcome.id)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {outcome.teamColor && (
                                <span
                                  className="h-2 w-2 rounded-full border border-white/20"
                                  style={{ backgroundColor: outcome.teamColor }}
                                  aria-hidden="true"
                                />
                              )}
                              <p className="font-semibold">{outcome.teamName}</p>
                            </div>
                            <p className="text-[11px] text-slate-400">{outcome.driverName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Odds</p>
                            <p className="font-semibold text-white">
                              {formatOdds(outcome.baselineOdds)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Share {formatPercent(outcome.marketShare)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_STAKES.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
                        onClick={() => setStakeInput(option.value.toString())}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    <label className="text-xs uppercase tracking-[0.25em] text-slate-400">Stake ({currencyLabel})</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={stakeInput}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/[^\d]/g, "");
                        setStakeInput(digits);
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-emerald-400/60 focus:border-emerald-400"
                      placeholder="Enter stake"
                    />
                    <p className="text-[11px] text-slate-500">
                      Minimum stake is {formatCurrency(MIN_STAKE)}.
                    </p>
                    {!stakeValid && (
                      <p className="text-[11px] text-rose-300">
                        Minimum stake is {formatCurrency(MIN_STAKE)}.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
                    <div>
                      <p className="text-xs text-slate-400">Your odds</p>
                      <p className="text-lg font-semibold text-white">
                        {formatOdds(selectedOutcome.baselineOdds)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Estimated payout</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(estimatedPayout)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Max payout</p>
                      <p className="font-semibold text-white">{formatCurrency(estimatedPayout)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Probability</p>
                      <p className="font-semibold text-white">
                        {impliedProbabilityFromOdds(selectedOutcome.baselineOdds)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Estimated payout is based on current pool state. Final payout may change as new bets are placed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
                Select an outcome to start a wager.
              </div>
            )}
          </div>
          <div className="pt-2">
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              disabled={!selectedOutcomeId || !stakeValid || poolClosed}
              onClick={handlePlaceBet}
            >
              Place Wager
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
