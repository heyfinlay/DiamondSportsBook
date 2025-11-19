import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closePool,
  confirmSettlement,
  fetchAdminMarketDetail,
  fetchMarketWagers,
  fetchWalletActivityForMarket,
  fetchRakeLedger,
  openPool,
  previewSettlement,
  proposeSettlement,
  suspendPool,
  voidPool,
  archivePool,
  restorePool,
  type AdminWagerRow,
  type MarketPool,
  type SettlementPreview,
  type WalletActivityRow
} from "@domains/betting/api/marketAdminApi";
import { useToast } from "@app/components/ToastProvider";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "pools", label: "Pools" },
  { key: "wallet", label: "Wallet & Money" },
  { key: "participants", label: "Participants / Bets" },
  { key: "audit", label: "Audit / Logs" }
] as const;

const MarketDetailAdminPage = () => {
  const { marketId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("overview");
  const [walletPoolFilter, setWalletPoolFilter] = useState<string>("all");
  const [wagerPoolFilter, setWagerPoolFilter] = useState<string>("all");

  const detailQuery = useQuery({
    queryKey: ["admin-market-detail", marketId],
    queryFn: () => fetchAdminMarketDetail(marketId!),
    enabled: !!marketId
  });

  const pools = detailQuery.data?.markets ?? [];

  const wagersQuery = useQuery({
    queryKey: ["admin-market-wagers", marketId, wagerPoolFilter],
    queryFn: () => fetchMarketWagers(marketId!, wagerPoolFilter === "all" ? undefined : wagerPoolFilter),
    enabled: !!marketId
  });

  const walletQuery = useQuery({
    queryKey: ["admin-market-wallet", marketId, walletPoolFilter],
    queryFn: () => fetchWalletActivityForMarket(marketId!, walletPoolFilter === "all" ? undefined : walletPoolFilter),
    enabled: !!marketId
  });

  const rakeLedgerQuery = useQuery({
    queryKey: ["admin-market-rake", marketId],
    queryFn: () => fetchRakeLedger(marketId!),
    enabled: !!marketId
  });

  const totalHandle = pools.reduce((sum, pool) => sum + pool.total_pool, 0);
  const totalWagers = wagersQuery.data?.length ?? 0;
  const pendingWagers = wagersQuery.data?.filter((wager) =>
    wager.status === "accepted" || wager.status === "pending"
  ).length ?? 0;
  const totalRake = rakeLedgerQuery.data?.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;

  const refreshDetail = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-market-detail", marketId] });
    queryClient.invalidateQueries({ queryKey: ["admin-market-wagers", marketId], exact: false });
    queryClient.invalidateQueries({ queryKey: ["admin-market-wallet", marketId], exact: false });
    queryClient.invalidateQueries({ queryKey: ["admin-market-rake", marketId], exact: false });
  };

  if (!marketId) {
    return <p className="text-white/70">Market not found.</p>;
  }

  if (detailQuery.isLoading) {
    return <p className="text-white/60">Loading market detail…</p>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        Unable to load market. Try again later.
      </p>
    );
  }

  const market = detailQuery.data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/dashboard/admin/markets" className="text-xs text-white/60 hover:text-white">
            ← Back to markets
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Market</p>
          <h1 className="text-3xl font-semibold text-white">{market.title}</h1>
          <p className="text-sm text-white/60">
            {market.session?.name ?? "Unlinked session"}
            {market.session?.track_name ? ` • ${market.session.track_name}` : ""}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/30 px-6 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Handle</p>
          <p className="text-2xl font-semibold">Ɖ{totalHandle.toLocaleString()}</p>
          <p className="text-xs text-white/60">Status: {market.status}</p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`rounded-full px-4 py-2 transition ${
              activeTab === tab.key ? "bg-white text-black" : "border border-white/10 text-white/60"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <OverviewTab
          pools={pools}
          totalHandle={totalHandle}
          totalWagers={totalWagers}
          pendingWagers={pendingWagers}
          totalRake={totalRake}
        />
      )}

      {activeTab === "pools" && (
        <div className="space-y-4">
          {pools.map((pool) => (
            <PoolManager key={pool.id} pool={pool} onRefresh={refreshDetail} />
          ))}
          {pools.length === 0 && <p className="text-sm text-white/60">No pools configured.</p>}
        </div>
      )}

      {activeTab === "wallet" && (
        <WalletTab
          pools={pools}
          walletPoolFilter={walletPoolFilter}
          setWalletPoolFilter={setWalletPoolFilter}
          walletRows={walletQuery.data ?? []}
          totalHandle={totalHandle}
          pendingWagers={pendingWagers}
          totalRake={totalRake}
          isLoading={walletQuery.isLoading}
        />
      )}

      {activeTab === "participants" && (
        <ParticipantsTab
          pools={pools}
          wagers={wagersQuery.data ?? []}
          isLoading={wagersQuery.isLoading}
          filter={wagerPoolFilter}
          setFilter={setWagerPoolFilter}
        />
      )}

      {activeTab === "audit" && (
        <section className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/60">
          No audit log source configured. Connect admin_actions_log to surface recent operations.
        </section>
      )}
    </div>
  );
};

const OverviewTab = ({
  pools,
  totalHandle,
  totalWagers,
  pendingWagers,
  totalRake
}: {
  pools: MarketPool[];
  totalHandle: number;
  totalWagers: number;
  pendingWagers: number;
  totalRake: number;
}) => {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Handle" value={`Ɖ${totalHandle.toLocaleString()}`} />
        <KpiCard label="Total Wagers" value={totalWagers.toString()} />
        <KpiCard label="Pending Wagers" value={pendingWagers.toString()} />
        <KpiCard label="Net Rake" value={`Ɖ${totalRake.toFixed(2)}`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pools.map((pool) => (
          <article key={pool.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">{pool.status}</p>
                <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
              </div>
              <p className="text-sm text-white/60">Ɖ{pool.total_pool.toLocaleString()}</p>
            </header>
            <p className="mt-2 text-xs text-white/60">{pool.description}</p>
            <p className="mt-2 text-xs text-white/40">Rake {(pool.rake_percent * 100).toFixed(1)}%</p>
            <a
              href="#pools"
              className="mt-3 inline-block text-xs uppercase tracking-[0.3em] text-brand hover:text-white"
            >
              Manage pool →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
};

const PoolManager = ({ pool, onRefresh }: { pool: MarketPool; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [preview, setPreview] = useState<SettlementPreview | null>(null);

  const closeMutation = useMutation({
    mutationFn: () => closePool(pool.id),
    onSuccess: () => {
      toast({ variant: "success", title: "Pool closed" });
      onRefresh();
    },
    onError: (error: Error) => toast({ variant: "error", title: "Unable to close", description: error.message })
  });

  const openMutation = useMutation({
    mutationFn: () => openPool(pool.id),
    onSuccess: () => {
      toast({ variant: "success", title: "Pool opened" });
      onRefresh();
    },
    onError: (error: Error) => toast({ variant: "error", title: "Unable to open", description: error.message })
  });

  const suspendMutation = useMutation({
    mutationFn: () => suspendPool(pool.id),
    onSuccess: () => {
      toast({ variant: "success", title: "Pool suspended" });
      onRefresh();
    },
    onError: (error: Error) => toast({ variant: "error", title: "Unable to suspend", description: error.message })
  });

  const previewMutation = useMutation({
    mutationFn: (outcomeId: string) => previewSettlement(pool.id, outcomeId),
    onSuccess: (data) => setPreview(data),
    onError: (error: Error) => toast({ variant: "error", title: "Preview failed", description: error.message })
  });

  const proposeMutation = useMutation({
    mutationFn: (outcomeId: string) => proposeSettlement(pool.id, outcomeId),
    onSuccess: () => {
      toast({ variant: "success", title: "Settlement proposed" });
      onRefresh();
    },
    onError: (error: Error) => toast({ variant: "error", title: "Proposal failed", description: error.message })
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmSettlement(pool.id),
    onSuccess: () => {
      toast({ variant: "success", title: "Pool settled" });
      onRefresh();
    },
    onError: (error: Error) => toast({ variant: "error", title: "Settlement failed", description: error.message })
  });

  const voidMutation = useMutation({
    mutationFn: () => voidPool(pool.id),
    onSuccess: () => {
      toast({ variant: "success", title: "Pool voided" });
      onRefresh();
    },
    onError: (error: Error) => toast({ variant: "error", title: "Unable to void", description: error.message })
  });

  const archiveMutation = useMutation({
    mutationFn: () => archivePool(pool.id),
    onSuccess: () => {
      toast({ variant: "success", title: "Pool archived" });
      onRefresh();
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to archive", description: error.message })
  });

  const restoreMutation = useMutation({
    mutationFn: () => restorePool(pool.id),
    onSuccess: () => {
      toast({ variant: "success", title: "Pool restored" });
      onRefresh();
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to restore", description: error.message })
  });

  const totalOutcomePool = pool.outcomes.reduce((sum, outcome) => sum + outcome.pool, 0);

  const pendingSummary = pool.pending_settlement?.summary
    ? ((pool.pending_settlement.summary as unknown) as SettlementPreview)
    : undefined;
  const previewData = preview ?? pendingSummary ?? null;

  const formatPreviewValue = (value: unknown) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
  };

  return (
    <article id="pools" className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{pool.status}</p>
          <h3 className="text-xl font-semibold text-white">{pool.name}</h3>
          <p className="text-sm text-white/60">{pool.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PoolActionButton label="Open" onClick={() => openMutation.mutate()} disabled={openMutation.isPending} />
          <PoolActionButton label="Close" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} />
          <PoolActionButton label="Suspend" onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending} />
          <PoolActionButton
            label="Void"
            onClick={() => {
              const confirmed = window.confirm("Void this pool and refund all wagers?");
              if (!confirmed) return;
              voidMutation.mutate();
            }}
            disabled={voidMutation.isPending}
          />
          {pool.status === "settled" || pool.status === "void" ? (
            <PoolActionButton
              label={pool.archived ? "Restore" : "Archive"}
              onClick={() => {
                if (!pool.archived) {
                  const confirmed = window.confirm(
                    "Archive this pool so it no longer appears on the public board?"
                  );
                  if (!confirmed) return;
                  archiveMutation.mutate();
                } else {
                  restoreMutation.mutate();
                }
              }}
              disabled={archiveMutation.isPending || restoreMutation.isPending}
            />
          ) : null}
        </div>
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-[0.3em] text-white/50">
            <tr>
              <th className="py-2">Outcome</th>
              <th>Stake</th>
              <th>% Pool</th>
              <th>Implied Payout</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {pool.outcomes.map((outcome) => {
              const share = totalOutcomePool > 0 ? (outcome.pool / totalOutcomePool) * 100 : 0;
              const implied = outcome.pool > 0 ? (pool.total_pool / outcome.pool).toFixed(2) : "—";
              return (
                <tr key={outcome.id} className="border-t border-white/5 text-white/80">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: outcome.color ?? "#9FF7D3" }}
                      />
                      {outcome.label}
                    </div>
                  </td>
                  <td>Ɖ{outcome.pool.toFixed(2)}</td>
                  <td>{share.toFixed(1)}%</td>
                  <td>{implied}</td>
                  <td>
                    <input
                      type="radio"
                      name={`outcome-${pool.id}`}
                      checked={selectedOutcome === outcome.id}
                      onChange={() => {
                        setSelectedOutcome(outcome.id);
                        setPreview(null);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 uppercase tracking-[0.3em]"
          onClick={() => selectedOutcome && previewMutation.mutate(selectedOutcome)}
          disabled={!selectedOutcome || previewMutation.isPending}
        >
          Preview Settlement
        </button>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 uppercase tracking-[0.3em]"
          onClick={() => selectedOutcome && proposeMutation.mutate(selectedOutcome)}
          disabled={!selectedOutcome || proposeMutation.isPending}
        >
          Propose Settlement
        </button>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 uppercase tracking-[0.3em]"
          onClick={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending || pool.status !== "settlement_proposed"}
        >
          Confirm Settlement
        </button>
      </div>

      {previewData && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Settlement Preview</p>
          <p>Handle Ɖ{formatPreviewValue(previewData.handle)}</p>
          <p>Rake Ɖ{formatPreviewValue(previewData.rake_amount)}</p>
          <p>Distribution Ɖ{formatPreviewValue(previewData.distribution_pool)}</p>
        </div>
      )}
    </article>
  );
};

const WalletTab = ({
  pools,
  walletPoolFilter,
  setWalletPoolFilter,
  walletRows,
  totalHandle,
  pendingWagers,
  totalRake,
  isLoading
}: {
  pools: MarketPool[];
  walletPoolFilter: string;
  setWalletPoolFilter: (id: string) => void;
  walletRows: WalletActivityRow[];
  totalHandle: number;
  pendingWagers: number;
  totalRake: number;
  isLoading: boolean;
}) => {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Handle" value={`Ɖ${totalHandle.toLocaleString()}`} />
        <KpiCard label="Pending Wagers" value={pendingWagers.toString()} />
        <KpiCard label="Net Rake" value={`Ɖ${totalRake.toFixed(2)}`} />
      </div>
      <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">Pool Filter</label>
          <select
            value={walletPoolFilter}
            onChange={(event) => setWalletPoolFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-sm"
          >
            <option value="all">All pools</option>
            {pools.map((pool) => (
              <option key={pool.id} value={pool.id}>
                {pool.name}
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <p className="mt-4 text-sm text-white/60">Loading wallet activity…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {walletRows.length === 0 && <p className="text-sm text-white/60">No wallet activity yet.</p>}
            {walletRows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <p className="font-semibold">{row.kind}</p>
                <p className="text-xs text-white/60">User {row.user_id.slice(0, 8)}…</p>
                <p className="text-lg font-semibold">{row.amount >= 0 ? "+" : ""}Ɖ{row.amount.toFixed(2)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const ParticipantsTab = ({
  pools,
  wagers,
  isLoading,
  filter,
  setFilter
}: {
  pools: MarketPool[];
  wagers: AdminWagerRow[];
  isLoading: boolean;
  filter: string;
  setFilter: (value: string) => void;
}) => {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs uppercase tracking-[0.3em] text-white/50">Pool Filter</label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-sm"
        >
          <option value="all">All pools</option>
          {pools.map((pool) => (
            <option key={pool.id} value={pool.id}>
              {pool.name}
            </option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <p className="mt-4 text-sm text-white/60">Loading wagers…</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.3em] text-white/50">
              <tr>
                <th className="py-2">User</th>
                <th>Pool</th>
                <th>Outcome</th>
                <th>Stake</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {wagers.map((wager) => (
                <tr key={wager.wager_id} className="border-t border-white/5 text-white/80">
                  <td className="py-2">{wager.user_name ?? wager.user_id.slice(0, 8)}</td>
                  <td>{wager.pool_name}</td>
                  <td>{wager.outcome_label}</td>
                  <td>Ɖ{wager.stake.toFixed(2)}</td>
                  <td>{wager.status}</td>
                  <td>{new Date(wager.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {wagers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-white/60">
                    No wagers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const KpiCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
    <p className="text-2xl font-semibold text-white">{value}</p>
  </div>
);

const PoolActionButton = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white disabled:opacity-40"
  >
    {label}
  </button>
);

export default MarketDetailAdminPage;
