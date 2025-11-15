import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMarkets } from "@domains/betting/api/bettingApi";

const MarketsPage = () => {
  const marketsQuery = useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-white/60">
            Betting
          </p>
          <h1 className="text-3xl font-semibold">Available Markets</h1>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {marketsQuery.isLoading && (
          <p className="text-sm text-white/60">Loading markets…</p>
        )}
        {marketsQuery.data?.map((market) => (
          <Link key={market.id} to={`/market/${market.id}`}>
            <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/50 p-6 shadow-lg shadow-black/30 transition hover:scale-[1.01]">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                {market.event.title}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{market.name}</h2>
              <p className="text-sm text-white/60">{market.description ?? ""}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="rounded-full bg-white/10 px-3 py-1 capitalize text-white/80">
                  {market.status}
                </span>
                <span className="text-white/70">
                  Pool: Ɖ{market.total_pool.toLocaleString()}
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MarketsPage;
