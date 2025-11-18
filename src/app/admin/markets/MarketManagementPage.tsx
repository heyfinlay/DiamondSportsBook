import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  createMarketWizard,
  fetchAdminMarkets,
  type MarketContainer,
  type MarketContainerStatus,
  type MarketWizardPayload
} from "@domains/betting/api/marketAdminApi";
import { fetchSessions, type TimingSessionSummary } from "@domains/timing/api/timingApi";
import { useToast } from "@app/components/ToastProvider";
import { formatDistanceToNow } from "date-fns";

const FILTERS: Array<{ key: MarketFilterKey; label: string; statuses: MarketContainerStatus[] | null }> = [
  { key: "active", label: "Active", statuses: ["active"] },
  { key: "upcoming", label: "Upcoming", statuses: ["draft", "upcoming"] },
  { key: "settlement", label: "In Settlement", statuses: ["in_settlement"] },
  { key: "settled", label: "Settled", statuses: ["settled"] },
  { key: "all", label: "All", statuses: null }
];

type MarketFilterKey = "active" | "upcoming" | "settlement" | "settled" | "all";

interface PoolDraft {
  id: string;
  name: string;
  description: string;
  pool_type: string;
  rake_percent: number;
  min_stake: number;
  max_stake: number;
  close_time: string;
}

const defaultPoolDraft = (): PoolDraft => ({
  id: crypto.randomUUID(),
  name: "Overall Winner",
  description: "",
  pool_type: "winner",
  rake_percent: 0.12,
  min_stake: 10,
  max_stake: 1000,
  close_time: ""
});

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
      description: "Pools were seeded using the session drivers."
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
        <MarketWizard
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
          {market.starts_at && (
            <p className="text-xs text-white/40">
              Starts {formatDistanceToNow(new Date(market.starts_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Handle</p>
          <p className="text-2xl font-semibold">Ɖ{handle.toLocaleString()}</p>
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

const MarketWizard = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({ queryKey: ["timing-sessions"], queryFn: fetchSessions });
  const [sessionId, setSessionId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [takeout, setTakeout] = useState<string>("0.12");
  const [startsAt, setStartsAt] = useState<string>("");
  const [pools, setPools] = useState<PoolDraft[]>([defaultPoolDraft()]);

  const mutation = useMutation({
    mutationFn: (payload: MarketWizardPayload) => createMarketWizard(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-markets"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ variant: "error", title: "Unable to create market", description: error.message });
    }
  });

  const selectedSession: TimingSessionSummary | undefined = sessionsQuery.data?.find((s) => s.id === sessionId);

  const handlePoolUpdate = (id: string, field: keyof PoolDraft, value: string | number) => {
    setPools((current) => current.map((pool) => (pool.id === id ? { ...pool, [field]: value } : pool)));
  };

  const handleSubmit = () => {
    if (!sessionId) {
      toast({ variant: "error", title: "Select a session", description: "Choose a timing session to link." });
      return;
    }
    if (!title.trim()) {
      toast({ variant: "error", title: "Title required", description: "Name the market container." });
      return;
    }
    if (pools.some((pool) => !pool.name.trim())) {
      toast({ variant: "error", title: "Pool name missing", description: "Every pool needs a label." });
      return;
    }

    const payload: MarketWizardPayload = {
      sessionId,
      title,
      description,
      takeout: takeout ? Number(takeout) : undefined,
      startsAt: startsAt || undefined,
      pools: pools.map((pool) => ({
        name: pool.name,
        description: pool.description,
        pool_type: pool.pool_type,
        rake_percent: pool.rake_percent,
        min_stake: pool.min_stake,
        max_stake: pool.max_stake,
        close_time: pool.close_time || undefined
      }))
    };

    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#04060C] p-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">New Market</p>
            <h2 className="text-2xl font-semibold text-white">Creation Wizard</h2>
            <p className="text-sm text-white/60">Select a live session, configure pools, and auto-seed driver outcomes.</p>
          </div>
          <button className="text-white/60 hover:text-white" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-white/10 p-4">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">Link Session</label>
            <select
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm"
              value={sessionId}
              onChange={(event) => {
                setSessionId(event.target.value);
                if (!title && event.target.value) {
                  const session = sessionsQuery.data?.find((s) => s.id === event.target.value);
                  if (session) {
                    setTitle(`${session.name} Market`);
                  }
                }
              }}
            >
              <option value="">Select session…</option>
              {sessionsQuery.data?.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} · {session.mode ?? "race"}
                </option>
              ))}
            </select>
            {selectedSession && (
              <p className="mt-2 text-xs text-white/50">
                Track: {selectedSession.track_name ?? "TBC"} · Starts {selectedSession.starts_at ?? "TBC"}
              </p>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 p-4">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">Market Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                placeholder="Qualifier Slate"
              />
            </div>
            <div className="rounded-2xl border border-white/10 p-4">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">Takeout %</label>
              <input
                type="number"
                step="0.01"
                value={takeout}
                onChange={(event) => setTakeout(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
              />
            </div>
            <div className="rounded-2xl border border-white/10 p-4">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">Start Time</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
              placeholder="Oversee overall winner, fastest qualifier, fastest lap pools"
            />
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">Pools</label>
              <button
                type="button"
                onClick={() => setPools((current) => [...current, defaultPoolDraft()])}
                className="text-xs uppercase tracking-[0.3em] text-brand hover:text-white"
              >
                + Add Pool
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {pools.map((pool) => (
                <div key={pool.id} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <input
                      type="text"
                      value={pool.name}
                      onChange={(event) => handlePoolUpdate(pool.id, "name", event.target.value)}
                      className="flex-1 rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-sm"
                      placeholder="Pool name"
                    />
                    {pools.length > 1 && (
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.3em] text-red-400"
                        onClick={() => setPools((current) => current.filter((p) => p.id !== pool.id))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    value={pool.description}
                    onChange={(event) => handlePoolUpdate(pool.id, "description", event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-xs"
                    placeholder="Pool description"
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="text-xs text-white/50">
                      Pool Type
                      <input
                        type="text"
                        value={pool.pool_type}
                        onChange={(event) => handlePoolUpdate(pool.id, "pool_type", event.target.value)}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-white/50">
                      Rake %
                      <input
                        type="number"
                        step="0.01"
                        value={pool.rake_percent}
                        onChange={(event) => handlePoolUpdate(pool.id, "rake_percent", Number(event.target.value))}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-white/50">
                      Close Time (ISO)
                      <input
                        type="datetime-local"
                        value={pool.close_time}
                        onChange={(event) => handlePoolUpdate(pool.id, "close_time", event.target.value)}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-xs text-white/50">
                      Min Stake
                      <input
                        type="number"
                        value={pool.min_stake}
                        onChange={(event) => handlePoolUpdate(pool.id, "min_stake", Number(event.target.value))}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-white/50">
                      Max Stake
                      <input
                        type="number"
                        value={pool.max_stake}
                        onChange={(event) => handlePoolUpdate(pool.id, "max_stake", Number(event.target.value))}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-2xl border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.3em] text-white/60"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black"
              onClick={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating…" : "Create Market"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketManagementPage;
