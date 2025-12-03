import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAdminMarkets, type MarketContainer, type MarketContainerStatus } from "@domains/betting/api/marketAdminApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { formatDistanceToNow } from "date-fns";
import MarketBuilderWizard from "./MarketBuilderWizard";

const FILTERS: Array<{ key: MarketFilterKey; label: string; statuses: MarketContainerStatus[] | null }> = [
  { key: "active", label: "Active", statuses: ["active"] },
  { key: "upcoming", label: "Upcoming", statuses: ["draft", "upcoming"] },
  { key: "settlement", label: "In Settlement", statuses: ["in_settlement"] },
  { key: "settled", label: "Settled", statuses: ["settled"] },
  { key: "all", label: "All", statuses: null }
];

type MarketFilterKey = "active" | "upcoming" | "settlement" | "settled" | "all";

const MarketManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MarketFilterKey>("active");
  const [wizardOpen, setWizardOpen] = useState(false);

  const marketsQuery = useQuery({
    queryKey: ["admin-markets"],
    queryFn: fetchAdminMarkets
  });

  const filteredMarkets = useMemo(() => {
    if (!marketsQuery.data) return [];
    const filterConfig = FILTERS.find((f) => f.key === filter)?.statuses;
    if (!filterConfig) return marketsQuery.data;
    return marketsQuery.data.filter((market) => filterConfig.includes(market.status));
  }, [marketsQuery.data, filter]);

  const handleWizardSuccess = () => {
    toast({
      variant: "success",
      title: "Market created",
      description: "Market Builder saved pools and runners."
    });
    setWizardOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Market Ops</p>
          <h1 className="text-3xl font-semibold">Market Management</h1>
          <p className="text-sm text-white/60">Create betting slates, monitor pools, and step through settlements.</p>
        </div>
        <button
          type="button"
          className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-black hover:bg-brand/90"
          onClick={() => setWizardOpen(true)}
        >
          + New Market
        </button>
      </header>

      <nav className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            className={`rounded-full px-4 py-2 transition ${
              filter === item.key ? "bg-white text-black" : "border border-white/10 text-white/60"
            }`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {marketsQuery.isLoading && <p className="text-white/60">Loading markets…</p>}
      {marketsQuery.isError && (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Unable to load markets. Refresh to try again.
        </p>
      )}

      <section className="grid gap-4">
        {filteredMarkets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
        {!marketsQuery.isLoading && filteredMarkets.length === 0 && (
          <p className="text-sm text-white/60">No markets match this filter.</p>
        )}
      </section>

      {wizardOpen && (
        <MarketBuilderWizard
          onClose={() => setWizardOpen(false)}
          onSuccess={handleWizardSuccess}
        />
      )}
    </div>
  );
};

const MarketCard = ({ market }: { market: MarketContainer }) => {
  const handle = market.markets.reduce((sum, pool) => sum + pool.total_pool, 0);
  const openPools = market.markets.filter((pool) => pool.status === "open").length;
  const totalPools = market.markets.length;

  return (
    <article className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{market.status}</p>
          <h2 className="text-2xl font-semibold text-white">{market.title}</h2>
          <p className="text-sm text-white/60">
            {market.session?.name ?? "Unlinked session"}
            {market.session?.track_name ? ` • ${market.session.track_name}` : ""}
          </p>
          <p className="text-xs text-white/50">
            {market.market_type} • {market.scope}
          </p>
          {market.starts_at && (
            <p className="text-xs text-white/40">
              Starts {formatDistanceToNow(new Date(market.starts_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Handle</p>
          <p className="text-2xl font-semibold">{`${currencySymbol}${handle.toLocaleString()}`}</p>
          <p className="text-xs text-white/60">{openPools} / {totalPools} pools open</p>
        </div>
      </div>
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex gap-2 text-white/60">
          <span>Takeout {(market.takeout * 100).toFixed(1)}%</span>
          <span>•</span>
          <span>{totalPools} pools</span>
        </div>
        <Link
          to={`/dashboard/admin/markets/${market.id}`}
          className="text-xs font-semibold uppercase tracking-[0.3em] text-brand hover:text-white"
        >
          Manage →
        </Link>
      </footer>
    </article>
  );
};

export default MarketManagementPage;
