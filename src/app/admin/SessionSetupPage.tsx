import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@lib/supabaseClient";
import {
  fetchChampionshipSeasons,
  fetchChampionshipTeams,
  type ChampionshipTeam
} from "@domains/championship/api/championshipApi";

interface DriverConfig {
  number: number;
  name: string;
  team_id?: string;
  team_name?: string;
  primary_color?: string;
  secondary_color?: string;
  status?: string;
  driver_entry_id?: string;
  season_id?: string;
}

interface Team {
  id: string;
  team_id: string;
  name: string;
  abbrev: string;
  primary_hex: string;
  secondary_hex: string;
  primary_driver: string | null;
}

type TeamOption = {
  key: string;
  name: string;
  abbrev?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

interface SessionFormState {
  name: string;
  mode: "practice" | "qualifying" | "race";
  track_name: string;
  laps_target: string;
  starts_at: string;
  drivers: DriverConfig[];
}

const SessionSetupPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<SessionFormState>({
    name: "",
    mode: "race",
    track_name: "",
    laps_target: "",
    starts_at: "",
    drivers: []
  });
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch legacy teams (fallback)
  const legacyTeamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("team_id");

      if (error) throw error;
      return data as Team[];
    }
  });

  const seasonsQuery = useQuery({
    queryKey: ["championship-seasons"],
    queryFn: fetchChampionshipSeasons
  });

  const activeSeason = useMemo(() => {
    const seasons = seasonsQuery.data ?? [];
    if (!seasons.length) return null;
    return seasons.find((season) => season.status === "active") ?? seasons[0];
  }, [seasonsQuery.data]);

  const championshipTeamsQuery = useQuery({
    queryKey: ["championship-teams", activeSeason?.id],
    queryFn: () => fetchChampionshipTeams(activeSeason!.id),
    enabled: Boolean(activeSeason?.id)
  });

  const officialTeamOptions = useMemo<TeamOption[]>(() => {
    if (!championshipTeamsQuery.data) return [];
    return championshipTeamsQuery.data.map((team: ChampionshipTeam) => ({
      key: team.legacy_team_id ?? team.id,
      name: team.name,
      abbrev: team.short_code,
      primary_color: team.primary_color,
      secondary_color: team.secondary_color
    }));
  }, [championshipTeamsQuery.data]);

  const fallbackTeamOptions = useMemo<TeamOption[]>(() => {
    if (!legacyTeamsQuery.data) return [];
    return legacyTeamsQuery.data.map((team) => ({
      key: team.team_id,
      name: team.name,
      abbrev: team.abbrev,
      primary_color: team.primary_hex,
      secondary_color: team.secondary_hex
    }));
  }, [legacyTeamsQuery.data]);

  const teamOptions = useMemo<TeamOption[]>(() => {
    const preferred = officialTeamOptions.length ? officialTeamOptions : fallbackTeamOptions;
    return preferred.filter((team) => Boolean(team.key));
  }, [officialTeamOptions, fallbackTeamOptions]);

  // Fetch DBGP lineup template
  const dbgpLineupQuery = useQuery<Partial<DriverConfig>[]>({
    queryKey: ["dbgp-lineup"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dbgp_lineup");

      if (error) throw error;
      return (data ?? []) as Partial<DriverConfig>[];
    },
    enabled: false
  });

  const serializeDrivers = (drivers: DriverConfig[]) =>
    drivers.map((driver) => ({
      number: driver.number,
      name: driver.name,
      team_id: driver.team_id ?? null,
      team_name: driver.team_name ?? null,
      primary_color: driver.primary_color ?? null,
      secondary_color: driver.secondary_color ?? null
    }));

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (params: SessionFormState) => {
      const payloadDrivers = serializeDrivers(params.drivers);
      const { data, error } = await supabase.rpc("timing_create_session_with_drivers", {
        p_name: params.name,
        p_mode: params.mode,
        p_track_name: params.track_name,
        p_laps_target: params.laps_target ? parseInt(params.laps_target) : null,
        p_starts_at: params.starts_at ? new Date(params.starts_at).toISOString() : null,
        p_drivers: payloadDrivers
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (session) => {
      setStatusMessage({
        text: `Session "${session.name}" created successfully!`,
        type: "success"
      });
      queryClient.invalidateQueries({ queryKey: ["timing-sessions"] });

      // Navigate to race control after brief delay
      setTimeout(() => {
        navigate(`/control/${session.id}`);
      }, 1500);
    },
    onError: (error: Error) => {
      setStatusMessage({
        text: `Error: ${error.message}`,
        type: "error"
      });
    }
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formState.drivers.length === 0) {
      setStatusMessage({
        text: "Please add at least one driver to the session",
        type: "error"
      });
      return;
    }

    setStatusMessage(null);
    createSessionMutation.mutate(formState);
  };

  const handleLoadDBGPLineup = async () => {
    const result = await dbgpLineupQuery.refetch();
    if (result.error) {
      setStatusMessage({
        text: result.error.message || "Unable to load the championship lineup.",
        type: "error"
      });
      return;
    }

    const lineup = result.data ?? [];
    if (!lineup.length) {
      setStatusMessage({
        text: "No active championship lineup found. Add drivers in Championship Management first.",
        type: "error"
      });
      return;
    }

    setFormState((prev) => ({
      ...prev,
      drivers: lineup.map((driver, index) => ({
        number: driver.number ?? index + 1,
        name: driver.name ?? `Driver ${index + 1}`,
        team_id: driver.team_id ?? undefined,
        team_name: driver.team_name ?? undefined,
        primary_color: driver.primary_color ?? "#FFFFFF",
        secondary_color: driver.secondary_color ?? "#0F0F0F",
        status: driver.status ?? undefined
      }))
    }));
    setStatusMessage({
      text: `Loaded ${lineup.length} drivers from ${activeSeason?.name ?? "the championship"} lineup.`,
      type: "success"
    });
  };

  const handleAddDriver = () => {
    setFormState(prev => ({
      ...prev,
      drivers: [
        ...prev.drivers,
        {
          number: prev.drivers.length + 1,
          name: "",
          team_name: ""
        }
      ]
    }));
  };

  const handleRemoveDriver = (index: number) => {
    setFormState(prev => ({
      ...prev,
      drivers: prev.drivers.filter((_, i) => i !== index)
    }));
  };

  const handleDriverChange = (index: number, field: keyof DriverConfig, value: string | number) => {
    setFormState(prev => ({
      ...prev,
      drivers: prev.drivers.map((driver, i) =>
        i === index ? { ...driver, [field]: value } : driver
      )
    }));
  };

  const handleDriverTeamSelect = (index: number, teamKey: string) => {
    const team = teamOptions.find((option) => option.key === teamKey);
    setFormState((prev) => ({
      ...prev,
      drivers: prev.drivers.map((driver, i) =>
        i === index
          ? {
              ...driver,
              team_id: team?.key ?? undefined,
              team_name: team?.name ?? undefined,
              primary_color: team?.primary_color ?? driver.primary_color,
              secondary_color: team?.secondary_color ?? driver.secondary_color
            }
          : driver
      )
    }));
  };

  const handleClearDrivers = () => {
    setFormState(prev => ({ ...prev, drivers: [] }));
  };

  // Generate default session name based on mode
  const generateSessionName = () => {
    const modeLabel = formState.mode.charAt(0).toUpperCase() + formState.mode.slice(1);
    const track = formState.track_name || "Track";
    const date = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    setFormState(prev => ({
      ...prev,
      name: `${track} ${modeLabel} - ${date}`
    }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">
          Race Control
        </p>
        <h1 className="text-3xl font-semibold">Session Setup</h1>
        <p className="text-sm text-white/60">
          Configure a new timing session with drivers, teams, and event details
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session Details */}
        <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
          <h2 className="text-xl font-semibold">Session Details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Session Name
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  placeholder="e.g. Spa Qualifying - Nov 17"
                />
                <button
                  type="button"
                  className="rounded-2xl border border-white/20 px-4 text-xs font-semibold uppercase tracking-widest text-white/70 hover:border-white/50"
                  onClick={generateSessionName}
                >
                  Auto
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Session Type
              </label>
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                value={formState.mode}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    mode: e.target.value as "practice" | "qualifying" | "race"
                  }))
                }
                required
              >
                <option value="practice">Practice</option>
                <option value="qualifying">Qualifying</option>
                <option value="race">Race</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Track Name
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                value={formState.track_name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, track_name: e.target.value }))
                }
                required
                placeholder="e.g. Circuit de Spa-Francorchamps"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Target Laps
              </label>
              <input
                type="number"
                min="1"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                value={formState.laps_target}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, laps_target: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Start Time (Optional)
              </label>
              <input
                type="datetime-local"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3"
                value={formState.starts_at}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, starts_at: e.target.value }))
                }
              />
            </div>
          </div>
        </section>

        {/* Driver Lineup */}
        <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Driver Lineup</h2>
              <p className="text-sm text-white/60">
                {formState.drivers.length} driver{formState.drivers.length !== 1 ? "s" : ""}{" "}
                configured
                {activeSeason ? ` · ${activeSeason.name}` : ""}
              </p>
              {activeSeason && !officialTeamOptions.length && (
                <p className="text-xs text-amber-200">
                  Add championship teams to prefill colors automatically. Legacy team list is used
                  until then.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-2xl bg-brand/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand/30 disabled:opacity-50"
                onClick={() => void handleLoadDBGPLineup()}
                disabled={dbgpLineupQuery.isFetching}
              >
                {dbgpLineupQuery.isFetching ? "Loading…" : "Load Championship Lineup"}
              </button>
              <button
                type="button"
                className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:border-white/50"
                onClick={handleAddDriver}
              >
                + Add Driver
              </button>
              {formState.drivers.length > 0 && (
                <button
                  type="button"
                  className="rounded-2xl border border-red-400/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-300 hover:border-red-400/50"
                  onClick={handleClearDrivers}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {formState.drivers.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              <p>No drivers configured yet.</p>
              <p className="mt-1 text-sm">
                Click "Load DBGP Lineup" to use the default championship lineup or "Add
                Driver" to add manually.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {formState.drivers.map((driver, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-12"
                >
                  <div className="md:col-span-1">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                      #
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      value={driver.number}
                      onChange={(e) =>
                        handleDriverChange(index, "number", parseInt(e.target.value) || 1)
                      }
                      required
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                      <span>Driver Name</span>
                      {driver.status && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            driver.status === "reserve"
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {driver.status}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      value={driver.name}
                      onChange={(e) => handleDriverChange(index, "name", e.target.value)}
                      required
                      placeholder="e.g. Max Verstappen"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Team
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm"
                      value={driver.team_id ?? ""}
                      onChange={(e) => handleDriverTeamSelect(index, e.target.value)}
                    >
                      <option value="">Select team</option>
                      {!teamOptions.length && (
                        <option value="" disabled>
                          No teams configured
                        </option>
                      )}
                      {teamOptions.map((team) => (
                        <option key={team.key} value={team.key}>
                          {team.name}
                          {team.abbrev ? ` (${team.abbrev})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Primary Color
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-12 rounded-xl border border-white/10 bg-black/60"
                        value={driver.primary_color || "#FFFFFF"}
                        onChange={(e) =>
                          handleDriverChange(index, "primary_color", e.target.value)
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 rounded-xl border border-white/10 bg-black/60 px-2 py-2 text-xs"
                        value={driver.primary_color || ""}
                        onChange={(e) =>
                          handleDriverChange(index, "primary_color", e.target.value)
                        }
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Secondary
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-12 rounded-xl border border-white/10 bg-black/60"
                        value={driver.secondary_color || "#000000"}
                        onChange={(e) =>
                          handleDriverChange(index, "secondary_color", e.target.value)
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 rounded-xl border border-white/10 bg-black/60 px-2 py-2 text-xs"
                        value={driver.secondary_color || ""}
                        onChange={(e) =>
                          handleDriverChange(index, "secondary_color", e.target.value)
                        }
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div className="flex items-end md:col-span-1">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-red-400/30 px-2 py-2 text-xs font-semibold text-red-300 hover:border-red-400/50"
                      onClick={() => handleRemoveDriver(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`rounded-2xl border p-4 text-center ${
              statusMessage.type === "success"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/30 bg-red-400/10 text-red-300"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white/70 hover:border-white/50"
            onClick={() => navigate("/admin")}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSessionMutation.isPending || formState.drivers.length === 0}
            className="rounded-2xl bg-brand px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40"
          >
            {createSessionMutation.isPending ? "Creating Session…" : "Create Session"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionSetupPage;
