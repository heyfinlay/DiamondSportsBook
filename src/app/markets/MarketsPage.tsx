import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";

const MarketsPage = () => {
  const navigate = useNavigate();

  const poolsQuery = useQuery({
    queryKey: ["markets:v2-pools"],
    queryFn: fetchUiPools
  });

  const pools = poolsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-[#060910]/80 p-8 shadow-[0_0_40px_rgba(15,23,42,0.45)]">
        <span className="text-xs uppercase tracking-[0.35em] text-[#9FF7D3]">Diamond Sports Book</span>
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">Live Markets</h1>
        <p className="max-w-2xl text-sm text-neutral-300 sm:text-base">
          All DBGP betting uses a live parimutuel system. Your payout depends on the total Diamonds staked across each outcome.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9FF7D3]">How It Works</p>
          <p className="mt-2 text-sm text-neutral-300">
            Markets update in real time as Diamonds move across the pool. Odds and payout estimates will rise or fall until the market closes and locks your final price.
          </p>
        </div>
        <p className="text-[0.7rem] uppercase tracking-[0.3em] text-neutral-500">
          All wagers settled in Diamonds (in-game currency). Parody product; no real-world stakes.
        </p>
      </header>

      {poolsQuery.isLoading && (
        <p className="text-sm text-neutral-400">Loading live markets…</p>
      )}

      {poolsQuery.isError && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Unable to load markets right now. Refresh to try again.
        </p>
      )}

      {pools.length > 0 ? (
        <MarketPoolsGrid pools={pools} onSelectPool={(poolId) => navigate(`/market/${poolId}`)} />
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
