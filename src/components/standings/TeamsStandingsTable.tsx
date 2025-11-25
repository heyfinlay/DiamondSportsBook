import { TeamStanding } from "@domains/standings/api/standingsApi";

type TeamsStandingsTableProps = {
  data: TeamStanding[];
};

const formatDelta = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—";
  if (value === 0) return "Leader";
  return `+${value.toFixed(1)}`;
};

const TeamsStandingsTable = ({ data }: TeamsStandingsTableProps) => {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/60">
        Teams standings will populate once results are submitted.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
          <tr>
            <th className="px-4 py-3 font-medium">Pos</th>
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 font-medium text-right">Points</th>
            <th className="px-4 py-3 font-medium text-right">Wins</th>
            <th className="px-4 py-3 font-medium text-right">Podiums</th>
            <th className="px-4 py-3 font-medium text-right">Starts</th>
            <th className="px-4 py-3 font-medium text-right">Δ Leader</th>
          </tr>
        </thead>
        <tbody>
          {data.map((team, index) => (
            <tr key={team.team_id} className={index === 0 ? "bg-white/5" : "hover:bg-white/5"}>
              <td className="px-4 py-3 font-semibold text-white/80">{team.position}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: team.team_color || "#fff" }}
                    />
                    {team.team_name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-base font-semibold text-white">
                {team.points.toFixed(1).replace(/\.0$/, "")}
              </td>
              <td className="px-4 py-3 text-right text-white/70">{team.wins}</td>
              <td className="px-4 py-3 text-right text-white/70">{team.podiums}</td>
              <td className="px-4 py-3 text-right text-white/70">{team.starts}</td>
              <td className="px-4 py-3 text-right text-white/70">{formatDelta(team.diff_to_leader)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamsStandingsTable;
