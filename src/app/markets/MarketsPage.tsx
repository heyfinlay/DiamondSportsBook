import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketPoolsGrid } from "../../features/markets/MarketPoolsGrid";
import { fetchUiPools } from "../../features/markets/api";
import { currencyLabel } from "@lib/currency";
import { useSession } from "@lib/auth/SessionProvider";
import { AuthCtaBanner } from "./components/AuthCtaBanner";
import { marketKeys } from "@lib/query/keys";

// This screen keeps the v2 grid layout from commit 9208937 while relying on the team metadata-backed pricing feeds from 23eeb03.

const MarketsPage = () => {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();

  const poolsQuery = useQuery({
    queryKey: marketKeys.pools(),
    queryFn: fetchUiPools
  });

  const pools = poolsQuery.data ?? [];
  const capitalizedCurrencyLabel = currencyLabel.charAt(0).toUpperCase() + currencyLabel.slice(1);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      {!sessionLoading && !user && <AuthCtaBanner />}

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
