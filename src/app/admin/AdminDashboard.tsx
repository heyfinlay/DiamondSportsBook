import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Radio, RefreshCw } from "lucide-react";
import {
  approveDeposit,
  approveWithdrawal,
  fetchAllWalletTransactions,
  fetchPendingDeposits,
  fetchPendingWithdrawals,
  rejectWithdrawal
} from "@domains/wallet/api/walletApi";
import {
  fetchSportsBoardEvents,
  fetchSportsProviderHealth,
  triggerSportsSync
} from "@domains/sports/api/sportsDataApi";
import { useSession } from "@lib/auth/SessionProvider";
import { useToast } from "@app/components/ToastProvider";
import { currencySymbol } from "@lib/currency";
import { sportsKeys } from "@lib/query/keys";
import { getSportLabel } from "@domains/sports/utils/sportsUi";

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { toast } = useToast();

  const depositsQuery = useQuery({
    queryKey: ["admin-pending-deposits"],
    queryFn: fetchPendingDeposits
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["admin-pending-withdrawals"],
    queryFn: fetchPendingWithdrawals
  });

  const walletAuditQuery = useQuery({
    queryKey: ["admin-wallet-audit"],
    queryFn: () => fetchAllWalletTransactions(20)
  });

  const feedHealthQuery = useQuery({
    queryKey: sportsKeys.providerHealth(),
    queryFn: fetchSportsProviderHealth
  });

  const boardEventsQuery = useQuery({
    queryKey: sportsKeys.adminBoard(),
    queryFn: () => fetchSportsBoardEvents({ limit: 12, includeUnpublished: true })
  });

  const approveDepositMutation = useMutation({
    mutationFn: approveDeposit,
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Deposit approved",
        description: "User wallet has been credited."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to approve deposit",
        description: error.message
      });
    }
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: approveWithdrawal,
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Withdrawal approved",
        description: "Funds marked as processed."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to approve withdrawal",
        description: error.message
      });
    }
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectWithdrawal(id, reason),
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Withdrawal rejected",
        description: "User has been notified and funds were returned."
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Unable to reject withdrawal",
        description: error.message
      });
    }
  });

  const syncSportsMutation = useMutation({
    mutationFn: triggerSportsSync,
    onSuccess: (result) => {
      toast({
        variant: "success",
        title: "Sports sync completed",
        description: `${result.requestCount} provider calls used in this run.`
      });
      queryClient.invalidateQueries({ queryKey: sportsKeys.providerHealth() });
      queryClient.invalidateQueries({ queryKey: sportsKeys.adminBoard() });
      queryClient.invalidateQueries({ queryKey: sportsKeys.board() });
    },
    onError: (error: Error) => {
      toast({
        variant: "error",
        title: "Sports sync failed",
        description: error.message
      });
    }
  });

  const feedHealth = feedHealthQuery.data ?? [];
  const boardEvents = boardEventsQuery.data ?? [];
  const walletAudit = walletAuditQuery.data ?? [];
  const publishedEvents = boardEvents.filter((event) => event.published).length;
  const reviewEvents = boardEvents.filter((event) => !event.published).length;
  const totalLiquidity = boardEvents.reduce(
    (sum, event) => sum + event.markets.reduce((marketSum, market) => marketSum + market.totalPool, 0),
    0
  );
  const activePools = boardEvents.reduce(
    (sum, event) => sum + event.markets.filter((market) => market.status === "open").length,
    0
  );
  const alerts = useMemo(() => {
    const items: string[] = [];
    feedHealth.forEach((row) => {
      if (row.status === "failed" || row.error_message) {
        items.push(`${row.display_name} ${row.sport_code ? `• ${row.sport_code.toUpperCase()}` : ""} ${row.error_message ?? "Sync failed"}`);
      }
      if (row.status === "rate_limited") {
        items.push(`${row.display_name} rate limit pressure detected`);
      }
    });
    return items.slice(0, 3);
  }, [feedHealth]);

  if (!user) {
    return (
      <div className="prismatic-card p-8 text-center text-on-subtle">
        Sign in with an admin account to access operations.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="prismatic-kicker text-primary-dim">Operations Command</p>
          <h1 className="mt-3 font-headline text-4xl font-black uppercase tracking-tight text-white">
            Sportsbook Control
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-on-subtle">
            Monitor external sports feeds, auto-generated markets, settlement readiness, and wallet approval flow from one operational surface.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]"
            onClick={() => syncSportsMutation.mutate({ mode: "schedule", sports: ["f1", "nrl"] })}
            disabled={syncSportsMutation.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncSportsMutation.isPending ? "animate-spin" : ""}`} />
            Sync F1 + NRL
          </button>
          <button
            type="button"
            className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]"
            onClick={() => syncSportsMutation.mutate({ mode: "live", sports: ["f1", "nrl"] })}
            disabled={syncSportsMutation.isPending}
          >
            <Radio className="h-3.5 w-3.5" />
            Sync Live F1 + NRL
          </button>
          <Link to="/admin/settlements" className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]">
            Settlement Audit
          </Link>
          <Link to="/admin/sports" className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]">
            Event Review
          </Link>
          <Link to="/admin/wallets" className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]">
            Wallet Control
          </Link>
          <Link to="/dashboard/admin/markets" className="prismatic-button prismatic-button-secondary min-h-[2.35rem] px-4 text-[0.62rem]">
            Market Management
          </Link>
          <Link to="/admin/session-setup" className="prismatic-button prismatic-button-primary min-h-[2.35rem] px-4 text-[0.62rem]">
            Create Session
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Global Liquidity" value={`${currencySymbol}${totalLiquidity.toFixed(0)}`} accent="text-primary-container" />
        <MetricCard label="Active Pools" value={String(activePools)} accent="text-primary-fixed" />
        <MetricCard label="Review Queue" value={`${reviewEvents}/${boardEvents.length || 1}`} accent="text-cyan-300" />
        <MetricCard label="Tx Throughput" value={walletAudit.length ? "Stable" : "Idle"} accent="text-white" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)]">
        <div className="prismatic-card p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="prismatic-kicker text-white">Feed Health</p>
                <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-white">
                  Provider Status
                </h2>
              </div>
              <span className="border border-primary-container/20 bg-primary-container/10 px-2 py-1 text-[0.58rem] uppercase tracking-[0.18em] text-primary-container">
                {syncSportsMutation.isPending ? "Syncing" : "Operational"}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {syncSportsMutation.isPending ? (
                <div className="border border-primary-container/20 bg-primary-container/8 px-4 py-3 text-[0.68rem] uppercase tracking-[0.16em] text-primary-container">
                  Sportradar sync in progress. Budget-aware Formula 1 and Rugby League jobs are running through the edge function.
                </div>
              ) : null}
              {feedHealth.length ? (
                feedHealth.map((row) => (
                  <div key={`${row.provider_id}-${row.sport_code ?? "all"}`} className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {row.display_name}
                        {row.sport_code ? ` • ${getSportLabel(row.sport_code)}` : ""}
                      </p>
                      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                        Last sync {row.started_at ? new Date(row.started_at).toLocaleString() : "unknown"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.16em] text-primary-container">
                        <Radio className="h-3.5 w-3.5" />
                        <span>{row.status ?? "standby"}</span>
                      </div>
                      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                        {row.request_count ?? 0} requests
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-on-subtle">
                  No provider health rows yet. Apply the migration and start sync jobs to populate this panel.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="prismatic-card p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="prismatic-kicker text-white">Market Management</p>
                <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-white">
                  External Event Board
                </h2>
              </div>
              <button type="button" className="prismatic-button prismatic-button-secondary min-h-[2.2rem] px-3 text-[0.58rem]">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {boardEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="grid gap-4 border-b border-outline-variant/15 pb-4 md:grid-cols-[minmax(0,1.2fr)_8rem_7rem] md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-white">{event.title}</p>
                    <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                      {getSportLabel(event.sportCode)} • {event.markets.length} pools • {event.published ? "live" : "review"}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">Pool Total</p>
                    <p className="font-semibold text-primary-container">
                      {currencySymbol}
                      {event.markets.reduce((sum, market) => sum + market.totalPool, 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">Status</p>
                    <p className="font-semibold uppercase text-white">{event.published ? "published" : "draft"}</p>
                  </div>
                </div>
              ))}
              {!boardEvents.length ? (
                <div className="text-sm text-on-subtle">
                  No external events have been generated into betting containers yet.
                </div>
              ) : null}
              {publishedEvents > 0 ? (
                <div className="pt-2 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                  {publishedEvents} event{publishedEvents === 1 ? "" : "s"} currently live, {reviewEvents} awaiting admin review
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {alerts.length ? (
        <section className="prismatic-card p-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-4 w-4" />
              <p className="prismatic-kicker text-danger">System Alerts</p>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {alerts.map((alert) => (
                <div key={alert} className="border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-on-surface">
                  {alert}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-2">
        <ApprovalPanel
          title="Pending Deposits"
          items={depositsQuery.data ?? []}
          loading={depositsQuery.isLoading}
          onApprove={(id) => approveDepositMutation.mutate(id)}
          approveDisabled={approveDepositMutation.isPending}
        />

        <ApprovalPanel
          title="Pending Withdrawals"
          items={withdrawalsQuery.data ?? []}
          loading={withdrawalsQuery.isLoading}
          onApprove={(id) => approveWithdrawalMutation.mutate(id)}
          approveDisabled={approveWithdrawalMutation.isPending}
          onReject={(id) => {
            const confirmed = window.confirm("Reject withdrawal and refund the wallet balance?");
            if (!confirmed) return;
            const reason = window.prompt("Reason for rejection?", "Manual review") ?? "";
            rejectWithdrawalMutation.mutate({ id, reason: reason.trim() });
          }}
          rejectDisabled={rejectWithdrawalMutation.isPending}
        />
      </section>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent: string;
}) => (
  <div className="border-l-2 border-primary-container bg-surface-low/85 px-5 py-5">
    <p className="text-[0.58rem] uppercase tracking-[0.18em] text-on-subtle">{label}</p>
    <p className={`mt-3 font-headline text-4xl font-black ${accent}`}>{value}</p>
  </div>
);

const ApprovalPanel = ({
  title,
  items,
  loading,
  onApprove,
  approveDisabled,
  onReject,
  rejectDisabled
}: {
  title: string;
  items: Array<{
    id: string;
    amount: number;
    requested_at: string;
    user_id: string;
    profile: {
      id: string | null;
      display_name: string | null;
      username: string | null;
      ic_number: string | null;
    } | null;
  }>;
  loading: boolean;
  onApprove: (id: string) => void;
  approveDisabled: boolean;
  onReject?: (id: string) => void;
  rejectDisabled?: boolean;
}) => (
  <section className="prismatic-card p-6">
    <div className="relative z-10">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-white">
          {title}
        </h2>
        <span className="text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
          {items.length} pending
        </span>
      </div>

      {loading ? <p className="mt-4 text-sm text-on-subtle">Loading…</p> : null}

      <div className="mt-5 space-y-3">
        {items.map((entry) => {
          const profile = entry.profile;
          const characterName =
            profile?.display_name ||
            profile?.username ||
            `User ${entry.user_id.slice(0, 8)}…`;

          return (
            <article key={entry.id} className="grid gap-4 border border-outline-variant/15 bg-surface-lowest/80 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold text-white">
                  {currencySymbol}
                  {entry.amount.toFixed(2)}
                </p>
                <p className="mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-on-subtle">
                  {characterName} • IC {profile?.ic_number ?? "—"}
                </p>
                <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-on-subtle">
                  {new Date(entry.requested_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="prismatic-button prismatic-button-primary min-h-[2.2rem] px-4 text-[0.58rem]"
                  onClick={() => onApprove(entry.id)}
                  disabled={approveDisabled}
                >
                  Approve
                </button>
                {onReject ? (
                  <button
                    type="button"
                    className="prismatic-button prismatic-button-secondary min-h-[2.2rem] px-4 text-[0.58rem]"
                    onClick={() => onReject(entry.id)}
                    disabled={rejectDisabled}
                  >
                    Reject
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}

        {!loading && items.length === 0 ? (
          <div className="text-sm text-on-subtle">No pending requests.</div>
        ) : null}
      </div>
    </div>
  </section>
);

export default AdminDashboard;
