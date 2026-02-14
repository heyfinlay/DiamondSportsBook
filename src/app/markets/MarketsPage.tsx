import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys } from "@lib/query/keys";
import { MarketHeroCard } from "../../components/markets/MarketHeroCard";
import { useBettingStore } from "@domains/betting/store/bettingStore";
import type { PoolStatus } from "../../features/markets/types";
import { formatCurrency } from "../../features/markets/utils/format";

// This screen keeps the v2 grid layout from commit 9208937 while relying on the team metadata-backed pricing feeds from 23eeb03.

const MarketsPage = () => {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const setBetslipSelection = useBettingStore((state) => state.setBetslipSelection);

  const poolsQuery = useQuery({
    queryKey: marketKeys.pools(),
    queryFn: fetchUiPools
  });

  const pools = poolsQuery.data ?? [];
  const [statusFilter, setStatusFilter] = useState<"all" | PoolStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"closing" | "pool">("closing");

  const filteredPools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const byStatus = statusFilter === "all"
      ? pools
      : pools.filter((pool) => pool.status === statusFilter);

    const bySearch = query
      ? byStatus.filter((pool) => pool.title.toLowerCase().includes(query))
      : byStatus;

    const sorted = [...bySearch].sort((a, b) => {
      if (sortKey === "pool") return b.totalStake - a.totalStake;
      // closing: use timeRemainingMs if available, otherwise keep stable order
      const aTime = (a as { timeRemainingMs?: number }).timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
      const bTime = (b as { timeRemainingMs?: number }).timeRemainingMs ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

    return sorted;
  }, [pools, searchQuery, sortKey, statusFilter]);

  const handleOutcomeSelect = (poolId: string, poolTitle: string, outcome: (typeof pools)[number]["outcomes"][number]) => {
    setBetslipSelection({
      marketId: poolId,
      marketName: poolTitle,
      eventTitle: null,
      outcomeId: outcome.id,
      outcomeLabel: `${outcome.teamName} — ${outcome.driverName}`,
      minStake: 0,
      maxStake: 0,
      stake: 0
    });
    navigate(`/market/${poolId}`);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <MarketHeroCard
        label="LIVE MARKETS"
        title="Diamond Sportsbook"
        subLabel={null}
        description={
          <div className="space-y-2 text-white/80">
            <p>Pool-based odds update in real time. The smaller the share, the bigger the payout.</p>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-white/50">
              <span>{filteredPools.length} markets</span>
              <span>·</span>
              <span>{poolsQuery.isLoading ? "Syncing" : "Live"}</span>
            </div>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Live pools</p>
          <p className="mt-1 text-lg font-semibold">{pools.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Open now</p>
          <p className="mt-1 text-lg font-semibold">
            {pools.filter((pool) => pool.status === "open" || pool.status === "closing_soon").length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total handle</p>
          <p className="mt-1 text-lg font-semibold">
            {formatCurrency(pools.reduce((sum, pool) => sum + pool.totalStake, 0))}
          </p>
        </div>
      </section>

      {!sessionLoading && !user && <AuthCtaBanner />}

      {poolsQuery.isLoading && (
        <p className="text-sm text-neutral-400">Loading live markets…</p>
      )}

      {poolsQuery.isError && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Unable to load markets right now. Refresh to try again.
        </p>
      )}

      <section className="rounded-3xl border border-white/10 bg-black/30 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {["all", "open", "closing_soon", "closed", "settled"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status as "all" | PoolStatus)}
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search markets"
                className="w-64 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs text-white placeholder:text-white/40"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-white/40">⌕</span>
            </div>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as "closing" | "pool")}
              className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs text-white"
            >
              <option value="closing">Sort: Closing soon</option>
              <option value="pool">Sort: Pool size</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/50">
          Showing {filteredPools.length} of {pools.length} pools
        </p>
      </section>

      {filteredPools.length > 0 ? (
        <MarketPoolsGrid
          pools={filteredPools}
          onSelectPool={(poolId) => navigate(`/market/${poolId}`)}
          onSelectOutcome={handleOutcomeSelect}
        />
      ) : (
        !poolsQuery.isLoading && (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-[#05070F]/40 p-8 text-sm text-neutral-400">
            <div className="flex-1">
              <p className="font-semibold text-white">Live market board coming online</p>
              <p>Admin tools will seed the first tote shortly. Check back once the next event opens betting.</p>
            </div>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-full border border-[#9FF7D3]/40 px-4 py-2 uppercase tracking-[0.35em] text-[#9FF7D3] transition hover:border-[#9FF7D3]/70 hover:text-white"
            >
              Manage wallet
            </Link>
          </div>
        )
      )}
    </div>
  );
};

export default MarketsPage;
