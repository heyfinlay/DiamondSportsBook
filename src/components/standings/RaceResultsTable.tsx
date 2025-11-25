import { RaceResult } from "@domains/standings/api/standingsApi";

type RaceResultsTableProps = {
  data: RaceResult[];
};

const formatGap = (result: RaceResult) => {
  if (result.finish_position === 1 || result.position_display === "1") return "—";
  if (result.gap_to_leader) return result.gap_to_leader;
  return result.status ?? "—";
};

const RaceResultsTable = ({ data }: RaceResultsTableProps) => {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-white/60">
        No classified results for this round yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
          <tr>
            <th className="px-4 py-3 font-medium">Pos</th>
            <th className="px-4 py-3 font-medium">Driver</th>
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 font-medium text-right">Grid</th>
            <th className="px-4 py-3 font-medium text-right">Δ Leader</th>
            <th className="px-4 py-3 font-medium text-right">Status</th>
            <th className="px-4 py-3 font-medium text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {data.map((result) => {
            const displayPosition =
              result.position_display ||
              (result.finish_position ? String(result.finish_position) : "—");
            const normalizedDisplay = displayPosition.toUpperCase();
            const retired =
              ["DNF", "DSQ"].includes(normalizedDisplay) ||
              result.status?.toUpperCase().includes("DNF") ||
              result.status?.toUpperCase().includes("DSQ");
            const pointsDisplay =
              Number.isInteger(result.points_awarded)
                ? result.points_awarded.toFixed(0)
                : result.points_awarded.toFixed(1);

            return (
              <tr
                key={result.result_id ?? `${result.session_id}-${result.driver_id}`}
                className={retired ? "opacity-60" : "hover:bg-white/5"}
              >
                <td className="px-4 py-3 text-sm font-semibold text-white/80">
                  {displayPosition}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: result.team_color || "#fff" }}
                      />
                      {result.driver_name}
                      {result.fastest_lap ? (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-200">
                          FL
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-white/60">{result.team_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/70">{result.team_name}</td>
                <td className="px-4 py-3 text-right text-white/70">
                  {result.grid_position ?? "—"}
                </td>
                <td className="px-4 py-3 text-right text-white/70">{formatGap(result)}</td>
                <td className="px-4 py-3 text-right text-white/70">{result.status ?? "—"}</td>
                <td className="px-4 py-3 text-right text-base font-semibold text-white">
                  {pointsDisplay.replace(/\.0$/, "")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RaceResultsTable;
