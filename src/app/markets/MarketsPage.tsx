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
    <div className="space-y-6">
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
          </div>
        )
      )}
    </div>
  );
};

export default MarketsPage;
