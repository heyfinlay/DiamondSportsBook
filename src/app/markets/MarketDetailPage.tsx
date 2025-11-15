import { useParams } from "react-router-dom";
import { useBettingRealtime } from "@domains/betting/hooks/useBettingRealtime";
import { useBettingStore } from "@domains/betting/store/bettingStore";

const MarketDetailPage = () => {
  const { marketId } = useParams();
  useBettingRealtime(marketId);
  const market = useBettingStore((state) =>
    state.markets.find((m) => m.id === marketId)
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-white/60">
            Market
          </p>
          <h1 className="text-3xl font-semibold">{market?.name ?? "Loading"}</h1>
          <p className="text-white/60">{market?.eventId}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/30 px-6 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Total Pool
          </p>
          <p className="text-2xl font-semibold">
            Ɖ{market?.totalPool.toLocaleString() ?? "—"}
          </p>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            Outcome cards & tote analytics will stream in via realtime feeds.
          </p>
          <div className="rounded-3xl border border-dashed border-white/20 p-10 text-center text-white/50">
            Outcome grid placeholder
          </div>
        </div>
        <aside className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/30">
          <h2 className="text-xl font-semibold">Bet Slip</h2>
          <p className="mt-2 text-sm text-white/60">
            Select an outcome to preview odds & estimated payout.
          </p>
          <form className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Stake
              </label>
              <input
                type="number"
                placeholder="100"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white focus:border-brand focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Baseline" value="—" />
              <Stat label="Effective" value="—" />
              <Stat label="Price Impact" value="—" />
              <Stat label="Payout" value="—" />
            </div>

            <button
              type="button"
              className="w-full rounded-2xl bg-brand py-3 text-center text-base font-semibold uppercase tracking-widest text-black disabled:opacity-40"
              disabled
            >
              Place Wager
            </button>
          </form>
        </aside>
      </section>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
    <p className="mt-1 text-lg font-semibold">{value}</p>
  </div>
);

export default MarketDetailPage;
