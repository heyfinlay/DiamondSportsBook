import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDriverStandings, useRaceResults, useTeamStandings } from "@domains/standings/api/standingsApi";
import { fetchChampionshipSeasons } from "@domains/championship/api/championshipApi";
import DriversStandingsTable from "../../components/standings/DriversStandingsTable";
import TeamsStandingsTable from "../../components/standings/TeamsStandingsTable";
import RaceResultsTable from "../../components/standings/RaceResultsTable";
import StandingsTabs from "../../components/standings/StandingsTabs";

type RoundOption = {
  round_number: number;
  race_name: string;
  circuit_name: string | null;
  race_date: string | null;
  session_id: string;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return undefined;
};

const StandingsPage = () => {
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"drivers" | "teams" | "results">("drivers");
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const seasonsQuery = useQuery({
    queryKey: ["championship-seasons"],
    queryFn: fetchChampionshipSeasons
  });
  const seasons = seasonsQuery.data ?? [];

  useEffect(() => {
    if (!seasons.length) {
      setSeasonId(null);
      return;
    }
    setSeasonId((prev) => {
      if (prev && seasons.some((season) => season.id === prev)) {
        return prev;
      }
      const activeSeason = seasons.find((season) => season.status === "active");
      return activeSeason?.id ?? seasons[0].id;
    });
  }, [seasons]);

  const driversQuery = useDriverStandings(seasonId ?? undefined);
  const teamsQuery = useTeamStandings(seasonId ?? undefined);
  const raceResultsQuery = useRaceResults(seasonId ?? undefined);

  const raceResults = raceResultsQuery.data ?? [];
  const selectedSeason = seasons.find((season) => season.id === seasonId) ?? null;

  const roundOptions = useMemo<RoundOption[]>(() => {
    const map = new Map<number, RoundOption>();
    for (const result of raceResults) {
      if (!map.has(result.round_number)) {
        map.set(result.round_number, {
          round_number: result.round_number,
          race_name: result.race_name,
          circuit_name: result.circuit_name,
          race_date: result.race_date,
          session_id: result.session_id
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.round_number - b.round_number);
  }, [raceResults]);

  useEffect(() => {
    if (!roundOptions.length) {
      setSelectedRound(null);
      return;
    }

    setSelectedRound((prev) => {
      if (prev && roundOptions.some((round) => round.round_number === prev)) {
        return prev;
      }
      return roundOptions[roundOptions.length - 1]?.round_number ?? null;
    });
  }, [roundOptions]);

  const selectedRoundResults = selectedRound
    ? raceResults.filter((result) => result.round_number === selectedRound)
    : [];

  const selectedRoundMeta =
    roundOptions.find((round) => round.round_number === selectedRound) ??
    (selectedRoundResults.length ? selectedRoundResults[0] : undefined);

  const latestRaceInfo =
    roundOptions.length > 0 ? roundOptions[roundOptions.length - 1] : undefined;

  const renderLoadingState = () => (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-4 animate-pulse rounded-full bg-white/10" />
        ))}
      </div>
    </div>
  );

  const renderErrorState = (refetch: () => void, message?: string) => (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm">
      <p className="text-rose-100">{message ?? "We couldn't load this data."}</p>
      <button
        type="button"
        className="mt-4 rounded-full bg-white/20 px-4 py-2 text-white transition hover:bg-white/30"
        onClick={refetch}
      >
        Retry
      </button>
    </div>
  );

  const renderDriversTab = () => {
    if (!seasonId) {
      if (seasonsQuery.isLoading) return renderLoadingState();
      return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
          Championship data will appear once a season is activated.
        </div>
      );
    }
    if (driversQuery.isLoading) return renderLoadingState();
    if (driversQuery.isError) return renderErrorState(driversQuery.refetch, getErrorMessage(driversQuery.error));

    return <DriversStandingsTable data={driversQuery.data ?? []} />;
  };

  const renderTeamsTab = () => {
    if (!seasonId) {
      if (seasonsQuery.isLoading) return renderLoadingState();
      return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
          Add an active season to view teams standings.
        </div>
      );
    }
    if (teamsQuery.isLoading) return renderLoadingState();
    if (teamsQuery.isError) return renderErrorState(teamsQuery.refetch, getErrorMessage(teamsQuery.error));

    return <TeamsStandingsTable data={teamsQuery.data ?? []} />;
  };

  const renderRaceResultsTab = () => {
    if (!seasonId) {
      if (seasonsQuery.isLoading) return renderLoadingState();
      return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
          Race results unlock once a championship season is configured.
        </div>
      );
    }
    if (raceResultsQuery.isLoading) return renderLoadingState();
    if (raceResultsQuery.isError) {
      return renderErrorState(raceResultsQuery.refetch, getErrorMessage(raceResultsQuery.error));
    }

    if (!roundOptions.length) {
      return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
          {selectedSeason
            ? `Race results for ${selectedSeason.name} will appear here once the first round is classified.`
            : "Select a season to view race results."}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col text-sm">
            <label className="text-white/60">Round</label>
            <select
              className="mt-1 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-white"
              value={selectedRound ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedRound(value ? Number(value) : null);
              }}
              disabled={!roundOptions.length}
            >
              {roundOptions.length ? (
                roundOptions.map((round) => (
                  <option key={round.round_number} value={round.round_number}>
                    Round {round.round_number}: {round.race_name}
                  </option>
                ))
              ) : (
                <option value="">No classified rounds</option>
              )}
            </select>
          </div>
          {selectedRoundMeta ? (
            <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase text-white/60">Race</p>
                <p className="text-lg font-semibold">{selectedRoundMeta.race_name}</p>
                <p className="text-sm text-white/60">
                  {selectedRoundMeta.circuit_name ?? "Circuit TBA"}
                </p>
              </div>
              <div className="mt-3 md:mt-0">
                <p className="text-xs uppercase text-white/60">Date</p>
                <p className="text-sm font-medium text-white">{formatDate(selectedRoundMeta.race_date)}</p>
                <p className="text-xs text-white/60">Official Classified Results</p>
              </div>
            </div>
          ) : null}
        </div>
        <RaceResultsTable data={selectedRoundResults} />
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-black/60 via-black/40 to-brand/20 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase text-white/60">Standings</p>
          <h1 className="text-3xl font-bold text-white">DayBreak Grand Prix Standings</h1>
          <p className="mt-2 text-sm text-white/70">
            Official driver, team and race results for the current season.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <label className="text-sm text-white/70">
            Season
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-white md:w-60"
              value={seasonId ?? ""}
              onChange={(event) => setSeasonId(event.target.value || null)}
              disabled={!seasons.length}
            >
              {seasons.length ? (
                seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                    {season.year ? ` (${season.year})` : ""}
                  </option>
                ))
              ) : (
                <option value="">No seasons available</option>
              )}
            </select>
          </label>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-white/80">
            {latestRaceInfo
              ? `${latestRaceInfo.race_name} – Round ${latestRaceInfo.round_number}`
              : selectedSeason
                ? "Awaiting first race"
                : "No season selected"}
          </div>
        </div>
      </div>

      <StandingsTabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        tabs={[
          { key: "drivers", label: "Drivers" },
          { key: "teams", label: "Teams" },
          { key: "results", label: "Race Results" }
        ]}
      />

      <div>
        {activeTab === "drivers" && renderDriversTab()}
        {activeTab === "teams" && renderTeamsTab()}
        {activeTab === "results" && renderRaceResultsTab()}
      </div>
    </div>
  );
};

export default StandingsPage;
