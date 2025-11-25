import { DriverStanding } from "@domains/standings/api/standingsApi";
import { Fragment } from "react";

type DriversStandingsTableProps = {
  data: DriverStanding[];
};

const formatDelta = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—";
  if (value === 0) return "Leader";
  return `+${value.toFixed(1)}`;
};

const DriversStandingsTable = ({ data }: DriversStandingsTableProps) => {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/60">
        Standings will appear here once results are recorded.
      </div>
    );
  }

  return (
    <Fragment>
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black/40 lg:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Pos</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium text-right">Points</th>
              <th className="px-4 py-3 font-medium text-right">Δ Leader</th>
              <th className="px-4 py-3 font-medium text-right">Wins</th>
              <th className="px-4 py-3 font-medium text-right">Podiums</th>
              <th className="px-4 py-3 font-medium text-right">Starts</th>
            </tr>
          </thead>
          <tbody>
            {data.map((driver, index) => (
              <tr
                key={driver.driver_id}
                className={index === 0 ? "bg-white/5" : "hover:bg-white/5"}
              >
                <td className="px-4 py-3 text-sm font-semibold text-white/80">{driver.position}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: driver.team_color || "#fff" }}
                      />
                      {driver.driver_name}
                    </span>
                    <span className="text-xs text-white/60">{driver.team_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/80">{driver.team_name}</td>
                <td className="px-4 py-3 text-right text-base font-semibold text-white">
                  {driver.points.toFixed(1).replace(/\.0$/, "")}
                </td>
                <td className="px-4 py-3 text-right text-white/70">{formatDelta(driver.diff_to_leader)}</td>
                <td className="px-4 py-3 text-right text-white/70">{driver.wins}</td>
                <td className="px-4 py-3 text-right text-white/70">{driver.podiums}</td>
                <td className="px-4 py-3 text-right text-white/70">{driver.starts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {data.map((driver, index) => (
          <div
            key={driver.driver_id}
            className={`rounded-2xl border border-white/10 bg-black/40 p-4 ${
              index === 0 ? "ring-2 ring-white/40" : ""
            }`}
          >
            <div className="flex items-center justify-between text-xs uppercase text-white/50">
              <span>Pos {driver.position}</span>
              <span>{formatDelta(driver.diff_to_leader)}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-base font-semibold">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: driver.team_color || "#fff" }}
              />
              {driver.driver_name}
              {driver.dnf_count > 0 ? (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-normal text-white/70">
                  {driver.dnf_count} DNF
                </span>
              ) : null}
            </div>
            <div className="text-sm text-white/60">{driver.team_name}</div>
            <div className="mt-2 flex items-center justify-between text-sm font-semibold">
              <div className="text-white/80">Points</div>
              <div>{driver.points.toFixed(1).replace(/\.0$/, "")}</div>
            </div>
          </div>
        ))}
      </div>
    </Fragment>
  );
};

export default DriversStandingsTable;
