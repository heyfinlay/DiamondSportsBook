import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useSession } from "@lib/auth/SessionProvider";
import { useUserWagers } from "@domains/betting/hooks/useUserWagers";
import { currencySymbol } from "@lib/currency";

const formatStatus = (status: string) =>
  status ? status.replace(/_/g, " ") : "pending";

const WagersPage = () => {
  const { user, loading } = useSession();
  const wagersQuery = useUserWagers(user?.id);
  const wagers = wagersQuery.data ?? [];
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredWagers = useMemo(() => {
    if (statusFilter === "all") return wagers;
    return wagers.filter((wager) => wager.status === statusFilter);
  }, [statusFilter, wagers]);

  const totalStaked = wagers.reduce((sum, wager) => sum + wager.stake, 0);
  const totalWon = wagers.filter((w) => w.status === "won").length;
  const totalLost = wagers.filter((w) => w.status === "lost").length;

  if (!user && !loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
        Sign in to review your wagers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Activity</p>
          <h1 className="text-3xl font-semibold text-white">My Wagers</h1>
          <p className="text-sm text-white/60">
            Track every bet you placed with settlement status and payouts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "won", "lost", "pending", "void_refund"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                statusFilter === status
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-white/20 text-white/70 hover:border-white/40"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total staked</p>
          <p className="mt-1 text-lg font-semibold">{currencySymbol}{totalStaked.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Wins</p>
          <p className="mt-1 text-lg font-semibold">{totalWon}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Losses</p>
          <p className="mt-1 text-lg font-semibold">{totalLost}</p>
        </div>
      </section>

      {wagersQuery.isLoading ? (
        <p className="text-sm text-white/60">Loading wagers…</p>
      ) : wagers.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center text-white/60">
          You haven&rsquo;t placed any wagers yet. Visit the{" "}
          <Link to="/" className="text-brand">
            markets board
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWagers.map((wager) => (
            <article
              key={wager.id}
              className="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-white shadow-[0_0_24px_rgba(2,6,23,0.45)] transition hover:border-emerald-400/30 hover:shadow-[0_0_32px_rgba(16,185,129,0.12)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
                <span>{wager.market_type.replace(/_/g, " ")}</span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    wager.status === "won"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : wager.status === "lost"
                        ? "bg-red-500/20 text-red-300"
                        : wager.status === "void_refund"
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-blue-500/20 text-blue-200"
                  }`}
                >
                  {formatStatus(wager.status)}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <p className="text-lg font-semibold">
                  {`${currencySymbol}${wager.stake.toFixed(2)}`} on {wager.outcome_label}
                </p>
                <p className="text-xs text-white/60">{wager.market_name}</p>
                <p className="text-xs text-white/60">{wager.event_title}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60">
                <div>
                  <span>Odds {wager.effective_odds.toFixed(2)}</span>
                  <span className="mx-1">·</span>
                  {wager.status === "won" && wager.settled_payout ? (
                    <span className="font-semibold text-emerald-300">
                      Paid {`${currencySymbol}${wager.settled_payout.toFixed(2)}`}
                    </span>
                  ) : (
                    <span>Potential {`${currencySymbol}${wager.estimated_payout.toFixed(2)}`}</span>
                  )}
                </div>
                <Link
                  to={`/wagers/${wager.id}`}
                  className="text-xs font-semibold uppercase tracking-[0.3em] text-brand transition hover:text-white"
                >
                  View details →
                </Link>
              </div>
              <p className="mt-1 text-xs text-white/40">
                Placed {new Date(wager.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default WagersPage;
