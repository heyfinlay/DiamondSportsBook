import { useEffect } from "react";
import { useBettingStore } from "@domains/betting/store/bettingStore";

const MarketsPage = () => {
  const markets = useBettingStore((state) => state.markets);
  const setMarkets = useBettingStore((state) => state.setMarkets);

  useEffect(() => {
    setMarkets([
      {
        id: "demo-1",
        name: "Race Winner",
        eventId: "demo-event",
        status: "open",
        totalPool: 12500
      }
    ]);
  }, [setMarkets]);

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
        {markets.map((market) => (
          <article
            key={market.id}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/50 p-6 shadow-lg shadow-black/30"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              {market.eventId}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{market.name}</h2>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1 capitalize text-white/80">
                {market.status}
              </span>
              <span className="text-white/70">
                Pool: Ɖ{market.totalPool.toLocaleString()}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default MarketsPage;
