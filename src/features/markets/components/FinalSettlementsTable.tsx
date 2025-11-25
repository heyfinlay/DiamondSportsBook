import { formatCurrency } from "../utils/format";
import type { PoolLedgerEntry } from "@domains/betting/api/settlementAuditApi";

type FinalSettlementsTableProps = {
  rows: PoolLedgerEntry[];
  emptyLabel?: string;
};

const formatShare = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(4)}%`;
};

const formatResult = (row: PoolLedgerEntry) => {
  if (row.status === "void_refund") return "REFUND";
  if (row.payout > 0) return "WIN";
  if (row.status === "lost") return "LOSS";
  if (row.status === "won") return "WIN";
  return row.status.toUpperCase();
};

export const FinalSettlementsTable = ({ rows, emptyLabel }: FinalSettlementsTableProps) => {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-white/60">
        {emptyLabel ?? "No settlement activity recorded for this market yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <table className="w-full border-collapse text-sm text-white">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.25em] text-white/50">
          <tr>
            <th className="px-4 py-3">Character</th>
            <th className="px-4 py-3">Outcome</th>
            <th className="px-4 py-3 text-right">Stake</th>
            <th className="px-4 py-3 text-right">Final Odds</th>
            <th className="px-4 py-3 text-right">Share</th>
            <th className="px-4 py-3 text-right">Result</th>
            <th className="px-4 py-3 text-right">Payout</th>
            <th className="px-4 py-3 text-right">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isWinner = row.payout > 0;
            const resultLabel = formatResult(row);
            const timestamp = isWinner ? row.settled_at : row.placed_at;
            return (
              <tr
                key={row.wager_id}
                className={isWinner ? "bg-emerald-500/5" : "odd:bg-white/5"}
              >
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-white">
                    {row.character_name || row.username || `User ${row.user_id.slice(0, 8)}…`}
                  </p>
                  <p className="text-xs text-white/50">{row.user_id.slice(0, 8)}…</p>
                </td>
                <td className="px-4 py-3 align-top text-white/80">{row.outcome_label}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">
                  {formatCurrency(row.stake)}
                </td>
                <td className="px-4 py-3 text-right text-white/80">
                  x{row.effective_odds.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-white/70">{formatShare(row.share_percent)}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.2em] ${
                      isWinner
                        ? "bg-emerald-500/20 text-emerald-200"
                        : row.status === "void_refund"
                          ? "bg-yellow-500/20 text-yellow-200"
                          : "bg-white/10 text-white/70"
                    }`}
                  >
                    {resultLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  <span className={isWinner ? "text-emerald-300" : "text-white/70"}>
                    {formatCurrency(row.payout)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-white/60">
                  {new Date(timestamp).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FinalSettlementsTable;
