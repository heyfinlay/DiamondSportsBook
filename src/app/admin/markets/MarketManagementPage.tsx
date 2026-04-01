import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAdminMarkets, type MarketContainer, type MarketContainerStatus } from "@domains/betting/api/marketAdminApi";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { format, formatDistanceToNow } from "date-fns";
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
    const filterConfig = FILTERS.find((item) => item.key === filter)?.statuses;
    if (!filterConfig) return marketsQuery.data;
    return marketsQuery.data.filter((market) => filterConfig.includes(market.status));
  }, [marketsQuery.data, filter]);

  const summary = useMemo(() => {
    const markets = marketsQuery.data ?? [];
    return {
      total: markets.length,
      external: markets.filter((market) => market.source_type === "external_feed").length,
      manual: markets.filter((market) => market.source_type === "manual_timing").length,
      review: markets.filter((market) => market.source_type === "external_feed" && market.status !== "active").length
    };
  }, [marketsQuery.data]);

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
    <div className="space-y-10">
      <header className="grid gap-8 border-b border-white/8 pb-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="space-y-4">
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Market Ops</p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Market Management</h1>
            <p className="max-w-3xl text-sm leading-7 text-white/60">
              Manual session slates and external-feed boards now share one calm surface. Source context comes first,
              dense badges are gone, and the page leaves space where scanning is faster than decoration.
            </p>
          </div>
          <div className="grid gap-6 pt-3 sm:grid-cols-4">
            <Stat label="Visible Slates" value={String(summary.total)} />
            <Stat label="External Feed" value={String(summary.external)} />
            <Stat label="Manual Builds" value={String(summary.manual)} />
            <Stat label="Needs Review" value={String(summary.review)} />
          </div>
        </div>
        <button
          type="button"
          className="min-h-[3rem] rounded-full bg-brand px-6 text-sm font-semibold uppercase tracking-[0.24em] text-black transition hover:bg-brand/90"
          onClick={() => setWizardOpen(true)}
        >
          New Market
        </button>
      </header>

      <nav className="flex flex-wrap gap-6 border-b border-white/8 pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/45">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            className={`border-b pb-3 transition ${
              filter === item.key ? "border-white text-white" : "border-transparent hover:text-white/70"
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

      <section className="grid gap-6">
        {filteredMarkets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
        {!marketsQuery.isLoading && filteredMarkets.length === 0 && (
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] px-8 py-12 text-sm text-white/55">
            No markets match this filter.
          </div>
        )}
      </section>

      {wizardOpen && <MarketBuilderWizard onClose={() => setWizardOpen(false)} onSuccess={handleWizardSuccess} />}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-2">
    <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/35">{label}</p>
    <p className="text-2xl font-semibold text-white">{value}</p>
  </div>
);

const MarketCard = ({ market }: { market: MarketContainer }) => {
  const handle = market.markets.reduce((sum, pool) => sum + pool.total_pool, 0);
  const openPools = market.markets.filter((pool) => pool.status === "open").length;
  const totalPools = market.markets.length;
  const sourceLabel = market.source_type === "external_feed" ? "External Feed" : "Manual Session";
  const sourceDescription =
    market.source_type === "external_feed"
      ? [market.sport_code?.toUpperCase(), market.competition?.name, market.sports_event?.venue_name].filter(Boolean).join(" • ")
      : [market.session?.name, market.session?.track_name].filter(Boolean).join(" • ") || "Custom market slate";
  const detailLine = [
    market.sports_event?.round_label,
    market.external_status ? `feed ${market.external_status}` : null,
    `${totalPools} pool${totalPools === 1 ? "" : "s"}`
  ]
    .filter(Boolean)
    .join(" • ");
  const poolPreview = market.markets.slice(0, 3).map((pool) => pool.label || pool.name).join(", ");
  const statusCopy =
    market.status === "active"
      ? "Taking bets"
      : market.status === "in_settlement"
        ? "Awaiting settlement"
        : market.status === "settled"
          ? "Settled"
          : market.status === "upcoming"
            ? "Queued for open"
            : "In draft";

  return (
    <article className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-7">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/38">{sourceLabel}</p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">{market.title}</h2>
              <p className="text-sm text-white/52">{sourceDescription}</p>
            </div>
            {market.description ? <p className="max-w-3xl text-sm leading-7 text-white/62">{market.description}</p> : null}
          </div>

          <div className="grid gap-4 border-t border-white/8 pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/35">Slate Status</p>
              <p className="text-base text-white">{statusCopy}</p>
              <p className="text-sm text-white/45">{detailLine}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/35">Pools</p>
              <p className="text-base text-white">{poolPreview || "No pools seeded yet"}</p>
              <p className="text-sm text-white/45">
                Takeout {(market.takeout * 100).toFixed(1)}% • {openPools} currently open
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:text-right">
          <div className="space-y-2">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/35">Handle</p>
            <p className="text-3xl font-semibold text-white">{`${currencySymbol}${handle.toLocaleString()}`}</p>
            <p className="text-sm text-white/45">
              {openPools} / {totalPools} pools open
            </p>
          </div>
          {market.starts_at ? (
            <div className="space-y-2">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/35">Start Window</p>
              <p className="text-base text-white">{formatDistanceToNow(new Date(market.starts_at), { addSuffix: true })}</p>
              <p className="text-sm text-white/45">{format(new Date(market.starts_at), "EEE d MMM • h:mm a")}</p>
            </div>
          ) : null}
          <div className="pt-2">
            <Link
              to={`/dashboard/admin/markets/${market.id}`}
              className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-brand transition hover:text-white"
            >
              Open Slate
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default MarketManagementPage;
