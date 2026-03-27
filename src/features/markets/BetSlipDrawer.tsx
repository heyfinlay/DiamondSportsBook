import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Wallet2 } from "lucide-react";
import { currencyLabel } from "@lib/currency";
import {
  formatCurrency,
  formatOdds,
  formatPercent,
  impliedProbabilityFromOdds
} from "./utils/format";
import type { Outcome, Pool } from "./types";
import { OutcomeIdentity } from "./components/OutcomeIdentity";

interface BetSlipDrawerProps {
  isOpen: boolean;
  pool: Pool | null;
  outcomes: Outcome[];
  selectedOutcomeId: string | null;
  onClose: () => void;
  onSelectOutcome: (outcomeId: string) => void;
  onPlaceBet?: (params: { poolId: string; outcomeId: string; stake: number }) => void;
  isPlacing?: boolean;
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
  onPlaceBet,
  isPlacing = false
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
    () => outcomes.find((outcome) => outcome.id === selectedOutcomeId) ?? null,
    [outcomes, selectedOutcomeId]
  );

  const stakeValue = Number(stakeInput.replace(/[^\d.]/g, "")) || 0;
  const stakeValid = stakeValue >= MIN_STAKE;
  const poolClosed = pool?.status === "closed" || pool?.status === "settled";

  const payoutEstimate = useMemo(() => {
    if (!pool || !selectedOutcome || stakeValue <= 0) return null;

    const existingPoolTotal = Math.max(pool.totalStake ?? 0, 0);
    const existingOutcomeHandle = Math.max(selectedOutcome.diamondsStaked ?? 0, 0);
    const rakeFraction = Math.max(0, Math.min(pool.rakePercent / 100, 0.95));

    const poolAfter = existingPoolTotal + stakeValue;
    const outcomeHandleAfter = existingOutcomeHandle + stakeValue;
    if (poolAfter <= 0 || outcomeHandleAfter <= 0) return null;

    const distributablePool = poolAfter * (1 - rakeFraction);
    const userShareOfOutcome = stakeValue / outcomeHandleAfter;
    const estimatedPayout = userShareOfOutcome * distributablePool;

    if (!Number.isFinite(estimatedPayout)) {
      return null;
    }

    return {
      estimatedPayout,
      userShareOfOutcome
    };
  }, [pool, selectedOutcome, stakeValue]);

  const handlePlaceBet = () => {
    if (!pool || !selectedOutcomeId || !stakeValid || poolClosed) return;
    onPlaceBet?.({
      poolId: pool.id,
      outcomeId: selectedOutcomeId,
      stake: stakeValue
    });
  };

  const drawerClasses = `fixed inset-y-0 right-0 z-50 w-full max-w-[30rem] transform border-l border-white/10 bg-surface-lowest shadow-[0_0_45px_rgba(0,0,0,0.65)] transition-transform duration-300 ${
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
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={drawerClasses}
        aria-hidden={isOpen ? undefined : true}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex h-full flex-col overflow-hidden text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,242,255,0.12),transparent_28%),linear-gradient(180deg,rgba(18,21,25,0.98),rgba(7,9,13,0.98))]" />

          <div className="relative flex h-full flex-col overflow-hidden px-5 py-5">
            <header className="border-b border-white/8 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="prismatic-kicker text-primary-dim">Place Wager</p>
                  <p className="mt-3 font-headline text-2xl font-extrabold uppercase tracking-[0.06em] text-white">
                    {pool.title}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-on-subtle">
                    Step 1 · Select outcome → Step 2 · Set stake → Step 3 · Confirm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  ref={closeButtonRef}
                  className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-3 text-[0.6rem]"
                >
                  Close
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
              {selectedOutcome ? (
                <div className="space-y-4">
                  <section className="prismatic-card p-4">
                    <div className="relative z-10">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="border border-white/10 bg-surface px-4 py-3">
                          <p className="prismatic-kicker text-[0.56rem]">Pool Size</p>
                          <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(pool.totalStake)}</p>
                        </div>
                        <div className="border border-white/10 bg-surface px-4 py-3">
                          <p className="prismatic-kicker text-[0.56rem]">Closes</p>
                          <p className="mt-2 text-lg font-semibold text-white">{pool.timeRemainingLabel}</p>
                        </div>
                      </div>

                      <div className="mt-4 border border-primary-container/25 bg-surface-high px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="prismatic-kicker text-primary-dim">Selected Outcome</p>
                            <OutcomeIdentity
                              primaryLabel={selectedOutcome.primaryLabel}
                              secondaryLabel={selectedOutcome.secondaryLabel}
                              accentColor={selectedOutcome.accentColor}
                              className="mt-2"
                              primaryClassName="font-headline text-lg font-extrabold uppercase tracking-[0.04em] text-white"
                              secondaryClassName="text-[0.7rem] uppercase tracking-[0.14em] text-on-subtle"
                            />
                          </div>
                          <div className="border border-white/10 bg-surface px-3 py-2 text-right">
                            <p className="prismatic-kicker text-[0.56rem]">Odds</p>
                            <p className="mt-1 font-headline text-2xl font-extrabold text-primary-dim">
                              {formatOdds(selectedOutcome.baselineOdds)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="prismatic-kicker text-[0.56rem]">Pool Share</p>
                            <p className="mt-1 text-base font-semibold text-white">
                              {formatPercent(selectedOutcome.marketShare)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="prismatic-kicker text-[0.56rem]">Probability</p>
                            <p className="mt-1 text-base font-semibold text-white">
                              {impliedProbabilityFromOdds(selectedOutcome.baselineOdds)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="prismatic-card p-4">
                    <div className="relative z-10">
                      <p className="prismatic-kicker text-primary-dim">Step 1 · Choose Outcome</p>
                      <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {outcomes.map((outcome) => {
                          const isActive = outcome.id === selectedOutcomeId;
                          return (
                            <button
                              key={outcome.id}
                              type="button"
                              className={`w-full border px-4 py-3 text-left transition ${
                                isActive
                                  ? "border-primary-container/45 bg-surface-high text-white"
                                  : "border-white/10 bg-surface-low/70 text-white hover:bg-surface"
                              }`}
                              onClick={() => onSelectOutcome(outcome.id)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <OutcomeIdentity
                                  primaryLabel={outcome.primaryLabel}
                                  secondaryLabel={outcome.secondaryLabel}
                                  accentColor={outcome.accentColor}
                                  primaryClassName="font-headline text-base font-extrabold uppercase tracking-[0.04em] text-white"
                                  secondaryClassName="text-[0.68rem] uppercase tracking-[0.14em] text-on-subtle"
                                />
                                <div className="shrink-0 text-right">
                                  <p className="prismatic-kicker text-[0.56rem]">Odds</p>
                                  <p className="mt-1 text-lg font-semibold text-white">
                                    {formatOdds(outcome.baselineOdds)}
                                  </p>
                                  <p className="mt-1 text-[0.66rem] uppercase tracking-[0.14em] text-on-subtle">
                                    Share {formatPercent(outcome.marketShare)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <section className="prismatic-card p-4">
                    <div className="relative z-10">
                      <p className="prismatic-kicker text-primary-dim">Step 2 · Set Stake</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {QUICK_STAKES.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            className="prismatic-chip"
                            data-active={stakeValue === option.value}
                            onClick={() => setStakeInput(option.value.toString())}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 border border-white/10 bg-surface-low px-4">
                        <label className="prismatic-kicker block pt-3 text-[0.56rem]">
                          Stake ({currencyLabel})
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={stakeInput}
                          onChange={(event) => {
                            const digits = event.target.value.replace(/[^\d]/g, "");
                            setStakeInput(digits);
                          }}
                          className="prismatic-input"
                          placeholder={`Minimum ${formatCurrency(MIN_STAKE)}`}
                        />
                      </div>

                      {!stakeValid ? (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-danger">
                          Minimum stake is {formatCurrency(MIN_STAKE)}.
                        </p>
                      ) : null}
                    </div>
                  </section>

                  <section className="prismatic-card p-4">
                    <div className="relative z-10">
                      <p className="prismatic-kicker text-primary-dim">Step 3 · Review</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="border border-white/10 bg-surface px-4 py-3">
                          <p className="prismatic-kicker text-[0.56rem]">Estimated Payout</p>
                          <p className="mt-2 font-headline text-2xl font-extrabold text-white">
                            {payoutEstimate ? formatCurrency(payoutEstimate.estimatedPayout) : "—"}
                          </p>
                        </div>
                        <div className="border border-white/10 bg-surface px-4 py-3">
                          <p className="prismatic-kicker text-[0.56rem]">Your Share After Bet</p>
                          <p className="mt-2 font-headline text-2xl font-extrabold text-primary-dim">
                            {payoutEstimate ? formatPercent(payoutEstimate.userShareOfOutcome) : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-start gap-3 border border-white/10 bg-surface-low px-4 py-3">
                        <Wallet2 className="mt-0.5 h-4 w-4 text-primary-dim" />
                        <p className="text-xs leading-6 text-on-subtle">
                          Estimates update as the pool moves. Final payout depends on total pool size and rake.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center border border-dashed border-white/10 bg-surface-low/50 p-6 text-center text-sm text-on-subtle">
                  Select an outcome to start a wager.
                </div>
              )}
            </div>

            <div className="border-t border-white/8 pt-4">
              <button
                type="button"
                className="prismatic-button prismatic-button-primary min-h-[3.2rem] w-full px-4 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!selectedOutcomeId || !stakeValid || poolClosed || isPlacing}
                onClick={handlePlaceBet}
              >
                {isPlacing ? "Placing…" : "Place Wager"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
