import { supabase } from "@lib/supabaseClient";

export interface ChampionshipSeason {
  id: string;
  name: string;
  year: number | null;
  status: string;
  current_round: number | null;
}

export const fetchChampionshipSeasons = async (): Promise<ChampionshipSeason[]> => {
  const { data, error } = await supabase
    .from("championship_seasons")
    .select("id, name, year, status, current_round")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const createChampionshipSeason = async (payload: {
  name: string;
  year?: number | null;
}) => {
  const { data, error } = await supabase
    .from("championship_seasons")
    .insert({
      name: payload.name.trim(),
      year: payload.year ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateChampionshipSeason = async (
  id: string,
  updates: Partial<Pick<ChampionshipSeason, "name" | "year" | "status" | "current_round">>
) => {
  const { data, error } = await supabase
    .from("championship_seasons")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const setActiveChampionshipSeason = async (id: string) => {
  const { error: demoteError } = await supabase
    .from("championship_seasons")
    .update({ status: "archived" })
    .neq("id", id)
    .eq("status", "active");

  if (demoteError) throw demoteError;

  return updateChampionshipSeason(id, { status: "active" });
};

export interface ChampionshipTeam {
  id: string;
  season_id: string;
  legacy_team_id: string | null;
  name: string;
  short_code: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export const fetchChampionshipTeams = async (seasonId: string) => {
  const { data, error } = await supabase
    .from("championship_teams")
    .select("*")
    .eq("season_id", seasonId)
    .order("name");

  if (error) throw error;
  return (data ?? []) as ChampionshipTeam[];
};

export const upsertChampionshipTeam = async (
  team: Partial<ChampionshipTeam> & { season_id: string }
) => {
  const { data, error } = await supabase
    .from("championship_teams")
    .upsert(team, { onConflict: "season_id,legacy_team_id" })
    .select()
    .single();

  if (error) throw error;
  return data as ChampionshipTeam;
};

export const deleteChampionshipTeam = async (id: string) => {
  const { error } = await supabase.from("championship_teams").delete().eq("id", id);
  if (error) throw error;
};

export interface ChampionshipDriver {
  id: string;
  season_id: string;
  team_id: string | null;
  driver_name: string;
  car_number: number | null;
  status: "primary" | "reserve" | "inactive";
}

export const fetchChampionshipDrivers = async (seasonId: string) => {
  const { data, error } = await supabase
    .from("championship_drivers")
    .select("*")
    .eq("season_id", seasonId)
    .order("car_number", { ascending: true })
    .order("driver_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChampionshipDriver[];
};

export const upsertChampionshipDriver = async (
  driver: Partial<ChampionshipDriver> & { season_id: string }
) => {
  const { data, error } = await supabase
    .from("championship_drivers")
    .upsert(driver)
    .select()
    .single();

  if (error) throw error;
  return data as ChampionshipDriver;
};

export const deleteChampionshipDriver = async (id: string) => {
  const { error } = await supabase.from("championship_drivers").delete().eq("id", id);
  if (error) throw error;
};

export interface ChampionshipRace {
  id: string;
  season_id: string;
  round_number: number;
  race_name: string;
  circuit_name: string | null;
  race_date: string | null;
}

export const fetchChampionshipRaces = async (seasonId: string) => {
  const { data, error } = await supabase
    .from("championship_races")
    .select("*")
    .eq("season_id", seasonId)
    .order("round_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChampionshipRace[];
};

export const upsertChampionshipRace = async (
  race: Partial<ChampionshipRace> & { season_id: string }
) => {
  const { data, error } = await supabase
    .from("championship_races")
    .upsert(race, { onConflict: "season_id,round_number" })
    .select()
    .single();

  if (error) throw error;
  return data as ChampionshipRace;
};

export type DisplayLabelMode = "position" | "gap_to_leader";

export interface ChampionshipResult {
  id?: string;
  race_id: string;
  driver_id: string;
  team_id: string | null;
  finish_position: number | null;
  position_display: string | null;
  grid_position: number | null;
  gap_to_leader: string | null;
  status: string | null;
  points_awarded: number;
  fastest_lap: boolean;
  // Controls whether the UI shows the finish position or the gap to leader.
  display_label_mode?: DisplayLabelMode | null;
}

export const fetchChampionshipResults = async (raceId: string) => {
  const { data, error } = await supabase
    .from("championship_results")
    .select("*")
    .eq("race_id", raceId)
    .order("finish_position", { ascending: true })
    .order("updated_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChampionshipResult[];
};

export const upsertChampionshipResults = async (results: ChampionshipResult[]) => {
  const payload = results.map((row) => ({
    id: row.id ?? undefined,
    race_id: row.race_id,
    driver_id: row.driver_id,
    team_id: row.team_id,
    finish_position: row.finish_position,
    position_display: row.position_display,
    grid_position: row.grid_position,
    gap_to_leader: row.gap_to_leader,
    status: row.status,
    points_awarded: row.points_awarded,
    fastest_lap: row.fastest_lap,
    display_label_mode: row.display_label_mode ?? "position"
  }));

  const { error } = await supabase
    .from("championship_results")
    .upsert(payload, { onConflict: "race_id,driver_id" });

  if (error) throw error;
};

export const deleteChampionshipResult = async (id: string) => {
  const { error } = await supabase.from("championship_results").delete().eq("id", id);
  if (error) throw error;
};

export type DriverOverrideInput = {
  season_id: string;
  driver_id: string;
  manual_points?: number | null;
  manual_position?: number | null;
  is_manual_override: boolean;
  notes?: string | null;
};

export type TeamOverrideInput = {
  season_id: string;
  team_id: string;
  manual_points?: number | null;
  manual_position?: number | null;
  is_manual_override: boolean;
  notes?: string | null;
};

export const upsertDriverLeaderboardOverride = async (payload: DriverOverrideInput) => {
  const { error } = await supabase
    .from("championship_driver_overrides")
    .upsert(
      {
        season_id: payload.season_id,
        driver_id: payload.driver_id,
        manual_points: payload.manual_points ?? null,
        manual_position: payload.manual_position ?? null,
        is_manual_override: payload.is_manual_override,
        notes: payload.notes ?? null
      },
      { onConflict: "season_id,driver_id" }
    );

  if (error) throw error;
};

export const deleteDriverLeaderboardOverride = async (seasonId: string, driverId: string) => {
  const { error } = await supabase
    .from("championship_driver_overrides")
    .delete()
    .eq("season_id", seasonId)
    .eq("driver_id", driverId);

  if (error) throw error;
};

export const upsertTeamLeaderboardOverride = async (payload: TeamOverrideInput) => {
  const { error } = await supabase
    .from("championship_team_overrides")
    .upsert(
      {
        season_id: payload.season_id,
        team_id: payload.team_id,
        manual_points: payload.manual_points ?? null,
        manual_position: payload.manual_position ?? null,
        is_manual_override: payload.is_manual_override,
        notes: payload.notes ?? null
      },
      { onConflict: "season_id,team_id" }
    );

  if (error) throw error;
};

export const deleteTeamLeaderboardOverride = async (seasonId: string, teamId: string) => {
  const { error } = await supabase
    .from("championship_team_overrides")
    .delete()
    .eq("season_id", seasonId)
    .eq("team_id", teamId);

  if (error) throw error;
};
