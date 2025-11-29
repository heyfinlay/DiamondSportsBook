import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@app/components/ToastProvider";
import {
  ChampionshipDriver,
  ChampionshipRace,
  ChampionshipResult,
  ChampionshipSeason,
  ChampionshipTeam,
  DisplayLabelMode,
  createChampionshipSeason,
  deleteDriverLeaderboardOverride,
  deleteChampionshipDriver,
  deleteChampionshipResult,
  deleteChampionshipTeam,
  deleteTeamLeaderboardOverride,
  fetchChampionshipDrivers,
  fetchChampionshipRaces,
  fetchChampionshipResults,
  fetchChampionshipSeasons,
  fetchChampionshipTeams,
  setActiveChampionshipSeason,
  upsertDriverLeaderboardOverride,
  upsertChampionshipDriver,
  upsertChampionshipRace,
  upsertChampionshipResults,
  upsertChampionshipTeam,
  upsertTeamLeaderboardOverride,
  updateChampionshipSeason
} from "@domains/championship/api/championshipApi";
import {
  DriverStanding,
  TeamStanding,
  fetchDriverStandings,
  fetchTeamStandings
} from "@domains/standings/api/standingsApi";
import { standingsKeys } from "@lib/query/keys";

type AdminTab = "seasons" | "roster" | "results" | "leaderboard";

const AdminChampionshipPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>("seasons");
  const seasonsQuery = useQuery({
    queryKey: ["championship-seasons"],
    queryFn: fetchChampionshipSeasons
  });

  const [seasonId, setSeasonId] = useState<string | null>(null);

  const activeSeasonId = useMemo(() => {
    if (!seasonsQuery.data || !seasonsQuery.data.length) return null;
    const preferred =
      seasonsQuery.data.find((season) => season.status === "active") ?? seasonsQuery.data[0];
    return preferred.id;
  }, [seasonsQuery.data]);

  useEffect(() => {
    if (seasonId || !activeSeasonId) return;
    setSeasonId(activeSeasonId);
  }, [activeSeasonId, seasonId]);

  const teamsQuery = useQuery({
    queryKey: ["championship-teams", seasonId],
    queryFn: () => fetchChampionshipTeams(seasonId!),
    enabled: Boolean(seasonId)
  });

  const driversQuery = useQuery({
    queryKey: ["championship-drivers", seasonId],
    queryFn: () => fetchChampionshipDrivers(seasonId!),
    enabled: Boolean(seasonId)
  });

  const racesQuery = useQuery({
    queryKey: ["championship-races", seasonId],
    queryFn: () => fetchChampionshipRaces(seasonId!),
    enabled: Boolean(seasonId)
  });

  const [raceId, setRaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!raceId && racesQuery.data && racesQuery.data.length) {
      setRaceId(racesQuery.data[0].id);
    }
  }, [raceId, racesQuery.data]);

  const resultsQuery = useQuery({
    queryKey: ["championship-results", raceId],
    queryFn: () => fetchChampionshipResults(raceId!),
    enabled: Boolean(raceId)
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Championship</p>
          <h1 className="text-3xl font-semibold text-white">DayBreak Grand Prix Control</h1>
          <p className="text-sm text-white/60">
            Manage official seasons, driver lineups and race results that power the standings
            experience.
          </p>
        </div>
        <Link
          to="/standings"
          className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
        >
          → View public standings
        </Link>
      </header>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/20 p-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
        {[
          { key: "seasons", label: "Seasons" },
          { key: "roster", label: "Teams & Drivers" },
          { key: "results", label: "Race Results" },
          { key: "leaderboard", label: "Manual Leaderboard" }
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key as AdminTab)}
            className={`rounded-xl px-4 py-2 transition ${
              tab === item.key ? "bg-white text-black" : "hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "seasons" && (
        <SeasonManager
          seasons={seasonsQuery.data ?? []}
          isLoading={seasonsQuery.isLoading}
          onSelectSeason={setSeasonId}
          selectedSeasonId={seasonId}
        />
      )}

      {tab === "roster" && seasonId && (
        <RosterManager
          seasonId={seasonId}
          teams={teamsQuery.data ?? []}
          drivers={driversQuery.data ?? []}
          isTeamsLoading={teamsQuery.isLoading}
          isDriversLoading={driversQuery.isLoading}
        />
      )}

      {tab === "results" && seasonId && (
        <RaceResultsManager
          seasonId={seasonId}
          races={racesQuery.data ?? []}
          isRacesLoading={racesQuery.isLoading}
          raceId={raceId}
          onRaceIdChange={setRaceId}
          results={resultsQuery.data ?? []}
          isResultsLoading={resultsQuery.isLoading}
          drivers={driversQuery.data ?? []}
        />
      )}

      {tab === "leaderboard" && seasonId && <ManualLeaderboardEditor seasonId={seasonId} />}
    </div>
  );
};

const SeasonManager = ({
  seasons,
  isLoading,
  onSelectSeason,
  selectedSeasonId
}: {
  seasons: ChampionshipSeason[];
  isLoading: boolean;
  onSelectSeason: (id: string) => void;
  selectedSeasonId: string | null;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [editingSeason, setEditingSeason] = useState<ChampionshipSeason | null>(null);

  const createMutation = useMutation({
    mutationFn: createChampionshipSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-seasons"] });
      toast({ variant: "success", title: "Season created" });
      setName("");
      setYear("");
    },
    onError: (error: Error) => toast({ variant: "error", title: "Unable to save", description: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; updates: Partial<ChampionshipSeason> }) =>
      updateChampionshipSeason(payload.id, payload.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-seasons"] });
      toast({ variant: "success", title: "Season updated" });
      setEditingSeason(null);
      setName("");
      setYear("");
    },
    onError: (error: Error) => toast({ variant: "error", title: "Unable to update", description: error.message })
  });

  const setActiveMutation = useMutation({
    mutationFn: setActiveChampionshipSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-seasons"] });
      toast({ variant: "success", title: "Active season set" });
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to set active season", description: error.message })
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast({ variant: "error", title: "Name required", description: "Season name cannot be empty." });
      return;
    }
    if (editingSeason) {
      updateMutation.mutate({
        id: editingSeason.id,
        updates: { name: name.trim(), year: year ? Number(year) : null }
      });
      return;
    }
    createMutation.mutate({ name: name.trim(), year: year ? Number(year) : null });
  };

  if (isLoading) {
    return <p className="text-sm text-white/60">Loading seasons…</p>;
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white"
      >
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">
          {editingSeason ? "Edit season" : "Create season"}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-white"
              placeholder="Season name"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">Year</label>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-white"
              placeholder="2025"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingSeason
              ? updateMutation.isPending
                ? "Saving…"
                : "Save changes"
              : createMutation.isPending
                ? "Creating…"
                : "Create season"}
          </button>
          {editingSeason && (
            <button
              type="button"
              className="rounded-2xl border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70"
              onClick={() => {
                setEditingSeason(null);
                setName("");
                setYear("");
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {seasons.length === 0 && (
          <p className="text-sm text-white/60">No seasons created yet. Add your first above.</p>
        )}
        {seasons.map((season) => (
          <article
            key={season.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white ${
              season.id === selectedSeasonId ? "ring-2 ring-brand/50" : ""
            }`}
          >
            <div>
              <p className="text-base font-semibold">{season.name}</p>
              <p className="text-xs text-white/60">
                {season.year ? `${season.year} • ` : ""}
                Status · {season.status}
                {season.current_round ? ` • Round ${season.current_round}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70"
                onClick={() => {
                  setEditingSeason(season);
                  setName(season.name);
                  setYear(season.year ? String(season.year) : "");
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70"
                onClick={() => {
                  onSelectSeason(season.id);
                  toast({ variant: "success", title: "Season selected" });
                }}
              >
                Work on
              </button>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70"
                disabled={setActiveMutation.isPending || season.status === "active"}
                onClick={() => setActiveMutation.mutate(season.id)}
              >
                {season.status === "active" ? "Active" : "Set active"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const RosterManager = ({
  seasonId,
  teams,
  drivers,
  isTeamsLoading,
  isDriversLoading
}: {
  seasonId: string;
  teams: ChampionshipTeam[];
  drivers: ChampionshipDriver[];
  isTeamsLoading: boolean;
  isDriversLoading: boolean;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [teamForm, setTeamForm] = useState({
    name: "",
    short_code: "",
    legacy_team_id: "",
    primary_color: "#ffffff",
    secondary_color: "#0f0f0f"
  });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [driverForm, setDriverForm] = useState({
    driver_name: "",
    car_number: "",
    team_id: "",
    status: "primary" as ChampionshipDriver["status"]
  });
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  const teamMutation = useMutation({
    mutationFn: (payload: Partial<ChampionshipTeam>) =>
      upsertChampionshipTeam({
        ...payload,
        id: editingTeamId ?? undefined,
        season_id: seasonId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-teams", seasonId] });
      toast({ variant: "success", title: "Team saved" });
      setTeamForm({
        name: "",
        short_code: "",
        legacy_team_id: "",
        primary_color: "#ffffff",
        secondary_color: "#0f0f0f"
      });
      setEditingTeamId(null);
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to save team", description: error.message })
  });

  const driverMutation = useMutation({
    mutationFn: (payload: Partial<ChampionshipDriver>) =>
      upsertChampionshipDriver({
        ...payload,
        id: editingDriverId ?? undefined,
        car_number: payload.car_number ?? null,
        season_id: seasonId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-drivers", seasonId] });
      toast({ variant: "success", title: "Driver saved" });
      setDriverForm({
        driver_name: "",
        car_number: "",
        team_id: "",
        status: "primary"
      });
      setEditingDriverId(null);
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to save driver", description: error.message })
  });

  const deleteTeamMutation = useMutation({
    mutationFn: deleteChampionshipTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-teams", seasonId] });
      toast({ variant: "success", title: "Team deleted" });
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to delete team", description: error.message })
  });

  const deleteDriverMutation = useMutation({
    mutationFn: deleteChampionshipDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-drivers", seasonId] });
      toast({ variant: "success", title: "Driver removed" });
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to delete driver", description: error.message })
  });

  if (isTeamsLoading || isDriversLoading) {
    return <p className="text-sm text-white/60">Loading roster…</p>;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Teams</p>
          <h2 className="text-xl font-semibold text-white">Season garage</h2>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!teamForm.name.trim()) {
              toast({ variant: "error", title: "Team name required" });
              return;
            }
            teamMutation.mutate({
              id: editingTeamId ?? undefined,
              name: teamForm.name.trim(),
              short_code: teamForm.short_code?.trim() || null,
              legacy_team_id: teamForm.legacy_team_id?.trim() || null,
              primary_color: teamForm.primary_color,
              secondary_color: teamForm.secondary_color
            });
          }}
          className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">Name</label>
              <input
                type="text"
                value={teamForm.name}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">Short code</label>
              <input
                type="text"
                value={teamForm.short_code}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, short_code: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">Legacy ID</label>
              <input
                type="text"
                value={teamForm.legacy_team_id}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, legacy_team_id: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                placeholder="Matches timing team_id (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">Primary</label>
                <input
                  type="color"
                  value={teamForm.primary_color}
                  onChange={(event) =>
                    setTeamForm((prev) => ({ ...prev, primary_color: event.target.value }))
                  }
                  className="mt-1 h-10 w-full cursor-pointer rounded-2xl border border-white/10 bg-black/60"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Secondary
                </label>
                <input
                  type="color"
                  value={teamForm.secondary_color}
                  onChange={(event) =>
                    setTeamForm((prev) => ({ ...prev, secondary_color: event.target.value }))
                  }
                  className="mt-1 h-10 w-full cursor-pointer rounded-2xl border border-white/10 bg-black/60"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              disabled={teamMutation.isPending}
            >
              {teamMutation.isPending ? "Saving…" : editingTeamId ? "Save changes" : "Add team"}
            </button>
            {editingTeamId && (
              <button
                type="button"
                className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70"
                onClick={() => {
                  setEditingTeamId(null);
                  setTeamForm({
                    name: "",
                    short_code: "",
                    legacy_team_id: "",
                    primary_color: "#ffffff",
                    secondary_color: "#0f0f0f"
                  });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="space-y-3 text-sm text-white">
          {teams.length === 0 && (
            <p className="text-white/60">No teams added. Use the form above to seed the grid.</p>
          )}
          {teams.map((team) => (
            <article
              key={team.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
            >
              <div>
                <p className="font-semibold">{team.name}</p>
                <p className="text-xs text-white/60">
                  Code {team.short_code || "—"} • Legacy {team.legacy_team_id || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-6 w-6 rounded-full border border-white/10"
                  style={{ backgroundColor: team.primary_color || "#fff" }}
                />
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70"
                  onClick={() => {
                    setEditingTeamId(team.id);
                    setTeamForm({
                      name: team.name,
                      short_code: team.short_code ?? "",
                      legacy_team_id: team.legacy_team_id ?? "",
                      primary_color: team.primary_color ?? "#ffffff",
                      secondary_color: team.secondary_color ?? "#0f0f0f"
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-full border border-red-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-red-200"
                  onClick={() => {
                    if (!window.confirm(`Delete ${team.name}?`)) return;
                    deleteTeamMutation.mutate(team.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Drivers</p>
          <h2 className="text-xl font-semibold text-white">Roster</h2>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!driverForm.driver_name.trim()) {
              toast({ variant: "error", title: "Driver name required" });
              return;
            }
            driverMutation.mutate({
              id: editingDriverId ?? undefined,
              driver_name: driverForm.driver_name.trim(),
              car_number: driverForm.car_number ? Number(driverForm.car_number) : null,
              team_id: driverForm.team_id || null,
              status: driverForm.status
            });
          }}
          className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">Driver</label>
              <input
                type="text"
                value={driverForm.driver_name}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, driver_name: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Car number
              </label>
              <input
                type="number"
                value={driverForm.car_number}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, car_number: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">Team</label>
              <select
                value={driverForm.team_id}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, team_id: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              >
                <option value="">Unassigned</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">Status</label>
              <select
                value={driverForm.status}
                onChange={(event) =>
                  setDriverForm((prev) => ({
                    ...prev,
                    status: event.target.value as ChampionshipDriver["status"]
                  }))
                }
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              >
                <option value="primary">Primary</option>
                <option value="reserve">Reserve</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              disabled={driverMutation.isPending}
            >
              {driverMutation.isPending
                ? "Saving…"
                : editingDriverId
                  ? "Save driver"
                  : "Add driver"}
            </button>
            {editingDriverId && (
              <button
                type="button"
                className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70"
                onClick={() => {
                  setEditingDriverId(null);
                  setDriverForm({
                    driver_name: "",
                    car_number: "",
                    team_id: "",
                    status: "primary"
                  });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2 text-sm text-white">
          {drivers.length === 0 && (
            <p className="text-white/60">No drivers assigned yet.</p>
          )}
          {drivers.map((driver) => {
            const team = teams.find((t) => t.id === driver.team_id);
            return (
              <article
                key={driver.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    #{driver.car_number ?? "—"} {driver.driver_name}
                  </p>
                  <p className="text-xs text-white/60">
                    {team ? team.name : "Unassigned"} • {driver.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70"
                    onClick={() => {
                      setEditingDriverId(driver.id);
                      setDriverForm({
                        driver_name: driver.driver_name,
                        car_number: driver.car_number ? String(driver.car_number) : "",
                        team_id: driver.team_id ?? "",
                        status: driver.status
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-red-200"
                    onClick={() => {
                      if (!window.confirm(`Remove ${driver.driver_name}?`)) return;
                      deleteDriverMutation.mutate(driver.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

type LeaderboardOverrideFormState = {
  is_manual_override: boolean;
  manual_points: string;
  manual_position: string;
  dirty: boolean;
};

const ManualLeaderboardEditor = ({ seasonId }: { seasonId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeBoard, setActiveBoard] = useState<"drivers" | "teams">("drivers");
  const [driverOverrides, setDriverOverrides] = useState<Record<string, LeaderboardOverrideFormState>>({});
  const [teamOverrides, setTeamOverrides] = useState<Record<string, LeaderboardOverrideFormState>>({});
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);

  const driversQuery = useQuery({
    queryKey: ["admin-driver-standings", seasonId],
    queryFn: () => fetchDriverStandings(seasonId),
    enabled: Boolean(seasonId)
  });

  const teamsQuery = useQuery({
    queryKey: ["admin-team-standings", seasonId],
    queryFn: () => fetchTeamStandings(seasonId),
    enabled: Boolean(seasonId)
  });

  useEffect(() => {
    if (!driversQuery.data) return;
    setDriverOverrides((prev) => {
      const next: Record<string, LeaderboardOverrideFormState> = { ...prev };
      driversQuery.data?.forEach((row) => {
        const defaults = buildDriverOverrideDefaults(row);
        if (!next[row.driver_id] || !next[row.driver_id].dirty) {
          next[row.driver_id] = defaults;
        }
      });
      return next;
    });
  }, [driversQuery.data]);

  useEffect(() => {
    if (!teamsQuery.data) return;
    setTeamOverrides((prev) => {
      const next: Record<string, LeaderboardOverrideFormState> = { ...prev };
      teamsQuery.data?.forEach((row) => {
        const defaults = buildTeamOverrideDefaults(row);
        if (!next[row.team_id] || !next[row.team_id].dirty) {
          next[row.team_id] = defaults;
        }
      });
      return next;
    });
  }, [teamsQuery.data]);

  const driverOverrideMutation = useMutation({
    mutationFn: async ({
      driverId,
      override
    }: {
      driverId: string;
      override: LeaderboardOverrideFormState;
    }) => {
      if (!override.is_manual_override) {
        await deleteDriverLeaderboardOverride(seasonId, driverId);
        return;
      }
      const manualPoints = parsePointsInput(override.manual_points, "Manual points");
      if (manualPoints === null) {
        throw new Error("Manual points are required when override is enabled.");
      }
      const manualPosition = parsePositionInput(override.manual_position, "Manual position");
      await upsertDriverLeaderboardOverride({
        season_id: seasonId,
        driver_id: driverId,
        manual_points: manualPoints,
        manual_position: manualPosition,
        is_manual_override: true
      });
    },
    onMutate: ({ driverId }) => setPendingDriverId(driverId),
    onSuccess: (_, variables) => {
      toast({ variant: "success", title: "Driver leaderboard updated" });
      setDriverOverrides((prev) => {
        const current = prev[variables.driverId];
        if (!current) return prev;
        return {
          ...prev,
          [variables.driverId]: { ...current, dirty: false }
        };
      });
      queryClient.invalidateQueries({ queryKey: ["admin-driver-standings", seasonId] });
      queryClient.invalidateQueries({ queryKey: standingsKeys.drivers(seasonId) });
    },
    onError: (error: Error) =>
      toast({
        variant: "error",
        title: "Unable to update driver override",
        description: error.message
      }),
    onSettled: () => setPendingDriverId(null)
  });

  const teamOverrideMutation = useMutation({
    mutationFn: async ({
      teamId,
      override
    }: {
      teamId: string;
      override: LeaderboardOverrideFormState;
    }) => {
      if (!override.is_manual_override) {
        await deleteTeamLeaderboardOverride(seasonId, teamId);
        return;
      }
      const manualPoints = parsePointsInput(override.manual_points, "Manual points");
      if (manualPoints === null) {
        throw new Error("Manual points are required when override is enabled.");
      }
      const manualPosition = parsePositionInput(override.manual_position, "Manual position");
      await upsertTeamLeaderboardOverride({
        season_id: seasonId,
        team_id: teamId,
        manual_points: manualPoints,
        manual_position: manualPosition,
        is_manual_override: true
      });
    },
    onMutate: ({ teamId }) => setPendingTeamId(teamId),
    onSuccess: (_, variables) => {
      toast({ variant: "success", title: "Team leaderboard updated" });
      setTeamOverrides((prev) => {
        const current = prev[variables.teamId];
        if (!current) return prev;
        return {
          ...prev,
          [variables.teamId]: { ...current, dirty: false }
        };
      });
      queryClient.invalidateQueries({ queryKey: ["admin-team-standings", seasonId] });
      queryClient.invalidateQueries({ queryKey: standingsKeys.teams(seasonId) });
    },
    onError: (error: Error) =>
      toast({
        variant: "error",
        title: "Unable to update team override",
        description: error.message
      }),
    onSettled: () => setPendingTeamId(null)
  });

  const handleDriverChange = (
    row: DriverStanding,
    updates: Partial<Omit<LeaderboardOverrideFormState, "dirty">>
  ) => {
    setDriverOverrides((prev) => {
      const base = prev[row.driver_id] ?? buildDriverOverrideDefaults(row);
      return {
        ...prev,
        [row.driver_id]: { ...base, ...updates, dirty: true }
      };
    });
  };

  const resetDriverOverride = (row: DriverStanding) => {
    setDriverOverrides((prev) => ({
      ...prev,
      [row.driver_id]: buildDriverOverrideDefaults(row)
    }));
  };

  const handleTeamChange = (
    row: TeamStanding,
    updates: Partial<Omit<LeaderboardOverrideFormState, "dirty">>
  ) => {
    setTeamOverrides((prev) => {
      const base = prev[row.team_id] ?? buildTeamOverrideDefaults(row);
      return {
        ...prev,
        [row.team_id]: { ...base, ...updates, dirty: true }
      };
    });
  };

  const resetTeamOverride = (row: TeamStanding) => {
    setTeamOverrides((prev) => ({
      ...prev,
      [row.team_id]: buildTeamOverrideDefaults(row)
    }));
  };

  const renderDriverEditor = () => {
    if (driversQuery.isLoading) {
      return <p className="text-sm text-white/60">Loading driver standings…</p>;
    }
    if (!driversQuery.data?.length) {
      return (
        <p className="text-sm text-white/60">
          No classified drivers yet. Once results are saved you can override the leaderboard here.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {driversQuery.data.map((row) => {
          const override = driverOverrides[row.driver_id] ?? buildDriverOverrideDefaults(row);
          const isSaving = pendingDriverId === row.driver_id && driverOverrideMutation.isPending;

          return (
            <article
              key={row.driver_id}
              className={`rounded-2xl border border-white/10 bg-black/40 p-4 ${
                override.is_manual_override ? "ring-1 ring-amber-400/60" : ""
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Driver</p>
                  <p className="text-lg font-semibold text-white">{row.driver_name}</p>
                  <p className="text-xs text-white/60">{row.team_name ?? "Privateer"}</p>
                </div>
                <div className="text-xs text-white/70">
                  <p>Computed · P{row.computed_position} · {row.computed_points.toFixed(1)}</p>
                  <p className="text-white">
                    Displayed · P{row.position} · {row.points.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <label className="flex flex-col text-xs text-white/70">
                  Manual points
                  <input
                    type="number"
                    step="0.1"
                    className="mt-1 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white disabled:opacity-50"
                    value={override.manual_points}
                    onChange={(event) =>
                      handleDriverChange(row, { manual_points: event.target.value })
                    }
                    disabled={!override.is_manual_override}
                  />
                </label>
                <label className="flex flex-col text-xs text-white/70">
                  Manual position
                  <input
                    type="number"
                    className="mt-1 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white disabled:opacity-50"
                    value={override.manual_position}
                    onChange={(event) =>
                      handleDriverChange(row, { manual_position: event.target.value })
                    }
                    disabled={!override.is_manual_override}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={override.is_manual_override}
                    onChange={(event) =>
                      handleDriverChange(row, { is_manual_override: event.target.checked })
                    }
                  />
                  Manual override
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                    onClick={() => resetDriverOverride(row)}
                    disabled={isSaving}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-50"
                  onClick={() => driverOverrideMutation.mutate({ driverId: row.driver_id, override })}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : override.is_manual_override ? "Save override" : "Remove override"}
                </button>
                <p className="text-xs text-white/60">
                  Stored values replace automatic totals for this driver when override is enabled.
                </p>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderTeamEditor = () => {
    if (teamsQuery.isLoading) {
      return <p className="text-sm text-white/60">Loading team standings…</p>;
    }
    if (!teamsQuery.data?.length) {
      return (
        <p className="text-sm text-white/60">
          No team standings available yet. Add race results to populate the leaderboard.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {teamsQuery.data.map((row) => {
          const override = teamOverrides[row.team_id] ?? buildTeamOverrideDefaults(row);
          const isSaving = pendingTeamId === row.team_id && teamOverrideMutation.isPending;

          return (
            <article
              key={row.team_id}
              className={`rounded-2xl border border-white/10 bg-black/40 p-4 ${
                override.is_manual_override ? "ring-1 ring-amber-400/60" : ""
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Team</p>
                  <p className="text-lg font-semibold text-white">{row.team_name}</p>
                </div>
                <div className="text-xs text-white/70">
                  <p>Computed · P{row.computed_position} · {row.computed_points.toFixed(1)}</p>
                  <p className="text-white">
                    Displayed · P{row.position} · {row.points.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <label className="flex flex-col text-xs text-white/70">
                  Manual points
                  <input
                    type="number"
                    step="0.1"
                    className="mt-1 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white disabled:opacity-50"
                    value={override.manual_points}
                    onChange={(event) =>
                      handleTeamChange(row, { manual_points: event.target.value })
                    }
                    disabled={!override.is_manual_override}
                  />
                </label>
                <label className="flex flex-col text-xs text-white/70">
                  Manual position
                  <input
                    type="number"
                    className="mt-1 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white disabled:opacity-50"
                    value={override.manual_position}
                    onChange={(event) =>
                      handleTeamChange(row, { manual_position: event.target.value })
                    }
                    disabled={!override.is_manual_override}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={override.is_manual_override}
                    onChange={(event) =>
                      handleTeamChange(row, { is_manual_override: event.target.checked })
                    }
                  />
                  Manual override
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                    onClick={() => resetTeamOverride(row)}
                    disabled={isSaving}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-50"
                  onClick={() => teamOverrideMutation.mutate({ teamId: row.team_id, override })}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : override.is_manual_override ? "Save override" : "Remove override"}
                </button>
                <p className="text-xs text-white/60">
                  Overrides let you manually set constructor standings when calculations are unavailable.
                </p>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white">
      <header>
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Manual Leaderboard</p>
        <h2 className="text-xl font-semibold text-white">Override points & positions</h2>
        <p className="text-sm text-white/60">
          Use overrides when automated aggregation isn&apos;t ready. Switch to the Drivers or Teams tab
          to manage each leaderboard. Reset returns to computed values.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["drivers", "teams"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveBoard(key)}
            className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
              activeBoard === key ? "bg-white text-black" : "border border-white/20 text-white/70"
            }`}
          >
            {key === "drivers" ? "Drivers" : "Teams"}
          </button>
        ))}
      </div>

      {activeBoard === "drivers" ? renderDriverEditor() : renderTeamEditor()}
    </section>
  );
};

const buildDriverOverrideDefaults = (row: DriverStanding): LeaderboardOverrideFormState => ({
  is_manual_override: row.is_manual_override ?? false,
  manual_points: formatNumberInputValue(row.manual_points, row.computed_points),
  manual_position: formatNumberInputValue(row.manual_position, row.computed_position),
  dirty: false
});

const buildTeamOverrideDefaults = (row: TeamStanding): LeaderboardOverrideFormState => ({
  is_manual_override: row.is_manual_override ?? false,
  manual_points: formatNumberInputValue(row.manual_points, row.computed_points),
  manual_position: formatNumberInputValue(row.manual_position, row.computed_position),
  dirty: false
});

const formatNumberInputValue = (primary: number | null | undefined, fallback: number) => {
  const value = primary ?? fallback;
  return Number.isFinite(value) ? `${value}` : `${fallback}`;
};

const parsePointsInput = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return parsed;
};

const parsePositionInput = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return parsed;
};

const DISPLAY_LABEL_OPTIONS: { value: DisplayLabelMode; label: string; description: string }[] = [
  {
    value: "position",
    label: "Show position",
    description: "Use the driver's finish position (default) when displaying labels."
  },
  {
    value: "gap_to_leader",
    label: "Show gap to leader",
    description: "Show the driver's gap to the leader instead of the finished position."
  }
];

const RaceResultsManager = ({
  seasonId,
  races,
  isRacesLoading,
  raceId,
  onRaceIdChange,
  results,
  isResultsLoading,
  drivers
}: {
  seasonId: string;
  races: ChampionshipRace[];
  isRacesLoading: boolean;
  raceId: string | null;
  onRaceIdChange: (value: string | null) => void;
  results: ChampionshipResult[];
  isResultsLoading: boolean;
  drivers: ChampionshipDriver[];
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [raceForm, setRaceForm] = useState({
    race_name: "",
    circuit_name: "",
    race_date: "",
    round_number: ""
  });
  const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
  const [resultsDraft, setResultsDraft] = useState<ChampionshipResult[]>([]);

  useEffect(() => {
    setResultsDraft(results);
  }, [results]);

  const raceMutation = useMutation({
    mutationFn: (payload: Partial<ChampionshipRace>) =>
      upsertChampionshipRace({
        id: editingRaceId ?? undefined,
        season_id: seasonId,
        round_number: payload.round_number ?? null,
        race_name: payload.race_name ?? "",
        circuit_name: payload.circuit_name ?? null,
        race_date: payload.race_date ?? null
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["championship-races", seasonId] });
      toast({ variant: "success", title: "Race saved" });
      setEditingRaceId(null);
      setRaceForm({ race_name: "", circuit_name: "", race_date: "", round_number: "" });
      onRaceIdChange(data.id);
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to save race", description: error.message })
  });

  const resultsMutation = useMutation({
    mutationFn: () =>
      upsertChampionshipResults(
        resultsDraft.map((row) => ({
          ...row,
          race_id: raceId!,
          finish_position: row.finish_position ?? null,
          position_display:
            row.position_display ??
            (row.finish_position ? String(row.finish_position) : row.status ?? null),
          points_awarded: row.points_awarded ?? 0,
          grid_position: row.grid_position ?? null,
          fastest_lap: Boolean(row.fastest_lap),
          display_label_mode: row.display_label_mode ?? "position"
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-results", raceId] });
      toast({ variant: "success", title: "Results saved" });
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to save results", description: error.message })
  });

  const deleteResultMutation = useMutation({
    mutationFn: deleteChampionshipResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-results", raceId] });
      toast({ variant: "success", title: "Result entry deleted" });
    },
    onError: (error: Error) =>
      toast({ variant: "error", title: "Unable to delete result", description: error.message })
  });

  if (isRacesLoading) {
    return <p className="text-sm text-white/60">Loading races…</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Race metadata</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!raceForm.race_name.trim() || !raceForm.round_number) {
              toast({ variant: "error", title: "Round and race name are required" });
              return;
            }
            raceMutation.mutate({
              id: editingRaceId ?? undefined,
              race_name: raceForm.race_name.trim(),
              circuit_name: raceForm.circuit_name?.trim() || null,
              race_date: raceForm.race_date || null,
              round_number: Number(raceForm.round_number)
            });
          }}
          className="mt-4 grid gap-4 md:grid-cols-4"
        >
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Round number
            </label>
            <input
              type="number"
              value={raceForm.round_number}
              onChange={(event) =>
                setRaceForm((prev) => ({ ...prev, round_number: event.target.value }))
              }
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">Race</label>
            <input
              type="text"
              value={raceForm.race_name}
              onChange={(event) =>
                setRaceForm((prev) => ({ ...prev, race_name: event.target.value }))
              }
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              placeholder="Paleto Bay GP"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">Circuit</label>
            <input
              type="text"
              value={raceForm.circuit_name}
              onChange={(event) =>
                setRaceForm((prev) => ({ ...prev, circuit_name: event.target.value }))
              }
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
              placeholder="Paleto Loop"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">Date</label>
            <input
              type="date"
              value={raceForm.race_date}
              onChange={(event) =>
                setRaceForm((prev) => ({ ...prev, race_date: event.target.value }))
              }
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
            />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button
              type="submit"
              className="rounded-2xl bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              disabled={raceMutation.isPending}
            >
              {raceMutation.isPending
                ? "Saving…"
                : editingRaceId
                  ? "Save race"
                  : "Create round"}
            </button>
            {editingRaceId && (
              <button
                type="button"
                className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70"
                onClick={() => {
                  setEditingRaceId(null);
                  setRaceForm({ race_name: "", circuit_name: "", race_date: "", round_number: "" });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">Select race</label>
          <select
            value={raceId ?? ""}
            onChange={(event) => onRaceIdChange(event.target.value || null)}
            className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
          >
            <option value="">Choose race</option>
            {races.map((race) => (
              <option key={race.id} value={race.id}>
                Round {race.round_number}: {race.race_name}
              </option>
            ))}
          </select>
          {raceId && (
            <button
              type="button"
              className="text-xs uppercase tracking-[0.3em] text-white/60 underline"
              onClick={() => {
                const selected = races.find((race) => race.id === raceId);
                if (!selected) return;
                setEditingRaceId(selected.id);
                setRaceForm({
                  race_name: selected.race_name,
                  circuit_name: selected.circuit_name ?? "",
                  race_date: selected.race_date ?? "",
                  round_number: String(selected.round_number)
                });
              }}
            >
              Edit selected race
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Results</p>
            <h2 className="text-xl font-semibold text-white">Classified order</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70"
            onClick={() => {
              if (!raceId) {
                toast({ variant: "error", title: "Select a race before adding entries" });
                return;
              }
              setResultsDraft((prev) => [
                ...prev,
                {
                  race_id: raceId,
                  driver_id: "",
                  team_id: null,
                  finish_position: prev.length + 1,
                  position_display: String(prev.length + 1),
                  grid_position: null,
                  status: "Finished",
                  gap_to_leader: null,
                  points_awarded: 0,
                  fastest_lap: false,
                  display_label_mode: "position"
                }
              ]);
            }}
          >
            + Add classified driver
          </button>
        </header>

        {isResultsLoading && <p className="text-sm text-white/60">Loading results…</p>}

        {!isResultsLoading && resultsDraft.length === 0 && (
          <p className="text-sm text-white/60">
            No entries yet. Add drivers as they are classified to populate standings.
          </p>
        )}

        <div className="space-y-3">
          {resultsDraft.map((row, index) => {
            const driver = drivers.find((d) => d.id === row.driver_id);
            return (
              <div
                key={row.id ?? `${row.driver_id}-${index}`}
                className="grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 md:grid-cols-6"
              >
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                    Driver
                  </label>
                  <select
                    value={row.driver_id}
                    onChange={(event) => {
                      const newDriver = drivers.find((d) => d.id === event.target.value);
                      setResultsDraft((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                driver_id: event.target.value,
                                team_id: newDriver?.team_id ?? null
                              }
                            : item
                        )
                      );
                    }}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                  >
                    <option value="">Select driver</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        #{d.car_number ?? "—"} {d.driver_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                    Finish
                  </label>
                  <input
                    type="number"
                    value={row.finish_position ?? ""}
                    onChange={(event) =>
                      setResultsDraft((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                finish_position: event.target.value
                                  ? Number(event.target.value)
                                  : null,
                                position_display: event.target.value || item.position_display
                              }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">Grid</label>
                  <input
                    type="number"
                    value={row.grid_position ?? ""}
                    onChange={(event) =>
                      setResultsDraft((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, grid_position: event.target.value ? Number(event.target.value) : null }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">Points</label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.points_awarded ?? 0}
                    onChange={(event) =>
                      setResultsDraft((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, points_awarded: event.target.value ? Number(event.target.value) : 0 }
                            : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">Status</label>
                  <input
                    type="text"
                    value={row.status ?? ""}
                    onChange={(event) =>
                      setResultsDraft((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, status: event.target.value } : item
                        )
                      )
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                    placeholder="Finished / DNF ..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">Flags</label>
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={row.fastest_lap}
                      onChange={(event) =>
                        setResultsDraft((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, fastest_lap: event.target.checked } : item
                          )
                        )
                      }
                    />
                    Fastest lap
                  </label>
                  <button
                    type="button"
                    className="mt-auto rounded-full border border-red-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-red-200"
                    onClick={() => {
                      const target = row.id;
                      if (target) {
                        deleteResultMutation.mutate(target);
                      }
                      setResultsDraft((prev) => prev.filter((_, i) => i !== index));
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className="md:col-span-6 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Display label
                    </label>
                    <input
                      type="text"
                      value={row.position_display ?? ""}
                      onChange={(event) =>
                        setResultsDraft((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, position_display: event.target.value } : item
                          )
                        )
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                      placeholder="1 / DNF / DSQ"
                    />
                    <div className="mt-3 space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-white/50">
                        Display mode
                      </label>
                      <select
                        value={row.display_label_mode ?? "position"}
                        onChange={(event) =>
                          setResultsDraft((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    display_label_mode: event.target.value as DisplayLabelMode
                                  }
                                : item
                            )
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white"
                      >
                        {DISPLAY_LABEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} title={option.description}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-white/50">
                        The dropdown controls the UI mode for the label; it only stores{' '}
                        <code>display_label_mode</code> and does not require a linked championship
                        result to exist yet.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Gap to leader
                    </label>
                    <input
                      type="text"
                      value={row.gap_to_leader ?? ""}
                      onChange={(event) =>
                        setResultsDraft((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, gap_to_leader: event.target.value } : item
                          )
                        )
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-white"
                      placeholder="+4.320s / +1 Lap"
                    />
                  </div>
                  <div className="text-xs text-white/50">
                    <p>Team</p>
                    <p className="text-sm text-white">
                      {driver?.team_id
                        ? `Matches ${drivers.find((d) => d.id === row.driver_id)?.driver_name ?? ""}`
                        : "Set via driver"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {raceId && resultsDraft.length > 0 && (
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-2xl bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
              disabled={resultsMutation.isPending}
              onClick={() => {
                resultsMutation.mutate();
              }}
            >
              {resultsMutation.isPending ? "Saving…" : "Save results"}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70"
              onClick={() => setResultsDraft(results)}
            >
              Revert unsaved edits
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminChampionshipPage;
